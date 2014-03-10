define([
    '../util/Class',
    '../util/CustomEvent',
    '../util/Promise',
    '../engine/RouteManager'
], function (Class, CustomEvent, promise, RouteManager) {
    "use strict";
    var defer = promise.defer;

    /**
     * @class com.sesamtv.core.abstract.BaseApplication
     * @extends com.sesamtv.core.util.CustomEvent
     * @param {String} appName application name
     */
    /**
     * @event appLoaded when application has loaded
     */
    /**
     * @event appUnloaded when application has unloaded
     */
    /**
     * @event ctrlChanged
     */
    var BaseApplication = Class({
        extend: CustomEvent,
        constructor: function (appName) {
            //this._super();
            CustomEvent.call(this);
            this.routesList = {};
            this.appName = appName;
            this.routePrefix = this.appName == 'default' ? '/' : '/@' + this.appName;
        },
        /**
         * prepare application
         * @method prepare
         * @return {*}
         */
        init: function () {
            return this;
        },
        /**
         * @example
         *      addRoutes(['search/#id'],{
             *          search:function(id){}
             *      });
         *  @method addRoutes
         *  @param {Array} routes
         *  @param {Object} routeHelpers
         * */
        addRoutes: function (routes, routeHelpers) {
            routes.forEach(function (route) {
                if (this.routesList[route]) {
                    return;
                }
                this.routesList[route] = routeHelpers[route.split('/').shift()];
            }, this);
        },
        setHash: function (hash, params) {
            RouteManager.setRoute(this.routePrefix + '/' + hash, params);
        },
        /**
         * @method router
         * @param {String} newUrl
         * @param {String} [oldUrl]
         */
        router: function (newUrl, oldUrl) {
            if (!Object.keys(this.routesList).length) {
                return;
            }
            var newRoute = this.matchRoute(newUrl);
            this.routesList[newRoute.route].call(this, newRoute.params);
        },
        /**
         * @method matchRoute
         * @param {String} url
         * @return {Object|null}
         */
        matchRoute: function (url) {
            var res, params;
            Object.keys(this.routesList).some(function (route) {
                if (params = this.fetchUrlExpParams(url, this.routePrefix + '/' + route)) {
                    return res = route;
                }
            }, this);
            return res ? {
                route: res,
                params: params
            } : null;
        },
        normalizeUrlPathExp: function (path, keys) {
            keys = keys || [];
            path = path
                .concat('/?')
                .replace(/\/\(/g, '(?:/')
                .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function (_, slash, format, key, capture, optional) {
                    keys.push(key);
                    slash = slash || '';
                    return ''
                        + (optional ? '' : slash)
                        + '(?:'
                        + (optional ? slash : '')
                        + (format || '') + (capture || '([^/]+?)') + ')'
                        + (optional || '');
                })
                .replace(/([\/.])/g, '\\$1')
                .replace(/\*/g, '(.+)');
            return {
                regexp: new RegExp('^' + path + '$', 'i'),
                keys: keys
            };
        },
        fetchUrlExpParams: function (url, rule) {
            var params = {}, match;
            rule = this.normalizeUrlPathExp(rule);
            if (match = url.match(rule.regexp)) {
                match.shift();
                match.forEach(function (m, i) {
                    params[rule.keys[i]] = m;
                });
                return params;
            }
            return null;
        },
        /**
         * @method load
         * @param {Object} route
         * @return {*}
         */
        load: function (route) {
            return this;
        },
        unload: function () {
            return this;
        }
    });
    return BaseApplication;
});