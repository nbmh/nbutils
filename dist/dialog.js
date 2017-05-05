
/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.dialog', [])
  .provider('$nbDialog', [function() {
    var provider = this,
    options = {
      defaultAction: {
        label: 'Close',
        type: ''
      }
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
    
    provider.$get = ['$mdDialog', function($mdDialog) {
      var service = {},
      mdDialog = angular.copy($mdDialog, service);

      mdDialog.dialog = function(value, opt) {
        var localOptions = angular.copy(options);
        localOptions = angular.merge(localOptions, opt && opt.options ? opt.options : {});
        
        if (!localOptions.locals) {
          localOptions.locals = {};
        }
        if (!localOptions.locals.actions) {
          localOptions.locals.actions = {};
        }
        
        localOptions.controller = 'nbDialogController';
        localOptions.template = '<md-dialog>' +
        '<md-dialog-content class="md-dialog-content">';
        
        if (localOptions.title && localOptions.title != '') {
          localOptions.template += '<h2 class="md-title">{{\'' + localOptions.title + '\'|translate}}</h2>';
        }
        
        localOptions.template += parseText(value) + 
        '</md-dialog-content>';
        
        if (opt) {
          var actions = {},
          id = 0,
          actionsTpl = [],
          buttonConfig;
          angular.forEach(opt, function(button, label) {
            if (label == 'options' || typeof button != 'function') {
              return;
            }
            buttonConfig = button(mdDialog);
            if (buttonConfig) {
              id = Math.round(Math.random() * 1000) + '-' + Math.round(Math.random() * 1000);
              actions[id] = buttonConfig.action;
              actionsTpl.push('<md-button flex' + (buttonConfig.type && buttonConfig.type != '' ? ' class="' + buttonConfig.type + '"' : '') + ' ng-click="actions.action($event, \'' + id + '\')">' + 
              '{{\'' + label + '\'|translate}}' + 
              '</md-button>');
            }
          });
          localOptions.locals = {
            $actions: actions
          };
          
          if (!actionsTpl.length) {
            var id = Math.round(Math.random() * 1000) + '-' + Math.round(Math.random() * 1000);
            actions[id] = function() {
              $mdDialog.hide();
            };
            actionsTpl.push('<md-button flex' + (options.defaultAction.type && options.defaultAction.type != '' ? ' class="' + options.defaultAction.type + '"' : '') + ' ng-click="actions.action($event, \'' + id + '\')">' + 
              '{{\'' + options.defaultAction.label + '\'|translate}}' + 
              '</md-button>');
          }
          
          localOptions.template += '<md-dialog-actions layout="row" layout-align="center center">';
          localOptions.template += actionsTpl.join("\n");
          localOptions.template += '</md-dialog-actions>';
        }
        localOptions.template += '</md-dialog>';
        
        return $mdDialog.show(localOptions);
      };

      return mdDialog;
    }];
  }])
  .controller('nbDialogController', ['$scope', '$nbDialog', '$actions', function($scope, $nbDialog, $actions) {
    $scope.actions = {
      action: function(e, id) {
        $actions[id].call(null, e.currentTarget);
      }
    };
  }]);
})(angular);
