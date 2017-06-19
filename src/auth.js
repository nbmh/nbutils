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
