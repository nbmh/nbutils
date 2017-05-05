
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.fetch', [
    'pascalprecht.translate'
  ])
  .provider('$fetchLocale', [function() {
    var provider = this,
    languageHeader = 'X-Locale-Code';
    
    provider.setHeader = function(value) {
      languageHeader = value;
      return provider;
    };
    
    provider.$get = ['$http', '$translate', function($http, $translate) {
      var service = function(config) {
        if (config) {
          if (!config.headers) {
            config.headers = {};
          }
        } else {
          config = {
            headers: {}
          };
        }
        config.headers[languageHeader] = $translate.use();
        return $http(config);
      },
      addHeader = function(config) {
        var c = {
          headers: {}
        };
        c.headers[languageHeader] = $translate.use();
        return angular.merge({}, config, c);
      },
      http = angular.copy($http, service);
      http.get = function(url, config) {
        return $http.get(url, addHeader(config));
      };
      http.head = function(url, config) {
        return $http.head(url, addHeader(config));
      };
      http.post = function(url, data, config) {
        return $http.post(url, data, addHeader(config));
      };
      http.put = function(url, data, config) {
        return $http.put(url, data, addHeader(config));
      };
      http.delete = function(url, config) {
        return $http.delete(url, addHeader(config));
      };
      http.jsonp = function(url, config) {
        return $http.jsonp(url, addHeader(config));
      };
      http.patch = function(url, data, config) {
        return $http.patch(url, data, addHeader(config));
      };
      return http;
    }];
  }])
  .provider('$fetchHost', [function() {
    var provider = this,
    hostUrl = '';
    
    provider.setUrl = function(value) {
      hostUrl = value;
      return provider;
    };
    
    provider.$get = ['$fetchLocale', function($http) {
      var service = function(config) {
        if (config && config.url && config.url != '') {
          config.url = hostUrl + config.url;
        }
        return $http(config);
      },
      http = angular.copy($http, service);
      http.get = function(url, config) {
        return $http.get(hostUrl + url, config);
      };
      http.head = function(url, config) {
        return $http.head(hostUrl + url, config);
      };
      http.post = function(url, data, config) {
        return $http.post(hostUrl + url, data, config);
      };
      http.put = function(url, data, config) {
        return $http.put(hostUrl + url, data, config);
      };
      http.delete = function(url, config) {
        return $http.delete(hostUrl + url, config);
      };
      http.jsonp = function(url, config) {
        return $http.jsonp(hostUrl + url, config);
      };
      http.patch = function(url, data, config) {
        return $http.patch(hostUrl + url, data, config);
      };
      return http;
    }];
  }]);
})(angular);
