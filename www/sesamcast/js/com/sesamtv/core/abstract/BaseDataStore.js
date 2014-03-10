define([
    '../util/Class',
    './../util/store/AbstractDataStore',
    '../util/Helper',
    '../util/XHR'
], function (Class, AbstractDataStore, helper, xhr) {
    "use strict";
    /**
     * @class com.sesamtv.core.abstract.BaseDataStore
     * @extends com.sesamtv.core.util.store.AbstractDataStore
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     * @cfg {Number} config.maxResults max results of store
     * @cfg {Number} [config.firstItemIndex=0]
     */
    var BaseDataStore = Class({
        extend: AbstractDataStore,
        constructor: function (config) {
            AbstractDataStore.call(this, config);
            if (!('firstItemIndex' in this)) {
                this.firstItemIndex = 0;
            }
        },
        load: function () {
            var self = this;
            if (this.url) {
                this.once('data', function (data) {
                    this.data = data;
                    if (self.formatter) {
                        this.data = self.formatter(this.data);
                    }
                    self.emit('loaded', this.data);
                });
                this.fetchData(this.url, {
                    content: this.defFetchParams
                });
            } else if (this.data) {
                this.emit('loaded', this.data);
            }
        },
        /**
         * @method fetchData
         * @param {String} [url]
         * @param {Object} [params]
         */
        fetchData: function (url, params) {
            var self = this;
            params = params || {};
            var xhrConf = {
                onload: function (data) {
                    self.emit('data', data);
                }
            };
            Class.mixin(xhrConf, params);
            xhrConf.handleAs = xhrConf.handleAs || 'json';
            xhr(url || this.url, xhrConf);
            return this;
        },
        /**
         * get value from data store
         * @method getValue
         * @abstract
         * @param {String} key
         * @return {*}
         */
        getValue: function (key) {

        },
        /**
         * set value in data store
         * @method setValue
         * @abstract
         * @param {String} key
         * @param {*} value
         */
        setValue: function (key, value) {

        }
    });
    return BaseDataStore;
});