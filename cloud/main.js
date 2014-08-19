'use strict';

var config = require('cloud/config.js'),
  routes = require('cloud/routes.js');

// init routes with config
routes(config);

// burgerculture reads mondelPaths from filesystem, but I think we won't need this. (as the artist resources are loaded in routes.js)