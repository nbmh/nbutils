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
