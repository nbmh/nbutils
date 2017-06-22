
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
              list.push(row);
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
              
              var result = $scope.source({
                offset: rows ? 0 : ctrl.offset(),
                limit: rows || ctrl.limit()
              });
              
              if (angular.isArray(result)) {
                parse.init(result, result.length);
                $scope.$loading = false;
              } else {
                if (result) {
                  result.then(function(response) {
                    parse.init(ctrl.mapRows(response.data), ctrl.mapTotal(response.data));
                  }, function(e) {
                    console.log(e.status + ' - ' + e.statusText);
                    parse.init([], 0);
                  }).finally(function() {
                    $scope.$loading = false;
                  });
                }
              }
            }
          },
          refresh: function() {
            if ($scope.$page > 1) {
              this.page($scope.$page);
            } else {
              this.load($scope.$count);
            }
          },
          reset: function() {
            $scope.offset = 0;
            $scope.offset = 0;
            $scope.$nbList.load();
          },
          more: function() {
            $scope.$loading = true;
            
            var offset = ctrl.offset() + ctrl.limit();
            if ($scope.$page > $scope.$pageMin) {
              offset = 0;
            }
            
            var result = $scope.source({
              offset: offset,
              limit: ctrl.limit()
            });
            
            $scope.offset = offset;
            $scope.offset = offset;
            
            if (angular.isArray(result)) {
              parse.more(result, result.length);
              $scope.$loading = false;
            } else {
              result.then(function(response) {
                parse.more(ctrl.mapRows(response.data), ctrl.mapTotal(response.data));
              }, function(e) {
                console.log(e.status + ' - ' + e.statusText);
                parse.more([], 0);
              }).finally(function() {
                $scope.$loading = false;
              });
            }
          },
          page: function(index) {
            $scope.$loading = true;
            
            var page = index - 1;
            if (page < 0) {
              page = 0;
            } else if (page >= $scope.$pages) {
              page = $scope.pages - 1;
            }
            
            var offset = page * ctrl.limit();
            var result = $scope.source({
              offset: offset,
              limit: ctrl.limit()
            });
            
            $scope.offset = offset;
            $scope.offset = offset;
            
            if (angular.isArray(result)) {
              parse.page(page, result, result.length);
              $scope.$loading = false;
            } else {
              result.then(function(response) {
                parse.page(page, ctrl.mapRows(response.data), ctrl.mapTotal(response.data));
              }, function(e) {
                console.log(e.status + ' - ' + e.statusText);
                parse.page(page, [], 0);
              }).finally(function() {
                $scope.$loading = false;
              });
            }
          }
        };
        
        $scope.$nbList.load();
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
        $nbList: '=control'
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
