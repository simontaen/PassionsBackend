'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

module.exports = function(config, lfm) {
  // 3 seconds timeout

  // search for and save the artist
  // query for ONE album of the artist, save the total number of albums
  Parse.Cloud.beforeSave("Artist", function(req, res) {
    var parseArtist = req.object;

    if (!parseArtist.get("spotifyId")) {
      spotify.searchForArtist({
        q: parseArtist.get("name"),
        limit: 1
      }, parseArtist).then(function(httpResponse) {
        parseArtist.set("spotifyId", httpResponse.data.artists.items[0].id);
        return spotify.updateTotalAlbumsOfArtist(parseArtist);
      }).then(res.success, res.error);
    } else {
      res.success();
    }
  });

};