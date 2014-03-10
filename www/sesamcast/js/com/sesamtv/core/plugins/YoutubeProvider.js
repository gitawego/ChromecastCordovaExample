define([
    '../util/Class',
    '../abstract/BaseDataStore',
    '../util/XHR'
], function (Class, BaseDataStore, xhr) {
    "use strict";
    /**
     * @class com.sesamtv.core.plugins.YoutubeProvider
     * @extends com.sesamtv.core.abstract.BaseDataStore
     * @requires com.sesamtv.core.util.XHR
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     */
    var Youtube = Class({
        extend: BaseDataStore,
        constructor: function (config) {
            BaseDataStore.call(this, config);
            this.firstItemIndex = 1;

            this.lang = this.lang || 'FR';
            this.url = this.url || 'http://gdata.youtube.com/feeds/api/standardfeeds/' + this.lang + '/';
            this.thumbnailSize = this.thumbnailSize || {
                height: 180,
                width: 320
            };
            this.itemsPerPage = this.itemsPerPage || 48;
            this.defFetchParams = this.defFetchParams || {
                v: 2,
                alt: 'json',
                'max-results': this.itemsPerPage,
                format: 5,
                time: 'this_month',
                hd: true
            };
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
                    category: this.currentCategory || 'most_popular',
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
            if (params.category) {
                this.currentCategory = params.category;
                delete params.category;
            }
            if ('startIndex' in params) {
                params['start-index'] = params.startIndex;
                delete params.startIndex;
            }
            if ('maxResults' in params) {
                params['max-results'] = params.maxResults;
                delete params.maxResults;
            }
            var self = this,
                url = this.url + this.currentCategory,
                callback = params.callback;
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
         * @param {Object} [params]
         * @returns {*}
         */
        getValue: function (key, item, params) {
            var params = params || {}, res, item = item || this.data.feed;
            if (item[key]) {
                if ('$t' in item[key]) {
                    return item[key]['$t'];
                } else {
                    return item[key];
                }
            }
            switch (key) {
                case 'thumbnail':
                    params.height = params.height || 90;
                    params.width = params.width || 120;
                    item['media$group']['media$thumbnail'].some(function (thumbnail) {
                        if (thumbnail.height == params.height && thumbnail.width == params.width) {
                            return res = thumbnail;
                        }
                    });
                    break;
                case 'startIndex':
                case 'itemsPerPage':
                case 'totalResults':
                    res = item['openSearch$' + key]['$t'];
                    break;

            }
            return res;
        },
        setValue: function (key, value, item, params) {
            var params = params || {}, item = item || this.data.feed;
            if (item[key]) {
                if ('$t' in item[key]) {
                    return item[key]['$t'] = value;
                } else {
                    return item[key] = value;
                }
            }
            switch (key) {
                case 'thumbnail':
                    params.height = params.height || 90;
                    params.width = params.width || 120;
                    item['media$group']['media$thumbnail'].some(function (thumbnail, i) {
                        if (thumbnail.height == params.height && thumbnail.width == params.width) {
                            Class.mixin(item['media$group']['media$thumbnail'][i], value);
                            return true;
                        }
                    });
                    break;
                case 'startIndex':
                case 'itemsPerPage':
                case 'totalResults':
                    item['openSearch$' + key]['$t'] = value;
                    break;

            }
        },
        /**
         * @method getItems
         * @param {Object} [options]
         * @param {Object} options.data
         * @param {Number} [options.startIndex]
         * @param {Number} [options.itemsPerPage]
         * @returns {Array}
         */
        getItems: function (options) {
            var cachedData;
            options = options || {};
            options.data = options.data || this.data;
            if (!('startIndex' in options)) {
                return options.data.feed.entry || [];
            }
            //out of range
            console.log('startIndex %o, options.startIndex %o, itemsPerPage %o,options.itemsPerPage %o',
                this.getValue('startIndex'), options.startIndex, this.getValue('itemsPerPage'), options.itemsPerPage);
            if (this.getValue('startIndex') > options.startIndex ||
                this.getValue('startIndex') + this.getValue('itemsPerPage') < options.startIndex + options.itemsPerPage) {
                return [];
            }
            var startIndex = options.startIndex - this.getValue('startIndex');
            console.log('get cached Items', this.data);
            if ((cachedData = (this.data.feed.entry || []).slice(startIndex, startIndex + options.itemsPerPage)
                ).length) {
                return cachedData;
            }
            return [];
        },
        launch:function(){

        },
        stop:function(){

        }
    });
    return Youtube;
});