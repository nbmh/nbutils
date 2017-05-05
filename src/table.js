
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.table', [])
  .directive('nbTable', [function() {
    return {
      restrict: 'A',
      link: function($scope, $element) {
        $element.addClass('nb-table');
      }
    };
  }])
  .directive('nbTableStriped', [function() {
    return {
      restrict: 'A',
      link: function($scope, $element) {
        $element.addClass('nb-table').addClass('nb-table-striped');
      }
    };
  }])
  .directive('nbTableHover', [function() {
    return {
      restrict: 'A',
      link: function($scope, $element) {
        $element.addClass('nb-table').addClass('nb-table-hover');
      }
    };
  }])
  .directive('nbTableCell', [function() {
    return {
      restrict: 'EA',
      link: function($scope, $element) {
        $element.addClass('nb-table-cell');
      }
    };
  }]);
})(angular);
