'use strict';

var background = require('cloud/background.js'),
  config = require('cloud/config.js'),
  lfm = require('cloud/lastFm.js'),
  spotify = require('cloud/spotify.js'),
  //routes = require('cloud/routes.js');
  triggers = require('cloud/triggers.js');

// init with config and lfm
//routes(config, lfm);
background(config, lfm, spotify);
triggers(config, lfm, spotify);
