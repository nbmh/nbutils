
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.bottomsheet', [])
  .provider('$nbBottomSheet', [function() {
    var provider = this;
    
    provider.$get = ['$mdBottomSheet', '$templateCache', '$compile', function($mdBottomSheet, $templateCache, $compile) {
      var service = function() {
      },
      mdBottomSheet = angular.copy($mdBottomSheet, service);
      
      mdBottomSheet.show = function(opt) {
        var options = angular.extend({}, opt);
        
        if (!options.preserveScope) {
          options.preserveScope = true;
        }
        
        if (options.template && options.template != '') {
          var tpl = $templateCache.get(options.template);
          if (tpl) {
            options.template = tpl;
          }
        }
        
        return $mdBottomSheet.show(options);
      };
      
      return mdBottomSheet;
    }];
  }]);
})(angular);
