/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.listener', [])
  .provider('$listener', [function() {
    var provider = this,
    listen = function($scope) {
      var scope = this,
      events = [];
      
      scope.$on = function(eventName, callback, s) {
        events.push($scope.$on(eventName, callback));
        return scope;
      };
      
      scope.$clear = function() {
        angular.forEach(events, function(event) {
          event();
        });
        events = [];
        return scope;
      };
      
      $scope.$on('$destroy', function() {
        scope.$clear();
      });
    };
    
    provider.$get = [function() {
      return function($scope) {
        return new listen($scope);
      };
    }];
  }]);
})(angular);
