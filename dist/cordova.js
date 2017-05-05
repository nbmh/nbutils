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
          return $cordova();
        };
        ngIf.link.call(ngIf, $scope, $element, $attr, ctrl, $transclude);
      }
    };
  }])
  .directive('showCordova', ['$cordova', function($cordova) {
    return {
      restrict: 'A',
      link: function ($scope, $element) {
        if ($cordova()) {
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
        if ($cordova()) {
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
        return service.exists();
      };
      
      service.exists = function() {
        return true;//window['cordova'] != undefined;
      };
      
      service.is = function() {
        return service.exists();
      };
      
      return service;
    }];
  }]);
})(angular);
