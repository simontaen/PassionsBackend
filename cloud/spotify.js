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

    // requires id, https://developer.spotify.com/web-api/get-artists-albums/
    // album_type, country, limit, offset
    getAlbumsForArtist: function(id, params, success, failure) {
      var endpoint = "artists/" + id + "/albums";
      params.album_type = "album";
      console.log("Calling " + endpoint);
      return wrappedHttpRequest(endpoint, params, success, failure);
    },

    // requires params.q, https://developer.spotify.com/web-api/search-item/
    // type, limit, offset
    searchForArtist: function(params, success, failure) {
      var endpoint = "search";
      params.type = "artist";
      console.log("Calling " + endpoint + " " + params.q);
      return wrappedHttpRequest(endpoint, params, success, failure);
    }

  }
})();