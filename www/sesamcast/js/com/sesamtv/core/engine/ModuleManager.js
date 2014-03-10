define([
    'module',
    '../util/Class',
    '../util/Helper',
    '../util/Promise',
    '../abstract/BaseSystem',
    './Topic',
    '../../config/config',
    '../util/CustomError'
], function (module, Class, helper, Promise, BaseSystem, topic, coreConfig, CustomError) {
    "use strict";
    var slice = Array.prototype.slice,
        Invalid = new CustomError({
            name: "ModuleManager",
            errors: {
                "PLUGIN_NOT_FOUND": "Plugin %s is not found"
            }
        }),
        moduleDependencies = {},
        daemonPlugins = {};
    /**
     * pluginManager manages only the master plugins
     * @class com.sesamtv.core.engine.ModuleManager
     * @extends com.sesamtv.core.abstract.BaseSystem
     * @singleton
     */
    var ModuleManager = Class({
        extend: BaseSystem,
        singleton: true,
        constructor: function (args) {
            /**
             * @property instances
             * @type {Object.<String,com.sesamtv.core.abstract.BaseSystem>}
             */
            this.instances = {};
            this.config = {
            };
            BaseSystem.call(this, args);
            this.trackDependencies();
        },
        /**
         * track dependencies of plugins
         * @method trackDependencies
         * @param {Boolean} [disable]
         */
        trackDependencies: function (disable) {
            if (disable) {
                delete requirejs.onResourceLoad;
                moduleDependencies = {};
                return;
            }
            var reg = this.getRegExp('plugins');

            requirejs.onResourceLoad = function (context, map, depArray) {
                //console.log('onResourceLoad', arguments);
                if (!map.id.match(reg)) {
                    return;
                }
                moduleDependencies[map.id] = [];
                for (var i = 0, l = depArray.length; i < l; i++) {
                    if (depArray[i].id.match(reg)) {
                        moduleDependencies[map.id].push(depArray[i].id);
                    }
                }
            };
        },
        /**
         * @method getDependencies
         * @param {String} moduleId
         * @returns {Array}
         */
        getDependencies: function (moduleId) {
            return moduleDependencies[moduleId] && moduleDependencies[moduleId].slice(0);
        },
        /**
         * @method isModuleRequired
         * @param {String} moduleId
         * @returns {Boolean}
         */
        isModuleRequired: function (moduleId) {
            var module, isRequired = false;
            Object.keys(moduleDependencies).some(function (id) {
                module = moduleDependencies[id];
                return isRequired = module.indexOf(moduleId) !== -1;
            });
            return isRequired;
        },
        /**
         * unload master plugin class and its dependencies
         *      this.unloadPlugin('vod');
         * @method unloadPlugin
         * @param {String} id
         */
        unloadPlugin: function (id) {
            var pluginConfig = this.getAppConfig().plugins[id];
            if (!pluginConfig) {
                return;
            }
            if (this.unloadDependencies(id)) {
                this.removePluginInstance(id);
            }
        },
        /**
         * unload all the dependencies of given module (plugin)
         * @method unloadDependencies
         * @param {String} moduleId the id of plugin
         */
        unloadDependencies: function (moduleId) {
            var deps = this.getDependencies(moduleId);
            if (!deps) {
                return false;
            }
            deps.forEach(function (dep) {
                if (!this.isModuleRequired(dep)) {
                    require.undef(dep);
                }
            }, this);
            require.undef(moduleId);
            delete moduleDependencies[moduleId];
            return true;
        },
        /**
         * add plugin, if it exists, and having config, set context config
         * @method addPlugins
         * @param {Array.<Object>} plugs
         * @param {Boolean} exclusive
         * @param {Function} [callback]
         * @return {com.sesamtv.core.util.Promise}
         */
        addPlugins: function (plugs, exclusive, callback) {
            var self = this, deferred = Promise(), i = 0, l, dep = [], appConfig = this.getAppConfig(), plugConfig, ids = [];
            plugs = plugs.filter(function (plugConf) {
                ids.push(plugConf.id);
                if (plugConf.id in this.instances) {
                    if ('config' in plugConf) {
                        this.instances[plugConf.id].setConfigs(plugConf.config);
                    }
                    return false;
                }
                dep.push(plugConf.plugin);
                return true;
            }, this);
            if (plugs.length === 0) {
                deferred.resolve();
                callback && callback();
                return deferred;
            }
            if (exclusive) {
                Object.keys(this.instances).forEach(function (id) {
                    if (ids.indexOf(id) === -1) {
                        this.removePluginInstance(id);
                    }
                }, this);
            }
            require(dep, function () {
                for (l = arguments.length; i < l; i++) {
                    plugConfig = plugs[i];
                    self.instantiate(plugConfig.id, arguments[i],
                        helper.merge(appConfig.plugins[plugConfig.plugin] || {}, plugConfig.config || {}));
                }
                deferred.resolve();
                callback && callback();
            });
            return deferred;
        },
        /**
         * @method instantiate
         * @param {String} instId
         * @param {function(Object)} Plug
         * @param {Object} [params]
         */
        instantiate: function (instId, Plug, params) {
            var deferred = Promise(), inst = new Plug(params);
            this.instances[instId] = inst;
            inst.setConfig('id', instId);
            this.emit('pluginAdded', instId);
            return deferred;
        },
        /**
         * @method getPlugin
         * @param {String} id instance id
         * @returns {com.sesamtv.core.abstract.BaseSystem}
         */
        getPlugin: function (id) {
            return this.instances[id];
        },
        /**
         * get dependency
         * @method getDependency
         * @param {String} id
         * @returns {*}
         */
        getDependency: function (id) {
            if (id in this.config.dependencies) {
                return this.instances[id] || this.getPlugin(id);
            }
            return null;
        },
        parseEventName: function (query) {
            var parts = query.split("/");
            return {
                eventName: parts.pop(),
                pluginName: parts.join("/")
            };
        },
        topicEvent: function (eventName, listener, callback, once) {
            callback && callback(this[once ? 'once' : 'on'](eventName, listener));
        },
        /**
         * @method focusPlugin
         * @param {String} action focus or blur
         * @param {String} id plugin instance id
         */
        focusPlugin: function (action, id) {
            console.log('focusPlugin', action, id);

            var self = this, plugin, m, h;
            if (m = id.match(/#ref:(.*)/)) {
                //when change state is triggered by focus manager, a callback is defined to be able to revert to previous focus map
                return topic.pub('stateManager/changeState', {
                    state: m[1].trim()
                }, null, function (status) {
                    !status && topic.pub('focusManager/revert', null, true);
                });
            }
            plugin = this.getPlugin(id);
            if (!plugin) {
                h = this.on('pluginAdded', function (plugId) {
                    if (plugId === id) {
                        h.remove();
                        h = null;
                        self.getPlugin(id).emit(action);
                    }
                });
                return;
            }
            plugin.emit(action);
        },
        /**
         * ref to topic: focusManager/selected
         * @method selectPlugin
         * @param {String} pluginId
         */
        selectPlugin: function (pluginId) {
            console.log('pluginId', pluginId);
            var plugin;
            if (pluginId.match(/#ref:(.*)/)) {
                //if we arrive here, it means we use mouse/touch to interact,
                // because with mouse/touch, focus and select occur at the same time
                return topic.pub('stateManager/changeState', {
                    state: m[1].trim()
                }, null, function (status) {
                    !status && topic.pub('focusManager/revert');
                });
            }
            if (plugin = this.getPlugin(pluginId)) {
                plugin.emit('selected');
                topic.pub('focusManager/delegateFocus', plugin);
            }
        },
        /**
         * ref to topic: focusManager/unselected
         * @method unselectPlugin
         * @param {String} pluginId
         */
        unselectPlugin: function (pluginId) {
            var plugin;
            if (pluginId.match(/#ref:(.*)/)) {
                //ignore state reference
                return;
            }
            if (plugin = this.getPlugin(pluginId)) {
                plugin.emit('unselected');
            }
        },
        /**
         * to stop plugin vod:
         *
         *      this.emit('pluginId1/stop');
         *
         * @method emit
         * @param eventName
         * @returns {*}
         */
        emit: function (eventName) {
            var info = this.parseEventName(eventName), args = slice.call(arguments, 1), plug;
            if (!info.pluginName) {
                return BaseSystem.prototype.emit.apply(this, arguments);
            }
            if (plug = this.getPlugin(info.pluginName)) {
                return plug.emit.apply(plug, [info.eventName].concat(args));
            }
            //new Invalid("PLUGIN_NOT_FOUND",info.pluginName).throw();
        },
        /**
         * to listen to event of  plugin
         *
         *      this.on('pluginId1/destroyed',function(){});
         *
         * @method on
         * @param {String} eventName
         * @param {Function} fnc
         * @returns {*}
         */
        on: function (eventName, fnc) {
            var info = this.parseEventName(eventName), args = slice.call(arguments, 1), plug;
            if (!info.pluginName) {
                return BaseSystem.prototype.on.apply(this, arguments);
            }
            if (plug = this.getPlugin(info.pluginName)) {
                return plug.on.apply(plug, [info.eventName].concat(args));
            }
            //new Invalid("PLUGIN_NOT_FOUND",info.pluginName).throw();
        },
        /**
         * @method removePluginInstance
         * @param {String} id
         * @param {Boolean} [force] force remove a daemon instance
         * @returns {boolean|Object}
         */
        removePluginInstance: function (id, force) {
            if (id in this.instances) {
                if (!force && this.instances[id].config.daemon) {
                    return {
                        reason: 'DAEMON',
                        code: 0
                    };
                }
                this.instances[id].emit('destroy');
                delete this.instances[id];
                return true;
            }
            return {
                reason: 'NOT_FOUND',
                code: 0
            };
        }

    });
    return new ModuleManager(module.config());
});