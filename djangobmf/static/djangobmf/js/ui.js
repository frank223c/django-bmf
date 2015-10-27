/*
 * AngularJS UI for django BMF
 *
 */

var app = angular.module('djangoBMF', []);

/*
 * Config
 */

app.config(['$httpProvider', '$locationProvider', function($httpProvider, $locationProvider) {
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    $locationProvider.html5Mode(true).hashPrefix('!');
}]);

/*
app.directive('bmfContent', ['$compile', function($compile) {
    return {
        restrict: 'A',
        priority: -500,
        link: function(scope, $element) {

            scope.$on('bmfRender', update);

            function update(event, controller, html) {
                if (controller && html) {
                    console.log("EVENT", controller, html, $element);
                    $element.html(html + ' [{{ testing }}]').show();
                    $compile($element.contents())(scope);
                }
            }
            update();
        }
    };
}]);
*/

/*
 * Services
 */

app.factory('CurrentView', ['$rootScope', '$location', function($rootScope, $location) {
    function go(next) {
        $rootScope.bmf_current_view = next;
        if (next && next.type == "list") {
            $rootScope.bmf_current_dashboard = {
                key: next.dashboard.key,
                name: next.dashboard.name
            };
        }
    }

    function update(url, prefix) {
        var current = get(url, prefix);
        go(current);
        return current
    }

    function get(url, prefix) {
        if (url == undefined) {
            url = $location.path();
        }
        if (prefix) {
            if ($location.protocol() == 'http' && $location.port() == 80) {
                prefix = 'http://'+ $location.host();
            }
            else if ($location.protocol() == 'https' && $location.port() == 443) {
                prefix = 'https://'+ $location.host();
            }
            else {
                prefix = $location.protocol() + '://' + $location.host() + ':' + $location.port()
            }
        }
        else {
            prefix = ''
        }
        var current = undefined;
        $rootScope.bmf_dashboards.forEach(function(d, di) {
            d.categories.forEach(function(c, ci) {
                c.views.forEach(function(v, vi) {
                    if (prefix + v.url == url) {
                        current = {
                            type: 'list',
                            view: v,
                            category: c,
                            dashboard: d
                        };
                    }
                });
            });
        });
        if (current) {
            return current;
        }
        return current
    }
    return {get: get, go: go, update: update}
}]);

/*
 * Controller
 */

// this controller is evaluated first, it gets all
// the data needed to access the bmf's views
app.controller('FrameworkCtrl', ['$http', '$rootScope', '$scope', '$window', 'CurrentView', function($http, $rootScope, $scope, $window, CurrentView) {

    // pace to store basic templates
    $rootScope.bmf_templates = {
        // template used to display items from the data api as a list
        'list': '',
    };

    // place to store all dashboards
    $rootScope.bmf_dashboards = undefined;

    // place to store all sitemaps
    $rootScope.bmf_sidebars = undefined;

    // place to store navigation
    $rootScope.bmf_navigation = undefined;

    // holds the current dashboard
    $rootScope.bmf_current_dashboard = undefined;

    // holds all informations about the current view
    $rootScope.bmf_current_view = undefined

    // data holder
    $rootScope.bmf_data = undefined;

    // Load data from REST API
    var url = angular.element.find('body')[0].dataset.api;
    $http.get(url).then(function(response) {

        // Update sidebar and Dashboard objects
        var sidebar = {}
        response.data.dashboards.forEach(function(d, i) {
            sidebar[d.key] = d.categories;
        });
        $rootScope.bmf_dashboards = response.data.dashboards;
        $rootScope.bmf_sidebars = sidebar;
        $rootScope.bmf_templates = response.data.templates;
        $rootScope.bmf_navigation = response.data.navigation;

        CurrentView.update();
    });


    $scope.$on('$locationChangeStart', function(event, next, current) {
//      // only invoke if dashboards are present (and the ui is loaded propperly)
//      if ($rootScope.bmf_dashboards) {
//          var next_view = CurrentView.get(next, true);
//          if (next_view) {
//              CurrentView.go(next_view);
//              return true
//          };
//      }

        // Case when the target url is not managed by the ui
        event.preventDefault(true);
        if (next != current) {
            $window.location = next;
        }
    });
}]);

