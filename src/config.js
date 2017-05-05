/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.config', [])
  .provider('$config', [function() {
    var provider = this,
    config = null,
    hidden = ['each', 'keys', 'values', 'has'];
    
    function parseData(data) {
      if (angular.isObject(data) && !angular.isArray(data)) {
          data.each = function(callback) {
            angular.forEach(this, function(item, key) {
              if (hidden.indexOf(key) == -1) {
                callback(item, key);
              }
            });
            return this;
          };
          data.keys = function() {
            var k = [];
            angular.forEach(this, function(item, key) {
              if (hidden.indexOf(key) == -1) {
                k.push(key);
              }
            });
            return k;
          };
          data.values = function() {
            var v = [];
            angular.forEach(this, function(item, key) {
              if (hidden.indexOf(key) == -1) {
                v.push(item);
              }
            });
            return v;
          };
          data.has = function(name) {
            return this.keys().indexOf(name) > -1;
          };
          angular.forEach(data, function(item, key) {
            data[key] = parseData(item);
          });
      }
      return data;
    };
    
    provider.set = function(value) {
      config = parseData(value);
    };
    
    provider.get = function() {
      return config;
    };
    
    provider.$get = [function() {
      return config;
    }];
  }]);
})(angular);
