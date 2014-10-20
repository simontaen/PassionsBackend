'use strict';
/* global Parse */

var spotify = require('cloud/spotify.js'),
  iTunes = require('cloud/iTunes.js');

module.exports = function(config) {
  // 3 seconds timeout

  // fetch the spotify artist and fetch total numbers of albums
  Parse.Cloud.beforeSave("Artist", function(req, res) {
    var parseArtist = req.object;

    if (!parseArtist.get("iTunesId")) {
      // we are creating an artist
      iTunes.fetchArtist(parseArtist).then(res.success, res.error);

    } else {
      res.success();
    }
  });

};