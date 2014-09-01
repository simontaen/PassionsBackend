'use strict';

var _ = require("underscore");

(function() {

  var apiUrl = "http://ws.audioscrobbler.com/2.0/";
  var apiKey = "aed3367b0133ab707cb4e5b6b04da3e7";

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

    /* ------------- API CALLS ------------- */

    // requires artist
    // returns a promise with then(parseArtist), error(httpResponse)
    getCorrection: function(params, parseArtist) {
      params.method = "artist.getCorrection";
      console.log("Calling Last.fm artist.getCorrection for artist=" + params.artist);

      return wrappedHttpRequest(params, "lfm.getCorrection").then(function(httpResponse) {
        // Take the correction if it exists
        if (httpResponse.data.corrections.correction) {
          parseArtist.set("name", httpResponse.data.corrections.correction.artist.name);
          parseArtist.set("lfmId", httpResponse.data.corrections.correction.artist.mbid);
        };
        return Parse.Promise.as(parseArtist);;
      });
    }

  }
})();