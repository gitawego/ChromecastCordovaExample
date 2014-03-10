/*global define,require,console*/
define([
    '../../util/Class',
    '../../util/Interface',
    '../BaseSystem',
    '../../util/databinding/Binder',
    '../../engine/Topic',
    '../../util/Dom',
    '../../util/DomEvent',
    '../../util/Helper',
    '../../util/Array',
    '../../util/keyboard',
    '../../util/Promise',
    'bower_components/hogan/web/builds/2.0.0/hogan-2.0.0.amd'
], function (klass, Interface, BaseSystem, DataBinding, topic, domHelper, domEvent, helper, arrayHelper, keyboard, promise, Hogan) {
    "use strict";
    var slice = Array.prototype.slice,
        executionCommand = new Interface('executionCommand', ['launch', 'stop']);
    /**
     * the front controller of a plugin
     *
     * notice: all implemented method should be able to receive config in the method parameter,
     * beside getting it from class instance.
     *
     *      this.play = function(id){
     *          //get from parameter first, and fallback to instance config
     *          doPlay(id || this.id);
     *      }
     *
     * how to load controller (viewModel)
     *
     *      //in defined action method
     *      this.showTrailers = function(){
     *           this.bindView({
     *               view:'text!com/sesamtv/plugin/vod/views/trailers.html',
     *               model:'com/sesamtv/plugin/vod/models/TrailersController',
     *               namespace:'vod_trailers',
     *               placeAt:'node_root_selector'
     *           }).then(function(binder){
     *                //more code
     *           });
     *      }
     *
     * to unbind
     *
     *      this.emit('unbind/vod_trailers');
     *
     * namespace name convention: **[[plugin_name]]_[[action_name]]**
     *
     * @class com.sesamtv.core.abstract.plugin.BasePlugin
     * @extends com.sesamtv.core.util.abstract.BaseSystem
     * @cfg {Object} config
     * @cfg {Object} config.topics
     * @cfg {Array} config.models
     * @cfg {String|HTMLElement} config.root a DOM selector or HTMLElement
     * @cfg {Array} config.dependencies
     */
    return klass({
        extend: BaseSystem,
        constructor: function BasePlugin(config) {
            Interface.ensureImplements(this, executionCommand);
            if (!this.config) {
                this.config = {
                    name: 'com/sesamtv/plugins/BasePlugin',
                    root: null,
                    topics: null
                };
            }
            klass.applyIf(this, {
                models: {},
                views: {},
                binders: {},
                inputEvts: []
            });
            /**
             * @property instances dependent plugin instances
             * @type {Array.<com.sesamtv.core.abstract.plugin.BasePlugin>}
             */
            this.instances = [];

            BaseSystem.call(this, config);

            this.defaultConfig = helper.deepClone(this.config);
            if (typeof(this.config.root) === "string") {
                this.config.root = document.querySelector(this.config.root);
            }
        },
        getRoot: function () {
            if (typeof(this.config.root) === "string") {
                this.config.root = document.querySelector(this.config.root);
            }
            return this.config.root;
        },
        initEvents: function () {
            var self = this, h;
            this.connect.push(this.on('config', function (opt) {
                if (opt.key === 'topics') {
                    self.initTopics(opt.newValue);
                }
                /* if (opt.key === 'root') {
                 self.config.root = typeof(opt.newValue) === 'string' ?
                 document.querySelector(opt.newValue) : opt.newValue;
                 }*/
                if (opt.key === 'inputEvents') {
                    self.inputEvts.forEach(function (c) {
                        c.remove();
                    });
                    self.inputEvts.length = 0;
                    self.initInputEvents();
                }
            }));

            this.connect.push(this.on('launch', function () {
                if (self.launched) {
                    return;
                }
                if (!self.modelsLoaded) {
                    return self.once('modelsLoaded', function () {
                        self.launch.apply(self, arguments);
                    });
                }
                self.launch.apply(self, arguments);
            }));
            this.connect.push(this.on('stop', function () {
                if (self.stopped) {
                    return;
                }
                self.stop.apply(self, arguments);
            }));
            this.connect.push(this.on('destroy', function () {
                self.destroy.apply(self, arguments);
            }));


            if (this.config.id) {
                this.initInputEvents();
            } else {
                h = this.on('config', function (v) {
                    if (v.key === 'id' && v.newValue) {
                        h.remove();
                        h = null;
                        self.initInputEvents();
                    }
                });
            }
        },
        initInputEvents: function () {
            if (!this.config.inputEvents) {
                return;
            }
            var self = this, handlerName;
            arrayHelper.forEach(this.config.inputEvents, function (evts, i, key) {
                topic.pub('inputManager/getDevice', key, function (device) {
                    arrayHelper.forEach(evts, function (setting, i, evtName) {
                        console.log(self.config.id + '/' + evtName, key);
                        if (key === 'mouse') {
                            handlerName = key + 'Handler';
                            return self[handlerName] && self[handlerName](setting, evtName, device);
                        }
                        self.inputEvts.push(device.on(self.config.id + '/' + evtName, function (evt) {
                            handlerName = key + 'Handler';
                            self[handlerName] && self[handlerName](evt, setting);
                        }));
                    });
                });
            });
        },
        keyboardHandler: function (evt, setting) {
            var keyName = keyboard.getIdentifier(evt.keyCode);
            if (keyName in setting) {
                this.parseHandler(setting[keyName], evt);
            }
        },
        cordovaHandler: function (evt, setting) {
            console.log('cordovaHandler', setting);
            this.parseHandler(setting, evt);
        },
        mouseHandler: function (setting, evtName, device) {
            console.log('mouseHandler', setting);
            var root = this.getRoot(),
                self = this;
            Object.keys(setting).forEach(function (selector) {
                if (selector === '$') {
                    this.inputEvts.push(device.on(root, self.config.id + '/' + evtName, function (evt) {
                        self.parseHandler(setting[selector], evt, this);
                    }));

                } else {
                    this.inputEvts.push(device.on(selector, self.config.id + '/' + evtName, function (evt) {

                        self.parseHandler(setting[selector], evt, this);
                    }));
                }

            }, this);
        },
        parseHandler: function (opt, evt, target) {
            if ('method' in opt) {
                return this[opt.method](evt, opt.params);
            }
            if ('actions' in opt) {
                arrayHelper.forEach(opt.actions, function (step) {
                    if ('publishTopic' in step) {
                        return topic.pub(step.publishTopic, step.params);
                    }
                    if ('dispatchEvent' in step) {
                        this.emit(step.dispatchEvent, step.params);
                    }
                }, this);
            }
        },
        /**
         * @method bindView
         * @param {Object} opt
         * @param {String} opt.view template path
         * @param {String|Function} opt.model model path
         * @param {String} opt.namespace
         * @param {String|HTMLElement} opt.placeAt
         * @param {HTMLElement} [targetNode]
         * @returns {com.sesamtv.core.util.Promise}
         */
        bindView: function (opt, targetNode) {
            var self = this, deferred = promise(), vm, deps = [], binder, tplStr,
                action = function (tplStr, Model) {
                    tplStr = Hogan.compile(tplStr).render(opt);
                    if (!targetNode) {
                        if (!opt.placeAt || opt.placeAt === "") {
                            targetNode = self.getRoot();
                        } else {
                            targetNode = opt.placeAt instanceof HTMLElement ?
                                opt.placeAt : self.getRoot().querySelector(opt.placeAt);
                        }
                    }
                    targetNode.insertAdjacentHTML('beforeend', tplStr);
                    binder = new DataBinding({
                        root: targetNode,
                        namespace: opt.namespace
                    });
                    vm = Model ? new Model(binder, self) : opt.model;
                    vm.set('binder', binder);
                    vm.set('plugin', self);
                    binder.bind(vm);
                    self.binders[opt.namespace] = binder;
                    self.connect.push(self.once('unbind/' + opt.namespace, function () {
                        binder.unbind();
                        delete self.binders[opt.namespace];
                    }));
                    deferred.resolve(binder);
                };
            if (opt.namespace in this.binders) {
                deferred.resolve(self.binders[opt.namespace]);
                return deferred;
            }
            if (opt.view.match(/^text!/)) {
                deps.push(opt.view);
            } else {
                tplStr = opt.view;
            }
            if (typeof(opt.model) === 'string') {
                deps.push(opt.model);
            }


            if (deps.length === 0) {
                action(tplStr);
            } else {
                require(deps, function (opt1, opt2) {
                    tplStr ? action(tplStr, opt1) : action(opt1, opt2);
                });
            }

            return deferred;
        },

        /**
         * @method launch
         * @param {*} params
         * @fires launched
         * @abstract
         */

        /**
         * @method stop
         * @fires stopped
         * @abstract
         */

        destroy: function () {
            BaseSystem.prototype.destroy.call(this);
            Object.keys(this.binders).forEach(function (binder) {
                binder.unbind();
            });
        }

    });
});
