'use strict';

function wrappedHttpRequest(url, params, authenticateRequest) {
  authenticateRequest = authenticateRequest || false;
  if (authenticateRequest) {
    params.access_token = _accessToken;
  } else {
    params.client_id = _clientID;
  }
  return Parse.Cloud.httpRequest({
    url: url,
    params: params
  });
};


module.exports = function(domain, key) {

  var url = 'api.mailgun.net/v2';

  /**
   * Send an email using Mailgun.
   * @param {Object} params A hash of the paramaters to be passed to
   *      the Mailgun API. They are passed as-is, so you should
   *      consult Mailgun's documentation to ensure they are valid.
   * @param {Object} options A hash with the success and error callback
   *      functions under the keys 'success' and 'error' respectively.
   * @return {Parse.Promise}
   */
  sendEmail: function(params, options) {
    return Parse.Cloud.httpRequest({
      method: "POST",
      url: "https://api:" + key + "@" + url + "/" + domain + "/messages",
      body: params,
    }).then(function(httpResponse) {
      if (options && options.success) {
        options.success(httpResponse);
      }
    }, function(httpResponse) {
      if (options && options.error) {
        options.error(httpResponse);
      }
    });
  }

};