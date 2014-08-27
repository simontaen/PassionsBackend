'use strict';

var background = require('cloud/background.js'),
  config = require('cloud/config.js'),
  //routes = require('cloud/routes.js');
  triggers = require('cloud/triggers.js');

// init with config
//routes(config);
background(config);
triggers(config);
