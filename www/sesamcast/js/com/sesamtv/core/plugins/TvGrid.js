/*global require,define,console,alert*/
/*jslint plusplus: true */
/*jslint expr:true */
define([
    '../util/Class',
    '../util/Helper',
    '../util/keyboard',
    '../util/has',
    '../util/DomEvent',
    '../util/ChromeCastReceiver',
    '../abstract/plugin/BasePlugin',
    '../engine/Topic',
    '../ui/Rating',
    '../util/databinding/types/Mosaic'
], function (klass, helper, keyboard, has, domEvent, ChromeCastReceiver, BasePlugin, topic, Rating, xhr) {
    "use strict";
    var slice = Array.prototype.slice;
    /**
     * @class com.sesamtv.core.plugins.TvGrid
     * @extends com.sesamtv.core.abstract.plugin.BasePlugin
     * @requires com.sesamtv.core.util.XHR
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     */
    var TvGrid = klass({
        extend: BasePlugin,
        constructor: function (config) {
            var self = this;
            BasePlugin.call(this, config);

            this.url = this.url || '../common/localdata/epg/getChannels.json';

            this.itemsPerPage = this.itemsPerPage || 48;
            this.startIndex = 0;
            this.scrollTimer = null;
            this.itemSelectTimer = null;
            this.defFetchParams = this.defFetchParams || {};
            if (has('audio') && this.config.sound) {
                this.sound = function (id) {
                    var snd = new Audio(require.toUrl(self.config.sound[id]));
                    snd.addEventListener('endded', function () {
                        snd = null;
                    });
                    return snd;
                };
            }

            Object.defineProperties(this, {
                'maxResults': {
                    get: function () {
                        return Math.min(1000, this.getValue('totalResults'));
                    }
                }
            });
            if (has('chromecast')) {
                this.initChromeCast();
            }
        },
        initChromeCast: function () {
            var self = this;
            this.castReceiver = new ChromeCastReceiver({
                appId: this.config.chromecast.appId,
                namespaces: ['sesamvod']
            });
            window.receiver = this.castReceiver;
            this.castReceiver.on('sesamvod', function (evt) {
                if (!evt.message) {
                    return;
                }

                if ('keyCode' in evt.message) {
                    self.config.fromCordova = evt.message.cordova;
                    domEvent.emit('keydown', {
                        keyCode: evt.message.keyCode
                    });
                }
            });
            this.castReceiver.start();

        },
        initEvents: function () {
            var self = this, h;
            BasePlugin.prototype.initEvents.call(this);
            this.connect.push(this.on('focus', function () {
                topic.pub('focusManager/selectMap');
            }));

            this.connect.push(this.on('show', function () {
                self.show.apply(self, arguments);
            }));
            this.connect.push(this.on('unselected', function () {
                self.unselect.apply(self, arguments);
            }));
            this.connect.push(this.on('selected', function () {
                self.select.apply(self, arguments);
            }));

        },
        unselect: function (evt, params) {
            var root = this.getRoot(), selectedNode;
            root.classList.remove('selected');
            selectedNode = root.getElementsByClassName('selected')[0];
            if (selectedNode) {
                selectedNode.classList.remove('selected');
            }

        },
        select: function () {
            var binder = this.binders[this.config.components.videos.namespace],
                grid = binder.getModel('videos').grid;
            this.getRoot().classList.add('selected');

            if (this.getConfig('currentItemIndex')) {
                this.selectItem(0);
                grid.scroller.scrollTo(0, null, 300);
            } else {
                this.selectItem(0, 'right');
            }

        },
        show: function (itemData) {

            var binder = this.binders[this.config.components.videos.namespace],
                self = this, grid, channelId = itemData.keyword,
                showGrid = function (binder) {
                    binder.boundModel.updateQueryParams(itemData);
                    binder.model.videos.update(itemData);
                    grid = binder.getModel('videos').grid;
                    grid.attachEvents();
                    grid.on('itemClick', function (evt, target) {
                        self.showDetailOnClick(target);
                    });
                };

            if (binder) {
                /*helper.merge(binder.boundModel, {
                 fetchParams: {
                 q: channelId
                 }
                 });*/

                //showGrid(binder);
                binder.boundModel.updateQueryParams(itemData);
                binder.model.videos.update(itemData);

            } else {
                this.bindView(this.config.components.videos).then(function (binder) {
                    /*helper.merge(binder.boundModel, {
                     fetchParams: {
                     q: channelId
                     }
                     });*/
                    showGrid(binder);
                    //self.selectItem(0);
                });
            }
        },
        showDetailOnClick: function (target) {
            var binder = this.binders[this.config.components.videos.namespace],
                itemData = binder.getModel('videos').getItemData(target);
            this.selectItem(+target.getAttribute('data-index'));
            this.showVodDetail(null, itemData);
        },
        playVideoOnClick: function (opt) {
            if (opt.target) {
                this.playVideo({
                    node: opt.target
                });
            }
        },
        initRemoteMedia: function (node) {
            var self = this,
                remoteMedia = self.castReceiver.getRemoteMedia();
            remoteMedia.handler.setMediaElement(node);
        },
        playVideo: function (opt, evt) {
            this.sound && this.sound('ok').play();
            var videoId = opt.node.getAttribute('data-videoid');
            var detailBinder = this.binders[this.config.components.detail.namespace];

            topic.pub('plugins/youtubePlayer/createPlayer');

            detailBinder.boundModel.kbNav.setConfig('disabled', true);
            topic.pub('plugins/youtubePlayer/attachEvent', 'playerDestroyed', function () {
                detailBinder.boundModel.kbNav.setConfig('disabled', false);
                //topic.pub('plugins/youtubePlayer/destroyPlayer');
            }, {
                once: true
            });


            /*if (this.castReceiver && this.config.fromCordova) {
                topic.pub('plugins/youtubePlayer/initPlayer');
                console.log('player', document.getElementById('vodPlayer'));
                this.initRemoteMedia(document.getElementById('vodPlayer'));

                this.castReceiver.sendMessage('sesamvod', {
                    videoId: videoId,
                    action: 'getVideoData'
                });

            } else {
                topic.pub('plugins/youtubePlayer/load', videoId);
            }*/
            topic.pub('plugins/youtubePlayer/load', videoId);

        },
        showVodDetail: function (evt, itemData) {
            this.sound && this.sound('ok').play();
            console.log('showVodDetail', arguments);
            var root = this.getRoot(),
                binder = this.binders[this.config.components.videos.namespace],
                node;
            if (!itemData) {
                node = root.getElementsByClassName('selected')[0];
                itemData = binder.getModel('videos').getItemData(node);
            }
            topic.pub('stateManager/changeState', {
                route: 'detail',
                params: itemData.id
            });
            console.log('showVodDetail', node, itemData);
        },
        buildVodDetail: function (id, itemData) {

            topic.pub('inputManager/setCurrentChannel', this.config.id + '/vodDetail');
            var root = this.getRoot(),
                clone, ratingNode,
                classList,
                self = this;
            if (!(clone = root.parentNode.getElementsByClassName('vodDetail')[0])) {
                clone = root.cloneNode(false);
                classList = clone.classList;
                classList.remove('vodVideos');
                classList.remove('selected');
                classList.add('vodDetail');
                root.parentNode.appendChild(clone);
            }
            this.config.currentItemId = id;

            this.bindView(this.config.components.detail, clone).then(function (binder) {

                binder.root.style.display = '';
                ratingNode = binder.root.querySelector('.options .rating');
                ratingNode.setAttribute('data-id', id);
                try {
                    self.rating = self.rating || new Rating({
                        storeRate: true
                    }, ratingNode);
                    self.rating.loadPrevRating();
                } catch (e) {
                    console.error('rating build error', e.message);
                    console.log(e.stack);
                }

                //binder.model.videos.update();
                //self.selectItem(0);
                binder.boundModel.trigger(id, self.config.components.videos.namespace, itemData);
            });
        },
        updateVodDetail_old: function (targetIdx) {
            var binder = this.binders[this.config.components.videos.namespace],
                self = this,
                grid = binder.getModel('videos').grid;
            if (grid.config.updatingGrid) {
                var h = grid.on('config', function (v) {
                    if (v.key === 'updatingGrid' && !h.newValue) {
                        h.remove();
                        h = null;
                        self.buildVodDetail(grid.getItemData(targetIdx).id);
                    }
                });
            } else {
                self.buildVodDetail(grid.getItemData(targetIdx).id);
            }
        },
        updateVodDetail: function (targetIdx) {

            var binder = this.binders[this.config.components.videos.namespace],
                self = this,
                grid = binder.getModel('videos').grid,
                itemData = grid.getItemData(targetIdx),
                args = {};
            if (itemData) {
                this.setConfig('currentItemIndex', targetIdx);
                return this.buildVodDetail(itemData.id, itemData);
            }
            args['start-index'] = targetIdx + 1;
            args['max-results'] = 1;
            binder.boundModel.videos(args).then(function (data) {
                self.setConfig('currentItemIndex', targetIdx);
                self.buildVodDetail(data[0].id, data[0]);
            });
        },
        showNextItemDetail: function (args, nav) {
            var binder = this.binders[this.config.components.videos.namespace],
                self = this,
                currentItemIndex = this.getConfig('currentItemIndex'),
                targetIdx = currentItemIndex + 1,
                grid = binder.getModel('videos').grid;

            //this.selectItem(targetIdx, targetIdx % grid.itemsPerLine === 0 ? 'right' : null);
            topic.pub('plugins/youtubePlayer/destroyPlayer');
            setTimeout(function () {
                self.updateVodDetail(targetIdx);
            }, 500);

        },
        showPrevItemDetail: function (args, nav) {
            var binder = this.binders[this.config.components.videos.namespace],
                self = this,
                currentItemIndex = this.getConfig('currentItemIndex'),
                targetIdx = currentItemIndex - 1,
                grid = binder.getModel('videos').grid;

            //this.selectItem(targetIdx, targetIdx % grid.itemsPerLine === 1 ? 'left' : null);
            //this.updateVodDetail(targetIdx);
            topic.pub('plugins/youtubePlayer/destroyPlayer');
            setTimeout(function () {
                self.updateVodDetail(targetIdx);
            }, 500);
        },
        activeRating: function (args, nav) {
            nav.setConfig('disabled', true);
            this.rating.emit('selected');
            this.rating.once('unselected', function () {
                nav.setConfig('disabled', false);
            });
        },
        backToMosaic: function () {
            topic.pub('plugins/youtubePlayer/destroyPlayer');
            var binder = this.binders[this.config.components.detail.namespace],
                root = this.getRoot(),
                self = this,
                selectedNode = root.getElementsByClassName('selected')[0],
                currentItemIndex = this.getConfig('currentItemIndex'),
                prevIdx;
            binder.boundModel.kbNav && binder.boundModel.kbNav.setConfig('disabled', true);
            binder.root.style.display = 'none';
            history.back(0);
            //this.rating && this.rating.unrate();
            this.rating.emit('unselected');
            topic.pub('inputManager/setCurrentChannel', this.config.id);

            if (selectedNode) {
                prevIdx = +selectedNode.getAttribute('data-index');

                if (currentItemIndex > prevIdx) {
                    setTimeout(function () {
                        self.selectItem(currentItemIndex, 'right');
                    }, 100);

                }
                if (currentItemIndex < prevIdx) {
                    setTimeout(function () {
                        self.selectItem(currentItemIndex, 'left');
                    }, 100);
                }
            }
        },
        unselectItem: function (selectedNode) {
            if (!selectedNode) {
                var root = this.getRoot();
                selectedNode = root.getElementsByClassName('selected')[0];
            }
            selectedNode && selectedNode.classList.remove('selected');
        },
        selectItem: function (idx, direction) {
            this.sound && this.sound('move').play();
            var root = this.getRoot(),
                nodes = root.getElementsByTagName('figure'),
                self = this,
                selectedNode = root.getElementsByClassName('selected')[0];
            if (!nodes[idx]) {
                return;
            }

            if (selectedNode) {
                if (selectedNode === nodes[idx]) {
                    return;
                }
                this.unselectItem(selectedNode);
            }
            nodes[idx].classList.add('selected');

            if (direction) {
                self.centerItem(nodes[idx], root, direction);
                self.setPagination(nodes[idx], root);
            }


            this.setConfig('currentItemIndex', idx);
            this.emit('selectItem', {
                index: idx,
                node: nodes[idx]
            });
        },
        setPagination: function (node, root) {
            var binder = this.binders[this.config.components.videos.namespace],
                nodes = slice.call(root.getElementsByTagName('figure')),
                grid = binder.getModel('videos').grid,
                totalItems = grid.config.totalResults,
                itemsPerPage, nodeNum, currentPage;
            setTimeout(function () {
                grid.updateRect().updateVisibleRange();
                grid.visibleItemsRange = grid.getVisibleItemsRange();
                itemsPerPage = nodes.indexOf(grid.visibleItemsRange[1]) - nodes.indexOf(grid.visibleItemsRange[0]) + 1;
                nodeNum = nodes.indexOf(node) + 1;
                currentPage = Math.ceil(nodeNum / itemsPerPage);
                binder.getModel('pagination').set('Page ' + [currentPage, Math.ceil(totalItems / itemsPerPage)].join('/'));
            }, 500);
        },
        centerItem: function (node, root, direction) {
            var self = this,
                binder = this.binders[this.config.components.videos.namespace],
                grid = binder.getModel('videos').grid,
                rect = grid.container.getBoundingClientRect(),
                centerPoint = {
                    left: Math.round(rect.left + rect.width / 2),
                    top: Math.round(rect.top + rect.height / 2)
                },
                duration = 300,
                nodeRect = node.getBoundingClientRect();

            if (direction === 'right') {
                if (nodeRect.left > centerPoint.left) {
                    grid.scroller.scrollBy(nodeRect.width, 0, duration);
                }
            } else {
                if (nodeRect.left < centerPoint.left) {
                    grid.scroller.scrollBy(-nodeRect.width, 0, duration);
                }
            }

        },
        goToAboveItem: function () {
            var currentItemIndex = this.getConfig('currentItemIndex'),
                binder = this.binders[this.config.components.videos.namespace],
                grid = binder.getModel('videos').grid,
                targetIdx = currentItemIndex - 1;
            if (currentItemIndex <= 0 || (targetIdx + 1) % grid.itemsPerLine === 0) {
                return;
                //return this.emit('unselected',evt,params);
            }
            return this.selectItem(targetIdx);
        },
        goToBelowItem: function (evt, params) {
            var currentItemIndex = this.getConfig('currentItemIndex'),
                root = this.getRoot(),
                binder = this.binders[this.config.components.videos.namespace],
                nodes = root.getElementsByTagName('figure'),
                grid = binder.getModel('videos').grid,
                targetIdx = currentItemIndex + 1;
            if ((targetIdx + 1) % grid.itemsPerLine === 1 || targetIdx > nodes.length - 1) {
                return;
                //return this.emit('unselected',evt,params);
            }
            return this.selectItem(targetIdx);
        },
        goToRightItem: function (evt, params) {
            var currentItemIndex = this.getConfig('currentItemIndex'),
                root = this.getRoot(),
                nodes = root.getElementsByTagName('figure'),
                binder = this.binders[this.config.components.videos.namespace],
                grid = binder.getModel('videos').grid,
                targetIdx = currentItemIndex + grid.itemsPerLine;
            if (targetIdx > nodes.length) {
                //this.emit('unselected', evt, params);
            } else {
                this.selectItem(targetIdx, 'right');
            }
        },
        goToLeftItem: function (evt, params) {
            var currentItemIndex = this.getConfig('currentItemIndex'),
                binder = this.binders[this.config.components.videos.namespace],
                grid = binder.getModel('videos').grid,
                targetIdx = currentItemIndex - grid.itemsPerLine;
            if (targetIdx <= -1) {
                this.emit('unselected', evt, params);
            } else {
                this.selectItem(targetIdx, 'left');
            }
        },
        launch: function () {

        },
        stop: function () {

        }
    });
    return TvGrid;
});