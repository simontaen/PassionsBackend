'use strict';

var _ = require("underscore");

module.exports = function(config, lfm) {
// 15 minute timeout

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    // Query for all artists
    var query = new Parse.Query("Artist");
    // Artist should be favorited by some users
    query.exists("favByUsers")
    
    query.each(function(artist) {
      // for each artist, query lfm to query new albums
      
      lfm.findAlbumsForArtist({
        artist: artist.name
      }, function(httpResponse) {
        processAlbums(httpResponse.data.topalbums.album, req.object);
        // cleanup name, this creates a duplicate entry for every falsely names artist
        // req.object.set("name", httpResponse.data.topalbums["@attr"].artist);
        
        res.success();
      }, function(httpResponse) {
        console.log(httpResponse.text);
        res.error("LFM call findAlbumsForArtist failed");
      });

      
      
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