'use strict';

var env = 'development'; // TODO: depend on what here?

var config = {
  development: {
	app: {
	  name: 'passions'
	},
	port: 3000,
	api: 'v1',
	apiDelim: '_',
	appId: 'nLPKoK0wdW9csg2mTwwPkiGEDBh4AlU3f6il9qqQ',
	masterKey: 'Mx6FjfJ4FYW6fi9Ra1G23AEcQuDgtm2xBH1yRhS7'
  },

  test: {
	app: {
	  name: 'passions'
	},
	port: 3000,
	api: 'v1',
	apiDelim: '_',
	appId: 'ymoWy7LcvcSg1tEGehR46hgLAEGP2mR3wyePOsQd',
	masterKey: '3ZYFrBWkSWjbxkN7korFuRp1JqvdPzroDzjFp2E5'
  },

  production: {
	app: {
	  name: 'passions'
	},
	port: 3000,
	api: 'v1',
	apiDelim: '_',
	appId: 'ymoWy7LcvcSg1tEGehR46hgLAEGP2mR3wyePOsQd',
	masterKey: '3ZYFrBWkSWjbxkN7korFuRp1JqvdPzroDzjFp2E5'
  }
};

module.exports = config[env];