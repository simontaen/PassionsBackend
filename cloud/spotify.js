'use strict';
/* global Parse */

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js');

(function() {

  var apiUrl = "https://api.spotify.com/v1/";
  //var appId = "nCQQ7cw92dCJJoH1cwbEv5ZBFmsEyFgSlVfmljp9";
  //var restKey = "BAamVLwiBS0XY64WhlYfxADSq0FjRSP97fIkWu4d";

  // find the exact artist name match in artist array
  function findExactMatch(items, artistName) {
    var result;
    if (items) {
      _.each(items, function(item) {
        if (artistName === item.name) {
          result = item;
          return;
        }
      });
    }
    return result;
  }

  // For the passed albums, fetch the full album info
  // Set the albums propertiy with selected album values
  function fetchAlbumInfo(albums, parseArtist) {
    var promises = [],
      completeAlbums = [];

    _.each(albums, function(album) {
      promises.push(
      // https://developer.spotify.com/web-api/get-album/
      // call the link for the full album on every album, start immediatly
      wrappedHttpRequest(album.href, {}, "spotify.fetchAlbumInfo").then(function(httpResponse) {
        var newAlbum = {}, data = httpResponse.data;
        newAlbum.href = data.href;
        newAlbum.id = data.id;
        newAlbum.name = data.name;
        newAlbum.release_date = data.release_date;
        newAlbum.release_date_precision = data.release_date_precision;

        // cache the new album and return successfully
        completeAlbums.push(newAlbum);
        return Parse.Promise.as();
      }));
    });

    // Return a new promise that is resolved when all are finished
    return Parse.Promise.when(promises).then(function() {
      var albums = _.groupBy(completeAlbums, 'id');
      // set albums on artist
      parseArtist.set("albums", albums);
      console.log("Found " + _.size(albums) + " Albums!");
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
    console.log("Calling " + myUrl + getParamsForLog(params) + " from " + caller);
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

  module.exports = {

    /* As a rule I never save the artist here -> caller!
     * Only SET the API results on the parse objects
     */

    // query for Last.fm name correction, then search spotify
    // takes the first spotify result if no exact match is found
    // returns a promise with then(parseArtist), error(httpResponse)
    fetchSpotifyArtist: function(parseArtist) {
      var endpoint = "search/";

      // call lfm for name correction
      return lfm.fetchCorrection({
        artist: parseArtist.get("name")
      }, parseArtist).then(function(parseArtist) {
        var params = {
          // get the updated name
          q: parseArtist.get("name"),
          type: "artist"
        };

        // https://developer.spotify.com/web-api/search-item/
        return wrappedHttpRequest(apiUrl + endpoint, params, "spotify.fetchSpotifyArtist").
        then(function(httpResponse) {
          var exactMatch = findExactMatch(httpResponse.data.artists.items, parseArtist.get("name")),
            // get the first of the delivered artists as a default
            spotifyA = exactMatch || httpResponse.data.artists.items[0],
            artistImgs = []; // big to small

          if (spotifyA) {
            parseArtist.set("spotifyId", spotifyA.id);

            if (spotifyA.images) {
              _.each(spotifyA.images, function(image) {
                artistImgs.push(image.url || "");
              });
              parseArtist.set("images", artistImgs);
            }
          }

          return Parse.Promise.as(parseArtist);
        });
      });
    },

    // query for ALL albums of the artist and the full album info
    // returns a promise with then(parseArtist), error(?)
    fetchAllAlbumsForArtist: function(parseArtist) {
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
          // we are done, all albums are known, get the complete infos
          return fetchAlbumInfo(albums, parseArtist);
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