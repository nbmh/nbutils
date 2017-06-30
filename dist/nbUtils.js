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
    service;
    
    provider.$get = [
      '$rootScope', '$localStorage', '$state', '$auth', '$transitions', 
    function($rootScope, $storage, $state, $auth, $transitions) {
      
      if (!$storage.aclRights) {
        $storage.aclRights = [];
      }
      
      if (!$storage.aclGroups) {
        $storage.aclGroups = [];
      }
      
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
          $storage.aclRights = value || [];
          $rootScope.$emit('$acl.update.rights', $storage.aclRights);
        }
        return $storage.aclRights || [];
      };
      
      service.groups = function(value) {
        if (value && angular.isArray(value)) {
          $storage.aclGroups = value || [];
          $rootScope.$emit('$acl.update.groups', $storage.aclGroups);
        }
        return $storage.aclGroups || [];
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


/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.auth', [
    'ui.router',
    'ngStorage'
  ])
  .provider('$auth', ['$httpProvider', function($httpProvider) {
    var provider = this,
    expiration = 900,
    checkInterval = 10,
    authUrl = '',
    checkUrl = '',
    firstState = true,
    condition = null,
    status = {
      check: 401,
      expiration: 403
    },
    states = {
      auth: {
        name: '',
        params: {},
        options: {}
      },
      main: {
        name: '',
        params: {},
        options: {}
      },
      excluded: []
    },
    customHeaders = {},
    mapSource = angular.identity,
    checkRunning = false,
    headerName = 'X-Auth-Token',
    rememberName = 'X-Auth-Remember',
    captured = false;
    
    provider.setCondition = function(callback) {
      condition = callback;
      return provider;
    };
    
    provider.setMapSource = function(callback) {
      mapSource = callback;
      return provider;
    };
    
    provider.setStateAuth = function(name, params, options) {
      states.auth.name = name || '';
      states.auth.params = params || {};
      states.auth.options = options || {};
      return provider;
    };
    
    provider.setStateMain = function(name, params, options) {
      states.main.name = name || '';
      states.main.params = params || {};
      states.main.options = options || {};
      return provider;
    };
    
    provider.setExcluded = function(states) {
      states.excluded = states;
      return provider;
    };
    
    provider.addExcluded = function(state) {
      states.excluded.push(state);
      return provider;
    };
    
    provider.setAuthUrl = function(value) {
      authUrl = value;
      return provider;
    };
    
    provider.setCheckUrl = function(value) {
      checkUrl = value;
      return provider;
    };
    
    provider.setExpiration = function(value) {
      expiration = value;
      return provider;
    };
    
    provider.setStatusCheck = function(value) {
      status.check = value;
      return provider;
    };
    
    provider.setStatusExpiration = function(value) {
      status.expiration = value;
      return provider;
    };
    
    provider.setHeaderName = function(value) {
      headerName = value;
      return provider;
    };
    
    provider.setRememberName = function(value) {
      rememberName = value;
      return provider;
    };
    
    provider.addHeader = function(name, callback) {
      customHeaders[name] = callback;
    };
    
    var service;
    
    $httpProvider.interceptors.push(['$q', function($q) {
      return {
        request: function(request) {
          return service.handleRequest && request.url.indexOf(checkUrl) == -1 ? service.handleRequest(request) : request;
        },
        responseError: function(response) {
          return $q.reject(service.handleResponseError ? service.handleResponseError(response) : response);
        }
      };
    }]);
    
    provider.$get = [
      '$rootScope', '$rootElement', '$sessionStorage', '$localStorage', '$http', '$interval', '$q', '$state', '$transitions', 
    function($rootScope, $rootElement, $ss, $sl, $http, $interval, $q, $state, $transitions) {
      var callbacks = {
        loading: angular.noop,
        done: angular.noop
      },
      getStorage = function() {
        return $sl.authRemember === true ? $sl : $ss;
      },
      checkExpiration = function($transition$) {
        if (service.isAuthenticated() && !$sl.authRemember) {
          var nowAction = new Date().getTime(),
          timespan = Math.floor((nowAction - (getStorage().authLastAction || 0)) / 1000);
          if (service.isAuthenticated() && timespan >= expiration) {
            if ($transition$) {
              $transition$.abort();
            }
            $rootScope.$emit('$auth.expired', {
              lastAction: getStorage().authLastAction,
              timespan: timespan,
              data: angular.copy(getStorage().authData)
            });
            clear();
            return 0;
          } else {
            return nowAction;
          }
        }
        return 0;
      },
      clickEvent = function() {
        if (service.isAuthenticated() && !$sl.authRemember) {
          getStorage().authLastAction = new Date().getTime();
        }
      },
      triggerExpiration = function() {
        if (service.isAuthenticated() && !$sl.authRemember) {
          var nowAction = new Date().getTime(),
          timespan = Math.floor((nowAction - (getStorage().authLastAction || 0)) / 1000);
          $rootScope.$emit('$auth.expired', {
            lastAction: getStorage().authLastAction,
            timespan: timespan,
            data: angular.copy(getStorage().authData)
          });
          clear();
        }
      },
      checkUser = function($transition$) {
        if (checkUrl != '' && service.isAuthenticated()) {
          if (!checkRunning) {
            checkRunning = true;
            $http.get(checkUrl).then(function(response) {
              service.handleResponseError(response, $transition$);
            }, function(response) {
              service.handleResponseError(response, $transition$);
            }).finally(function() {
              checkRunning = false;
            });
          }
        }
      };
      
      if (!getStorage().authLastAction) {
        getStorage().authLastAction = new Date().getTime();
      }
      
      if (!$sl.authRemember) {
        $sl.authRemember = false;
      }
      
      service = function(data) {
        if (data && angular.isObjectType(data)) {
          service.update(data);
        }
        return service.data();
      };
      
      service.clone = function() {
        return angular.copy(service.data());
      };
      
      service.getStateAuth = function() {
        return states.auth;
      };

      service.getStateMain = function() {
        return states.main;
      };

      service.getExcluded = function() {
        return states.excluded;
      };
      service.handleRequest = function(request) {
        getStorage().authLastAction = new Date().getTime();
        return request;
      };
      service.handleResponseError = function(response, $transition$) {
        if ($transition$) {
          $transition$.abort();
        }
        if (response.status == status.check) {
          service.clear();
        } else if (response.status == status.expiration) {
          triggerExpiration();
        }
        return response;
      };
      service.setRemember = function(value) {
        $sl.authRemember = !!value;
        $httpProvider.defaults.headers.common[rememberName] = $sl.authRemember;
        return service;
      };
      service.getRemember = function() {
        return $sl.authRemember;
      };
      service.data = function() {
        return getStorage().authData;
      };
      service.isAuthenticated = function() {
        return getStorage().authAuthenticated === true;
      };
      service.loading = function(callback) {
        callbacks.loading = callback || angular.noop;
        return service;
      };
      service.done = function(callback) {
        callbacks.done = callback || angular.noop;
        return service;
      };
      service.isExpired = function() {
        var nowAction = new Date().getTime(),
        timespan = parseInt((nowAction - (getStorage().authLastAction || 0)) / 1000);
        return service.isAuthenticated() && !$sl.authRemember && (!getStorage().authData || timespan >= expiration);
      };
      service.update = function(data) {
        if (service.isAuthenticated()) {
          getStorage().authData = data;
          $rootScope.$emit('$auth.update', getStorage().authData);
        }
        return service;
      };
      service.quick = function(response) {
        var headers = response.headers();
        if (headers && headers[headerName] != undefined || headers[headerName.toLowerCase()] != undefined) {
          getStorage().authToken = headers[headerName] || headers[headerName.toLowerCase()] || '';
          $httpProvider.defaults.headers.common[headerName] = getStorage().authToken;
        }
        getStorage().authLastAction = new Date().getTime();
        getStorage().authAuthenticated = true;
        getStorage().authData = (mapSource || angular.identity)(response.data);
        $rootScope.$emit('$auth.authenticate', getStorage().authData);
      };
      service.authenticate = function(credentials) {
        callbacks.loading();
        var deferred = $q.defer(),
        headers = {},
        injector = $rootElement.injector();
        
        angular.forEach(customHeaders, function(header, name) {
          if (angular.isArray(header)) {
            headers[name] = injector.invoke(header);
          } else {
            headers[name] = header;
          }
        });
        
        $http.post(authUrl, credentials, {
          headers: headers
        })
				.then(function(response) {
          var success = condition !== null ? condition(response) : true;
          
          if (success === true) {
            var headers = response.headers();
            if (headers[headerName] != undefined || headers[headerName.toLowerCase()] != undefined) {
              getStorage().authToken = headers[headerName] || headers[headerName.toLowerCase()] || '';
              $httpProvider.defaults.headers.common[headerName] = getStorage().authToken;
            }
            getStorage().authLastAction = new Date().getTime();
            getStorage().authAuthenticated = true;
            getStorage().authData = (mapSource || angular.identity)(response.data);
            deferred.resolve(response.data || {});
            $rootScope.$emit('$auth.authenticate', getStorage().authData);
          } else {
            deferred.reject(response.data || {});
          }
          
          callbacks.done();
        });
        
        return deferred.promise;
      };
      service.clear = function(callback) {
        var promises = [];
        
        if (callback) {
          promises.push(callback(service));
        }
        
        return $q.all(promises).then(function() {
          var authData = clear();
          $rootScope.$emit('$auth.clear', authData);
        });
      };
      
      service.capture = function() {
        if (!captured) {
          captured = true;
          $transitions.onStart({}, function($transition$) {
            var state = $transition$.to();
            checkStateAuth($transition$, state);
          });
          angular.element(document.body).on('click', clickEvent);
        }
      };
      
      if (service.isAuthenticated() && getStorage().authToken) {
        $httpProvider.defaults.headers.common[headerName] = getStorage().authToken;
      }
      $httpProvider.defaults.headers.common[rememberName] = $sl.authRemember;
      
      var clear = function() {
        var authData = angular.copy(getStorage().authData);
        
        getStorage().authAuthenticated = false;
        delete $sl.authRemember;
        delete $sl.authData;
        delete $ss.authData;
        delete $sl.authLastAction;
        delete $ss.authLastAction;
        delete $sl.authToken;
        delete $ss.authToken;
        delete $httpProvider.defaults.headers.common[headerName];
        delete $httpProvider.defaults.headers.common[rememberName];
        
        return authData;
      }, checkStateAuth = function($transition$, state) {
        if (states.excluded.indexOf(state.name) == -1) {
          var isAuth = service.isAuthenticated();
          if (states.auth.name != '' && states.main.name != '' && state.name == states.auth.name && isAuth) {
            $transition$.abort();
            $state.go(states.main.name, states.main.params, states.main.options);
            return;
          } else if (states.auth.name != '' && state.name != states.auth.name && !isAuth) {
            $transition$.abort();
            $state.go(states.auth.name, states.auth.params, states.auth.options);
            return;
          }
        }
      };
      
      service.capture();
      
      $transitions.onStart({}, function($transition$) {
        if (firstState) {
          var state = $transition$.to();
          checkStateAuth($transition$, state);
          
          getStorage().authLastAction = new Date().getTime();
          firstState = false;
          if (service.isExpired()) {
            $transition$.abort();
            service.clear();
          } else {
            checkUser($transition$);
          }
        } else if (!service.getRemember()) {
          checkUser();
        }
        var nowAction = checkExpiration($transition$);
        if (nowAction > 0) {
          getStorage().authLastAction = nowAction;
        }
      });
      
      $interval(function() {
        checkExpiration();
      }, checkInterval * 1000);
      
      $rootScope.$on('$destroy', function() {
        angular.element(document.body).off('click', clickEvent);
      });
      
      return service;
    }];
  }]);
})(angular);



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


