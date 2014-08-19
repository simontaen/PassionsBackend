'use strict';

module.exports = function(config) {

  // API version
  var api = config.api;

  // Resource handlers
  var artists = require('cloud/' + api + '/artists.js');

  // 'artists' resource
  var artistsResource = config.apiDelim + 'artists';

  Parse.Cloud.define(api + artistsResource, artists.handleArtists);

  // app.post(api + artistsResource, artists.add); // post on missing, post on existing
  // app.get(api + artistsResource + '/:id', artists.findById); // find existing, find missing
  // app.put(api + artistsResource + '/:id', artists.updateById); // update existing, update missing
  // app.delete(api + artistsResource + '/:id', artists.deleteById); // delete existing, delete missing

  // API ping
  Parse.Cloud.define(api, function(req, res) {
    res.success(config.app.name + ' API ' + api + ' is running');
  });
};