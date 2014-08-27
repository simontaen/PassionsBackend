'use strict';

(function() {

  function wrappedHttpRequest(method, params, success, failure) {
    params.api_key = "aed3367b0133ab707cb4e5b6b04da3e7";
    params.format = "json";
    params.autocorrect = "1";
    //params.User_Agent = "Passions";
    //params.Accept = "application/json";

    return Parse.Cloud.httpRequest({
      method: method,
      url: "http://ws.audioscrobbler.com/2.0/",
      body: params,
    }).then(function(httpResponse) {
      if (success) {
        success(httpResponse);
      }
    }, function(httpResponse) {
      if (failure) {
        failure(httpResponse);
      }
    });

  };

  module.exports = {

    // requires mbid or artist
    getAlbumsForArtist: function(params, success, failure) {
      params.method = "artist.getTopAlbums";
      console.log("Calling artist.getTopAlbums for artist=" + params.artist);
      return wrappedHttpRequest("POST", params, success, failure);
    }

  }
})();