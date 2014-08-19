'use strict';

// Return hello
exports.hello = function(req, res) {
  console.log(req.params);
  res.success("Hello world!");
};
