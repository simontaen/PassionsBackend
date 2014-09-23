'use strict';
/* global Parse */

var _ = require("underscore");

(function() {

  var apiUrl = "https://api.spotify.com/v1/";
  //var appId = "nCQQ7cw92dCJJoH1cwbEv5ZBFmsEyFgSlVfmljp9";
  //var restKey = "BAamVLwiBS0XY64WhlYfxADSq0FjRSP97fIkWu4d";

  // find the exact artist name match in artist array
  function findExactMatch(items, artistName) {
    var result, counter = 0;
    if (items) {
      _.each(items, function(item) {
        if (artistName === item.name) {
          result = item;
          counter++;
        }
      });
    }
    if (counter > 1) {
      // TODO: present a sheet to the user that he must choose
      console.log("WARN: Found " + counter + " exact matches for Artist " + artistName + " on spotify.");
    }
    return result;
  }

  // try to get the album record from parse
  // if not existent, create it. Update it with passed values
  // returns parseAlbum (saved if neccessary)
  function createOrUpdateAlbum(data, parseArtist) {
    var Album = Parse.Object.extend("Album");
    var query = new Parse.Query(Album);
    query.equalTo("spotifyId", data.id);

    return query.first().then(function(parseAlbum) {
      var thisAlbum,
      didUpdate = false;

      if (parseAlbum) {
        thisAlbum = parseAlbum;
      } else {
        // create one
        parseAlbum = new Album();
        parseAlbum.set("spotifyId", data.id);
        parseAlbum.set("artistId", parseArtist.id);
        didUpdate = true;
      }

      // update values
      if ( !! data.href && parseAlbum.get("href") != data.href) {
        parseAlbum.set("href", data.href);
        didUpdate = true;
      }
      if ( !! data.name && parseAlbum.get("name") != data.name) {
        parseAlbum.set("name", data.name);
        didUpdate = true;
      }
      if ( !! data.release_date && parseAlbum.get("release_date") != data.release_date) {
        parseAlbum.set("release_date", data.release_date);
        didUpdate = true;
      }
      if ( !! data.release_date_precision && parseAlbum.get("release_date_precision") != data.release_date_precision) {
        parseAlbum.set("release_date_precision", data.release_date_precision);
        didUpdate = true;
      }
      if ( !! data.images && parseAlbum.get("images") != data.images) {
        var result = setImagesFromRecordOnParseObject(data, parseAlbum);
        didUpdate = didUpdate || result;
      }

      if (didUpdate) {
        return parseAlbum.save();
      }
      return Parse.Promise.as(parseAlbum);
    });
  }

  // For the passed albums, store them on parse
  // pass in fetchFullAlbum to get the full album info (performance!)
  // Set the albums propertiy on parseArtist with album id's
  // returns a promise with then(parseArtist), error(?)
  function processAlbumInfo(albums, parseArtist, fetchFullAlbum) {
    var promises = [],
      albumIds = [];

    _.each(albums, function(album) {
      promises.push(
      // https://developer.spotify.com/web-api/get-album/
      // call the link for the full album on every album, start immediatly

      function() {
        if (fetchFullAlbum) {
          return wrappedHttpRequest(album.href, undefined, "spotify.processAlbumInfo").then(function(httpResponse) {
            return createOrUpdateAlbum(httpResponse.data, parseArtist);
          });
        }
        return createOrUpdateAlbum(album, parseArtist);

      }().then(function(parseAlbum) {
        // cache the new album and return successfully
        albumIds.push(parseAlbum.id);
        return Parse.Promise.as();
      }));
    });

    // Return a new promise that is resolved when all are finished
    return Parse.Promise.when(promises).then(function() {
      // set albums on artist (just overwrite)
      parseArtist.set("albums", albumIds);
      console.log("Found " + albumIds.length + " Albums for Artist " + parseArtist.get("name"));
      return Parse.Promise.as(parseArtist);
    });
  }

  // return a string intented for logging
  function getParamsForLog(params) {
    var result = "";
    if (params) {
      result += params.q ? " " + params.q : "";
    }
    return result;
  }

  /* ------------ Pure API calls ------------ */

  // returns a promise with then(httpResponse), error(httpResponse)
  function wrappedHttpRequest(myUrl, params, caller) {
    if (caller != "spotify.processAlbumInfo") {
      console.log("Calling " + myUrl + getParamsForLog(params) + " from " + caller);
    }
    return Parse.Cloud.httpRequest({
      url: myUrl,
      params: params,
    }).fail(function(httpResponse) {
      caller ? console.error(caller + " failed") : console.error(myUrl + " failed");
      console.error(httpResponse.text);
    });
  }

  // requires id, https://developer.spotify.com/web-api/get-artists-albums/
  // album_type, country, limit, offset
  // returns a promise with then(httpResponse), error(httpResponse)
  function getAlbumsForArtist(id, params) {
    var endpoint = "artists/" + id + "/albums/";
    params.album_type = "album";
    return wrappedHttpRequest(apiUrl + endpoint, params, "spotify.getAlbumsForArtist");
  }


  function setImagesFromRecordOnParseObject(rec, parseObj) {
    var imgs = []; // big to small
    if (rec.images) {
      _.each(rec.images, function(image) {
        imgs.push(image.url || "");
      });
      parseObj.set("images", imgs);
      return true;
    }
  }

  module.exports = {

    /* As a rule I never save the artist here -> caller!
     * Only SET the API results on the parse objects
     */

    // query for Last.fm name correction, then search spotify
    // takes the first spotify result if no exact match is found
    // returns a promise with then(parseArtist), error(httpResponse)
    fetchSpotifyArtist: function(parseArtist) {
      var endpoint = "search/",
        params = {
          // get the updated name
          q: parseArtist.get("name"),
          type: "artist"
        };

      // https://developer.spotify.com/web-api/search-item/
      return wrappedHttpRequest(apiUrl + endpoint, params, "spotify.fetchSpotifyArtist").
      then(function(httpResponse) {
        var exactMatch = findExactMatch(httpResponse.data.artists.items, parseArtist.get("name")),
          spotifyA = exactMatch;

        if (!spotifyA) {
          console.log("WARN: No exact match found for Artist " + parseArtist.get("name") + " out of " + _.size(httpResponse.data.artists.items) + ".");
          // TODO: present a sheet to the user that he must choose
          // get the first of the delivered artists as a default
          spotifyA = httpResponse.data.artists.items[0];
        }

        if (spotifyA) {
          parseArtist.set("spotifyId", spotifyA.id);
          setImagesFromRecordOnParseObject(spotifyA, parseArtist);
        }

        return Parse.Promise.as(parseArtist);
      });
    },

    // query for ALL albums of the artist
    // pass in fetchFullAlbum to get the full album info (performance!)
    // https://developer.spotify.com/web-api/object-model/#artist-object-full
    // returns a promise with then(parseArtist), error(?)
    fetchAllAlbumsForArtist: function(parseArtist, fetchFullAlbum) {
      var albums;

      // cache the results and call "next"
      function processor(httpResponse) {
        var data = httpResponse.data,
          nextUrl = data.next;
        // cache albums
        albums = albums ? _.union(albums, data.items) : data.items;

        if (data.limit + data.offset < data.total && nextUrl) {
          // call next url recursivly
          return wrappedHttpRequest(nextUrl, undefined, "spotify.fetchAllAlbumsForArtist").then(processor);
        } else {
          // update if different
          if (parseArtist.get("totalAlbums") != httpResponse.data.total) {
            parseArtist.set("totalAlbums", httpResponse.data.total);
          }
          // we are done, all albums are known (simplified), store them in parse
          // optionally fetch full album details (performance!)
          return processAlbumInfo(albums, parseArtist, fetchFullAlbum);
        }
      }

      // initial call
      return getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 50
      }).then(processor);
    },

    // query for ONE album of the artist
    // returns a promise with then(parseArtist), error(httpResponse)
    fetchTotalAlbumsOfArtist: function(parseArtist) {
      return getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 1
      }).then(function(httpResponse) {
        // update if different
        if (parseArtist.get("totalAlbums") != httpResponse.data.total) {
          parseArtist.set("totalAlbums", httpResponse.data.total);
        }
        return Parse.Promise.as(parseArtist);
      });
    }

  }
})();