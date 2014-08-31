'use strict';

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
      console.error(caller + " failed");
      console.error(httpResponse.text);
    });
  };

  // set an ARRAY of album names to the artists "album" property
  function processAlbums(albums, parseArtist) {
    var albumsMap = _.groupBy(albums, 'id');
    parseArtist.set("albums", albumsMap);
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

    // query for ALL albums of the artist, save them
    // returns a promise with then(parseArtist), error(?)
    fetchAllAlbumsForArtist: function(parseArtist) {

      return this.getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 50
      }).then(function(httpResponse) {
        parseArtist.set("totalAlbums", httpResponse.data.total);
        return parseArtist.save();
      });

      // return wrappedHttpRequest(nextUrl, {});


    },

    // query for ONE album of the artist, sets totalAlbums on the passed artist
    // returns a promise with then(parseArtist), error(httpResponse)
    updateTotalAlbumsOfArtist: function(parseArtist) {
      return this.getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 1
      }).then(function(httpResponse) {
        parseArtist.set("totalAlbums", httpResponse.data.total);
        return Parse.Promise.as(parseArtist);;
      });
    }

  }
})();