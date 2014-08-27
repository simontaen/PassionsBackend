'use strict';

var _ = require("underscore");

// save an array of album names to the artists "album" property
function processAlbums(albums, artist) {
  var albumsMap =  _.groupBy(albums, 'name');
  artist.set("albums", albumsMap);
  /*
  var albumNames = [];
  _.each(albums, function(album) {
    albumNames.push(album.name);
  });
  artist.set("albums", albumNames);
  */
};

module.exports = function(config, lfm, spotify) {
  // 3 seconds timeout

  Parse.Cloud.beforeSave("Artist", function(req, res) {
    var name = req.object.get("name");

    lfm.findAlbumsForArtist({
      artist: name
    }, function(httpResponse) {
      processAlbums(httpResponse.data.topalbums.album, req.object);
      // cleanup name, this creates a duplicate entry for every falsely names artist
      // req.object.set("name", httpResponse.data.topalbums["@attr"].artist);

      res.success();
    }, function(httpResponse) {
      console.log(httpResponse.text);
      res.error("LFM call findAlbumsForArtist failed");
    });

  });

};