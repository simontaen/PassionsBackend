'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

// save an array of album names to the artists "album" property
function processSpotifyAlbums(albums, artistObj) {
  var albumsMap = _.groupBy(albums, 'id');
  artistObj.set("albums", albumsMap);
};

// save selected artist properties
// query for ONE album of the artist, save the total number of albums
function processArtist(artist, artistObj, res) {
  var artistId = artist.id;
  spotify.getAlbumsForArtist(artistId, {
    limit: 1
  },

  function(httpResponse) {
    //processSpotifyAlbums(httpResponse.data.items, artistObj);
    artistObj.set("totalAlbums", httpResponse.data.total);
    res.success();
  },

  function(httpResponse) {
    console.log(httpResponse.text);
    res.error("spotify.getAlbumsForArtist failed!");
  });

  artistObj.set("spotifyId", artistId);
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
      processArtist(httpResponse.data.artists.items[0], req.object, res);
    },

    function(httpResponse) {
      console.log(httpResponse.text);
      res.error("spotify.searchForArtist failed!");
    });
  });


  /*
  // save an array of album names to the artists "album" property
  function processLfmAlbums(albums, artistObj) {
    var albumsMap = _.groupBy(albums, 'name');
    artistObj.set("albums", albumsMap);
    // var albumNames = [];
    // _.each(albums, function(album) {
    //   albumNames.push(album.name);
    // });
    // artistObj.set("albums", albumNames);
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