/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.config', [])
  .provider('$config', [function() {
    var provider = this,
    config = null,
    hidden = ['each', 'keys', 'values', 'has'];
    
    function parseData(data) {
      if (angular.isObject(data) && !angular.isArray(data)) {
          data.each = function(callback) {
            angular.forEach(this, function(item, key) {
              if (hidden.indexOf(key) == -1) {
                callback(item, key);
              }
            });
            return this;
          };
          data.keys = function() {
            var k = [];
            angular.forEach(this, function(item, key) {
              if (hidden.indexOf(key) == -1) {
                k.push(key);
              }
            });
            return k;
          };
          data.values = function() {
            var v = [];
            angular.forEach(this, function(item, key) {
              if (hidden.indexOf(key) == -1) {
                v.push(item);
              }
            });
            return v;
          };
          data.has = function(name) {
            return this.keys().indexOf(name) > -1;
          };
          angular.forEach(data, function(item, key) {
            data[key] = parseData(item);
          });
      }
      return data;
    };
    
    provider.set = function(value) {
      config = parseData(value);
    };
    
    provider.get = function() {
      return config;
    };
    
    provider.$get = [function() {
      return config;
    }];
  }]);
})(angular);


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
          return $cordova.exists();
        };
        ngIf.link.call(ngIf, $scope, $element, $attr, ctrl, $transclude);
      }
    };
  }])
  .directive('showCordova', ['$cordova', function($cordova) {
    return {
      restrict: 'A',
      link: function ($scope, $element) {
        if ($cordova.exists()) {
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
        if ($cordova.exists()) {
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
        return service.exists() ? window['cordova'] : null;
      };
      
      service.exists = function() {
        return window['cordova'] != undefined;
      };
      
      service.is = function() {
        return service.exists();
      };
      
      return service;
    }];
  }])
  .provider('$plugins', [function() {
    var provider = this;
    
    provider.$get = ['$cordova', function($cordova) {
      var service = function(name) {
        if (name && name != '') {
          return service.get(name);
        }
        return service.cordova() ? $cordova().plugins : null;
      };
      
      service.cordova = function() {
        return $cordova.exists() && $cordova().plugins;
      };
      
      service.exists = function(name) {
        return service.cordova() && $cordova().plugins[name] != undefined;
      };
      
      service.get = function(name) {
        return service.exists(name) ? $cordova().plugins[name] : null;
      };
      
      return service;
    }];
  }]);
})(angular);



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



