'use strict';

(function() {

  function wrappedHttpRequest(endpoint, params, success, failure) {
    var myUrl = endpoint ? "https://api.spotify.com/v1/" + endpoint + "/" : _url;
    params.limit = params.limit || "1";

    return Parse.Cloud.httpRequest({
      url: myUrl,
      params: params,
      success: function(httpResponse) {
        success && success(httpResponse);
      },
      error: function(httpResponse) {
        failure && failure(httpResponse);
      }
    });
  };

  module.exports = {

    /* ------------- API CALLS ------------- */

    // requires id, https://developer.spotify.com/web-api/get-artists-albums/
    // album_type, country, limit, offset
    getAlbumsForArtist: function(id, params, success, failure) {
      var endpoint = "artists/" + id + "/albums";
      params.album_type = "album";
      console.log("Calling spotify " + endpoint);
      return wrappedHttpRequest(endpoint, params, success, failure);
    },

    // requires params.q, https://developer.spotify.com/web-api/search-item/
    // type, limit, offset
    searchForArtist: function(params, success, failure) {
      var endpoint = "search";
      params.type = "artist";
      console.log("Calling spotify " + endpoint + " " + params.q);
      return wrappedHttpRequest(endpoint, params, success, failure);
    },


    /* ------------- DATA PROCESSING ------------- */

    // save an array of album names to the artists "album" property
    processSpotifyAlbums: function(albums, parseArtist) {
      var albumsMap = _.groupBy(albums, 'id');
      parseArtist.set("albums", albumsMap);
    },

    // save selected artist properties
    // query for ONE album of the artist, save the total number of albums
    processArtist: function(artist, parseArtist, cb) {
      var artistId = artist.id;
      this.getAlbumsForArtist(artistId, {
        limit: 1
      },

      function(httpResponse) {
        //processSpotifyAlbums(httpResponse.data.items, parseArtist);
        parseArtist.set("totalAlbums", httpResponse.data.total);
        cb && cb();
      },

      function(httpResponse) {
        console.log(httpResponse.text);
        cb && cb("spotify.getAlbumsForArtist failed!");
      });

      parseArtist.set("spotifyId", artistId);
    }

  }
})();