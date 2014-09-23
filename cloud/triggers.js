'use strict';
/* global Parse */

var spotify = require('cloud/spotify.js');

module.exports = function(config) {
  // 3 seconds timeout

  // fetch the spotify artist and fetch total numbers of albums
  Parse.Cloud.beforeSave("Artist", function(req, res) {
    var parseArtist = req.object;

    if (!parseArtist.get("spotifyId")) {
      // we are creating an artist
      spotify.fetchSpotifyArtist(parseArtist).then(function(parseArtist) {
        // TODO: we could have more than one match, let the user decide
        // TODO: what if different users match differently? -> version 2.0

        // call background job to fetch all simplified albums
        Parse.Cloud.httpRequest({
          url: "https://api.parse.com/1/jobs/fetchFullAlbums",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Parse-Application-Id": config.appId,
            "X-Parse-Master-Key": config.masterKey
          },
          body: {}
        });
        
        // return the artist immediatly
        return Parse.Promise.as(parseArtist);
      }).then(res.success, res.error);
      
    } else {
      res.success();
    }
  });

};