/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.fetch', [
    'pascalprecht.translate'
  ])
  .provider('$fetchLocale', [function() {
    var provider = this,
    languageHeader = 'X-Locale-Code';
    
    provider.setHeader = function(value) {
      languageHeader = value;
      return provider;
    };
    
    provider.$get = ['$http', '$translate', function($http, $translate) {
      var service = function(config) {
        if (config) {
          if (!config.headers) {
            config.headers = {};
          }
        } else {
          config = {
            headers: {}
          };
        }
        config.headers[languageHeader] = $translate.use();
        return $http(config);
      },
      addHeader = function(config) {
        var c = {
          headers: {}
        };
        c.headers[languageHeader] = $translate.use();
        return angular.merge({}, config, c);
      },
      http = angular.copy($http, service);
      http.get = function(url, config) {
        return $http.get(url, addHeader(config));
      };
      http.head = function(url, config) {
        return $http.head(url, addHeader(config));
      };
      http.post = function(url, data, config) {
        return $http.post(url, data, addHeader(config));
      };
      http.put = function(url, data, config) {
        return $http.put(url, data, addHeader(config));
      };
      http.delete = function(url, config) {
        return $http.delete(url, addHeader(config));
      };
      http.jsonp = function(url, config) {
        return $http.jsonp(url, addHeader(config));
      };
      http.patch = function(url, data, config) {
        return $http.patch(url, data, addHeader(config));
      };
      return http;
    }];
  }])
  .provider('$fetchHost', [function() {
    var provider = this,
    hostUrl = '';
    
    provider.setUrl = function(value) {
      hostUrl = value;
      return provider;
    };
    
    provider.$get = ['$fetchLocale', function($http) {
      var service = function(config) {
        if (config && config.url && config.url != '') {
          config.url = hostUrl + config.url;
        }
        return $http(config);
      },
      http = angular.copy($http, service);
      http.get = function(url, config) {
        return $http.get(hostUrl + url, config);
      };
      http.head = function(url, config) {
        return $http.head(hostUrl + url, config);
      };
      http.post = function(url, data, config) {
        return $http.post(hostUrl + url, data, config);
      };
      http.put = function(url, data, config) {
        return $http.put(hostUrl + url, data, config);
      };
      http.delete = function(url, config) {
        return $http.delete(hostUrl + url, config);
      };
      http.jsonp = function(url, config) {
        return $http.jsonp(hostUrl + url, config);
      };
      http.patch = function(url, data, config) {
        return $http.patch(hostUrl + url, data, config);
      };
      return http;
    }];
  }]);
})(angular);


