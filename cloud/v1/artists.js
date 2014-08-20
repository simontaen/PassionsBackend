'use strict';

Parse.Cloud.beforeSave("Artist", function(req, res) {
  console.log("Saving " + req.object.get("name"))
  res.success();
});


// Handle 'artists' resource
exports.handleArtists = function(req, res) {

  // we always get POST through Parse.Cloud.define

  switch (req.params.method) {
  case "GET":
    getArtists(req, res);
    break;

  case "POST":
    postArtists(req, res);
    break;

  case "PUT":
    putArtists(req, res);
    break;

  case "DELETE":
    deleteArtists(req, res);
    break;

  default:
    console.log(req.params);
    res.error("Unknown method=" + req.params.method);
  }
};

// return fav artists
function getArtists(req, res) {
  res.success("Called " + req.params.method);
};

// read required artists from requests
// fetch infos about them on last fm
// save to Parse
// eventually send a Push notification back
function postArtists(req, res) {
  res.success("Called " + req.params.method);
};

// update ALL favorite artists (send a new array)
function putArtists(req, res) {
  res.success("Called " + req.params.method);
};

// delete specified/all favorite artists
function deleteArtists(req, res) {
  res.success("Called " + req.params.method);
};