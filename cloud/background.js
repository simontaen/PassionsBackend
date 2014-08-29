'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

// 
function findNewAlbumsForArtist(parseArtist) {
  var totalAlbums = parseArtist.get("totalAlbums");

  // for each artist, query for ONE album to update totalAlbums
  return spotify.updateTotalAlbumsOfArtist(parseArtist).then(function(parseArtist) {
    // updateTotalAlbumsOfArtist is completed
    // get updated value
    var newTotalAlbums = parseArtist.get("totalAlbums");

    // compare the total number of albums
    if (totalAlbums != newTotalAlbums) {
      // query for all albums if changed
      return spotify.fetchAllAlbumsForArtist(parseArtist);

    } else {
      if (counter % 10 === 0) {
        // Set the  job's progress status
        status.message(counter + " artists have no new albums.");
      }
      counter += 1;
      // artist got saved by previous call, resolve successfully
      return Parse.Promise.as();
    }

  }).then(function(parseArtist) {
    if (parseArtist) {
      // fetchAllAlbumsForArtist is completed
      // all albums are saved

      // find newest album, check release date -> must be recent

      // send push

      // save artist and return
      if (counter % 1 === 0) {
        // Set the  job's progress status
        status.message("NEW ALBUMS for " + counter + " artists!");
      }
      counter += 1;
      return parseArtist.save();
    } else {
      // no more action needed
      return Parse.Promise.as();
    }

  });

};


module.exports = function(config) {
  // 15 minute timeout

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    // https://parse.com/docs/cloud_code_guide#jobs
    var counter = 0, //
      // Artist should be favorited by some users
      query = (new Parse.Query("Artist")).exists("favByUsers");

    query.find().then(function(results) {
      var promises = [];
      _.each(results, function(parseArtist) {
        // Start the find immediately and add its promise to the list.
        promises.push(this.findNewAlbumsForArtist(parseArtist));
      });
      // Return a new promise that is resolved when all of the deletes are finished.
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