/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.history', [])
  .provider('$history', [function() {
    var provider = this;
    
    provider.$get = ['$window', function($window) {
        var service = function() {
          
        };
        
        service.back = function() {
          $window.history.back();
        };
        
        service.forward = function() {
          $window.history.forward();
        };
        
        return service;
    }];
  }]);
})(angular);



/* global angular, $nbList */

(function(angular) {
  'use strict';
  
  var link = function($scope, $element, $attr, ctrl, transclude) {
        var $this = this;
        
        $element.addClass('nb-list');
        
        var parse = {
          common: function(total) {
            $scope.$count = $scope.$rows.length;
            $scope.$total = total;

            $scope.$more = $scope.$count < $scope.$total;

            $scope.$pages = Math.ceil($scope.$total / ctrl.limit());
            $scope.$pageMin = 1;
            $scope.$pageMax = $scope.$pages;
            $scope.$prev = $scope.$page > $scope.$pageMin;
            $scope.$next = $scope.$page < $scope.$pageMax;
            
            var prevPage = $scope.$page - 1;
            if (prevPage < 1) {
              prevPage = 1;
            }
            
            var nextPage = $scope.$page + 1;
            if (nextPage > $scope.$pages) {
              nextPage = $scope.$pages;
            }
            
            $scope.$prevPage = isNaN(prevPage) ? 1 : prevPage;
            $scope.$nextPage = isNaN(nextPage) ? 1 : nextPage;
            $scope.$pagination = $scope.$pages > 1;
            
            var paginator = [],
            _range = ctrl.range(),
            range = [],
            rangeMin = $scope.$pageMin,
            rangeMax = $scope.$pageMax;
            for (var i = 1; i <= $scope.$pages; i++) {
              paginator.push(i);
            }
            $scope.$paginator = paginator;
            
            if (_range > 0) {
              rangeMin = $scope.$page - _range;
              if (rangeMin < $scope.$pageMin) {
                rangeMin = $scope.$pageMin;
              }
              rangeMax = $scope.$page + _range;
              if (rangeMax > $scope.$pageMax) {
                rangeMax = $scope.$pageMax;
              }
            }
            
            for (var i = rangeMin; i <= rangeMax; i++) {
              range.push(i);
            }
            $scope.$range = range;
            $scope.$pageMinInRange = $scope.$range.indexOf($scope.$pageMin) > -1;
            $scope.$pageMaxInRange = $scope.$range.indexOf($scope.$pageMax) > -1;
          },
          init: function(rows, total) {
            var list = [];
            angular.forEach(rows, function(row) {
              list.push($scope.mapRow(row));
            });
            $scope.$rows = list;
            $scope.$page = 1;
            parse.common(total);
            $scope.$init = true;
          },
          more: function(rows, total) {
            var $parent = $element.parents('md-content'),
            height = $element.height();
            
            if ($scope.$page > $scope.$pageMin) {
              $scope.$rows = [];
            }
            
            angular.forEach(rows, function(row) {
              $scope.$rows.push(row);
            });
            
            $scope.$page = $scope.$pageMin;
            parse.common(total);
            
            $this.$timeout(function() {
              $parent.first().animate({
                scrollTop: height - $parent.offset().top
              }, 500);
            }, 10);
          },
          page: function(page, rows, total) {
            var list = [];
            angular.forEach(rows, function(row) {
              list.push(row);
            });
            $scope.$rows = list;
            $scope.$page = page + 1;
            parse.common(total);
          }
        };
        
        transclude($scope, function(transEl) {
          $element.prepend(transEl);
        });
        
        $scope.$offset = ctrl.offset();
        $scope.$limit = ctrl.limit();
        $scope.$loading = true;
        $scope.$init = false;
        $scope.$firstLoad = false;
        $scope.$rows = [];
        $scope.$paginator = [];
        
        parse.common(0);
        
        $scope.$nbList = {
          load: function(rows) {
            if (angular.isArray($scope.source)) {
              parse.init($scope.source, $scope.source.length);
              $scope.$loading = false;
            } else if (angular.isFunction($scope.source)) {
              $scope.$loading = true;
              if (!$scope.$init) {
                $scope.$firstLoad = true;
              }
              
              var result = $scope.source.call($scope, {
                offset: rows ? 0 : ctrl.offset(),
                limit: rows || ctrl.limit()
              });
              
              if (angular.isArray(result)) {
                parse.init(result, result.length);
                $scope.$loading = false;
                $scope.$firstLoad = false;
              } else {
                if (result) {
                  result.then(function(response) {
                    parse.init(ctrl.mapRows(response.data), ctrl.mapTotal(response.data));
                  }, function(e) {
                    console.log(e.status + ' - ' + e.statusText);
                    parse.init([], 0);
                  }).finally(function() {
                    $scope.$loading = false;
                    $scope.$firstLoad = false;
                  });
                }
              }
            }
          },
          refresh: function() {
            if ($scope.$page > 1) {
              this.page($scope.$page);
            } else {
              this.load();
            }
          },
          reset: function() {
            $scope.offset = 0;
            $scope.$nbList.load();
          },
          clear: function() {
            parse.init([], 0);
          },
          more: function() {
            $scope.$loading = true;
            if (!$scope.$init) {
              $scope.$firstLoad = true;
            }
            
            var offset = ctrl.offset() + ctrl.limit();
            if ($scope.$page > $scope.$pageMin) {
              offset = 0;
            }
            
            var result = $scope.source.call($scope, {
              offset: offset,
              limit: ctrl.limit()
            });
            
            $scope.offset = offset;
            
            if (angular.isArray(result)) {
              parse.more(result, result.length);
              $scope.$loading = false;
              $scope.$firstLoad = false;
            } else {
              result.then(function(response) {
                parse.more(ctrl.mapRows(response.data), ctrl.mapTotal(response.data));
              }, function(e) {
                console.log(e.status + ' - ' + e.statusText);
                parse.more([], 0);
              }).finally(function() {
                $scope.$loading = false;
                $scope.$firstLoad = false;
              });
            }
          },
          page: function(index) {
            $scope.$loading = true;
            if (!$scope.$init) {
              $scope.$firstLoad = true;
            }
            
            var page = index - 1;
            if (page < 0) {
              page = 0;
            } else if (page >= $scope.$pages) {
              page = $scope.pages - 1;
            }
            
            var offset = page * ctrl.limit();
            var result = $scope.source.call($scope, {
              offset: offset,
              limit: ctrl.limit()
            });
            
            $scope.offset = offset;
            $scope.offset = offset;
            
            if (angular.isArray(result)) {
              parse.page(page, result, result.length);
              $scope.$loading = false;
              $scope.$firstLoad = false;
            } else {
              result.then(function(response) {
                parse.page(page, ctrl.mapRows(response.data), ctrl.mapTotal(response.data));
              }, function(e) {
                console.log(e.status + ' - ' + e.statusText);
                parse.page(page, [], 0);
              }).finally(function() {
                $scope.$loading = false;
                $scope.$firstLoad = false;
              });
            }
          }
        };
        
        if ($scope.autostart === true) {
          console.log('autostart');
          $scope.$nbList.load();
        }
      };
  
  angular.module('nb.list', [])
  .provider('$nbList', [function() {
    var provider = this,
    defaults = {
      limit: 10,
      range: 0,
      paginationTemplate: '',
      map: {
        rows: function(data) {
          return data.rows;
        },
        total: function(data) {
          return data.total;
        }
      }
    };
    
    provider.limit = function(value) {
      defaults.limit = value;
      return defaults.limit;
    };
    
    provider.range = function(value) {
      defaults.range = value;
      return defaults.range;
    };
    
    provider.paginationTemplate = function(value) {
      defaults.paginationTemplate = value;
      return defaults.paginationTemplate;
    };
    
    provider.mapRows = function(value) {
      defaults.map.rows = value;
      return defaults.map.rows;
    };
    
    provider.mapTotal = function(value) {
      defaults.map.total = value;
      return defaults.map.total;
    };
    
    provider.$get = [function() {
      var service = function() {
        
      };
      service.limit = function() {
        return defaults.limit;
      };
      service.range = function() {
        return defaults.range;
      };
      service.paginationTemplate = function() {
        return defaults.paginationTemplate;
      };
      service.mapRows = function(data) {
        return defaults.map.rows.call(this, data);
      };
      service.mapTotal = function(data) {
        return defaults.map.total.call(this, data);
      };
      
      return service;
    }];
  }])
  .directive('nbList', ['$nbList', '$compile', '$templateCache', '$q', '$http', '$timeout', '$document', '$window', function($nbList, $compile, $templateCache, $q, $http, $timeout, $document, $window) {
    return {
      restrict: 'EA',
      transclude: true,
      scope: {
        source: '=',
        offset: '@',
        limit: '@',
        range: '@',
        locals: '=',
        paginationTemplate: '@',
        $nbList: '=control',
        autostart: '@',
        mapRow: '=?mapRow'
      },
      controller: ['$scope', function($scope) {
        var ctrl = this;
        ctrl.offset = function () {
          return ($scope.offset || 0) * 1;
        };
        ctrl.limit = function () {
          return ($scope.limit || $nbList.limit()) * 1;
        };
        ctrl.range = function() {
          return ($scope.range || $nbList.range()) * 1;
        };
        ctrl.paginationTemplate = function() {
          return $scope.paginationTemplate || $nbList.paginationTemplate();
        };
        ctrl.mapRows = function(data) {
          return $nbList.mapRows(data);
        };
        ctrl.mapTotal = function(data) {
          return $nbList.mapTotal(data);
        };
      }],
      link: function($scope, $element, $attr, ctrl) {
        var defer = $q.defer(),
        template = ctrl.paginationTemplate(),
        args = arguments;
        
        if ($scope.autostart !== false) {
          $scope.autostart = true;
        }
        
        if (!$scope.mapRow) {
          $scope.mapRow = angular.identity;
        }
        
        defer.promise.then(function(tpl) {
          if (tpl != '') {
            var tplCompiled = $compile(tpl)($scope);
            $element.append(tplCompiled);
          }
          link.apply({
            $timeout: $timeout,
            $document: $document,
            $window: $window
          }, args);
        });
        
        if (template != undefined && template != '') {
          var tpl = $templateCache.get(template);
          
          if (tpl != undefined && tpl != '') {
            defer.resolve(tpl);
          } else {
            $http.get(template).then(function(response) {
              defer.resolve(response.data);
            }, function() {
              defer.resolve('');
            });
          }
        } else {
          defer.resolve('');
        }
      }
    };
  }])
  .directive('nbListScroll', ['$window', function($window) {
    return {
      restrict: 'A',
      require: 'nbList',
      priority: 1,
      link: function($scope, $element, $attr) {
        $element.addClass('nb-list-scroll');
      }
    };
  }])
  .directive('nbListRow', [function() {
    return {
      restrict: 'EA',
      link: function($scope, $element) {
        $element.addClass('nb-list-row');
      }
    };
  }])
  .directive('nbListCell', [function() {
    return {
      restrict: 'EA',
      link: function($scope, $element) {
        $element.addClass('nb-list-cell');
      }
    };
  }]);
})(angular);


