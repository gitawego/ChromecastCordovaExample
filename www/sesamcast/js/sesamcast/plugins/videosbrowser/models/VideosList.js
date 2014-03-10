/*global define,require,console*/
define([
    'require',
    'com/sesamtv/core/util/Class',
    'com/sesamtv/core/util/Promise',
    'com/sesamtv/core/util/XHR',
    'com/sesamtv/core/engine/Topic',
    'com/sesamtv/core/abstract/plugin/BaseModel',
    'com/sesamtv/core/util/Helper',
    'com/sesamtv/core/util/WebWorker',
    'text!../views/itemTemplate.html'
], function (require, klass, promise, xhr, topic, BaseModel, helper, WebWorker, itemTemplate) {
    'use strict';
    var VideosList = klass({
        extend: BaseModel,
        constructor: function VideosList(binder, plugin) {
            BaseModel.call(this, binder, plugin);

            this.fetchParams = {
                v: 2,
                alt: 'json',
                'max-results': 50,
                format: 5,
                time: 'all_time',
                //orderby: 'published',
                lr:'fr',
                //category:'news',
                hd: true
            };
            this.defaultUrl = 'http://gdata.youtube.com/feeds/api/videos';
            this.defaultTime = 'all_time';
            this.url = null;
            this.lazyloadDataParams = plugin.config.lazyloadDataParams;
            this.lazyloadDataParams.itemTemplate = itemTemplate;
            if (WebWorker.hasFeature()) {
                this.webworker = new WebWorker(true);
            }
        },
        init: function () {

        },
        updateQueryParams: function (itemData) {
            if (typeof(itemData) === 'string') {
                itemData = {
                    keyword: itemData
                };
            }
            if (itemData.keyword) {
                this.fetchParams.q = itemData.keyword;
            } else {
                delete this.fetchParams.q;
            }
            if ('category' in itemData) {
                this.fetchParams.category = itemData.category;
            }

            if ('standardfeeds' in itemData) {
                itemData.url = 'https://gdata.youtube.com/feeds/api/standardfeeds/FR/' + itemData.standardfeeds;
            }
            //author
            if (itemData.author) {
                this.fetchParams.author = itemData.author;
            } else {
                delete this.fetchParams.author;
            }

            if (itemData.time) {
                this.fetchParams.time = itemData.time;
            } else {
                this.fetchParams.time = this.defaultTime;
            }

            if ('url' in itemData) {
                this.url = itemData.url;
            } else {
                delete this.url;
            }
        },
        videos: function (args) {
            var self = this, grid, worker;
            if (!args) {
                return [];
            }

            var deferred = promise(), contentConf = helper.mixin({}, this.fetchParams);

            if ('start' in args) {
                contentConf['start-index'] = args.start + 1;
            }
            if ('total' in args) {
                contentConf['max-results'] = args.total;
            }

            //http://gdata.youtube.com/feeds/api/videos?&v=2&alt=json&max-results=24&format=5&lr=fr&time=all_time&category=Comedy
            //http://gdata.youtube.com/feeds/api/videos?&v=2&alt=json&max-results=4&format=5&lr=fr&time=all_time&category=Sports&start-index=25
            if (this.webworker) {
                console.log('load worker');
                worker = this.webworker.initWorker(require.toUrl('../models/videosFetcher.js'));
                worker.on('message', function (evt) {
                    console.log("worker",evt);
                    deferred.resolve(self.videoDataParser(evt.data.data));
                    worker.terminate();
                });
                worker.postMessage({
                    method: 'httpRequest',
                    params: {
                        url: this.url || this.defaultUrl,
                        method: 'get',
                        handleAs: 'json',
                        content: contentConf
                    }
                });
                return deferred;
            }

            xhr(this.url || this.defaultUrl, {
                method: 'get',
                handleAs: 'json',
                content: contentConf,
                onload: function (data) {
                    console.log(data);
                    deferred.resolve(self.videoDataParser(data));
                }
            });
            return deferred;
        },
        videoDataParser: function (data) {
            return {
                items: data.feed.entry.map(function (entry) {

                    var parsedItem =  {
                        thumbnail: entry.media$group.media$thumbnail[1].url,
                        preview: entry.media$group.media$thumbnail[3].url,
                        title: entry.title.$t,
                        id: entry.id.$t,
                        duration:+(entry.media$group.yt$duration.seconds/60).toFixed(2),
                        published:(new Date(entry.published.$t)).toLocaleString(),
                        author: entry.author[0].name.$t,
                        category: entry.category[1].label,
                        description: entry.media$group.media$description.$t,
                        videoId: entry.media$group.yt$videoid.$t,
                        like:entry.yt$rating,
                        rating:entry.gd$rating?Math.floor(entry.gd$rating.average):1,
                        statistics:entry.yt$statistics,
                        entry: entry
                    };
                    parsedItem['rating'+parsedItem.rating] = true;
                    return parsedItem;
                }),
                totalResults: data.feed.openSearch$totalResults.$t
            };
        }
    });
    return VideosList;
});