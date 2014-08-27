'use strict';

(function() {
  
  var _url = "https://api.spotify.com/v1/"

  function wrappedHttpRequest(method, endpoint, params, success, failure) {
    var myUrl = endpoint ? _url + endpoint + "/" : _url;
    if (!params.limit) {
      params.limit = "50";
    }
    
    
    //params.api_key = "aed3367b0133ab707cb4e5b6b04da3e7";
    //params.format = "json";
    //params.autocorrect = "1";
    //params.User_Agent = "Passions";
    //params.Accept = "application/json";
    

    return Parse.Cloud.httpRequest({
      method: method,
      url: _url + endpoint + "/" + ,
      body: params,
    }).then(function(httpResponse) {
      if (success) {
        success(httpResponse);
      }
    }, function(httpResponse) {
      if (failure) {
        failure(httpResponse);
      }
    });
    
  };

  module.exports = {

    // requires id
    findAlbumsForArtist: function(id, params, success, failure) {
      var endpoint = "artists/" + id + "/albums";
      params.album_type = "single";
      console.log("Calling " + endpoint);
      return wrappedHttpRequest("GET", endpoint, params, success, failure);
    }
    
    // requires params.q
    serachForArtist: function(params, success, failure) {
      var endpoint = "search";
      params.type = "artist";
      params.limit = "1";
      console.log("Calling " + endpoint + " " + params.query);
      return wrappedHttpRequest("GET", endpoint, params, success, failure);
    }
    
  }
})();