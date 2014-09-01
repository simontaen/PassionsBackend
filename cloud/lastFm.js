'use strict';

var _ = require("underscore");

(function() {

  var apiUrl = "http://ws.audioscrobbler.com/2.0/";
  var apiKey = "nCQQ7cw92dCJJoH1cwbEv5ZBFmsEyFgSlVfmljp9";

  // returns a promise with then(httpResponse), error(httpResponse)
  function wrappedHttpRequest(params, caller) {
    params.api_key = apiKey;
    params.format = "json";
    //params.User_Agent = "Passions";
    //params.Accept = "application/json";

    return Parse.Cloud.httpRequest({
      url: apiUrl,
      params: params,
    }).fail(function(httpResponse) {
      caller ? console.error(caller + " failed") : console.error(params.method + " failed");
      console.error(httpResponse.text);
    });
  };

  module.exports = {

    // requires mbid or artist
    getAlbumsForArtist: function(params) {
      params.method = "artist.getTopAlbums";
      params.autocorrect = "1";
      console.log("Calling artist.getTopAlbums for artist=" + params.artist);
      return wrappedHttpRequest(params, "lfm.getAlbumsForArtist");
    }

  }
})();