'use strict';

var _ = require("underscore");

(function() {

  var apiUrl = "http://ws.audioscrobbler.com/2.0/";
  var apiKey = "aed3367b0133ab707cb4e5b6b04da3e7";

  /* ------------ Pure API calls ------------ */
  
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

    /* As a rule I never save the artist here -> caller!
     * Only SET the API results on the parse objects
     */

    // requires artist
    // returns a promise with then(parseArtist), error(httpResponse)
    fetchCorrection: function(params, parseArtist) {
      params.method = "artist.getCorrection";
      console.log("Calling Last.fm artist.getCorrection for artist=" + params.artist);

      return wrappedHttpRequest(params, "lfm.fetchCorrection").then(function(httpResponse) {
        var mbid = undefined;
        // Take the correction if it exists
        if (httpResponse.data.corrections.correction) {
          parseArtist.set("name", httpResponse.data.corrections.correction.artist.name);
          mbid = httpResponse.data.corrections.correction.artist.mbid;
          if (mbid && mbid != "") {
            parseArtist.set("lfmId", mbid);
          }
        }
        return Parse.Promise.as(parseArtist);
      });
    }

  }
})();