/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true */
define([
    '../util/Class',
    '../util/BaseEvented',
    '../util/DomEvent',
    '../util/Dom',
    './ScrollAdapter',
    'bower_components/WeakMap/weakmap',
    'bower_components/hogan/web/builds/2.0.0/hogan-2.0.0.amd',
    'text!assets/common/template/LazyLoadDataItem.html',
    './scrollAdapter/iScroll',
    'bower_components/iscroll/build/iscroll'
], function (klass, BaseEvented, domEvent, domHelper, ScrollAdapter, WeakMap, Hogan, itemTemplate) {
    'use strict';
    /*var _inView = function (el, offset) {
     offset = offset || 0;
     var coords = el.getBoundingClientRect();
     return ((coords.top >= 0 && coords.left >= 0 && coords.top) <= (window.innerHeight ||
     document.documentElement.clientHeight) + parseInt(offset));
     };*/
    var _inView = function (el) {
        var r, html;
        if (!el || 1 !== el.nodeType) {
            return false;
        }
        html = document.documentElement;
        r = el.getBoundingClientRect();
        return ( !!r &&
            r.bottom >= -r.height &&
            r.right >= -r.width &&
            r.top >= -r.height &&
            r.top <= html.clientHeight + r.height &&
            r.left >= -r.width &&
            r.left <= html.clientWidth + r.width
            );
    }, dataCache = new WeakMap();
    window.d = dataCache;
    var slice = Array.prototype.slice,
        attrSetting = {
            x: {
                column: {
                    unit: 'height',
                    offset: 'offsetHeight',
                    size: 'h',
                    scrollSize: 'scrollHeight'
                },
                row: {
                    unit: 'width',
                    offset: 'offsetWidth',
                    size: 'w',
                    scrollSize: 'scrollWidth'
                },
                scrollDirectionKey: 'scrollDirectionX',
                itemLoadDirection: 'down',
                scrollPositionKey: 'scrollLeft'
            },
            y: {
                row: {
                    unit: 'height',
                    offset: 'offsetHeight',
                    size: 'h',
                    scrollSize: 'scrollHeight'
                },
                column: {
                    unit: 'width',
                    offset: 'offsetWidth',
                    size: 'w',
                    scrollSize: 'scrollWidth'
                },
                scrollDirectionKey: 'scrollDirectionY',
                itemLoadDirection: 'down',
                scrollPositionKey: 'scrollTop'
            }
        };
    var LazyLoadData = klass({
        extend: BaseEvented,
        constructor: function LazyLoadData(args, node) {
            this.config = {
                direction: 'y',
                baseCls: 'lazyloadData',
                replaceTargetNode: true,
                /**
                 * @cfg {Boolean} initTwice cache twice at initialization
                 */
                initTwice: true,
                preloadItemNodes: false,
                /**
                 * @cfg {String} [innerTag='div']
                 */
                innerTag: 'div',
                scrollAdapter: {},
                /**
                 * @cfg {Function} fetchItems
                 */
                fetchItems: null,
                /**
                 * custom data filler
                 * @cfg {Function} [dataFiller]
                 */
                dataFiller: null,
                /**
                 * prepare html for each item node, if not defined, default template will be used.
                 * @cfg {Function} [prepareItemHTML]
                 */
                prepareItemHTML: null,
                itemStyle: {},
                itemTemplate: itemTemplate,
                itemsPerUpdate: 50,
                imageThrottle: 250,
                totalItemsLimit: Infinity,
                node: node,
                lazyLoadImages: false,
                imageHolder: []
            };
            args && klass.mixin(this.config, args);
            this.updateTotalResults(this.config.totalResults);
            this.config.itemTplRender = Hogan.compile(this.config.itemTemplate);
            BaseEvented.call(this);
            this.updateVariables();

        },
        updateVariables: function () {
            klass.mixin(this.config, attrSetting[this.config.direction] || {});
            var self = this, itemSize, itemsPerLine;
            Object.defineProperties(this.config, {
                "itemsPerLine": {
                    get: function () {
                        if (itemsPerLine) {
                            return itemsPerLine;
                        }
                        var itemSize = self.config.itemSize[self.config.column.unit];
                        itemsPerLine = Math.floor(self.config.innerNode[self.config.column.offset] / itemSize);
                        return itemsPerLine;
                    },
                    configurable: true
                },
                "itemSize": {
                    get: function () {
                        if (itemSize) {
                            return itemSize;
                        }
                        var itemStyle = self.config.itemStyle,
                            getValue = function (k) {
                                if (k in itemStyle && typeof(itemStyle[k]) === 'number') {
                                    return itemStyle[k];
                                }
                                return self.config.innerNode.firstElementChild['offset' + k];
                            };
                        itemSize = {
                            width: getValue('Width'),
                            height: getValue('Height')
                        };
                        return itemSize;
                    },
                    configurable: true
                }
            });
        },
        attachEvents: function () {
            var self = this;
            this.connect.push(domEvent.on(this.config.node, 'click', function (evt) {
                var item = self.findItemNode(evt.target);
                if (item) {
                    self.emit('itemClick', evt, item);
                }
            }));
        },
        findItemNode: function (node) {
            if (node.classList.contains('item')) {
                return node;
            }
            while ((node = node.parentNode)) {
                if (node.classList) {
                    if (node.classList.contains('item')) {
                        return node;
                    }
                    if (node.classList.contains('inner')) {
                        return null;
                    }
                }
            }
            return null;
        },
        render: function (node) {
            var n, self = this, prevPos;
            if (!this.config.node) {
                this.config.node = node;
            }
            if (!this.config.node) {
                return;
            }
            if (typeof(this.config.node) === 'string') {
                this.config.node = document.querySelector(this.config.node);
            }
            if (this.config.replaceTargetNode) {
                n = document.createElement('div');
                n.className = this.config.node.className;
                n.classList.add(this.config.baseCls);
                if (this.config.node.id) {
                    n.id = this.config.node.id;
                }
                if (!n.firstElementChild) {
                    n.innerHTML = '<' + this.config.innerTag + ' class="inner"></' + this.config.innerTag + '>';
                }
            } else {
                n = this.config.node;
            }


            if (this.config.style) {
                this.style(this.config.style, n);
            }

            if (this.config.replaceTargetNode) {
                this.config.oldNode = this.config.node;
                this.config.node.parentNode.replaceChild(n, this.config.node);
                this.config.node = n;
            }

            this.config.innerNode = n.firstElementChild;
            prevPos = this.config.node[this.config.scrollPositionKey];
            if (!this.scroller) {
                this.scroller = new ScrollAdapter(klass.mixin({
                    direction: this.config.direction,
                    element: this.config.node
                }, this.config.scrollAdapter));
                var detectPreload = function cb(evt) {
                    if (self.config.loading) {
                        return;
                    }
                    var pos = self.config.node[self.config.scrollPositionKey],
                        lastItem = self.config.innerNode.lastElementChild,
                        lastIdx = parseInt(lastItem.getAttribute('data-item-index'), 10),
                        gap = pos - prevPos,
                        availSize = self.config.node[self.config.row.scrollSize], edgeSize;

                    prevPos = pos;

                    self.loadImages();

                    if (gap <= 0 || lastIdx === self.config.totalResults - 1) {
                        return;
                    }
                    evt[self.config.scrollDirectionKey] = 'down';

                    if (pos === availSize - self.config.node[self.config.row.offset]) {
                        self.loadItems(evt);
                    } else if (pos > availSize / 2) {
                        self.loadItems(evt);
                    }
                };
                this.scroller.addEventListener('scroll', detectPreload);

                this.attachEvents();
            }
            this.config.autoStart && setTimeout(function () {
                self.startUp();
            }, 100);
            return this;
        },
        reload: function (config) {
            config && klass.mixin(this.config, config);
            this.updateVariables();
            this.config.innerNode.innerHTML = '';
            this.startUp();
        },
        startUp: function () {
            var evt = {};
            evt[this.config.scrollDirectionKey] = this.config.itemLoadDirection;
            this.loadItems(evt);
        },
        destroy: function () {
            this.connect.forEach(function (c) {
                c.remove();
            });
            this.scroller && this.scroller.destroy();
            this.config.node.parentNode.replaceChild(this.config.oldNode, this.config.node);
            this.config.node = null;
            this.config.innerNode = null;
            this.config.imageHolder.length = 0;
        },
        style: function (opt, node) {
            node = node || this.config.node;
            var keys = Object.keys(opt), i = 0, l = keys.length, key;
            for (; i < l; i++) {
                key = keys[i];
                node.style[key] = opt[key];
            }
            return this;
        },
        updateTotalResults: function (totalResults) {
            if (totalResults && totalResults > this.config.totalItemsLimit) {
                totalResults = this.config.totalItemsLimit;
            }
            this.setConfig('totalResults', totalResults);
            return this;
        },
        loadItems: function (evt) {
            this.config.loading = true;
            var lastItem = this.config.innerNode.lastElementChild,
                direction = evt[this.config.scrollDirectionKey],
                self = this,
                range = {
                    total: this.config.itemsPerUpdate
                }, total, lastIdx;
            if (this.config.itemLoadDirection !== direction) {
                return;
            }
            if (lastItem) {
                lastIdx = parseInt(lastItem.getAttribute('data-item-index'), 10);
                if (lastIdx === this.config.totalResults - 1) {
                    return;
                }
                range.start = lastIdx + 1;
            } else {
                range.start = 0;
            }
            total = range.total + range.start + 1;
            if ('totalResults' in this.config && total > this.config.totalResults) {
                range.total = this.config.totalResults - range.start;
            }

            this.prepareItemNodes(range);


            this.fetchItems(range, function (err, data) {
                if ('totalResults' in data) {
                    self.updateTotalResults(data.totalResults);
                }
                var availSize = self.config.node[self.config.row.scrollSize],
                    offsetSize = self.config.node[self.config.row.offset];
                if (availSize - offsetSize === 0) {
                    self.loadItems(evt);
                } else if (!self.config.initialized && self.config.initTwice) {
                    self.loadItems(evt);
                }
                self.updateItems(data.items, range);

            });
        },
        parseStyle: function () {
            var reg = /{{(.*?)}}/,
                itemStyle = this.config.itemStyle || {};
            return function (attr) {
                attr = attr.match(reg)[1];
                if (attr in itemStyle) {
                    var v = itemStyle[attr];
                    return attr + ':' + (typeof(v) === 'number' ? v + 'px' : v) + ';';
                }
                return '';
            };
        },
        genItemHTML: function (index, item, isInner) {
            return this.config.itemTplRender.render({
                inner: isInner,
                itemIndex: index + 'I',
                parseStyle: this.parseStyle.bind(this),
                lazyLoadImages: this.config.lazyLoadImages,
                item: item
            });
        },
        prepareItemNodes: function (range) {
            var i = range.start,
                endIdx = range.start + range.total - 1,
                htmlStr = '';
            for (; i <= endIdx; i++) {
                htmlStr += this.config.prepareItemHTML ? this.config.prepareItemHTML(i, this) : this.genItemHTML(i);
            }

            //console.time('insertAdjacentHTML');
            this.config.innerNode.insertAdjacentHTML('beforeend', htmlStr);
            //console.timeEnd('insertAdjacentHTML');
            return this;
        },
        loadImages: function () {
            clearTimeout(this.config.imagePoll);
            this.config.imagePoll = setTimeout(this._pollImage.bind(this), this.config.imageThrottle);
        },
        _pollImage: function () {
            var images = this.config.imageHolder, img;
            for (var i = images.length; i--;) {
                img = images[i];
                if (_inView(img)) {
                    if (img.tagName === 'IMG') {
                        img.src = img.getAttribute('data-img');
                    } else {
                        img.style.backgroundImage = 'url(' + img.getAttribute('data-img') + ')';
                    }
                    img.classList.remove('imgNotLoaded');
                    images.splice(i, 1);
                }
            }
        },
        getItemData: function (itemNode) {
            return dataCache.get(itemNode);
        },
        updateItems: function (items, range) {
            var i = range.start,
                endIdx = range.start + range.total - 1,
                node, item, imgNode;
            for (; i <= endIdx; i++) {
                node = this.config.innerNode.getElementsByClassName('itemIndex-' + i + 'I')[0];
                if (!node) {
                    console.log('not found', i);
                    continue;
                }
                item = items[i - range.start];
                if (item) {
                    node.classList.remove('empty');
                }
                if (this.config.dataFiller) {
                    this.config.dataFiller(node, item, this);
                } else {
                    node.innerHTML = this.genItemHTML(null, item, true);
                }
                dataCache.set(node, item);
                imgNode = node.getElementsByClassName('dataImg')[0];
                if (imgNode) {
                    this.config.imageHolder.push(imgNode);
                    imgNode.classList.add('imgNotLoaded');
                }

            }
            this.emit('itemsUpdate', range);
            if (!this.config.initialized) {
                this.config.initialized = true;
                this.emit('initialized');
                this.loadImages();
            }
            this.config.loading = false;
            return this;
        },

        fetchItems: function (range, callback) {
            if (this.config.fetchItems) {
                return this.config.fetchItems(range, callback);
            }
        }
    });
    return LazyLoadData;
});