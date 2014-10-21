'use strict';
/* global Parse */

var _ = require("underscore"),
  spotify = require('cloud/spotify.js'),
  // we've seen (http://bendodson.com/code/itunes-artwork-finder/index.html)
  // that a few other resolutions are valid, try these
  artworkRes = ["600", "400", "200"];

(function() {

  var apiUrl = "https://itunes.apple.com/";

  // find the exact artist name matches in artist array
  function findExactMatches(items, searchArtistName) {
    var result = [];
    if (items) {
      _.each(items, function(item) {
        if (searchArtistName === item.artistName) {
          result.push(item);
        }
      });
    }
    return result;
  }

  // try to get the album record from parse
  // if not existent, create it. Update it with passed values
  // set artistId on the album
  // returns a promise with then(parseAlbum), error(parseAlbum, error)
  function createOrUpdateAlbum(album, parseArtist) {
    var query = new Parse.Query("Album");
    query.equalTo("iTunesId", album.collectionId);

    return query.first().then(function(parseAlbum) {
      var thisAlbum;

      if (parseAlbum) {
        thisAlbum = parseAlbum;
      } else {
        // create one
        thisAlbum = createAlbum(album, parseArtist);
      }

      if (updateAlbumValues(album, thisAlbum, parseArtist)) {
        return thisAlbum.save();
      }
      return Parse.Promise.as(thisAlbum);
    });
  }

  // returns unsaved new parseAlbum
  function createAlbum(album) {
    var Album = Parse.Object.extend("Album"),
      parseAlbum = new Album();
    parseAlbum.set("iTunesId", album.collectionId);
    return parseAlbum;
  }

  // true if values have been updated
  // does NOT save the parseAlbum
  function updateAlbumValues(album, parseAlbum, parseArtist) {
    // INFO: ALBUM VALUE UPDATES
    parseAlbum.set("artistId", parseArtist.id);
    parseAlbum.set("iTunesUrl", album.collectionViewUrl);
    parseAlbum.set("name", album.collectionName);
    parseAlbum.set("explicitness", album.explicitness);
    parseAlbum.set("trackCount", album.trackCount);
    parseAlbum.set("iTunesGenreName", album.primaryGenreName);
    parseAlbum.set("releaseDate", new Date(album.releaseDate));
    setImagesFromRecordOnParseObject(album, parseAlbum);
    return true;
  }

  // For the passed albums, store them on parse
  // returns a promise with
  // then(parseArtist, parseAlbums), error(httpResponse) or error(parseAlbum, error)
  function processAlbumInfo(albums, parseArtist) {
    var promises = [],
      parseAlbums = [];

    _.each(albums, function(album) {
      promises.push(
      // start immediatly
      createOrUpdateAlbum(album, parseArtist).then(function(parseAlbum) {
        // cache the new album and return successfully
        parseAlbums.push(parseAlbum);
        return Parse.Promise.as();
      }));
    });

    // Return a new promise that is resolved when all are finished
    return Parse.Promise.when(promises).then(function() {
      // set albums on artist (just overwrite)
      console.log("INFO: Processed " + parseAlbums.length + " Albums for Artist " + parseArtist.get("name"));
      return Parse.Promise.as(parseArtist, parseAlbums);
    });
  }

  // return a string intented for logging
  function getParamsForLog(params) {
    var result = "";
    if (params) {
      result += params.term ? " " + params.term : "";
      result += params.id ? " " + params.id : "";
    }
    return result;
  }

  /* ------------ Pure API calls ------------ */

  // returns a promise with then(httpResponse), error(httpResponse)
  function wrappedHttpRequest(myUrl, params, caller) {
    // if (caller != "iTunes.processAlbumInfo") {
    //   console.log("Calling " + myUrl + getParamsForLog(params) + " from " + caller);
    // }
    params.media = "music";
    return Parse.Cloud.httpRequest({
      url: myUrl,
      params: params
    }).then(function(httpResponse) {
      httpResponse.data = JSON.parse(httpResponse.text);
      return Parse.Promise.as(httpResponse);
    }).fail(function(httpResponse) {
      console.log((caller || myUrl) + " failed");
      console.log(httpResponse.text);
    });
  }

  // http://itunes.apple.com/lookup?id=122782&entity=album&limit=10&sort=recent
  // returns a promise with then(albums || undefined, albumsCount), error(httpResponse)
  function getAlbumsForArtist(artistId, params) {
    var endpoint = "lookup";
    params.id = artistId;
    params.entity = "album";
    params.sort = "recent";
    return wrappedHttpRequest(apiUrl + endpoint, params, "iTunes.getAlbumsForArtist").then(function(httpResponse) {
      var results = httpResponse.data.results,
        // remove artist record
        allAlbums = _.without(results, _.first(results)),
        allAlbumsCount = _.size(allAlbums),
        filteredAlbums = [],
        filteredAlbumsCount;

      // limit is 200 and no possibility to paginate
      if (allAlbumsCount > 197) {
        alert("WARN: Very close to API limit! Artist " + artistId + " has over 197 Albums");
      }

      // we do have instances where an album in the delivered list has
      // album.artistId != artist.artistId -> filter these!
      _.each(allAlbums, function(album) {
        if (album.artistId == artistId) {
          filteredAlbums.push(album);
        }
      });

      filteredAlbumsCount = _.size(filteredAlbums);

      if (filteredAlbumsCount > 0) {
        console.log("INFO: Valid Albums for Artist " + artistId + " " + filteredAlbumsCount + " out of " + allAlbumsCount);
        return Parse.Promise.as(filteredAlbums, filteredAlbumsCount);
      }

      console.log("WARN: " + filteredAlbumsCount + " Albums found for Artist " + artistId);
      return Parse.Promise.as(undefined, filteredAlbumsCount);
    });
  }

  // Substitutes the passed resolution in the url
  function replaceResolutionInUrl(url, resolution) {
    var pattern = /(\d{3}x\d{3})(-\d{2}.[A-Za-z]{3})/g;
    return url.replace(pattern, resolution + "x" + resolution + "$2");
  }

  // sets the image urls on the passed parseObj
  function setImagesFromRecordOnParseObject(album, parseObj) {
    var imgs = []; // big to small
    var url100 = album.artworkUrl100;

    _.each(artworkRes, function(res) {
      if (album["artworkUrl" + res]) {
        // first lets probe for higher res images in the record
        imgs.push(album["artworkUrl" + res]);
      } else if (url100) {
        // url100 serves as a basis for trying other resolutions
        imgs.push(replaceResolutionInUrl(url100, res));
      }
    });

    if (url100) {
      imgs.push(url100);
    }
    if (album.artworkUrl60) {
      imgs.push(album.artworkUrl60);
    }

    parseObj.set("images", imgs);
    return true;
  }

  module.exports = {

    /* As a rule I never save the artist here -> caller!
     * Only SET the API results on the parse objects
     */

    // Search iTunes, takes first result if no exact match is found
    // returns a promise with then(parseArtist, isExactMatch), error(httpResponse)
    fetchArtist: function(parseArtist) {
      var endpoint = "search",
        params = {
          // get the updated name
          term: parseArtist.get("name"),
          entity: "musicArtist",
          attribute: "artistTerm"
        };

      // https://www.apple.com/itunes/affiliates/resources/documentation/itunes-store-web-service-search-api.html
      return wrappedHttpRequest(apiUrl + endpoint, params, "iTunes.fetchArtist").then(function(httpResponse) {
        var artistName = parseArtist.get("name"),
          artistData,
          exactMatches = findExactMatches(httpResponse.data.results, artistName),
          exactMatchesCount = _.size(exactMatches);

        if (exactMatchesCount > 0) {
          // TODO: present a sheet to the user that he must choose the Artist
          exactMatchesCount > 1 && console.log("INFO (iTunes): Found " + exactMatchesCount + " exact matches for Artist " + artistName + " on iTunes.");

          // get the first of the exact matches even if too many
          // this is presumable the "best" match by the data provider
          artistData = _.first(exactMatches);

        } else {
          console.log("INFO (iTunes): No exact match found for Artist " + artistName + " out of " + _.size(httpResponse.data.results) + ".");
          // TODO: present a sheet to the user that we did not find the Artist
          // get the first of the delivered artists as a default
          artistData = _.first(httpResponse.data.results);
        }

        if (artistData) {
          // INFO: ARTIST VALUE UPDATES
          parseArtist.set("iTunesId", artistData.artistId);
          parseArtist.set("iTunesUrl", artistData.artistLinkUrl);
          parseArtist.set("amgId", artistData.amgArtistId);
          parseArtist.set("iTunesGenreName", artistData.primaryGenreName);
          parseArtist.set("iTunesGenreId", artistData.primaryGenreId);
          parseArtist.set("iTunesRadioUrl", artistData.radioStationUrl);
          // no images delivered for Artist
        }

        return Parse.Promise.as(parseArtist, exactMatchesCount == 1);
      });
    },

    // query for ALL albums of the artist
    // returns a promise with
    // then(parseArtist), error(httpResponse) or error(parseAlbum, error)
    fetchAllAlbumsForArtist: function(parseArtist) {
      // cache the results and call "next"
      function processor(albums, albumsCount) {
        // update totalAlbums (even if 0, undefined is processing for the device)
        parseArtist.set("totalAlbums", albumsCount);

        // only accept exact matches since false positives lead to a worse experience
        function spotifyHandler(obj, isExactMatch) {
          if (albumsCount > 0) {
            // set SOME (order not guaranteed here) Albums Artwork as the Artist Artwork
            !isExactMatch && setImagesFromRecordOnParseObject(_.first(albums), parseArtist);

            // we are done, all albums are known, store them in parse
            return processAlbumInfo(albums, parseArtist);

          } else {
            // Some Artists don't have Albums on iTunes, return
            return Parse.Promise.as(parseArtist);
          }
        }

        // We try to use the Spotify Artist Artwork
        return spotify.fetchArtist(parseArtist).then(spotifyHandler, spotifyHandler);
      }

      // initial call
      return getAlbumsForArtist(parseArtist.get("iTunesId"), {
        limit: 200
      }).then(processor);
    },

    // http://itunes.apple.com/lookup?id=5040714&entity=album&limit=1&sort=recent
    // fetches the latest album and creates it if new, else returns existing newest
    // returns a promise with then(parseArtist, newestParseAlbum, isNew), error(httpResponse)
    findNewestAlbum: function(parseArtist) {
      return getAlbumsForArtist(parseArtist.get("iTunesId"), {
        limit: 13
      }).then(function(albums, albumsCount) {

        if (albumsCount > 0) {
          // Go check if we have the newest
          var query = new Parse.Query("Album"),
            album = _.first(albums);
          query.equalTo("iTunesId", album.collectionId);

          return query.first().then(function(parseAlbum) {
            if (parseAlbum) {
              // Found existing Album
              return Parse.Promise.as(parseArtist, parseAlbum, false);
            }
            var newParseAlbum = createAlbum(album, parseArtist);
            updateAlbumValues(album, newParseAlbum, parseArtist);
            newParseAlbum.save();

            // New album found
            parseArtist.set("totalAlbums", parseArtist.get("totalAlbums") + 1);
            return Parse.Promise.as(parseArtist, newParseAlbum, true);
          });

        }
        // Some Artists don't have Albums on iTunes, return
        return Parse.Promise.as(parseArtist);
      });
    }

  };
})();