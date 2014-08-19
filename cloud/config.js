'use strict';

var env = 'development'; // depend on what here?

var config = {
  development: {
	app: {
	  name: 'passions'
	},
	domain: 'localhost',
	port: 3000,
	api: 'v1',
	apiDelim: '_'
  },

  test: {
	app: {
	  name: 'passions'
	},
	domain: 'localhost',
	port: 3000,
	api: 'v1',
	apiDelim: '_'
  },

  production: {
	app: {
	  name: 'passions'
	},
	domain: 'burgercultu.re',
	port: 3000,
	api: 'v1',
	apiDelim: '_'
  }
};

module.exports = config[env];