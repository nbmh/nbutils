
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.backbutton', [
    'ui.router'
  ])
  .directive('nbBackButton', ['$rootScope', '$state', '$transitions', '$timeout', function($rootScope, $state, $transitions, $timeout) {
    return {
      restrict: 'EA',
      transclude: true,
      scope: {
        name: '@',
        state: '='
      },
      link: function($scope, $element, $attr, ctrl, transclude) {
        $element.addClass('nb-back-button').addClass('ng-hide');
        
        var main = false;
        
        transclude($scope, function(transEl) {
          $element.prepend(transEl);
        });
        
        if ($scope.name || $scope.state) {
          var eventGet = $rootScope.$on('$nb.backbutton.get', function() {
            $rootScope.$emit('$nb.backbutton.give', {name: $scope.name, state: $scope.state});
          });
          $rootScope.$emit('$nb.backbutton', null);
          
          $scope.$on('$destroy', function() {
            eventGet();
          });
        } else {
          $scope.$back = function() {
            $rootScope.$emit('$nb.backbutton.get');
          };
          var eventGive = $rootScope.$on('$nb.backbutton.give', function(e, data) {
            if (data.state) {
              $state.go(data.state.state, data.state.params || {}, data.state.options || {});
            } else {
              $state.go(data.name);
            }
          });
          var event = $rootScope.$on('$nb.backbutton', function() {
            main = true;
            $element.removeClass('ng-hide');
          });
          $scope.$on('$destroy', function() {
            eventGive();
            event();
          });
          $transitions.onStart({}, function() {
            main = false;
          });
          $transitions.onSuccess({}, function() {
            $timeout(function() {
              if (!main) {
                $element.addClass('ng-hide');
              }
            }, 10);
          });
          
          setTimeout(function() {
            if (!main) {
              $element.addClass('ng-hide');
            }
          }, 10);
        }
      }
    };
  }]);
})(angular);