// This controller updates the dashboard dropdown menu
app.controller('DashboardCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {

    $scope.data = [];
    $scope.current_dashboard = null;

    $scope.$watch(
        function(scope) {return scope.bmf_dashboards},
        function(newValue) {if (newValue != undefined) update_dashboard()}
    );
    $scope.$watch(
        function(scope) {return scope.bmf_current_dashboard},
        function(newValue) {if (newValue != undefined) update_dashboard()}
    );

    function update_dashboard(key) {
        var response = [];
        var current_dashboard = [];
        var current = $scope.bmf_current_dashboard;

        $scope.bmf_dashboards.forEach(function(d, di) {
            var active = false
            if (current && current.key == d.key || key && key == d.key) {
                active = true
            }

            response.push({
                'key': d.key,
                'name': d.name,
                'active': active,
            });
        });

        $scope.data = response;
        $scope.current_dashboard = $scope.bmf_current_dashboard;

    }

    $scope.update = function(key) {
        var name;
        $scope.bmf_dashboards.forEach(function(d, di) {
            if (key && key == d.key) {
                name = d.name;
            }
        });

        if (name) {
            $rootScope.bmf_current_dashboard = {
                key: key,
                name: name
            };
        }
        else {
            $rootScope.bmf_current_dashboard = undefined;
        }
    };

}]);

// This controller updates the dashboard dropdown menu
app.controller('SidebarCtrl', ['$scope', function($scope) {
    $scope.data = [];

    $scope.$watch(
        function(scope) {return scope.bmf_current_view},
        function(newValue) {if (newValue != undefined) update_sidebar()}
    );
    $scope.$watch(
        function(scope) {return scope.bmf_current_dashboard},
        function(newValue) {if (newValue != undefined) update_sidebar()}
    );

    function update_sidebar() {
        var response = [];
        var key = $scope.bmf_current_dashboard.key;

        response.push({
            'class': 'sidebar-board',
            'name': $scope.bmf_current_dashboard.name
        });

        $scope.bmf_sidebars[key].forEach(function(c, ci) {
            response.push({'name': c.name});
            c.views.forEach(function(v, vi) {
                if ($scope.bmf_current_view && $scope.bmf_current_view.type == "list" && c.key == $scope.bmf_current_view.category.key && v.key == $scope.bmf_current_view.view.key) {
                    response.push({'name': v.name, 'url': v.url, 'class': 'active'});
                }
                else {
                    response.push({'name': v.name, 'url': v.url});
                }
            });
        });

        $scope.data = response;
    }
}]);

// This controller updates the dashboard dropdown menu
app.controller('NavigationCtrl', ['$scope', function($scope) {
    $scope.data = undefined;

    $scope.$watch(
        function(scope) {return scope.bmf_navigation && scope.bmf_navigation.length || 0},
        function(newValue) {if (newValue != undefined) init_navigation()}
    );
//  $scope.$watch(
//      function(scope) {return scope.bmf_current_dashboard},
//      function(newValue) {if (newValue != undefined) update_sidebar()}
//  );
//
    function init_navigation() {
//      var response = [];
//      var key = $scope.bmf_current_dashboard.key;
//
//      response.push({
//          'class': 'sidebar-board',
//          'name': $scope.bmf_current_dashboard.name
//      });
//
//      $scope.bmf_sidebars[key].forEach(function(c, ci) {
//          response.push({'name': c.name});
//          c.views.forEach(function(v, vi) {
//              if ($scope.bmf_current_view && $scope.bmf_current_view.type == "list" && c.key == $scope.bmf_current_view.category.key && v.key == $scope.bmf_current_view.view.key) {
//                  response.push({'name': v.name, 'url': v.url, 'class': 'active'});
//              }
//              else {
//                  response.push({'name': v.name, 'url': v.url});
//              }
//          });
//      });
//
        $scope.data = $scope.bmf_navigation;
        console.log($scope.bmf_navigation);
    }
}]);

// TODO OLD
app.controller('bmfListCtrl', function($scope, $http) {

    $scope.data = [];

    $scope.$watch(
        function(scope) {return scope.bmf_current_view},
        function(newValue) {if (newValue != undefined) get_data()}
    );

    get_data = function() {
        var url = $scope.bmf_current_view.view.dataapi + '?d=' + $scope.bmf_current_view.dashboard.key + '&c=' + $scope.bmf_current_view.category.key + '&v=' + $scope.bmf_current_view.view.key
        $http.get(url).then(function(response) {
            $scope.data = response.data;
        });
    }
});
