'use strict';

var _ = require("underscore"),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js');

module.exports = function(config) {
  // 15 minute timeout

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    var counter = 0, //
      // Artist should be favorited by some users
      query = (new Parse.Query("Artist")).exists("favByUsers");

    query.each(function(parseArtist) {
      var totalAlbums = parseArtist.get("totalAlbums");

      // for each artist, query for ONE album to update totalAlbums
      spotify.updateTotalAlbumsOfArtist(parseArtist,

      function(error) {
        if (error) {
          status.error(error);
        }
        // get updated value
        var newTotalAlbums = httpResponse.data.total;

        // compare the total number of albums
        if (totalAlbums != newTotalAlbums) {

          // query for all albums if changed
          spotify.fetchAllAlbumsForArtist(parseArtist,

          function(error) {
            if (error) {
              return status.error(error);
            }
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
          });
        } else {
          if (counter % 10 === 0) {
            // Set the  job's progress status
            status.message(counter + " artists have no new albums.");
          }
          counter += 1;
          return parseArtist.save();
        }
      });


      // return a promise;
    }).then(function() {
      // promise of each
      // Set the job's success status
      status.success("findNewAlbums completed successfully");

    }, function(error) {
      // Set the job's error status
      status.error(error);

    });
  });

};