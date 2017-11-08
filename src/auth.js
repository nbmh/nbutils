/* global angular */

(function(angular) {
  'use strict';
  
  angular.module('nb.auth', [
    'ui.router',
    'ngStorage'
  ])
  .provider('$auth', ['$httpProvider', function($httpProvider) {
    var provider = this,
    _authData = null,
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
    
    provider.setData = function(data) {
      _authData = data;
    };
    
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
      '$rootScope', '$rootElement', '$sessionStorage', '$localStorage', '$http', '$interval', '$q', '$state', '$transitions', '$config', 
    function($rootScope, $rootElement, $ss, $sl, $http, $interval, $q, $state, $transitions, $config) {
      var callbacks = {
        loading: angular.noop,
        done: angular.noop
      },
      getStorage = function() {
        return $sl[$config.auth.remember_name] === true ? $sl : $ss;
      },
      checkExpiration = function($transition$) {
        if (service.isAuthenticated() && !$sl[$config.auth.remember_name]) {
          var nowAction = new Date().getTime(),
          timespan = Math.floor((nowAction - (getStorage()[$config.auth.last_action_name] || 0)) / 1000);
          if (service.isAuthenticated() && timespan >= expiration) {
            if ($transition$) {
              $transition$.abort();
            }
            $rootScope.$emit('$auth.expired', {
              lastAction: getStorage()[$config.auth.last_action_name],
              timespan: timespan,
              data: angular.copy(_authData)
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
        if (service.isAuthenticated() && !$sl[$config.auth.remember_name]) {
          getStorage()[$config.auth.last_action_name] = new Date().getTime();
        }
      },
      triggerExpiration = function() {
        if (service.isAuthenticated() && !$sl[$config.auth.remember_name]) {
          var nowAction = new Date().getTime(),
          timespan = Math.floor((nowAction - (getStorage()[$config.auth.last_action_name] || 0)) / 1000);
          $rootScope.$emit('$auth.expired', {
            lastAction: getStorage()[$config.auth.last_action_name],
            timespan: timespan,
            data: angular.copy(_authData)
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
      },
      setToken = function(value) {
        getStorage()[$config.auth.header_name] = value;
      },
      clearToken = function() {
        delete $sl[$config.auth.header_name];
        delete $ss[$config.auth.header_name];
      };
      
      if (!getStorage()[$config.auth.last_action_name]) {
        getStorage()[$config.auth.last_action_name] = new Date().getTime();
      }
      
      if (!$sl[$config.auth.remember_name]) {
        $sl[$config.auth.remember_name] = false;
      }
      
      service = function(data) {
        if (data && angular.isObjectType(data)) {
          service.update(data);
        }
        return service.data();
      };
      
      Object.defineProperty(service, 'authToken', {
        set: function(value) {
          throw 'It is not allowed to set auth token from service!';
        },
        get: function() {
          return getStorage()[$config.auth.header_name];
        },
        enumerable: true
      });
      
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
        getStorage()[$config.auth.last_action_name] = new Date().getTime();
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
        $sl[$config.auth.remember_name] = !!value;
        $httpProvider.defaults.headers.common[rememberName] = $sl[$config.auth.remember_name];
        return service;
      };
      service.getRemember = function() {
        return $sl[$config.auth.remember_name];
      };
      service.data = function() {
        return _authData;
      };
      service.isAuthenticated = function() {
        return _authData != null;
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
        timespan = parseInt((nowAction - (getStorage()[$config.auth.last_action_name] || 0)) / 1000);
        return service.isAuthenticated() && !$sl[$config.auth.remember_name] && (!_authData || timespan >= expiration);
      };
      service.update = function(data) {
        if (service.isAuthenticated()) {
          _authData = data;
          $rootScope.$emit('$auth.update', _authData);
        }
        return service;
      };
      service.quick = function(response) {
        var headers = response.headers();
        if (headers && headers[headerName] != undefined || headers[headerName.toLowerCase()] != undefined) {
          setToken(headers[headerName] || headers[headerName.toLowerCase()] || '');
          $httpProvider.defaults.headers.common[headerName] = service.authToken;
        }
        getStorage()[$config.auth.last_action_name] = new Date().getTime();
        _authData = (mapSource || angular.identity)(response.data);
        $rootScope.$emit('$auth.authenticate', _authData);
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
              setToken(headers[headerName] || headers[headerName.toLowerCase()] || '');
              $httpProvider.defaults.headers.common[headerName] = service.authToken;
            }
            getStorage()[$config.auth.last_action_name] = new Date().getTime();
            _authData = (mapSource || angular.identity)(response.data);
            deferred.resolve(response.data || {});
            $rootScope.$emit('$auth.authenticate', _authData);
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
      
      if (service.isAuthenticated() && service.authToken) {
        $httpProvider.defaults.headers.common[headerName] = service.authToken;
      }
      $httpProvider.defaults.headers.common[rememberName] = $sl[$config.auth.remember_name];
      
      var clear = function() {
        var authData = angular.copy(_authData);
        
        _authData = null;
        
        delete $sl[$config.auth.remember_name];
        delete $sl[$config.auth.last_action_name];
        delete $ss[$config.auth.last_action_name];
        clearToken();
        delete $httpProvider.defaults.headers.common[headerName];
        delete $httpProvider.defaults.headers.common[rememberName];
        
        return authData;
      }, 
      checkStateAuth = function($transition$, state) {
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
          
          getStorage()[$config.auth.last_action_name] = new Date().getTime();
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
          getStorage()[$config.auth.last_action_name] = nowAction;
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
