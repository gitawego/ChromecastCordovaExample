//index.html#vod/Vod/
//index.html#vod/Vod/list
/*
 1. les instances de plugin sont stockees dans ModuleManager.instances;
 2. chaque plugin a une liste de dependances qui font reference a pluginManager.instances
 3.
 */
define([
    'module',
    '../util/Class',
    '../util/BaseEvented',
    '../engine/Topic',
    '../../config/config'
], function (module, Class, BaseEvented, topic, coreConfig) {
    "use strict";
    var slice = Array.prototype.slice;
    /**
     * @class com.sesamtv.core.abstract.BaseSystem
     * @singleton
     * @extends com.sesamtv.core.util.BaseEvented
     */
    var BaseSystem = Class({
        extend: BaseEvented,
        constructor: function (args) {
            this.config = this.config || {};
            //this.config.managerName = this.config.managerName || "";
            BaseEvented.call(this);
            args && Class.mixin(this.config, args);

            this.initTopics();
            this.initEvents();

        },
        /**
         * initialize topics
         * @method initTopics
         */
        initTopics: function () {
            var tpConfig, self = this, args;
            this.config.topics && Object.keys(this.config.topics).forEach(function (t) {

                //todo verify login and right
                tpConfig = this.config.topics[t];
                if(tpConfig.topic){
                    return topic.sub(t,function(){
                        args = slice.call(arguments);
                        topic.pub.apply(topic,[tpConfig.topic].concat(args));
                    });
                }
                if (tpConfig.event){
                    return topic.sub(t,function(){
                        args = slice.call(arguments);
                        self.emit.apply(self,[tpConfig.event].concat(args));
                    });
                }
                if (!(tpConfig.method in this)) {
                    throw new Error('method ' + tpConfig.method + ' is not defined');
                }
                topic.sub(t, tpConfig.params ? this[tpConfig.method].bind(this, tpConfig.params) : this[tpConfig.method].bind(this), tpConfig.once);
            }, this);
        },
        /**
         * @method getRegExp
         * @param {Object|String} id regexp id or regexp object
         * @returns {RegExp}
         */
        getRegExp: function (id) {
            var regRule;
            if (typeof(id) === 'object') {
                regRule = id;
            } else if (!this.config.regExp || !(regRule = this.config.regExp[id])) {
                return null;
            }
            return new RegExp(regRule.pattern, regRule.flags);
        },
        /**
         * @method initEvents
         * @abstract
         */
        initEvents: function () {

        },
        /**
         * app's config must be loaded first, as we use commonjs style
         * @method getAppConfig
         * @returns {Object}
         */
        getAppConfig: function () {
            var coreConf = coreConfig.config;
            return require('com/sesamtv/config/config').config;
        }
    });
    return BaseSystem;
});