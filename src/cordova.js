/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.cordova', [])
  .directive('ifCordova', ['ngIfDirective', '$cordova', function(ngIfDirective, $cordova) {
    var ngIf = ngIfDirective[0];
    return {
      transclude: ngIf.transclude,
      priority: ngIf.priority,
      terminal: ngIf.terminal,
      restrict: ngIf.restrict,
      link: function ($scope, $element, $attr, ctrl, $transclude) {
        $attr.ngIf = function () {
          return $cordova.exists();
        };
        ngIf.link.call(ngIf, $scope, $element, $attr, ctrl, $transclude);
      }
    };
  }])
  .directive('showCordova', ['$cordova', function($cordova) {
    return {
      restrict: 'A',
      link: function ($scope, $element) {
        if ($cordova.exists()) {
          $element.removeClass('ng-hide');
        } else {
          $element.addClass('ng-hide');
        }
      }
    };
  }])
  .directive('hideCordova', ['$cordova', function($cordova) {
    return {
      restrict: 'A',
      link: function ($scope, $element) {
        if ($cordova.exists()) {
          $element.addClass('ng-hide');
        } else {
          $element.removeClass('ng-hide');
        }
      }
    };
  }])
  .provider('$cordova', [function() {
    var provider = this;
    
    provider.$get = [function() {
      var service = function() {
        return service.exists() ? window['cordova'] : null;
      };
      
      service.exists = function() {
        return window['cordova'] != undefined;
      };
      
      service.is = function() {
        return service.exists();
      };
      
      return service;
    }];
  }])
  .provider('$plugins', [function() {
    var provider = this;
    
    provider.$get = ['$cordova', function($cordova) {
      var service = function(name) {
        if (name && name != '') {
          return service.get(name);
        }
        return service.cordova() ? $cordova().plugins : null;
      };
      
      service.cordova = function() {
        return $cordova.exists() && $cordova().plugins;
      };
      
      service.exists = function(name) {
        return service.cordova() && $cordova().plugins[name] != undefined;
      };
      
      service.get = function(name) {
        return service.exists(name) ? $cordova().plugins[name] : null;
      };
      
      return service;
    }];
  }]);
})(angular);
