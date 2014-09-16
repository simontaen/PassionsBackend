'use strict';
/* global Parse */

var //_ = require("underscore"),
  //lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

module.exports = function(config) {
  // 3 seconds timeout

  // fetch the spotify artist and fetch total numbers of albums
  Parse.Cloud.beforeSave("Artist", function(req, res) {
    var parseArtist = req.object;

    if (!parseArtist.get("spotifyId")) {
      spotify.fetchSpotifyArtist(parseArtist).then(function(parseArtist) {
        return spotify.fetchTotalAlbumsOfArtist(parseArtist);
      }).then(res.success, res.error);
    } else {
      res.success();
    }
  });

};