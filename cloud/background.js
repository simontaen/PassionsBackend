'use strict';
/* global Parse */

var _ = require("underscore"),
  //lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js'),
  defaultYear = 1000,
  defaultMonth = 0,
  defaultDay = 1,
  defaultUTC = Date.UTC(defaultYear, defaultMonth, defaultDay);

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
  var totalAlbums = parseArtist.get("totalAlbums"), //
    counter = 0;

  // for each artist, query for ONE album to update totalAlbums
  return spotify.fetchTotalAlbumsOfArtist(parseArtist).then(function(parseArtist) {
    // compare the total number of albums
    if (totalAlbums != parseArtist.get("totalAlbums")) {
      // query for all albums if changed
      return spotify.fetchAllAlbumsForArtist(parseArtist);

    } else {
      if (counter % 5 === 0) {
        // Set the  job's progress status
        status.message(counter + " artists have 0 new albums.");
      }
      counter += 1;
      return Parse.Promise.as(parseArtist);
    }

  }).then(function(parseArtist) {
    if (parseArtist && totalAlbums != parseArtist.get("totalAlbums")) {
      // all albums are set

      // find newest album
      var newestAlbum = findNewestAlbum(parseArtist.get("albums"));

      //check release date -> must be recent
      console.log("Newest Album " + newestAlbum.name + " for Artist " + parseArtist.get("name"));

      var pushQuery = new Parse.Query(Parse.Installation);
      pushQuery.contains('channels', 'allFavArtists');
      pushQuery.contains('favArtists', parseArtist)

      Parse.Push.send({
        where: pushQuery, // Set our Installation query
        data: {
          alert: "New Album by " + parseArtist.get("name") + "!"
        }
      });

      // Set the  job's progress status
      status.message("NEW ALBUMS for " + counter + " artists!");
      counter += 1;
    }

    // save artist and return
    return parseArtist.save();
  });
}


module.exports = function(config) {
  // 15 minute timeout

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    // https://parse.com/docs/cloud_code_guide#jobs
    // Artist should be favorited by some users
    var query = (new Parse.Query("Artist")).exists("favByUsers");

    query.find().then(function(results) {
      var promises = [];
      _.each(results, function(parseArtist) {
        // Start the find immediately and add its promise to the list.
        promises.push(findNewAlbumsForArtist(parseArtist, status));
      });
      // Return a new promise that is resolved when all are finished.
      return Parse.Promise.when(promises);

    }).then(function() {
      // promise of each, all artists are processed
      // Set the job's success status
      status.success("findNewAlbums completed successfully");

    }, function(error) {
      // Set the job's error status
      status.error(error);

    });
  });

};