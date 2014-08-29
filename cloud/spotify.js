'use strict';

(function() {

  // returns a promise with then(httpResponse), error(httpResponse)
  function wrappedHttpRequest(endpoint, params, caller) {
    var myUrl = endpoint ? "https://api.spotify.com/v1/" + endpoint + "/" : _url;
    params.limit = params.limit || 1;

    return Parse.Cloud.httpRequest({
      url: myUrl,
      params: params,
    }).fail(function(httpResponse) {
      console.error(caller + " failed");
      console.error(httpResponse.text);
    });
  };

  // save an array of album names to the artists "album" property
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
      var endpoint = "artists/" + id + "/albums";
      params.album_type = "album";
      console.log("Calling spotify " + endpoint);
      return wrappedHttpRequest(endpoint, params, "spotify.getAlbumsForArtist");
    },

    // requires params.q, https://developer.spotify.com/web-api/search-item/
    // type, limit, offset
    // returns a promise with then(httpResponse), error(httpResponse)
    searchForArtist: function(params) {
      var endpoint = "search";
      params.type = "artist";
      console.log("Calling spotify " + endpoint + " " + params.q);
      return wrappedHttpRequest(endpoint, params, "spotify.searchForArtist");
    },


    /* ------------- DATA PROCESSING ------------- */

    // query for ALL albums of the artist, save them
    // returns a promise with then(parseArtist), error(?)
    fetchAllAlbumsForArtist: function(parseArtist) {
      return this.getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 50
      }).then(function(httpResponse) {
        parseArtist.set("totalAlbums", httpResponse.data.total);
        return parseArtist.save();
      });
    },

    // query for ONE album of the artist, save the total number of albums
    // returns a promise with then(parseArtist), error(?)
    updateTotalAlbumsOfArtist: function(parseArtist) {
      return this.getAlbumsForArtist(parseArtist.get("spotifyId"), {
        limit: 1
      }).then(function(httpResponse) {
        parseArtist.set("totalAlbums", httpResponse.data.total);
        return parseArtist.save();
      });
    }

  }
})();