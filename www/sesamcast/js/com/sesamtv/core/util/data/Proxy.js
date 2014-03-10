define([
    'module'
    , '../Class'
    , '../BaseEvented'
    , '../Helper'
    , '../Encoding'
    , '../Promise'
    , '../../engine/TaskManager'
    , '../../engine/request/Manager'
    , './ParserFactory'
    , '../../engine/CacheManager'
], function (module, Class, BaseEvented, helper, encoding, Promise, TaskManager, requestManager, dataFactory, cacheManager) {
    'use strict';
    /**
     *
     * @class com.sesamtv.core.util.data.Proxy
     * @extends com.sesamtv.core.util.BaseEvented
     */
    var DataProxy = Class({
        extend: BaseEvented,
        constructor: function DataProxy(args) {
            this.initialized = false;
            this.requestHandler = null;
            this.config = {
                fetchConfig: null
            };
            BaseEvented.call(this, args);
            this.loadDefaultParsers();
        },
        /**
         * @method loadDefaultParsers
         * @param {Array} [parsers]
         * @returns {*}
         */
        loadDefaultParsers: function (parsers) {
            parsers = parsers || this.config.defaultParsers;
            if (!parsers) {
                return this.set('initialized', true);
            }
            var self = this;
            require(parsers, function () {
                self.set('initialized', true);
            });
        },
        /**
         * @method fetch
         * @param {Object} [config]
         * @param {String} [config.url]
         * @param {String} config.collectionName
         * @param {Object} config.query
         * @param {Number} config.query.start
         * @param {Number} config.query.total
         * @param {String} config.policyName
         * @param {Object} [config.policy] this will be overwritten if policyName is defined
         * @param {Function} config.updater
         * @param {*} config.query an object or string depending on request type
         */
        fetch: function (config) {
            if (!this.initialized) {
                this.once('initialized', function () {
                    this.fetch(config);
                });
                return this;
            }
            if (!config) {
                config = this.config.fetchConfig;
            }
            if (!this.config.fetchConfig && config) {
                this.config.fetchConfig = config;
            }
            if (!config) {
                throw new Error('fetch config is undefined');
            }
            if (this.taskManager && this.taskManager.queue.length > 0) {
                return this.abort().fetch();
            }

            if ('policyName' in config) {
                config.policy = config.dataPolicy.items[config.policyName] || config.policy;
            }
            var hash = this.getUUID(config),
                self = this,
                tasks = [],
                collectionName = config.collectionName ? config.collectionName : hash,
                collection, updater = config.updater;

            if (!config.disableCache) {
                collection = cacheManager.select(collectionName, {
                    lifetime: config.policy.cache.lifetime,
                    isArray: true
                })[config.policy.cache.storageType];
                //step 1: cacheManager
                tasks.push({
                    id: 'cacheManager',
                    task: this.stepCacheManager(config, collection)
                });
            }

            //step 2: requestManager
            tasks.push({
                id: 'requestManager',
                task: this.stepRequestManager(config)
            });

            //step 3: dataFactory
            tasks.push({
                id: 'dataFactory',
                task: this.stepDataFactory(config)
            });

            this.taskManager = new TaskManager(tasks, function (err, parsedData) {
                if (err) {
                    self.emit('aborted', err);
                    return;
                }
                this.taskDone(config, parsedData, collection, updater);
            }, {
                scope: this
            });
            this.taskManager.run();
            return this;
        },
        stepCacheManager: function stepCacheManager(config, collection) {
            var self = this;
            return function stepCacheManager(next) {
                var res = collection.query(config.query);
                if (self.taskManager.status === 'cancelled') {
                    return;
                }
                self.emit('data', res.data, config.query);
                config.updater && config.updater(res.data);

                if (res.length === config.query.total) {
                    self.requestHandler = null;
                    return next(false);
                }
                next(true, res);
                return {
                    onCancelled: function () {
                        collection && collection.abort();
                    }
                };
            };
        },
        stepRequestManager: function stepRequestManager(config) {
            var self = this;
            return function stepRequestManager(next, res) {
                //if it's the first step
                var conf = helper.deepClone(config.policy.request);

                res = res || {
                    length: 0
                };
                conf.query = {
                    start: config.query.start + res.length,
                    total: config.query.total - res.length
                };
                conf.updater = function requestUpdater(rawData) {
                    next(true, rawData);
                };
                if (self.taskManager.status === 'cancelled') {
                    return;
                }
                self.requestHandler = requestManager.fetch(conf);
                return {
                    onCancelled: function () {
                        self.requestHandler && self.requestHandler.abort();
                    }
                };
            };
        },
        stepDataFactory: function stepDataFactory(config) {
            var self = this;
            return function stepDataFactory(next, rawData) {
                self.dataParser = dataFactory.getInstance(config.policy);
                self.dataParser.on('data', function (res) {
                    next(true, res);
                });
                if (self.taskManager.status === 'cancelled') {
                    return;
                }
                self.dataParser.parse(rawData);
                return {
                    onCancelled: function () {
                        self.dataParser && self.dataParser.abort();
                    }
                };
            };
        },
        /**
         * @method taskDone
         * @param {Object} config
         * @param {Object} parsedData
         * @param {com.sesamtv.core.engine.CacheManager} [collection]
         * @param {Function} [updater]
         *
         */
        taskDone: function taskDone(config, parsedData, collection, updater) {
            parsedData = parsedData instanceof Array ? parsedData : parsedData.items;
            updater && updater(parsedData);
            collection && collection.sync(parsedData, config.query);
            this.emit('data', parsedData, config.query);
            delete this.requestHandler;
            delete this.taskManager;
            delete this.dataParser;
        },
        getUUID: function (config) {
            var obj = {}, include = ['url', 'policyName'];
            include.forEach(function (k) {
                if (k in config) {
                    obj[k] = config[k];
                }
            });
            return encoding.hashCode(JSON.stringify(obj));
        },
        abort: function () {
            this.taskManager.cancel();
            return this;
        }
    });
    return function Proxy(config) {
        var handler = (new DataProxy(module.config()));
        if (config) {
            handler.setConfig('fetchConfig', config);
        }
        return handler;
    };
});