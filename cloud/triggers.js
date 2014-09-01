'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

// find the exact artist name match
function findExactMatch(items, artistName) {
  var result = undefined;
  if (items) {
    _.each(items, function(item) {
      if (artistName === item.name) {
        result = item;
        return;
      }
    });
  }
  return result;
}

module.exports = function(config) {
  // 3 seconds timeout

  // search for and save the artist
  // query for ONE album of the artist, save the total number of albums
  Parse.Cloud.beforeSave("Artist", function(req, res) {
    var parseArtist = req.object;

    if (!parseArtist.get("spotifyId")) {
      spotify.searchForArtist({
        q: parseArtist.get("name")
      }, parseArtist).then(function(httpResponse) {
        var spotifyArtist = findExactMatch(httpResponse.data.artists.items, parseArtist.get("name")),
          spotifyId = spotifyArtist ? spotifyArtist.id : httpResponse.data.artists.items[0].id;

        parseArtist.set("spotifyId", spotifyId);
        return spotify.updateTotalAlbumsOfArtist(parseArtist);
      }).then(res.success, res.error);
    } else {
      res.success();
    }
  });

};