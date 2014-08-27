'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

module.exports = function(config) {
  // 15 minute timeout

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    // Query for all artists
    var query = new Parse.Query("Artist");
    // Artist should be favorited by some users
    query.exists("favByUsers")

    query.each(function(artist) {
      // for each artist, query for ONE album
      // compare the total number of albums
      
      // query for all albums if changed
      
      // save all albums
      
      // find newest album, check release date -> must be recent
      
      // send push



      // Update to plan value passed in
      user.set("plan", req.params.plan);
      if (counter % 100 === 0) {
        // Set the  job's progress status
        status.message(counter + " users processed.");
      }

      counter += 1;
      return user.save();


    }).then(function() {
      // Set the job's success status
      status.success("Migration completed successfully.");

    }, function(error) {
      // Set the job's error status
      status.error("Uh oh, something went wrong.");

    });
  });

};