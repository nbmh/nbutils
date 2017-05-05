/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.history', [])
  .provider('$history', [function() {
    var provider = this;
    
    provider.$get = ['$window', function($window) {
        var service = function() {
          
        };
        
        service.back = function() {
          $window.history.back();
        };
        
        service.forward = function() {
          $window.history.forward();
        };
        
        return service;
    }];
  }]);
})(angular);
