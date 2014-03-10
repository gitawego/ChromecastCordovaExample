define([
    './Class',
    './BaseEvented',
    './DomEvent'
], function (Class, BaseEvented, DomEvent) {
    "use strict";

    /**
     * route pattern example:
     *      app/:appName
     *      app/:appName/:id?  (:id? is optional)
     *      app/:appName/*  (wildcard support)
     * @class com.sesamtv.core.util.Router
     * @extends com.sesamtv.core.util.BaseEvented
     * @cfg {Object} args
     * @cfg {String} [args.routePrefix]
     */
    var Router = Class({
        extend: BaseEvented,
        constructor: function Router(args) {
            this.config = {
                disabled: false,
                routePrefix: '',
                routesList: {}
            };
            BaseEvented.call(this);
            args && Class.mixin(this.config, args);
            this.evts = {};
            this.prevHash = '';
        },
        /**
         * prepare application
         * @method prepare
         * @return {*}
         */
        init: function () {
            if (this.evts['onhashchange']) {
                return;
            }
            var self = this, oldUrl, newUrl;
            this.evts['onhashchange'] = DomEvent.on(window, 'hashchange', function (evt) {
                if (self.config.disabled) {
                    return;
                }
                if (self.preventAction) {
                    delete self.preventAction;
                    return;
                }
                self.emit('hashchange', evt);
                oldUrl = self.getHash(evt.oldURL || '');
                newUrl = self.getHash(evt.newURL || '');
                self.prevHash = oldUrl;
                self.router(newUrl);
            });
        },
        /**
         * @method toUrl
         * @param {String} path
         * @param {Object} params
         * @return {string}
         */
        toUrl: function (path, params) {
            var param;
            for (param in params) {
                if (!params.hasOwnProperty(param)) {
                    continue;
                }
                path = path.replace('/:' + param, '/' + params[param]);
            }
            path = path.replace(/\/:.*\?/g, '/').replace(/\?/g, '');
            if (path.indexOf(':') !== -1) {
                throw new Error('missing parameters for url: ' + path);
            }
            return path;
        },
        destroy: function () {
            this.config.routesList = {};
            BaseEvented.prototype.destroy.call(this);
        },
        /**
         * @method getHash
         * @param {String} [url=window.location.href]
         * @return {String|null}
         */
        getHash: function (url) {
            url = url || window.location.href;
            url = url.match(/#(.*)/);
            return url ? url.pop() : null;
        },
        /**
         * example:
         *      this.addRoute('app/:appName',fnc);
         *      this.addRoute('app/:appName/init',fnc,true); //trigger only once
         *      this.addRoute({
         *         'app/:appName/:id':fnc1,
         *         'app/:appName/show':fnc2
         *      });
         * @method addRoute
         * @param {String|Object} route
         * @param {Boolean|function(params,next)} [p1] if route is object, p1 is a boolean and optional,
         * otherwise, p1 is a function and required
         * @param {Boolean} [p2] if route is a string, p2 is a boolean and optional, otherwise, p2 is undefined
         *
         */
        addRoute: function (route, p1, p2) {
            var mtd, handlers = [];
            if (typeof(route) === 'object') {
                mtd = p1 ? 'once' : 'on';
                Object.keys(route).forEach(function (o) {
                    handlers.push(this[mtd](o, route[o]));
                }, this);
                return {
                    remove: function () {
                        handlers.forEach(function (h) {
                            h.remove();
                        });
                        handlers = null;
                    }
                }
            }
            mtd = p2 ? 'once' : 'on';
            return this[mtd](route, p1);
        },
        removeRule: function (rule) {
            return this.event.purgeListeners(rule);
        },
        revert: function (params) {
            params = params || {};
            this.preventAction = params.preventAction;
            window.history.back(0);
        },
        /**
         * @method setHash
         * @param {String|Object} routeHash
         * @param {Object} [params]
         * @param {Boolean} params.replace
         * @param {Boolean} params.preventAction if set to true, no event will be triggered, only change the hash
         */
        setHash: function (routeHash, params) {
            if (this.config.disabled) {
                return;
            }
            params = params || {};
            if (params.preventAction) {
                this.preventAction = true;
            }
            if (params.replace) {
                window.location.replace('#' + routeHash);
            } else {
                window.location.href = '#' + routeHash;
            }
        },
        setRoute: function (route, params) {
            this.setHash(this.config.routePrefix + route, params);
        },
        /**
         * @method router
         * @param {String} newUrl
         * @param {Number} [startFromIndex]
         * @param {*} opt option from previous route
         */
        router: function router(newUrl, startFromIndex, opt) {
            newUrl = decodeURIComponent(newUrl);
            if (!this.event.hasEvent()) {
                return false;
            }
            var newRoute = this.matchRoute(newUrl, startFromIndex), self = this;

            if (newRoute && this.event.hasListeners(newRoute.route)) {
                this.emit(newRoute.route, newRoute.params, function (_opt) {
                    self.router(newUrl, newRoute.index, _opt);
                }, opt);
                return true;
            }
            return false;
        },
        /**
         * @method matchRoute
         * @param {String} url
         * @param {Number} [startFromIndex]
         * @return {Object|null}
         */
        matchRoute: function (url, startFromIndex) {
            var res, params, idx;
            startFromIndex = startFromIndex || 0;
            this.event.eventList().slice(startFromIndex).some(function (route, i) {
                i += startFromIndex;
                params = this.matchParams(url, this.config.routePrefix + route);
                if (params) {
                    idx = i + 1;
                    return res = route;
                }
            }, this);
            return res ? {
                route: res,
                params: params,
                index: idx
            } : null;
        },
        /**
         * @method ruleToRegexp
         * @param {String|Array} path
         * @param {Array} keys
         * @param {Boolean} [sensitive]
         * @param {Boolean} [strict]
         */
        ruleToRegexp: function (path, keys, sensitive, strict) {
            if (path instanceof RegExp) {
                return path;
            }
            if (path instanceof Array) {
                path = '(' + path.join('|') + ')';
            }
            path = path
                .concat(strict ? '' : '/?')
                .replace(/\/\(/g, '(?:/')
                .replace(/\+/g, '__plus__')
                .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function (_, slash, format, key, capture, optional) {
                    keys.push({ name: key, optional: !!optional });
                    slash = slash || '';
                    return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
                })
                .replace(/([\/.])/g, '\\$1')
                .replace(/__plus__/g, '(.+)')
                .replace(/\*/g, '(.*)');
            return new RegExp('^' + path + '$', sensitive ? '' : 'i');
        },
        matchParams: function (url, rule) {
            var params = {}, match, keys = [];
            rule = this.ruleToRegexp(rule, keys);
            if (match = url.match(rule)) {
                match.shift();
                match.forEach(function (m, i) {
                    if (keys[i]) {
                        params[keys[i].name] = m;
                    }
                });
                return params;
            }
            return null;
        }
    });
    return new Router();
});