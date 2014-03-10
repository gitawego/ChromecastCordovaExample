/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true */
define([
    '../util/Helper',
    '../util/Dom',
    '../util/DomEvent',
    '../util/Class',
    '../util/BaseEvented',
    './ScrollAdapter'
],function (helper, domHelper, DomEvent, klass, BaseEvented, ScrollAdapter) {
        "use strict";
        var slice = Array.prototype.slice, 
            attrSetting  = {
                x:{
                    column:{
                        unit:'height', 
                        offset:'offsetHeight', 
                        size:'h'
                    },
                    row:{
                        unit:'width',
                        offset:'offsetWidth',
                        size:'w'
                    },
                    scrollDirectionKey:'scrollDirectionX'
                },
                y:{
                    row:{
                        unit:'height', 
                        offset:'offsetHeight', 
                        size:'h'
                    },
                    column:{
                        unit:'width',
                        offset:'offsetWidth',
                        size:'w'
                    },
                    scrollDirectionKey:'scrollDirectionY'
                }
            };
        /**
         * @class com.sesamtv.core.ui.SimpleDataGrid
         * @requires com.sesamtv.core.ui.ScrollAdapter
         * @constructor
         * @cfg {Object} config
         * @cfg {String} [config.direction='y'] x or y
         * @cfg {Array} [config.data]
         * @cfg {Number} config.totalResults
         * @cfg {Number} config.totalVisibleItems
         * @cfg {Number} [config.preloadLinesBuff=1] it will add N lines before first line and N lines after last line as buffer
         * @cfg {String|Function} config.itemTemplate a template string or a template function
         * @cfg {Object} [config.scrollAdapter] config for scroll adapter
         * @cfg {HTMLElement|String} node
         */
        var SimpleDataGrid = klass({
            extend: BaseEvented,
            constructor: function (config, node) {

                this.config = {
                    baseCls: 'simpleDataGrid',
                    innerCls: 'gridInner',
                    direction: 'y',
                    itemTag: 'div',
                    itemLimite: 30,
                    itemInnerTpl: '<div class="cellInner"></div>',
                    emptyInvisibleItems:false,
                    preloadLinesBuff: 7,
                    autoStart: true
                };
                BaseEvented.call(this);

                this.oldItemsParsingOrderMapping = {
                    down: {
                        startRangeIdx: 0,
                        endRangeIdx: 1,
                        traverseDirection: 'nextElementSibling',
                        reverseDirection: 'previousElementSibling',
                        initialItem: 'firstItem',
                        finalItem: 'lastItem'
                    },
                    up: {
                        startRangeIdx: 1,
                        endRangeIdx: 0,
                        traverseDirection: 'previousElementSibling',
                        reverseDirection: 'nextElementSibling',
                        initialItem: 'lastItem',
                        finalItem: 'firstItem'
                    }
                };
                this.rect = {
                    container: {},
                    inner: {}
                };
                this.timer = null;
                this.visibleRange = [];
                this.visibleItemsRange = [];
                this.oldVisibleItemsRange = [];
                
                Object.defineProperties(this, {
                    /**
                     * @property itemsPerLine
                     * @type {Number}
                     */
                    itemsPerLine: {
                        get: function () {
                            return Math.floor(this.innerNode[this.config.column.offset]/this.config.itemSize[this.config.column.size]);
                        }
                    },
                    /**
                     * @property itemBuffSize
                     * @type {Number}
                     */
                    itemBuffSize: {
                        get: function () {
                            return this.itemsPerLine * this.config.preloadLinesBuff;
                        }
                    }
                });
                this.loading = false;

                config && klass.mixin(this.config, config);

                this.updateVariables();

                /**
                 * @method  tplEngine
                 */
                if (typeof(this.config.itemTemplate) === 'function') {
                    this.tplEngine = this.config.itemTemplate;
                } else {
                    this.tplEngine = helper.substitute(this.config.itemTemplate);
                }
                this.config.scrollAdapter = this.config.scrollAdapter || {};
                this.create(node);
                this.attach(node);
            },
            updateVariables:function(){
                klass.mixin(this.config, attrSetting[this.config.direction] || {});
            },
            attach: function (node) {
                this.container = typeof(node) === 'string' ? document.getElementById(node) : node;
                this.basicStyles('add');
            },
            reload: function (args) {
                args = args || {};
                if (args.totalResults) {
                    this.setTotalResults(args.totalResults);
                }
                this.emptyItems();
                this.setConfig(args);
                this.scroller.scrollTo(0, 0);
                this.startUp();

            },
            setTotalResults: function (num) {
                if (num > this.config.itemLimite) {
                    num = this.config.itemLimite;
                }
                if (this.config.totalResults === num) {
                    return;
                }
                this.config.totalResults = num;
                this.updateTotalItems();
            },
            /**
             * this must be called after totalResults is changed
             * @method updateTotalItems
             */
            updateTotalItems: function () {
                var nodes = this.innerNode.children,
                    gap = this.config.totalResults - nodes.length, i = 1, node, clone;
                if (gap === 0) {
                    return;
                }
                if (gap > 0) {
                    node = this.innerNode.lastElementChild.cloneNode();
                    node.innerHTML = this.config.itemInnerTpl;
                    for (; i <= gap; i++) {
                        clone = node.cloneNode(true);
                        clone.setAttribute('data-index', (+node.getAttribute('data-index')) + i);
                        clone.classList.remove('loaded');
                        clone.classList.remove('selected');
                        this.innerNode.appendChild(clone);
                    }

                } else {
                    gap = -gap;
                    for (; gap > 0; gap--) {
                        this.innerNode.removeChild(this.innerNode.lastElementChild);
                    }
                }
                if (this.config.direction === 'x') {
                    this.innerNode.style.width = Math.ceil(this.innerNode.children.length/this.itemsPerLine)*this.config.itemSize.w+'px';
                }
            },
            create: function (node) {
                var self = this, i, itemEl, _itemEl;
                this.container = typeof(node) === 'string' ? document.getElementById(node) : node;
                //this.container.setAttribute('tabindex',-1);
                this.innerNode = document.createElement('div');

                itemEl = document.createElement(this.config.itemTag);
                itemEl.className = 'item';
                itemEl.innerHTML = this.config.itemInnerTpl;
                this.config.itemSize && this.resize(this.config.itemSize, itemEl);

                for (i = 0; i < this.config.totalResults; i++) {
                    _itemEl = itemEl.cloneNode(true);
                    _itemEl.setAttribute('data-index', i);
                    this.innerNode.appendChild(_itemEl);
                }
                this.container.appendChild(this.innerNode);

                this.scroller = new ScrollAdapter(klass.mixin({
                    direction: this.config.direction,
                    element: this.container
                }, this.config.scrollAdapter));

                if (this.config.size) {
                    this.resize(this.config.size, this.container);
                    this.innerNode.style[this.config.column.unit] = this.config.size[this.config.column.size] - this.scroller.scrollbarWidth + 'px';
                } else {
                    this.config.size = this.getSize(this.node);
                }

                //itemsize is not defined, get it from DOM
                if (!this.config.itemSize) {
                    this.config.itemSize = this.getSize(this.innerNode.firstElementChild);
                }
                if (this.config.direction === 'x') {
                    //var itemsPerPage = Math.round(this.config.size.w / this.config.itemSize.w) * Math.round(this.config.size.h / this.config.itemSize.h);
                    //var colCount = Math.round(this.config.totalResults / itemsPerPage);
                    this.innerNode.style[domHelper.getPrefixedCssProp('column-width').js] = this.config.itemSize.w + 'px';
                    this.innerNode.style[domHelper.getPrefixedCssProp('column-gap').js] = 0;
                    this.innerNode.style.width = Math.ceil(this.innerNode.children.length/this.itemsPerLine)*this.config.itemSize.w+'px';

                }
                //this.updateRect().updateVisibleRange();

                this.scroller.addEventListener('scrollEnd', function cb(evt) {
                    self.loadItems(evt);
                });
                //FIXME find a way more reliable
                this.config.autoStart && setTimeout(function () {
                    self.startUp();
                }, 100); 
            },
            attachEvents: function () {
                var self = this;
                this.connect.push(DomEvent.on(this.innerNode, 'click', function (evt) {
                    var target = self.ensureItemNode(evt.target);
                    if (!target) {
                        return;
                    }
                    self.emit('itemClick', evt, target);
                }, false));
            },
            startUp: function () {

                this.scroller.refresh();
                this.loadItems({
                    scrollDirection: 'down'
                });
            },
            getSize: function (node) {
                return {
                    w: node.offsetWidth,
                    h: node.offsetHeight
                };
            },
            /**
             * @method updateRect
             * @returns {*}
             */
            updateRect: function () {
                var container = this.container.getBoundingClientRect(),
                    inner = this.innerNode.getBoundingClientRect(),
                    mathMtdMapping = {
                        top: 'ceil',
                        left: 'ceil',
                        right: 'floor',
                        bottom: 'floor',
                        width: 'abs',
                        height: 'abs'
                    }, keys = Object.keys(mathMtdMapping), i = 0, l = keys.length, k;

                for(;i<l;i++){
                    k = keys[i];
                    this.rect.container[k] = Math[mathMtdMapping[k]](container[k]);
                    this.rect.inner[k] = Math[mathMtdMapping[k]](inner[k]);
                }
                return this;
            },
            /**
             * @method updateVisibleRange
             * @returns {*}
             */
            updateVisibleRange: function () {
                var size = this.config.itemSize[this.config.column.size], range = {
                        start: [],
                        end: []
                    }, html = document.documentElement;
                this.visibleRange.length = 0;
                if (this.config.direction === 'y') {
                    range.start = [this.rect.inner.left + 1, this.rect.container.top + 1];
                    range.end = [this.rect.inner.left + this.itemsPerLine * size - 1, this.rect.container.bottom - 1];
                }
                if (this.config.direction === 'x') {
                    range.start = [this.rect.container.left + 1, this.rect.inner.top + 1];
                    range.end = [this.rect.container.right - 1, this.itemsPerLine * size - 1];
                }
                if (range.end[0] >= html.clientWidth) {
                    range.end[0] = html.clientWidth - 1;
                }
                if (range.end[1] >= html.clientHeight) {
                    range.end[1] = html.clientHeight - 1;
                }

                this.visibleRange.push(range.start);
                this.visibleRange.push(range.end);

                return this;
            },
            getVisibleItemsRange: function () {
                var elFromP = document.elementFromPoint,
                    range = [elFromP.apply(document, this.visibleRange[0]),
                        elFromP.apply(document, this.visibleRange[1])];
                range[0] = this.ensureItemNode(range[0]);
                range[1] = range[1] === this.innerNode ? range[1].lastElementChild : this.ensureItemNode(range[1]);
                return range;
            },
            ensureItemNode: function (itemNode) {
                var ensured = itemNode.parentNode === this.innerNode;
                if (ensured) {
                    return itemNode;
                }
                if (this.innerNode.contains(itemNode)) {
                    while (!ensured) {
                        if ((ensured = itemNode.parentNode === this.innerNode)) {
                            return itemNode;
                        }
                        itemNode = itemNode.parentNode;
                        if (!itemNode || itemNode === this.innerNode) {
                            ensured = true;
                        }
                    }
                }
                return null;
            },
            /**
             * @method loadItems
             * @param {Event|Object} [evt]
             */
            loadItems: function (evt) {
                this.updateRect().updateVisibleRange();
                var self = this, firstItem, lastItem, firstIdx, lastIdx,
                    preloadItemsBuffer = this.itemsPerLine * this.config.preloadLinesBuff,
                    finalItem = this.innerNode.lastElementChild, range = [];
                this.loading = true;

                //update range

                this.visibleItemsRange = this.getVisibleItemsRange();
                firstItem = this.visibleItemsRange[0];
                lastItem = this.visibleItemsRange[1];
                if (!firstItem || !lastItem) {
                    return;
                }
                firstIdx = +firstItem.getAttribute('data-index');
                lastIdx = +lastItem.getAttribute('data-index');
                range[0] = firstIdx - preloadItemsBuffer;
                range[1] = lastIdx + preloadItemsBuffer;

                if (range[0] < 0) {
                    range[0] = 0;
                }
                if (range[1] > +finalItem.getAttribute('data-index')) {
                    range[1] = +finalItem.getAttribute('data-index');
                }
                this.setConfig('updatingGrid', true);
                //console.log('range',range);
                this.fetchItems({
                    range: range,
                    callback: function (err, data) {

                        console.log('data', data);
                        self.config.data = data;

                        self.updateLayoutByData(data);
                        //self.setConfig('data',data);
                        self.updateDataGrid(data, {
                            firstItem: firstItem,
                            lastItem: lastItem,
                            scrollDirection: evt.scrollDirection || evt[self.config.scrollDirectionKey]
                        });
                    }
                });
            },
            updateLayoutByData: function (data) {
                var totalNum = data.range[1] - data.range[0] + 1, totalItems = data.items.length;
                if (data.totalResults) {
                    this.setTotalResults(data.totalResults);
                }

            },
            getItemData: function (idx) {
                if (idx < this.config.data.range[0] || idx > this.config.data.range[1]) {
                    //throw new Error('out of data range in cache');
                    return;
                }
                return this.config.data.items[idx - this.config.data.range[0]];
            },
            /**
             * @method updateDataGrid
             * @param {Object} data
             * @param {Array} data.items
             * @param {Array} data.range
             * @param {Object} opt
             * @param {HTMLElement} opt.firstItem
             * @param {HTMLElement} opt.lastItem
             * @param {String} opt.scrollDirection down or up
             */
            updateDataGrid: function (data, opt) {
                if (!opt.scrollDirection) {
                    return;
                }
                var i, l, currentItem, oldItem, self = this, itemIdxInData,
                    currentParsingMap = this.oldItemsParsingOrderMapping[opt.scrollDirection],
                    initialItem = opt[currentParsingMap.initialItem],
                    finalItem = opt[currentParsingMap.finalItem],
                    updateCurrentItem = function () {
                        currentItem = (currentItem ? currentItem[currentParsingMap.traverseDirection] : initialItem);
                        return currentItem;
                    }, fillBuffer = function (itms, pos, startItem) {
                        startItem = startItem || opt[currentParsingMap[pos + 'Item']];
                        var d, traverseDirection = 'nextElementSibling', item = startItem;

                        if ((opt.scrollDirection === 'up' && pos === 'final') ||
                            (opt.scrollDirection === 'down' && pos === 'initial')) {
                            itms.reverse();
                            traverseDirection = 'previousElementSibling';
                        }
                        //console.log('buffer %o %o , startItem %o,direction %o', pos, itms.slice(0), startItem, traverseDirection);

                        while ((d = itms.shift()) !== undefined) {
                            //console.log('dd', d, item);
                            item = item[traverseDirection];
                            self.fillItem(d, item, i++);
                        }
                        if (opt.scrollDirection === 'up') {
                            self.oldVisibleItemsRange[pos === 'final' ? 0 : 1] = item;
                        } else {
                            self.oldVisibleItemsRange[pos === 'final' ? 1 : 0] = item;
                        }

                    }, oldVisibleItemsRange;
                if (this.oldVisibleItemsRange.length !== 0) {
                    i = 0;
                    oldVisibleItemsRange = this.oldVisibleItemsRange.slice(0);
                    if (opt.scrollDirection === 'up') {
                        oldVisibleItemsRange.reverse();
                    }
                    oldItem = oldVisibleItemsRange[0];
                    this.oldVisibleItemsRange[currentParsingMap.startRangeIdx] = opt[currentParsingMap.initialItem];
                    this.oldVisibleItemsRange[currentParsingMap.endRangeIdx] = opt[currentParsingMap.finalItem];
                    if(this.config.emptyInvisibleItems){
                        while (oldItem) {
                            //this.emptyItem(oldItem, [+opt.firstItem.getAttribute('data-index'), +opt.lastItem.getAttribute('data-index')]);
                            this.emptyItem(oldItem, data.range);
                            if (oldItem === oldVisibleItemsRange[1]) {
                                break;
                            }
                            oldItem = oldItem[currentParsingMap.traverseDirection];
                        }
                    }
                    


                    while (updateCurrentItem()) {
                        itemIdxInData = currentItem.getAttribute('data-index') - data.range[0];
                        this.fillItem(data.items.slice(itemIdxInData, itemIdxInData + 1)[0], currentItem, i++);
                        if (currentItem === finalItem) {
                            break;
                        }
                    }

                    if (parseInt(currentItem.getAttribute('data-index'),10) !== 0) {
                        //console.log('final buffer itemIdxInData %o', itemIdxInData, currentItem[currentParsingMap.traverseDirection]);
                        //fillBufferStartItem = opt.scrollDirection === 'up'?currentItem[currentParsingMap.traverseDirection]:null;
                        fillBuffer(opt.scrollDirection === 'down' ? data.items.slice(itemIdxInData + 1) :
                            data.items.slice(0, itemIdxInData), 'final');
                    }

                    //initial item buffer
                    //console.log('initial buffer', itemIdxInData, currentItem);
                    fillBuffer(opt.scrollDirection === 'down' ?
                        data.items.slice(0, opt[currentParsingMap.initialItem].getAttribute('data-index') - data.range[0]) :
                        data.items.slice(opt[currentParsingMap.initialItem].getAttribute('data-index') - data.range[1]),
                        'initial'
                    );


                } else {
                    for (i = 0, l = data.items.length; i < l; i++) {
                        updateCurrentItem();
                        if ([0, l - 1].indexOf(i) !== -1) {
                            this.oldVisibleItemsRange.push(currentItem);
                        }
                        //currentItem = i === 0 ? opt.firstItem : currentItem.nextElementSibling;
                        if (currentItem.classList.contains('loaded')) {
                            continue;
                        }
                        this.fillItem(data.items[i], currentItem, i);
                    }
                }
                //this.oldVisibleItemsRange = this.visibleItemsRange.slice(0);
                this.setConfig('updatingGrid', false);
            },
            emptyItem: function (itemNode, outRange) {
                var idx = +itemNode.getAttribute('data-index');
                //this item is still visible
                if (idx >= outRange[0] && idx <= outRange[1]) {
                    //console.log('item is visible, do not empty', idx);
                    return;
                }
                //console.log('empty %o', idx, outRange);
                //itemNode.innerHTML = '';
                itemNode.innerHTML = this.config.itemInnerTpl;
                itemNode.classList.remove('loaded');
            },
            emptyItems: function () {
                var items = slice.call(this.container.getElementsByClassName('loaded')), i = 0, l = items.length,item;
                for (; i<l; i++) {
                    item = items[i];
                    item.innerHTML = this.config.itemInnerTpl;
                    item.classList.remove('loaded');
                }
            },
            /**
             * @method fillItem
             * @abstract
             */
            fillItem: function (data, itemNode, _fillOrder) {
                if (!data || !itemNode || itemNode.classList.contains('loaded')) {

                    return;
                }
                if (this.config.fillItem) {
                    return this.config.fillItem.apply(this, arguments);
                }
                data._fillOrder = _fillOrder;
                data._itemIndex = itemNode.getAttribute('data-index');
                itemNode.innerHTML = this.tplEngine(data);
                itemNode.classList.add('loaded');
            },
            /**
             * @method fetchItems
             * @param {Object} args
             * @param {Array.<Number>} args.range
             * @param {function(Error,{items:Array, range:Array})} args.callback
             * @abstract
             */
            fetchItems: function (args) {
                if (this.config.fetchItems) {
                    return this.config.fetchItems.apply(this, arguments);
                }
                if (!this.config.data) {
                    return;
                }

                var items = this.config.data.slice(args.range[0], args.range[1] + 1);
                args.callback(null, {
                    items: items,
                    range: args.range
                });

            },
            resize: function (opt, node) {
                var setValue = function(k){
                    if(k in opt){
                        node.style[mapping[k]] = typeof(opt[k]) === 'number' ? opt[k]+'px':opt[k];
                    }
                }, mapping = {
                    h:'height',
                    w:'width'
                };
                setValue('h');
                setValue('w');
                
                return this;
            },
            detach: function () {
                this.basicStyles('remove');
            },
            basicStyles: function (action) {
                this.container.classList[action](this.config.baseCls);
                this.container.classList[action](this.config.direction);
                this.container.firstElementChild.classList[action](this.config.innerCls);
            },
            destroy: function () {
                this.detach();
                this.connect.forEach(function (c) {
                    c.remove();
                });
                this.scroller && this.scroller.destroy();
                this.container.innerHTML = '';
                this.container = null;
            }
        });
        return SimpleDataGrid;
    });