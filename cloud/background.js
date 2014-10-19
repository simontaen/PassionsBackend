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

// find newest album in array of parseAlbum
// then(parseArtist), error(parseArtist, error)
function findNewestAlbum(parseAlbums) {
  var newestAlbum, newestAlbumUTC = defaultUTC;

  _.each(parseAlbums, function(parseAlbum) {
    var utc = parseAlbum.get("utc");

    if (!utc) {
      utc = normalizeDate(parseAlbum.get("releaseDate"));
      parseAlbum.set("utc", utc);
      parseAlbum.save();
    }

    // cache if newer
    if (utc > newestAlbumUTC) {
      newestAlbum = parseAlbum;
      newestAlbumUTC = utc;
    }
  });

  return newestAlbum;
}

// Checks for new albums (via total albums)
// Fetches all albums if new available
// Sends push notification for newest one
// then(parseArtist),
// error(httpResponse), error(parseAlbum, error), error(parseArtist, error)
function findNewAlbumsForArtist(parseArtist, status) {
  var totalAlbums = parseArtist.get("totalAlbums");

  // for each artist, query for ONE album to update totalAlbums
  return spotify.fetchTotalAlbumsOfArtist(parseArtist).then(function(parseArtist) {
    // compare the total number of albums
    var newTotalAlbums = parseArtist.get("totalAlbums"),
     diffAlbums = newTotalAlbums - totalAlbums, msg;
    
    if (diffAlbums > 0) {
      msg = "Processing " + newTotalAlbums + " Albums for Artist " + parseArtist.get("name") + ", has " + diffAlbums + " new.";
      status.message(msg);
      console.log(msg);
      // fetch full album details (I need the release date to find the newest)
      return spotify.fetchAllAlbumsForArtist(parseArtist, true);
    }
    // nothing to do (we could have less albums, but when does that happen?)
    return Parse.Promise.as();

  }).then(function(parseArtist, parseAlbums) {
    // There could be more than one new Album, but that would be coding for an exception
    if (parseArtist && totalAlbums != parseArtist.get("totalAlbums")) {
      // all albums are set
      // You could check to see if it's recent

      var newestParseAlbum = findNewestAlbum(parseAlbums),
        userQuery = new Parse.Query(Parse.User),
        pushQuery = new Parse.Query(Parse.Installation),
        newestAlbumName = newestParseAlbum.get("name"),
        artistName = parseArtist.get("name");

      console.log("Newest Album " + newestAlbumName + " for Artist " + artistName + " (" + parseArtist.id + ")");

      userQuery.equalTo('favArtists', parseArtist.id);
      userQuery.find().then(function(parseUsers) {
        var usersInstallationIds = [],
        pushMsg = "New Album " + newestAlbumName + " by " + artistName + "!";
        
        _.each(parseUsers, function(parseUser) {
          usersInstallationIds.push(parseUser.get("installation"));
        });
        pushQuery.containedIn('objectId', usersInstallationIds);

        pushQuery.equalTo('channels', 'allFavArtists');

        Parse.Push.send({
          where: pushQuery,
          data: {
            alert: pushMsg,
            a: newestParseAlbum.id
          }
        }).then(function() {
          console.log("Push successful: " + pushMsg);
          
        }, function(error) {
          errorHandler("Push failed: " + pushMsg, status, error);

        });

      });

      // save artist and return ("totalAlbums" have changed)
      return parseArtist.save();
    }
    // nothing to do
    return Parse.Promise.as(parseArtist);
  });
}

// do error handling
function errorHandler(caller, status, errorOrObject, errorOrUndefined) {
  var error = errorOrUndefined || errorOrObject,
    msg = error;

  if (error) {
    // inspect the error for more info
    if (error.message) {
      msg = error.message + " (" + error.code + ")";
    } else if (error.text) {
      msg = error.text;
    } // what else could error be?
  }
  msg = "ERROR: " + caller + ": " + msg;

  console.error(msg);
  alert(msg);
  if (status) {
    status.error(msg);
  }
}

function sendRefreshPushForInstallId(installId) {
  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.equalTo('objectId', installId);
  pushQuery.equalTo('channels', 'global');

  console.log("Sending push to InstallationId=" + installId);

  Parse.Push.send({
    where: pushQuery,
    data: {
      alert: "Finished processing",
      far: true
    }
  }).then(function() {
    console.log("Push successful: InstallationId=" + installId);

  }, function(error) {
    errorHandler("Push failed: InstallationId=" + installId, undefined, error);

  });
}

module.exports = function( /* config */ ) {
  // 15 minute timeout

  Parse.Cloud.job("findNewAlbums", function(req, status) {
    // https://parse.com/docs/cloud_code_guide#jobs
    var query = new Parse.Query("Artist");
    // Data provider id must exists
    query.exists("spotifyId");
    // Artist should have totalAlbums (aka fetchFullAlbums did run)
    query.exists("totalAlbums");

    query.find().then(function(results) {
      var promises = [];
      status.message("Processing " + _.size(results) + " Artists");

      _.each(results, function(parseArtist) {
        promises.push(findNewAlbumsForArtist(parseArtist, status));
      });
      return Parse.Promise.when(promises);

    }).then(function() {
      // all artists are processed
      status.success("findNewAlbums completed successfully");

    }, function(errorOrObject, errorOrUndefined) {
      errorHandler("findNewAlbums", status, errorOrObject, errorOrUndefined);

    });
  });

  Parse.Cloud.job("fetchFullAlbums", function(req, status) {
    // if (!fetchFullAlbumsRunning) {
    if (fetchFullAlbumsRunning) {
      alert("fetchFullAlbumsRunning " + fetchFullAlbumsRunning);
    } else {
      console.log("fetchFullAlbumsRunning " + fetchFullAlbumsRunning);
    }
    fetchFullAlbumsRunning = true;

    var query = new Parse.Query("Artist");
    // Data provider id must exists
    query.exists("spotifyId");
    // this is only executed initially when the artists has just been created
    query.equalTo("totalAlbums", undefined);

    query.find().then(function(results) {
      var promises = [];
      status.message("Processing " + _.size(results) + " Artists");

      _.each(results, function(parseArtist) {
        console.log("INFO: fetchFullAlbums for Artist " + parseArtist.get("name") + " (" + parseArtist.id + ")");
        promises.push(
        // fetch full album details (I need the release date in the CollectionView for sorting)
        spotify.fetchAllAlbumsForArtist(parseArtist, true).then(function(parseArtist) {
          return parseArtist.save();
        }));
      });
      return Parse.Promise.when(promises);

    }).then(function() {
      // all artists are processed
      fetchFullAlbumsRunning = false;

      // send a push to inform the client
      // you might need to track an array of interested installIds,
      // if you run into problems with parallel execution
      if (!!req.params.i) {
        sendRefreshPushForInstallId(req.params.i);
      }
      
      // close the task
      status.success("fetchFullAlbums completed successfully");
      
    }, function(errorOrObject, errorOrUndefined) {
      fetchFullAlbumsRunning = false;
      errorHandler("fetchFullAlbums", status, errorOrObject, errorOrUndefined);

    });
    // }
    // status.error("ERROR: fetchFullAlbums: Job already running");

  });

};