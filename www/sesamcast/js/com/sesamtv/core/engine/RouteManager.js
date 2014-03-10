/*global define,require,console*/
define([
    'module',
    'require',
    '../util/Class',
    '../abstract/BaseSystem',
    './Topic',
    '../util/DomEvent',
    '../util/Router',
    '../util/Promise',
    '../util/Helper',
    '../../config/config'
], function (module, require, klass, BaseSystem, topic, DomEvent, router, promise, helper, loadCoreConfig) {
    "use strict";
    var slice = Array.prototype.slice;
    /**
     * @class com.sesamtv.core.engine.RouteManager
     * @extend com.sesamtv.core.abstract.BaseSystem
     * @singleton
     */
    var RouteManager = klass({
        extend: BaseSystem,
        singleton: true,
        constructor: function (args) {

            this.config = {
                initialHash: window.location.hash.length > 0 ? window.location.hash.substr(1) : null,
                stateConnect: {},
                routeCallback:[],
                currentState: null
            };
            BaseSystem.call(this, args);


        },
        getSceneConfig: function (state) {
            return this.getAppConfig().scenes.items[this.getStateConfig(state).scene];
        },
        getStateConfig: function (state) {
            state = state || this.config.currentState;
            return this.config.states.items[state];
        },
        init: function () {
            topic.pub('inputManager/importDevices');
            topic.pub('focusManager/attachInput');
            topic.pub('inputManager/setCurrentChannel', 'focusManager');
            /**
             * when state has been changed
             * @event currentState
             */
            this.setConfig('currentState', this.config.states.defaultState);
            this.config.stateConnect[this.config.states.defaultState] = [];
            var currStateConfig = this.getStateConfig();
            var defRoute = currStateConfig.defaultRoute;
            if(defRoute.force){
                window.location.replace('#');
            }
            this.enableRouter().
                setRoute(defRoute, {
                    autoDetect: true
                });
        },
        composeRoute: function (action, state) {
            state = state || this.config.currentState;
            var arr = [loadCoreConfig().appId, state],route;
            if (action !== '/') {
                arr.push(action);
            }
            route = arr.join('/')+'/';
            if(route.charAt(0) !== '/')    {
                route = '/'+route;
            }
            return route;
        },
        enableRouter: function () {
            var routePattern = this.config.states.routePattern;
            Object.keys(routePattern).forEach(function (route) {
                if (routePattern[route] in this) {
                    this.connect.push(
                        router.addRoute(
                            loadCoreConfig().appRoutePattern + '/' + route,
                            this[routePattern[route]].bind(this)
                        )
                    );
                }
            }, this);
            return this;
        },
        /**
         * use this method to change state in script,
         * autoDetect and preventAction should either be undefined, or set to false
         *
         * @method setRoute
         * @param {Object} routeOpt
         * @param {String} [routeOpt.route] if route is not defined, state must be defined
         * @param {String} [routeOpt.state]
         * @param {Object|String} [routeOpt.params]
         * @param {Object} [params] params for router
         * @param {Boolean} [params.preventAction]
         * @param {function(Boolean)} [callback]
         */
        setRoute: function (routeOpt, params,callback) {
            if (!routeOpt.route && routeOpt.state) {
                klass.mixin(routeOpt, this.getStateConfig(routeOpt.state).defaultRoute);
            }
            params = params || {};
            if(!routeOpt.route){
                callback && callback(false);
                return;
            }
            var route = this.composeRoute(routeOpt.route, routeOpt.state),
                hash = router.getHash(),
                initialHash = loadCoreConfig().appId + '/',
                paramStr;
            if(initialHash.charAt(0) !== '/'){
                initialHash = '/'+initialHash;
            }
            if (hash && params.autoDetect) {
                if (hash === initialHash) {
                    params.replace = true;
                } else {
                    if(!router.router(hash)){
                        callback && callback(false);
                    }else{
                        callback && this.config.routeCallback.push(callback);
                    }
                    return this;
                }
            }

            if (routeOpt.params) {
                paramStr = typeof(routeOpt.params) === 'object' ? JSON.stringify(routeOpt.params) : (routeOpt.params + '');
                paramStr = encodeURIComponent(paramStr);
                route = [route].concat(paramStr).join("");
            }
            router && router.setHash(route, params);
            callback && this.config.routeCallback.push(callback);
            return this;
        },
        /**
         * add events cross plugins
         * @method initStateEvents
         */
        initStateEvents: function () {
            if (this.stateEventsAttached === this.config.currentState) {

                return;
            }
            var currStateConfig = this.getStateConfig(), self = this;
            if (currStateConfig.events) {
                Object.keys(currStateConfig.events).forEach(function (evtName) {
                    topic.pub('pluginManager/on', evtName, function () {
                        topic.pub.apply(topic,['pluginManager/emit',currStateConfig.events[evtName]].concat(slice.call(arguments)));
                        //this.emit.apply(this, [currStateConfig.events[evtName]].concat(slice.call(arguments)));
                    }, function (handler) {
                        self.config.stateConnect[self.config.currentState].push(handler);
                    });

                }, this);
            }
            this.stateEventsAttached = this.config.currentState;
        },
        /**
         * initialize events for RouteManager
         * @method initEvents
         */
        initEvents: function () {
            var self = this, stateConfig;
            this.connect.push(this.on('config', function (opt) {
                if (opt.key === 'currentState') {
                    self.updateFocusGroup(opt.newValue);
                }
            }));

        },
        updateFocusGroup:function(groupId){
            var stateConfig = this.getStateConfig(groupId);
            topic.pub('focusManager/addFocusGroup', groupId, stateConfig.focus);
            topic.pub('focusManager/switchGroup', groupId);
        },
        hasState: function (state) {
            return state in this.config.states.items;
        },
        /**
         * control the state based on router
         * @method stateRoute
         * @param {Object} params
         * @param {Function} next if state is valid, passes to action router
         * @returns {*}
         */
        stateRoute: function (params, next) {
            var self = this;
            console.log('stateRoute', params, this.config);

            if (!this.hasState(params.state)) {
                if(this.config.routeCallback.length){
                    this.config.routeCallback.shift()(false);
                }
                return router.revert({
                    preventAction: true
                });
            }

            this.config.stateConnect[params.state] = this.config.stateConnect[params.state] || [];
            //todo initialize layout (rendering engine)
            if (params.state === this.config.currentState) {
                return next();
            }

            this.changeState(params.state).then(function (status) {
                //todo change layout (rendering engine)
                next();
            });
        },
        /**
         * last part should be encoded by encodeURIComponent
         * ex: app/youtube/vod/show/id%3D1%26theme%3Dblack
         * master plugin is initialized in action route (call on demande)
         * @method actionRoute
         * @param params
         */
        actionRoute: function (params) {
            console.log('actionRoute', params, this.config);
            if (!(params.state in this.config.states.items)) {
                if(this.config.routeCallback.length){
                    this.config.routeCallback.shift()(false);
                }
                return router.revert({
                    preventAction: true
                });
            }
            var state = this.config.states.items[params.state],
                currRouteSetting = state.routes[params.action],
                coreConfig = loadCoreConfig(),
                self = this, stateModule,
                postAction = function () {
                    self.initStateEvents();
                    topic.pub(currRouteSetting.topic, params.params);
                    //topic.pub('focusManager/selectMap');
                };
            if (!currRouteSetting) {
                if(this.config.routeCallback.length){
                    this.config.routeCallback.shift()(false);
                }
                return router.revert({
                    preventAction: true
                });
            }


            if (params.params) {
                params.params = decodeURIComponent(params.params);
                if (currRouteSetting.params) {
                    params.params = helper.castType(params.params, currRouteSetting.params.type);
                }
            }

            if(self.config.routeCallback.length){
                self.config.routeCallback.shift()(true);
            }
            if (state.stateFile) {
                stateModule = 'app/states/' + params.state;
                return require([stateModule], function () {
                    self.loadPlugins.then(postAction);
                });
            }
            this.loadPlugins().then(postAction);
        },
        loadPlugins: function () {
            var stateConfig = this.getStateConfig(), deferred = promise();
            topic.pub('pluginManager/addPlugins', stateConfig.plugins, true, function () {
                deferred.resolve();
            });
            return deferred;
            //return pluginManager.addPlugins(stateConfig.plugins, true);
        },
        destroy: function () {
            this.connect.forEach(function (c) {
                c.remove();
            }).length = 0;
            router && router.destroy();
        },
        /**
         * ex:
         *      for path: /vod_state/play/mostViewed
         *      state: vod_state
         *      route: play
         *      params: ["mostViewed"]
         * @method getInfoFromHash
         * @param hash
         * @returns {{state: String, route: String, params: Array}}
         */
        getInfoFromHash: function (hash) {
            var parts = hash.split("/");
            return {
                state: parts.shift(),
                route: parts.shift(),
                params: parts
            };
        },
        /**
         * topic: stateManager/changeState
         * topic.pub('stateManager/changeState','mapa');
         * @method changeState
         * @param {String} stateId
         * @return {com.sesamtv.core.util.Promise}
         */
        changeState: function (stateId) {
            var self = this,
                state = this.getStateConfig(stateId),
                currentPluginName = this.getStateConfig().plugin,
                tranMode = this.config.states.transitionMode,
                deferred = promise(),
                run = function () {
                    self.disconnect(self.config.currentState);
                    self.setConfig('currentState', stateId);
                    deferred.resolve(true);
                };

            topic.pub('pluginManager/on', currentPluginName + '/stopped', function () {
                this.unloadPlugin(currentPluginName);
            }, null, true);

            this[tranMode[state.transitionMode] || tranMode[tranMode['default']]](currentPluginName, run);
            topic.pub('pluginManager/emit', currentPluginName + '/stop');
            //todo unload all plugins
            return deferred;
        },
        /**
         * handler for transition mode 'combine'
         * @method transitionCombine
         * @param {String} currentPluginName
         * @param {Function} callback
         */
        transitionCombine: function (currentPluginName, callback) {
            callback();
        },
        /**
         * handler for transition mode 'chain'
         * @method transitionChain
         * @param {String} currentPluginName
         * @param {Function} callback
         */
        transitionChain: function (currentPluginName, callback) {
            topic.pub('pluginManager/on', currentPluginName + '/stopped', callback, null, true);
        },
        disconnect: function (state) {
            state = state || this.config.currentState;
            this.config.stateConnect[state].forEach(function (c) {
                c.remove();
            }).length = 0;
        }
    });
    return new RouteManager(module.config());
});