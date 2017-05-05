
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.toast', [])
  .provider('$nbToast', [function() {
    var provider = this,
    options = {
      hideDelay: 4000,
      position: 'bottom right'
    },
    parseText = function(value) {
      var text = [];
      if (angular.isObject(value)) {
        if (angular.isArray(value)) {
          angular.forEach(value, function (line) {
            text.push(line);
          });
        } else {
          angular.forEach(value, function (m) {
            angular.forEach(m, function (line) {
              text.push(line);
            });
          });
        }
      } else {
        text.push(value);
      }
      return '{{\'' + text.join('\'|translate}}<br />{{\'') + '\'|translate}}';
    };
    
    provider.setOptions = function(value) {
      options = angular.merge(options, value || {});
    };
    
    provider.$get = ['$mdToast', function($mdToast) {
      var service = {},
      mdToast = angular.copy($mdToast, service);
      
      mdToast.info = function(value, opt) {
        var localOptions = angular.copy(options);
        localOptions = angular.merge(localOptions, opt || {});
        
        localOptions.controller = 'nbToastController';
        localOptions.template = '<md-toast class="multiline">' +
          '<div class="md-toast-text">' +
          parseText(value) + 
          '</div>' + 
          '</md-toast>';
          
        localOptions.locals = {
          actions: {}
        };
          
        return $mdToast.show(localOptions);
      };

      mdToast.alert = function(value, opt) {
        var localOptions = angular.copy(options);
        localOptions = angular.merge(localOptions, opt || {});
        
        var highlight = false;
        if (localOptions && localOptions.highlight != undefined) {
          highlight = localOptions.highlight === true;
          delete localOptions.highlight;
        }
        
        localOptions.controller = 'nbToastController';
        localOptions.template = '<md-toast class="multiline">' +
          '<div class="md-toast-text">' +
          parseText(value) + 
          '</div>' +
          '<md-button' + (highlight ? ' class="md-highlight"' : '') + ' ng-click="actions.hide()">' + 
          '{{\'client.action.close\'|translate}}' + 
          '</md-button>' + 
          '</md-toast>';
        
        localOptions.locals = {
          actions: {}
        };
        
        return $mdToast.show(localOptions);
      };
      
      mdToast.show = mdToast.alert;

      mdToast.confirm = function(value, opt) {
        var localOptions = angular.copy(options);
        localOptions = angular.merge(localOptions, opt && opt.options ? opt.options : {});
        
        localOptions.controller = 'nbToastController';
        localOptions.template = '<md-toast class="multiline">' +
          '<div class="md-toast-text">' +
          parseText(value) + 
          '</div>';
        
        var actions = {};
        
        if (opt) {
          angular.forEach(opt, function(button, label) {
            var buttonConfig = button(mdToast);
            if (buttonConfig) {
              var id = Math.round(Math.random() * 1000) + '-' + Math.round(Math.random() * 1000);
              actions[id] = buttonConfig.action;
              localOptions.template += '<md-button' + (buttonConfig.highlight === true ? ' class="md-highlight"' : '') + ' ng-click="actions.action($event, \'' + id + '\')">' + 
                '{{\'' + label + '\'|translate}}' + 
                '</md-button>';
              }
          });
        }
        
        localOptions.locals = {
          actions: actions
        };
        
        localOptions.template += '</md-toast>';
          
        return $mdToast.show(localOptions);
      };

      return mdToast;
    }];
  }])
  .controller('nbToastController', ['$scope', '$nbToast', 'actions', function($scope, $nbToast, actions) {
    $scope.actions = {
      hide: function() {
        $nbToast.hide();
      },
      action: function(e, id) {
        actions[id].call(null, e.currentTarget);
      }
    };
  }]);
})(angular);
