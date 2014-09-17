'use strict';

var background = require('cloud/background.js'),
  config = require('cloud/config.js'),
  triggers = require('cloud/triggers.js');

// init with config
background(config);
triggers(config);
