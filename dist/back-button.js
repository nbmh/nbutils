
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.backbutton', [])
  .directive('nbBackButton', ['$rootScope', '$state', function($rootScope, $state) {
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
          $rootScope.$on('$stateChangeSuccess', function() {
            setTimeout(function() {
              if (!state) {
                $element.addClass('ng-hide');
              }
            }, 10);
          });
          $rootScope.$on('$stateChangeStart', function() {
            state = null;
            params = {};
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
