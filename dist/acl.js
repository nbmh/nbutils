/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.acl', [
    'nb.auth'
  ])
  .directive('nbAclIfAllowed', ['ngIfDirective', '$acl', function(ngIfDirective, $acl) {
    var ngIf = ngIfDirective[0];
    return {
      transclude: ngIf.transclude,
      priority: ngIf.priority,
      terminal: ngIf.terminal,
      restrict: ngIf.restrict,
      link: function ($scope, $element, $attr, ctrl, $transclude) {
        $attr.ngIf = function () {
          return $acl.isAllowed($attr.nbAclIfAllowed);
        };
        ngIf.link.call(ngIf, $scope, $element, $attr, ctrl, $transclude);
      }
    };
  }])
  .directive('nbAclShowAllowed', ['$acl', '$rootScope', function($acl, $rootScope) {
    return {
      restrict: 'A',
      link: function ($scope, $element, $attr) {
        if ($acl.isAllowed($attr.nbAclShowAllowed)) {
          $element.removeClass('acl-hide');
        } else {
          $element.addClass('acl-hide');
        }
        $rootScope.$on('$acl.update.rights', function() {
          if ($acl.isAllowed($attr.nbAclShowAllowed)) {
            $element.removeClass('acl-hide');
          } else {
            $element.addClass('acl-hide');
          }
        });
        $rootScope.$on('$acl.update.groups', function() {
          if ($acl.isAllowed($attr.nbAclShowAllowed)) {
            $element.removeClass('acl-hide');
          } else {
            $element.addClass('acl-hide');
          }
        });
      }
    };
  }])
  .directive('nbAclIfGroup', ['ngIfDirective', '$acl', function(ngIfDirective, $acl) {
    var ngIf = ngIfDirective[0];
    return {
      transclude: ngIf.transclude,
      priority: ngIf.priority,
      terminal: ngIf.terminal,
      restrict: ngIf.restrict,
      link: function ($scope, $element, $attr, ctrl, $transclude) {
        $attr.ngIf = function () {
          return $acl.isGroup($attr.nbAclIfGroup);
        };
        ngIf.link.call(ngIf, $scope, $element, $attr, ctrl, $transclude);
      }
    };
  }])
  .directive('nbAclShowGroup', ['$acl', '$rootScope', function($acl, $rootScope) {
    return {
      restrict: 'A',
      link: function ($scope, $element, $attr) {
        if ($acl.isGroup($attr.nbAclShowGroup)) {
          $element.removeClass('acl-hide');
        } else {
          $element.addClass('acl-hide');
        }
        $rootScope.$on('$acl.update.groups', function() {
          if ($acl.isGroup($attr.nbAclShowGroup)) {
            $element.removeClass('acl-hide');
          } else {
            $element.addClass('acl-hide');
          }
        });
      }
    };
  }])
  .provider('$acl', [function() {
    var provider = this,
    _groups = [],
    _rights = [],
    service;
    
    provider.setRights = function(value) {
      _rights = value || [];
    };
      
    provider.setGroups = function(value) {
      _groups = value || [];
    };
    
    provider.$get = [
      '$rootScope', '$state', '$auth', '$transitions', 
    function($rootScope, $state, $auth, $transitions) {
      
      service = function(value) {
        if (value) {
          return service.isAllowed(value);
        }
        return service.rights();
      };
      
      service.isAllowed = function(rights) {
        var source = service.rights(),
        rightsList = [];
        
        if (angular.isArray(rights)) {
          rightsList = rights;
        } else if (angular.isString(rights)) {
          rightsList = rights.split('|');
        }
        
        var result = false;
        
        angular.forEach(rightsList, function(right) {
          if (!result && source.indexOf(right) > -1) {
            result = true;
          }
        });
        
        return result;
      };
      
      service.isGroup = function(groups) {
        var sourceGroups = service.groups(),
        groupsList = [],
        result = false;
        
        if (angular.isArray(groups)) {
          groupsList = groups;
        } else if (angular.isString(groups)) {
          groupsList = groups.split('|');
        }
        
        angular.forEach(groupsList, function(group) {
          if (!result) {
            var groupName = group, groupRights = [];
            
            if (group.indexOf(':') > -1) {
              groupName = group.substr(0, group.indexOf(':'));
              groupRights = group.substr(group.indexOf(':') + 1);
            }
            
            if (sourceGroups.indexOf(groupName) > -1) {
              if (groupRights.length) {
                result = service.isAllowed(groupRights.replace(/;/gi, '|').replace(/,/gi, '|'));
              } else {
                result = true;
              }
            }
          }
        });
        
        return result;
      };
      
      service.rights = function(value) {
        if (value && angular.isArray(value)) {
          _rights = value || [];
          $rootScope.$emit('$acl.update.rights', _rights);
        }
        return _rights || [];
      };
      
      service.groups = function(value) {
        if (value && angular.isArray(value)) {
          _groups = value || [];
          $rootScope.$emit('$acl.update.groups', _groups);
        }
        return _groups || [];
      };
      
      $transitions.onStart({}, function($transition$) {
        var state = $transition$.to();
        if (state.params.acl) {
          var acl = state.params.acl;
          if (angular.isString(state.params.acl)) {
            acl = state.params.acl.split('|');
          }
          if (acl.length) {
            if (!service.isAllowed(acl)) {
              $transition$.abort();
              var mainState = $auth.getStateMain();
              $state.go(mainState.name, mainState.params, mainState.options);
            }
          }
        }
      });
      
      return service;
    }];
  }]);
})(angular);
