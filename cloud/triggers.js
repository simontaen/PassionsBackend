'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

// save an array of album names to the artists "album" property
function processSpotifyAlbums(albums, parseArtist) {
  var albumsMap = _.groupBy(albums, 'id');
  parseArtist.set("albums", albumsMap);
};

// save selected artist properties
// query for ONE album of the artist, save the total number of albums
function processArtist(artist, parseArtist, cb) {
  var artistId = artist.id;
  spotify.getAlbumsForArtist(artistId, {
    limit: 1
  },

  function(httpResponse) {
    //processSpotifyAlbums(httpResponse.data.items, parseArtist);
    parseArtist.set("totalAlbums", httpResponse.data.total);
    cb && cb();
  },

  function(httpResponse) {
    console.log(httpResponse.text);
    cb && cb("spotify.getAlbumsForArtist failed!");
  });

  parseArtist.set("spotifyId", artistId);
};

module.exports = function(config, lfm) {
  // 3 seconds timeout

  // search for and save the artist
  // query for ONE album of the artist, save the total number of albums
  Parse.Cloud.beforeSave("Artist", function(req, res) {
    spotify.searchForArtist({
      q: req.object.get("name"),
      limit: 1
    },

    function(httpResponse) {
      processArtist(httpResponse.data.artists.items[0], req.object, function(error) {
        error ? res.error(error) : res.success();
      });
    },

    function(httpResponse) {
      console.log(httpResponse.text);
      res.error("spotify.searchForArtist failed!");
    });
  });


  /*
  // save an array of album names to the artists "album" property
  function processLfmAlbums(albums, parseArtist) {
    var albumsMap = _.groupBy(albums, 'name');
    parseArtist.set("albums", albumsMap);
    // var albumNames = [];
    // _.each(albums, function(album) {
    //   albumNames.push(album.name);
    // });
    // parseArtist.set("albums", albumNames);
  };

  Parse.Cloud.beforeSave("Artist2", function(req, res) {
    lfm.getAlbumsForArtist({
      artist: req.object.get("name")
    },

    function(httpResponse) {
      processAlbums(httpResponse.data.topalbums.album, req.object);
      // cleanup name: this creates a duplicate entry for every falsely names artist
      // req.object.set("name", httpResponse.data.topalbums["@attr"].artist);
      res.success();
    },

    function(httpResponse) {
      console.log(httpResponse.text);
      res.error("lfm.getAlbumsForArtist failed");
    });
  });
  */

};