/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.listener', [])
  .provider('$listener', [function() {
    var provider = this,
    listen = function($scope) {
      var scope = this,
      events = [];
      
      scope.$on = function(eventName, callback, s) {
        events.push($scope.$on(eventName, callback));
        return scope;
      };
      
      scope.$clear = function() {
        angular.forEach(events, function(event) {
          event();
        });
        events = [];
        return scope;
      };
      
      $scope.$on('$destroy', function() {
        scope.$clear();
      });
    };
    
    provider.$get = [function() {
      return function($scope) {
        return new listen($scope);
      };
    }];
  }]);
})(angular);


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


/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.pincode', [
    'nb.auth'
  ])
  .provider('$pinCode', [function() {
    var provider = this,
    size = 4,
    validation = {
      empty: 'PIN is empty',
      same: 'Pin and its repeat is not the same',
      size: 'Pin is too short'
    },
    translations = {};
    
    provider.validationMessage = function(code, message) {
      validation[code] = message;
      return provider;
    };
    
    provider.size = function(value) {
      if (value) {
        size = parseInt(value);
      }
      return size;
    };
    
    provider.$get = ['$rootScope', '$localStorage', '$q', '$auth', '$translate', function($rootScope, $ls, $q, $auth, $translate) {
      var service = function() {
        return service.available();
      };
      
      service.available = function() {
        return $ls.pinCode && $ls.pinCode != '';
      };
      
      service.size = function() {
        return size;
      };
      
      service.clear = function() {
        var pinCode = $ls.pinCode ? $ls.pinCode + '' : '';
        $ls.pinCode = '';
        $rootScope.$emit('$pincode.clear', pinCode);
        $rootScope.$emit('$pincode.change', pinCode);
      };
      
      service.get = function() {
        return $ls.pinCode || '';
      };
      
      service.validate = function(value, repeat) {
        var deferred = $q.defer(),
        reason = null;
        
        if (!value || value == '') {
          reason = translations[validation.empty];
        } else if (value.length < size) {
          reason = translations[validation.size];
        } else if (repeat && repeat != value) {
          reason = translations[validation.same];
        }
        
        if (reason == null) {
          $ls.pinCode = value;
          deferred.resolve($ls.pinCode);
          $rootScope.$emit('$pincode.validate', value);
          $rootScope.$emit('$pincode.change', value);
        } else {
          deferred.reject({
            reason: reason,
            pin: value,
            repeat: repeat
          });
        }
        
        return deferred.promise;
      };
      
      service.authenticate = function(value) {
        var deferred = $q.defer();
        
        service.validate(value).then(function(pinCode) {
          var code = $ls.pinCode;
          if (code == pinCode) {
            $ls.pinAuthData = $auth();
            deferred.resolve($auth());
            $rootScope.$emit('$pincode.authenticate', pinCode);
          }
        }, function(e) {
          deferred.reject(e);
        });
        
        return deferred.promise;
      };
      
      var toTranslation = [];
      angular.forEach(validation, function(code) {
        toTranslation.push(code);
      });
      
      $translate(toTranslation).then(function(t) {
        translations = t;
      }, function(codes) {
        translations = codes;
      });
      
      return service;
    }];
  }]);
})(angular);



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
