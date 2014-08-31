'use strict';

var _ = require("underscore");

(function() {

  var apiUrl = "https://api.spotify.com/v1/";
  var appId = "nCQQ7cw92dCJJoH1cwbEv5ZBFmsEyFgSlVfmljp9";
  var restKey = "BAamVLwiBS0XY64WhlYfxADSq0FjRSP97fIkWu4d";

  // returns a promise with then(httpResponse), error(httpResponse)
  function wrappedHttpRequest(myUrl, params, caller) {
    return Parse.Cloud.httpRequest({
      url: myUrl,
      params: params,
    }).fail(function(httpResponse) {
      caller ? console.error(caller + " failed") : console.error(myUrl + " failed");
      console.error(httpResponse.text);
    });
  };

  // For the passed albums, call the link to get complete info
  // Set the albums propertiy with selected album values
  // https://developer.spotify.com/web-api/get-album/
  function fetchAlbumInfo(albums, parseArtist) {
    var promises = [],
      completeAlbums = [];

    _.each(albums, function(album) {
      // Start the request immediately and add its promise to the list.
      promises.push(wrappedHttpRequest(album.href).then(function(httpResponse) {
        var newAlbum = {}, data = httpResponse.data;
        newAlbum.href = data.href;
        newAlbum.id = data.id;
        newAlbum.name = data.name;
        newAlbum.release_date = data.release_date;
        newAlbum.release_date_precision = data.release_date_precision;

        // cache albums
        completeAlbums.push(newAlbum);
        return Parse.Promise.as();;
      }));
    });

    // Return a new promise that is resolved when all are finished
    return Parse.Promise.when(promises).then(function() {
      // set albums on artist
      console.log("TOTAL ALBUMS: " + _.size(completeAlbums));
      parseArtist.set("albums", _.groupBy(completeAlbums, 'id'));
      return Parse.Promise.as(parseArtist);;
    });
  };

  module.exports = {

    /* ------------- API CALLS ------------- */

    // requires id, https://developer.spotify.com/web-api/get-artists-albums/
    // album_type, country, limit, offset
    // returns a promise with then(httpResponse), error(httpResponse)
    getAlbumsForArtist: function(id, params) {
      var endpoint = "artists/" + id + "/albums/";
      params.album_type = "album";
      console.log("Calling spotify " + endpoint);
      return wrappedHttpRequest(apiUrl + endpoint, params, "spotify.getAlbumsForArtist");
    },

    // requires params.q, https://developer.spotify.com/web-api/search-item/
    // type, limit, offset
    // returns a promise with then(httpResponse), error(httpResponse)
    searchForArtist: function(params) {
      var endpoint = "search/";
      params.type = "artist";
      params.limit = params.limit || 1;
      console.log("Calling spotify " + endpoint + " " + params.q);
      return wrappedHttpRequest(apiUrl + endpoint, params, "spotify.searchForArtist");
    },


    /* ------------- DATA PROCESSING ------------- */
    /* As a rule I never save the artist here -> caller! */

    // query for ALL albums of the artist, set them on the passed artist
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
          return wrappedHttpRequest(nextUrl).then(processor);
        } else {
          // we are done, all albums are known, get the complete infos
          console.log("Found " + _.size(albums) + " Albums!");
          return fetchAlbumInfo(albums, parseArtist);
        }
      };

      // initial call
      return this.getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 50
      }).then(processor);
    },

    // query for ONE album of the artist, sets totalAlbums on the passed artist
    // returns a promise with then(parseArtist), error(httpResponse)
    updateTotalAlbumsOfArtist: function(parseArtist) {
      return this.getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 1
      }).then(function(httpResponse) {
        if (parseArtist.get("totalAlbums") != httpResponse.data.total) {
          parseArtist.set("totalAlbums", httpResponse.data.total);
        }
        return Parse.Promise.as(parseArtist);;
      });
    }

  }
})();