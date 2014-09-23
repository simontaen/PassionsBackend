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
	appId: 'nCQQ7cw92dCJJoH1cwbEv5ZBFmsEyFgSlVfmljp9',
	masterKey: '5iM8ff4mv3rHgq7iXQQEFgVXldqDHZOegM36qcyx'
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