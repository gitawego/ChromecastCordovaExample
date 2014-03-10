define([
    '../util/Class',
    '../abstract/BaseDataStore',
    '../util/XHR'
], function (Class, BaseDataStore, xhr) {
    "use strict";
    /**
     * @class com.sesamtv.core.plugins.channelProvider.Plugin
     * @extends com.sesamtv.core.abstract.BaseDataStore
     * @requires com.sesamtv.core.util.XHR
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     */
    var Channels = Class({
        extend: BaseDataStore,
        constructor: function (config) {
            BaseDataStore.call(this, config);

            this.url = this.url || '../common/localdata/epg/getChannels.json';

            this.itemsPerPage = this.itemsPerPage || 48;
            this.startIndex = 0;
            this.defFetchParams = this.defFetchParams || {};
            Object.defineProperties(this, {
                'maxResults': {
                    get: function () {
                        return Math.min(1000, this.getValue('totalResults'));
                    }
                }
            });
        },
        load: function () {
            var self = this;
            if (this.url) {
                this.fetchData({
                    callback: function (data) {
                        self.data = data;
                        if (self.formatter) {
                            self.data = self.formatter(self.data);
                        }
                        self.emit('loaded', self.data);
                    }
                });
            } else if (this.data) {
                this.emit('loaded', this.data);
            }
        },
        fetchData: function (params) {
            params = params || {};
            var self = this,
                url = this.url,
                callback = params.callback,
                items;
            delete params.callback;
            var xhrConf = {
                onload: function (data) {
                    callback && callback(data);
                    self.emit('data', data);
                },
                content: Class.mixin({}, this.defFetchParams)
            };
            Class.mixin(xhrConf.content, params);
            xhrConf.handleAs = xhrConf.handleAs || 'json';
            xhr(url, xhrConf);
            return this;
        },
        /**
         * @method getValue
         * @param {String} key
         * @param {Object} [item]
         * @returns {*}
         */
        getValue: function (key, item) {
            var item = item || this.data.data;
            if (key == 'totalResults') {
                return item.length;
            }
            if (key == 'startIndex') {
                return this.startIndex;
            }
            if (key == 'itemsPerPage') {
                return this.itemsPerPage;
            }
            if (key in item) {
                return item[key];
            }
        },
        setValue: function (key, value, item) {
            var item = item || this.data.data;
            if (item[key]) {
                return item[key] = value;
            }
        },
        getItems: function (options) {
            var cachedData;
            options = options || {};
            options.data = options.data || this.data;
            if (!('startIndex' in options)) {
                return options.data.data || [];
            }
            //out of range
            if (this.getValue('startIndex') > options.startIndex ||
                this.getValue('startIndex') + this.getValue('totalResults') < options.startIndex + options.itemsPerPage) {
                return [];
            }
            var startIndex = options.startIndex;
            if ((cachedData = options.data.data.slice(startIndex, startIndex + options.itemsPerPage)).length) {
                return cachedData;
            }
            return [];
        },
        launch:function(){

        },
        stop:function(){

        }
    });
    return Channels;
});