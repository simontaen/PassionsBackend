'use strict';
/* global Parse */

var _ = require("underscore"),
  spotify = require('cloud/spotify.js'),
  defaultYear = 1000,
  defaultMonth = 0,
  defaultDay = 1,
  defaultUTC = Date.UTC(defaultYear, defaultMonth, defaultDay),
  // global var to check if bkg job is running
  // not the best solution to be honest
  fetchFullAlbumsRunning = false;

// return UTC timestamp, never null
function normalizeDate(date) {
  var splitted = date.split("-");
  // Date.UTC(year, month, day[, hours[, minutes[, seconds[,ms]]]])
  return Date.UTC(splitted[0] || defaultYear, splitted[1] || defaultMonth, splitted[2] || defaultDay);
}

// find newest albums in array
function findNewestAlbum(albums) {
  var newestAlbum, newestAlbumUTC = defaultUTC;

  _.each(albums, function(albumArray) {
    var album = albumArray[0];
    album.utc = normalizeDate(album.release_date);

    // cache if newer
    if (album.utc > newestAlbumUTC) {
      newestAlbum = album;
      newestAlbumUTC = album.utc;
    }
  });

  return newestAlbum;
}

// Checks for new albums (via total albums)
// Fetches all albums if new available
// Sends push notification for newest one
function findNewAlbumsForArtist(parseArtist, status) {
  var totalAlbums = parseArtist.get("totalAlbums");

  // for each artist, query for ONE album to update totalAlbums
  return spotify.fetchTotalAlbumsOfArtist(parseArtist).then(function(parseArtist) {
    // compare the total number of albums
    var diffAlbums = parseArtist.get("totalAlbums") - totalAlbums;
    if (diffAlbums > 0) {
      console.log("Artist " + parseArtist.get("name") + " has " + diffAlbums + " new Albums, fetching them.");
      // query for all albums if changed
      return spotify.fetchAllAlbumsForArtist(parseArtist, true);
    }
    // nothing to do (we could have less albums, but when does that happen?)
    return Parse.Promise.as();

  }).then(function(parseArtist) {
    // TODO: what if there is more than one new Album?
    if (parseArtist && totalAlbums != parseArtist.get("totalAlbums")) {
      // all albums are set

      // You could check to see if it's recent
      var newestAlbum = findNewestAlbum(parseArtist.get("albums")),
        pushQuery = new Parse.Query(Parse.Installation),
        newAlbumsCounter = 0;

      console.log("Newest Album " + newestAlbum.name + " for Artist " + parseArtist.get("name") + " (" + parseArtist.id + ")");
      status.error("New Albums for " + newAlbumsCounter + " artists!");
      newAlbumsCounter += 1;

      pushQuery.equalTo('channels', 'allFavArtists');
      pushQuery.equalTo('favArtists', parseArtist.id);

      Parse.Push.send({
        where: pushQuery,
        data: {
          alert: "New Album by " + parseArtist.get("name") + "!"
        }
      });

      // save artist and return ("albums" and "totalAlbums" have changed)
      return parseArtist.save();
    }
    // nothing to do
    return Parse.Promise.as(parseArtist);
  });
}

module.exports = function( /* config */ ) {
  // 15 minute timeout

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    // https://parse.com/docs/cloud_code_guide#jobs
    // Artist should be favorited by some users
    var query = (new Parse.Query("Artist")).exists("favByUsers");

    query.find().then(function(results) {
      var promises = [];
      _.each(results, function(parseArtist) {
        promises.push(findNewAlbumsForArtist(parseArtist, status));
      });
      return Parse.Promise.when(promises);

    }).then(function() {
      // all artists are processed
      status.success("findNewAlbums completed successfully");

    }, function(error) {
      console.error("ERROR: " + error);
      alert(error.message);
      status.error("ERROR: findNewAlbums");

    });
  });

  Parse.Cloud.job("fetchFullAlbums", function(req, status) {
    // for all artists without "albums"
    if (!fetchFullAlbumsRunning) {
      // fetch simplified album
      var query = (new Parse.Query("Artist")).doesNotExist("albums");
      query.find().then(function(results) {
        var promises = [];
        _.each(results, function(parseArtist) {
          console.log("INFO: fetchFullAlbums for Artist " + parseArtist.get("name") + " (" + parseArtist.id + ")");
          promises.push(
          spotify.fetchAllAlbumsForArtist(parseArtist, true).then(function(parseArtist) {
            return parseArtist.save();
          }));
        });
        return Parse.Promise.when(promises);

      }).then(function() {
        // all artists are processed
        fetchFullAlbumsRunning = false;
        status.success("fetchFullAlbums completed successfully");

      }, function(error) {
        fetchFullAlbumsRunning = false;
        console.error("ERROR: " + error);
        alert(error.message);
        status.error("ERROR: fetchFullAlbums");

      });
    }

  });

};