'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

// find newest albums in array
function findNewestAlbum(albums) {
  var newestAlbum, //
  newestAlbumReleaseDate;

  _.each(albums, function(album) {
    // read releasedate
    // compare to newest
    // cache if newer
  });
  return newestAlbum;
};

// Checks for new albums (via total albums)
// Fetches all albums if new available
// Sends push notification for newest one
function findNewAlbumsForArtist(parseArtist, status) {
  var totalAlbums = parseArtist.get("totalAlbums"), //
    counter = 0;

  // for each artist, query for ONE album to update totalAlbums
  return spotify.updateTotalAlbumsOfArtist(parseArtist).then(function(parseArtist) {
    // compare the total number of albums
    if (totalAlbums != parseArtist.get("totalAlbums")) {
      // query for all albums if changed
      return spotify.fetchAllAlbumsForArtist(parseArtist);

    } else {
      if (counter % 1 === 0) {
        // Set the  job's progress status
        status.message(counter + " artists have no new albums.");
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


      // send push
      console.log("DEBUG: Sending push message");

      // save artist and return
      if (counter % 1 === 0) {
        // Set the  job's progress status
        status.message("NEW ALBUMS for " + counter + " artists!");
      }
      counter += 1;
    }

    // no more action needed
    return parseArtist.save();
  });
};


module.exports = function(config) {
  // 15 minute timeout

  // curl -X POST   -H "X-Parse-Application-Id: nCQQ7cw92dCJJoH1cwbEv5ZBFmsEyFgSlVfmljp9"   -H "X-Parse-Master-Key: 5iM8ff4mv3rHgq7iXQQEFgVXldqDHZOegM36qcyx"   -H "Content-Type: application/json"   -d '{"plan":"paid"}'   https://api.parse.com/1/jobs/findNewAlbums

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    // https://parse.com/docs/cloud_code_guide#jobs
    var counter = 0, //
      // Artist should be favorited by some users
      query = (new Parse.Query("Artist")).exists("favByUsers");

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