
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.backbutton', [
    'ui.router'
  ])
  .directive('nbBackButton', ['$rootScope', '$state', '$transitions', function($rootScope, $state, $transitions) {
    return {
      restrict: 'EA',
      transclude: true,
      scope: {
        state: '@',
        params: '='
      },
      link: function($scope, $element, $attr, ctrl, transclude) {
        $element.addClass('nb-back-button').addClass('ng-hide');
        
        var state = null,
        params = {};
        
        transclude($scope, function(transEl) {
          $element.prepend(transEl);
        });
        
        if ($scope.state) {
          $rootScope.$emit('$nb.backbutton', $scope.state, $scope.params);
        } else {
          $scope.$back = function() {
            $rootScope.$emit('$nb.backbutton', null);
            $state.go(state, params);
          };
          $rootScope.$on('$nb.backbutton', function(e, s, p) {
            if (s) {
              state = s;
              params = p || {};
              $element.removeClass('ng-hide');
            }
          });
          $transitions.onStart({}, function() {
            state = null;
            params = {};
          });
          $transitions.onSuccess({}, function() {
            setTimeout(function() {
              if (!state) {
                $element.addClass('ng-hide');
              }
            }, 10);
          });
          
          setTimeout(function() {
            if (!state || state == null) {
              $element.addClass('ng-hide');
            }
          }, 10);
        }
      }
    };
  }]);
})(angular);
