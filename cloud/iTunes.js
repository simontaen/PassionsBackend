'use strict';
/* global Parse */

var _ = require("underscore");

(function() {

  var apiUrl = "https://itunes.apple.com/";

  // find the exact artist name match in artist array
  function findExactMatch(items, searchArtistName) {
    var result = [];
    if (items) {
      _.each(items, function(item) {
        if (searchArtistName === item.artistName) {
          result.push(item);
        }
      });
    }
    if (_.size(result) > 1) {
      // TODO: present a sheet to the user that he must choose the Artist
      console.log("WARN: Found " + _.size(result) + " exact matches for Artist " + searchArtistName + " on iTunes.");
    }
    // pick the most "popular" one
    return _.first(result);
  }

  // try to get the album record from parse
  // if not existent, create it. Update it with passed values
  // set artistId on the album
  // returns a promise with then(parseAlbum), error(parseAlbum, error)
  function createOrUpdateAlbum(data, parseArtist) {
    var query = new Parse.Query("Album");
    query.equalTo("iTunesId", data.collectionId);

    return query.first().then(function(parseAlbum) {
      var thisAlbum;

      if (parseAlbum) {
        thisAlbum = parseAlbum;
      } else {
        // create one
        thisAlbum = createAlbum(data, parseArtist);
      }

      if (updateAlbumValues(data, thisAlbum)) {
        return thisAlbum.save();
      }
      return Parse.Promise.as(thisAlbum);
    });
  }

  // returns unsaved new parseAlbum
  function createAlbum(data, parseArtist) {
    var Album = Parse.Object.extend("Album"),
      parseAlbum = new Album();
    parseAlbum.set("iTunesId", data.collectionId);
    parseAlbum.set("artistId", parseArtist.id);
    return parseAlbum;
  }

  // true if values have been updated
  // does NOT save the parseAlbum
  function updateAlbumValues(data, parseAlbum) {
    var didUpdate = false;
    // update values
    if ( !! data.collectionViewUrl && parseAlbum.get("iTunesLink") != data.collectionViewUrl) {
      parseAlbum.set("iTunesLink", data.collectionViewUrl);
      didUpdate = true;
    }
    if ( !! data.collectionName && parseAlbum.get("name") != data.collectionName) {
      parseAlbum.set("name", data.collectionName);
      didUpdate = true;
    }
    if ( !! data.releaseDate) {
      var myDate = new Date(data.releaseDate);
      if (parseAlbum.get("releaseDate") != myDate) {
        parseAlbum.set("releaseDate", myDate);
        didUpdate = true;
      }
    }
    if ( !! data.artworkUrl60 && !! data.artworkUrl100) {
      var result = setImagesFromRecordOnParseObject(data, parseAlbum);
      didUpdate = didUpdate || result;
    }
    return didUpdate;
  }

  // For the passed albums, store them on parse
  // returns a promise with
  // then(parseArtist, parseAlbums), error(httpResponse) or error(parseAlbum, error)
  function processAlbumInfo(albums, parseArtist) {
    var promises = [],
      parseAlbums = [];

    _.each(albums, function(album) {
      promises.push(
      // start immediatly
      createOrUpdateAlbum(album, parseArtist).then(function(parseAlbum) {
        // cache the new album and return successfully
        parseAlbums.push(parseAlbum);
        return Parse.Promise.as();
      }));
    });

    // Return a new promise that is resolved when all are finished
    return Parse.Promise.when(promises).then(function() {
      // set albums on artist (just overwrite)
      console.log("Found " + parseAlbums.length + " Albums for Artist " + parseArtist.get("name"));
      return Parse.Promise.as(parseArtist, parseAlbums);
    });
  }

  // return a string intented for logging
  function getParamsForLog(params) {
    var result = "";
    if (params) {
      result += params.term ? " " + params.term : "";
      result += params.id ? " " + params.id : "";
    }
    return result;
  }

  /* ------------ Pure API calls ------------ */

  // returns a promise with then(httpResponse), error(httpResponse)
  function wrappedHttpRequest(myUrl, params, caller) {
    if (caller != "iTunes.processAlbumInfo") {
      console.log("Calling " + myUrl + getParamsForLog(params) + " from " + caller);
    }
    params.media = "music";
    return Parse.Cloud.httpRequest({
      url: myUrl,
      params: params
    }).then(function(httpResponse) {
      httpResponse.data = JSON.parse(httpResponse.text);
      return Parse.Promise.as(httpResponse);
    }).fail(function(httpResponse) {
      console.error((caller || myUrl) + " failed");
      console.error(httpResponse.text);
    });
  }

  // requires id, https://developer.iTunes.com/web-api/get-artists-albums/
  // album_type, country, limit, offset
  // returns a promise with then(results), error(httpResponse)
  function getAlbumsForArtist(id, params) {
    var endpoint = "lookup";
    params.id = id;
    params.entity = "album";
    params.sort = "recent";
    return wrappedHttpRequest(apiUrl + endpoint, params, "iTunes.getAlbumsForArtist").then(function(httpResponse) {
      var results = httpResponse.data.results;
      return Parse.Promise.as(_.without(results, _.first(results)));
    });
  }

  // sets the image urls on the passed parseObj
  function setImagesFromRecordOnParseObject(data, parseObj) {
    var imgs = []; // big to small
    if (data.artworkUrl100) {
      imgs.push(data.artworkUrl100);
    }
    if (data.artworkUrl60) {
      imgs.push(data.artworkUrl60);
    }
    parseObj.set("images", imgs);
    return true;
  }

  module.exports = {

    /* As a rule I never save the artist here -> caller!
     * Only SET the API results on the parse objects
     */

    // query for Last.fm name correction, then search iTunes
    // takes the first iTunes result if no exact match is found
    // returns a promise with then(parseArtist), error(httpResponse)
    fetchArtist: function(parseArtist) {
      var endpoint = "search",
        params = {
          // get the updated name
          term: parseArtist.get("name"),
          entity: "musicArtist",
          attribute: "artistTerm"
        };

      // https://www.apple.com/itunes/affiliates/resources/documentation/itunes-store-web-service-search-api.html
      return wrappedHttpRequest(apiUrl + endpoint, params, "iTunes.fetchArtist").then(function(httpResponse) {
        var exactMatch = findExactMatch(httpResponse.data.results, parseArtist.get("name")),
          iTunesA = exactMatch;

        if (!iTunesA) {
          console.log("WARN: No exact match found for Artist " + parseArtist.get("name") + " out of " + _.size(httpResponse.data.results) + ".");
          // TODO: present a sheet to the user that we did not find the Artist
          // get the first of the delivered artists as a default
          iTunesA = _.first(httpResponse.data.results);
        }

        if (iTunesA) {
          parseArtist.set("iTunesId", iTunesA.artistId);
          parseArtist.set("iTunesLink", iTunesA.artistLinkUrl);
        }

        return Parse.Promise.as(parseArtist);
      });
    },

    // query for ALL albums of the artist
    // pass in fetchFullAlbum to get the full album info (performance!)
    // https://developer.iTunes.com/web-api/object-model/#artist-object-full
    // returns a promise with
    // then(parseArtist), error(httpResponse) or error(parseAlbum, error)
    fetchAllAlbumsForArtist: function(parseArtist) {
      var albums;

      // cache the results and call "next"
      function processor(results) {
        // cache albums
        albums = results;
        
        // update totalAlbums
        parseArtist.set("totalAlbums", _.size(albums));
        // set the latests Albums Artwork as the Artist Artwork
        setImagesFromRecordOnParseObject(_.first(albums), parseArtist);
                  
        // we are done, all albums are known, store them in parse
        return processAlbumInfo(albums, parseArtist);
      }

      // initial call
      return getAlbumsForArtist(parseArtist.get("iTunesId"), {
        limit: 200
      }).then(processor);
    },

    // http://itunes.apple.com/lookup?id=5040714&entity=album&limit=1&sort=recent
    // fetches the latest album and creates it if new, else returns existing newest
    // returns a promise with then(parseArtist, newestParseAlbum, isNew), error(httpResponse)
    findNewestAlbum: function(parseArtist) {
      var data;
      return getAlbumsForArtist(parseArtist.get("iTunesId"), {
        limit: 1
      }).then(function(results) {
        data = _.first(results);
        if ( !! data) {
          // Go check if it exists
          var query = new Parse.Query("Album");
          query.equalTo("iTunesId", data.collectionId);
          return query.first();
        }
        return Parse.Promise.error(results);

      }).then(function(parseAlbum) {
        if (parseAlbum) {
          // Found existing Album
          return Parse.Promise.as(parseArtist, parseAlbum, false);
        }
        var newParseAlbum = createAlbum(data, parseArtist);

        // New album found
        parseArtist.set("totalAlbums", parseArtist.get("totalAlbums") + 1);
        return Parse.Promise.as(parseArtist, newParseAlbum, true);
      });
    }

  };
})();