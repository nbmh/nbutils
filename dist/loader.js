/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.loader', [
    'ngMaterial'
  ]).directive('nbLoader', ['$rootScope', '$timeout', '$injector', function($rootScope, $timeout, $injector) {
    return {
      restrict: 'E',
      template: '<md-backdrop class="md-dialog-backdrop md-opaque" ng-if="data.visible>0"></md-backdrop>' + 
      '<div ng-if="data.visible>0">' +
      '<md-whiteframe class="md-whiteframe-2dp" ng-if="data.label" layout="row" layout-align="center center">' + 
      '<md-progress-circular md-mode="indeterminate"></md-progress-circular>' + 
      '{{data.label}}' + 
      '</md-whiteframe>' + 
      '<div ng-if="!(data.label)">' + 
      '<md-progress-circular md-mode="indeterminate"></md-progress-circular>' + 
      '<div>' + 
      '</div>',
      scope: {},
      link: function($scope) {
        $scope.data = {
          visible: 0,
          label: null
        };
        var $translate = null;
        
        try {
          $translate = $injector.get('$translate');
        } catch (ex) {
          
        }
        
        $rootScope.$on('$nbloader.show', function(e, data) {
          $scope.data.visible = $scope.data.visible + 1;
          
          if ($translate) {
            $translate(data.label).then(function(translation) {
              $scope.data.label = translation;
            }, function(code) {
              $scope.data.label = code;
            });
          } else {
            $scope.data.label = data.label;
          }
          
          $timeout(function() {
            $scope.$apply();
          });
        });
        $rootScope.$on('$nbloader.hide', function(e) {
          var visible = $scope.data.visible * 1;
          visible--;
          if (visible < 0) {
            visible = 0;
          }
          $scope.data.visible = visible;
          if (visible == 0) {
            $scope.data.label = null;
          }
          $timeout(function() {
            $scope.$apply();
          });
        });
      }
    };
  }])
  .provider('$nbLoader', [function() {
    var provider = this;
    
    provider.$get = ['$rootScope', function($rootScope) {
      var service = function() {
        
      };
      
      service.show = function(value) {
        $rootScope.$emit('$nbloader.show', {label: value});
      };
      
      service.hide = function() {
        $rootScope.$emit('$nbloader.hide');
      };
      
      return service;
    }];
  }]);
})(angular);
