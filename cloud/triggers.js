'use strict';
/* global Parse */

var spotify = require('cloud/spotify.js');

module.exports = function(/* config */) {
  // 3 seconds timeout

  // fetch the spotify artist and fetch total numbers of albums
  Parse.Cloud.beforeSave("Artist", function(req, res) {
    var parseArtist = req.object;

    if (!parseArtist.get("spotifyId")) {
      // we are creating an artist
      spotify.fetchSpotifyArtist(parseArtist).then(function(parseArtist) {
        // TODO: we could have more than one match, let the user decide
        // TODO: what if different users match differently? -> version 2.0
        // fetch all albums but only the simplified version
        // TODO: this times out easily, move to background task and just start it here.
        return spotify.fetchAllAlbumsForArtist(parseArtist, false); // call background task instead
      }).then(res.success, res.error);
    } else {
      res.success();
    }
  });

};