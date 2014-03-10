/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true */
define([
    '../util/Class',
    '../util/Helper',
    '../util/Dom',
    '../util/BaseEvented',
    '../util/Animation',
    '../util/DomEvent',
    '../util/keyboard',
    '../util/Promise',
    'bower_components/hogan/web/builds/2.0.0/hogan-2.0.0.amd',
    'text!assets/common/template/datagridinfinite/dataGrid.html',
    'text!assets/common/template/datagridinfinite/itemTemplate.html',
    'text!assets/common/template/datagridinfinite/rowTemplate.html'
], function (klass, helper, domHelper, BaseEvented, animation, domEvent, keyboard, promise, Hogan, gridTemplate, itemTemplate, rowTemplate) {
    'use strict';
    var slice = Array.prototype.slice, doc = document;
    /**
     * @class com.sesamtv.core.ui.DataGridInfiniteNativeScroll
     * @extends com.sesamtv.core.util.BaseEvented
     * @param {Object} opt
     * @param {HTMLElement} node
     */
    var DataGridInfiniteNativeScroll = klass({
        extend: BaseEvented,
        constructor: function DataGridInfiniteNativeScroll(opt, node) {
            var self = this;
            this.config = {
                /**
                 * @cfg {String} direction x or y
                 */
                direction: 'x',
                /**
                 * @cfg {String} [baseCls='dataGridInfinite']
                 */
                baseCls: 'dataGridInfinite',
                scrollTimer: null,
                /**
                 * @cfg {Number} [scrollEndDelay=200]
                 */
                scrollEndDelay: 200,
                /**
                 * @cfg {Number} [bufferLines=3]
                 */
                bufferLines: 3,
                /**
                 * @cfg {Number} [duration=300]
                 */
                duration: 300,
                /**
                 * @cfg {String} [animType='easeOutExpo']
                 */
                animType: 'easeOutExpo',
                /**
                 * @cfg {Boolean} keyboard bind keyboard events
                 */
                keyboard: true,
                maxIntense: 10,
                initialRowPositions: [],
                totalResults: Infinity,
                currentStartIndex: 0,
                jumpQueue: [],
                scrollValue: 0,
                scrollbar: {
                    enabled: true,
                    minSize: 20
                },
                data: {
                    items: [],
                    start: 0,
                    total: 0
                },
                cssProps: {
                    transitionEnd: domHelper.getPrefixedCssProp('transitionEnd'),
                    transition: domHelper.getPrefixedCssProp('transition'),
                    transform: domHelper.getPrefixedCssProp('transform')
                },
                itemStyle: {
                    width: 320,
                    height: 150
                },
                itemTemplate: itemTemplate,
                rowTemplate: rowTemplate,
                node: node
            };
            this.keyboardMapping = {
                y: {
                    UP_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex - self.config.itemsPerLine;
                        if (targetIdx >= 0) {
                            self.selectLoadedItem(targetIdx);
                        }
                    },
                    DOWN_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex + self.config.itemsPerLine;
                        if (targetIdx < self.config.totalResults) {
                            self.selectLoadedItem(targetIdx);
                        }
                    },
                    LEFT_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex - 1;
                        if (selectedNode.previousElementSibling) {
                            self.selectLoadedItem(targetIdx);
                        }
                    },
                    RIGHT_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex + 1;
                        if (selectedNode.nextElementSibling && targetIdx < self.config.totalResults) {
                            self.selectLoadedItem(targetIdx);
                        }
                    }
                },
                x: {
                    UP_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex - 1;
                        if (selectedNode.previousElementSibling) {
                            self.selectLoadedItem(targetIdx);
                        }
                    },
                    DOWN_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex + 1;
                        if (selectedNode.nextElementSibling && targetIdx < self.config.totalResults) {
                            self.selectLoadedItem(targetIdx);
                        }
                    },
                    LEFT_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex - self.config.itemsPerLine;
                        if (targetIdx >= 0) {
                            self.selectLoadedItem(targetIdx);
                        }
                    },
                    RIGHT_ARROW: function (selectedNode) {
                        var targetIdx;
                        selectedNode = selectedNode || self.config.node.getElementsByClassName('selected')[0];
                        targetIdx = self.config.currentItemIndex + self.config.itemsPerLine;
                        if (targetIdx < self.config.totalResults) {
                            self.selectLoadedItem(targetIdx);
                        }
                    }
                }
            };
            opt && helper.merge(this.config, opt);

            this.setTplCompiler();
            BaseEvented.call(this);
            if (this.config.keyboard) {
                this.bindKeyboard();
            }
        },
        bindKeyboard: function () {
            var self = this, direction = this.config.direction;
            this.connect.push(domEvent.on(doc, 'keydown', function (evt) {
                var keyId = keyboard.getIdentifier(evt.keyCode);
                if (!self.keyboardMapping[direction][keyId]) {
                    return;
                }
                if ('navTimer' in self.config) {
                    return self.config.jumpQueue.push(function () {
                        self.keyAction(keyId);
                    });
                }
                self.keyAction(keyId);
            }));
        },
        keyAction: function (keyId) {
            var self = this, visibleRow,
                direction = this.config.direction,
                selectedNode;
            if (!this.keyboardMapping[direction][keyId]) {
                return;
            }
            if ('navTimer' in this.config) {
                return;
            }
            selectedNode = this.config.node.getElementsByClassName('selected')[0];
            if (!selectedNode) {
                visibleRow = this.getFirstVisibleRow();
                if (visibleRow) {
                    selectedNode = visibleRow.firstElementChild;
                    this.selectLoadedItem(parseInt(selectedNode.getAttribute('data-item-index'), 10));
                }
            }
            this.keyboardMapping[direction][keyId](selectedNode);
            this.config.navTimer = this.config.navTimer || setInterval(function () {
                if (self.config.jumpQueue.length) {
                    self.config.jumpQueue.shift();
                } else {
                    clearInterval(self.config.navTimer);
                    delete self.config.navTimer;
                }
            }, 10);
        },
        getFirstVisibleRow: function () {
            var i = 0, l = this.config.rowNodes.length, row, pos;
            for (; i < l; i++) {
                row = this.config.rowNodes[i];
                pos = this.getCssTransform(row)[this.config.direction];
                if (pos >= 0) {
                    return row;
                }
            }
        },
        getLastVisibleRow: function () {
            var i = 0, l = this.config.rowNodes.length,
                size = this.config.itemStyle[this.config.column.unit],
                row, pos, lastPos = 0, lastRow;
            for (; i < l; i++) {
                row = this.config.rowNodes[i];
                pos = this.getCssTransform(row)[this.config.direction] + size;
                if (pos >= 0 && pos <= this.config.viewport[this.config.column.unit]) {
                    if (pos >= lastPos) {
                        lastRow = row;
                    }
                }
            }
            return lastRow;
        },
        setTplCompiler: function () {
            this.config.itemTplCompiler = Hogan.compile(this.config.itemTemplate);
            this.config.rowTplCompiler = Hogan.compile(this.config.rowTemplate);
        },
        requestItems: function (args, callback, preventCache) {
            args = args || {
                start: 0,
                total: this.config.totalItems
            };
            var self = this, cache, fetchOptions = {}, fetchMissingOpt = {};

            if (!preventCache) {
                cache = this.getDataFromCache(args);
                if (cache.items.length) {
                    callback && callback({
                        data: cache.items,
                        range: args
                    });
                    if (cache.missing) {
                        fetchMissingOpt.start = cache.missing.start;
                        fetchMissingOpt.total = this.config.totalItems;
                        this.fetchItems(fetchMissingOpt).then(function (data) {
                            self.cacheData(data.items, fetchMissingOpt);
                            callback && callback({
                                data: data.items,
                                range: cache.missing
                            });
                            //self.fillGrid(data.items, cache.missing);
                        });
                    }
                    return;
                }

            }

            fetchOptions.start = args.start;
            fetchOptions.total = args.total < this.config.totalItems ? this.config.totalItems : args.total;

            this.fetchItems(fetchOptions).then(function (data) {
                self.cacheData(data.items, fetchOptions);
                //self.fillGrid(data.items, args);
                callback && callback({
                    data: data.items,
                    range: args
                });
            });
        },
        /**
         * @method fetchItems
         * @param  {Object} options [description]
         * @return {com.sesamtv.core.util.Promise}
         */
        fetchItems: function (options) {
            if (this.config.fetchItems) {
                return this.config.fetchItems(options);
            }
            throw new Error('fetchItems is not defined');
        },
        /**
         * @method cacheData
         * @param {Array} data
         * @param {Object} args
         * @param {Number} args.start
         * @param {Number} args.total
         */
        cacheData: function (data, args) {
            var l = data.length, items = this.config.data.items, range;
            args.total = l < args.total ? l : args.total;
            items.splice.apply(items, [args.start, args.total].concat(data));
            range = this.getItemRange(items);
            this.config.data.start = range.start;
            this.config.data.total = range.end - range.start + 1;
        },
        /**
         * @method getDataFromCache
         * @param {Object} range
         * @param {Number} range.start start index
         * @param {Number} range.total
         */
        getDataFromCache: function (range) {

            var data = [], items = this.config.data.items,
                i = range.start < this.config.data.start ? this.config.data.start : range.start,
                end = i + range.total - 1;
            for (; i <= end; i++) {
                if (items[i] === undefined) {
                    break;
                }
                data.push(items[i]);
            }
            i--;
            return {
                items: data,
                missing: i === end ? null : {
                    start: i,
                    total: end - i + 1
                }
            };
        },
        getItemRange: function (items) {
            var i = 0, l = items.length, start = -1, end = -1;
            for (; i < l; i++) {
                if (start < 0) {
                    if (items[i] === undefined) {
                        continue;
                    }
                    start = i;
                } else {
                    if (items[i] === undefined) {
                        break;
                    }
                    end = i;
                }
            }
            return {
                start: start,
                end: end
            };
        },
        /**
         * @method render
         * @param {HTMLElement} [node]
         * @chainable
         */
        render: function (node) {
            node = node || this.config.node;
            this.config.node = node;
            this.config.oldNode = this.config.node;
            var grid = doc.createElement('div'), self = this,
                cls = this.config.oldNode.className.split(" "),
                id = this.config.oldNode.id, classList;
            grid.innerHTML = Hogan.compile(gridTemplate).render(this.config);
            grid = grid.firstElementChild;
            this.config.node.parentNode.replaceChild(grid, this.config.node);
            this.config.node = grid;

            this.config.id = this.config.node.id = id ? id : ('datagrid-' + (new Date() % 1e9));

            classList = this.config.node.classList;
            cls.forEach(function (c) {
                c = c.trim();
                if (c) {
                    classList.add(c);
                }
            });

            this.postRender();
            this.initScroller();
            this.requestItems(null, function (opt) {
                self.fillGrid(opt.data, opt.range);
            });
            return this;
        },
        initScroller: function () {
            var self = this, pageValue, time, getEvent = function (evt) {
                if (domHelper.supportTouch) {
                    return evt.touches[0];
                }
                return evt;
            }, gap, timeGap, evt;
            domEvent.on(this.config.node, 'mousedown', function (e) {
                if (('button' in e && e.button === 2) || (domHelper.supportTouch && e.touches.length > 1)) {
                    return;
                }
                self.stopAnims();

                e.preventDefault();
                var h = domEvent.on(doc, 'mousemove', function (moveEvt) {
                    //self.stopAnims();
                    !moved && (moved = true);
                    var t = +(new Date());
                    evt = getEvent(moveEvt);
                    if (pageValue === undefined) {
                        pageValue = evt[self.config.pageAttr];
                        time = t;
                    } else {
                        gap = pageValue - evt[self.config.pageAttr];
                        timeGap = t - time;
                        time = t;
                        pageValue = evt[self.config.pageAttr];
                        if (gap !== 0 && !self.detectEdge(gap > 0 ? 'next' : 'prev', true)) {
                            self.moveRowsBy(gap);
                        }

                    }
                }), moved = false;
                domEvent.once(doc, 'mouseup', function (upEvt) {
                    var intense;
                    h.remove();
                    if (gap !== 0 && moved && !self.detectEdge(gap > 0 ? 'next' : 'prev')) {
                        intense = Math.abs(gap / timeGap);
                        self.simulateInertia({
                            gap: gap,
                            intense: intense > self.config.maxIntense ? self.config.maxIntense : intense
                        });
                    }

                    pageValue = undefined;
                    gap = 0;
                    timeGap = 0;
                    h = null;
                });
            });
        },
        getCssTransform: function (node) {
            var m = node.style[this.config.cssProps.transform.js].match(/translate3d\((.*?)\)/);
            m = m[1].split(",");
            return {
                x: parseFloat(m[0]),
                y: parseFloat(m[1]),
                z: parseFloat(m[2])
            };
        },
        simulateInertia: function (opt) {
            //console.log('intense',opt.intense);
            opt = opt || {};
            opt.hasIntense = 'intense' in opt;
            if (opt.hasIntense && opt.intense < 0.2) {
                return;
            }
            if (this.config.disabled) {
                return;
            }
            var distance = opt.hasIntense ? opt.intense * opt.gap * 2 : opt.distance,
                duration = opt.hasIntense ? opt.intense * 50 : opt.duration;
            this.config.combinedAnim = this.scrollTo(distance, duration);
            this.config.combinedAnim && this.config.combinedAnim.play();
        },
        selectLoadedItem: function (dataItemIndex, ensureItemSelectable) {
            console.log('dataItemIndex', dataItemIndex);

            var idx = dataItemIndex + 'I',
                self = this,
                duration = 300,
                items = this.config.itemNodes,
                firstSelect = !('currentItemIndex' in this.config),
                isNext = dataItemIndex > (this.config.currentItemIndex || 0),
                targetItem = self.config.node.querySelector('figure[data-item-index="' + idx + '"]'),
                centerPos = this.config.itemStyle[this.config.column.unit] * Math.floor(this.config.totalVisibleLines / 2),
                rowNode, rowPos, rightRowPos,
                selectedItem, item, i = 0, l = items.length, anim, gap,
                run = function () {
                    selectedItem = self.config.node.getElementsByClassName('selected')[0];
                    targetItem.classList.add('selected');
                    selectedItem && selectedItem.classList.remove('selected');

                    rowNode = targetItem.parentNode;
                    rowPos = self.getCssTransform(rowNode)[self.config.direction];
                    rightRowPos = rowPos + self.config.itemStyle[self.config.column.unit];
                    gap = rowPos - centerPos;

                    if ((selectedItem && selectedItem.parentNode === rowNode) || firstSelect) {
                        return self.setConfig('currentItemIndex', dataItemIndex);
                    }

                    if (rowPos < 0 || (isNext && rowPos > centerPos) || (!isNext && rowPos < centerPos)) {
                        if (self.config.goToSelectedItemAnim && self.config.goToSelectedItemAnim.getStatus() === 'stopped') {
                            return self.setConfig('currentItemIndex', dataItemIndex);
                        }

                        if (!self.detectEdge(isNext ? 'next' : 'prev') &&
                            /*!self.config.closedToEdge &&*/
                            (self.config.goToSelectedItemAnim = self.scrollTo(gap, duration)) !== null) {
                            self.config.goToSelectedItemAnim.on('end',function () {
                                delete self.config.goToSelectedItemAnim;
                            }).play();
                            return self.setConfig('currentItemIndex', dataItemIndex);
                        }
                    }
                    self.setConfig('currentItemIndex', dataItemIndex);
                };

            if (!targetItem) {
                console.log('target item idx ' + idx + ' not found');
                return;
            }

            if (this.config.goToSelectedItemAnim) {
                if (this.config.goToSelectedItemAnim.hasJumpedToEnd()) {
                    return;
                }
                this.config.goToSelectedItemAnim.on('end', run).jumpToEnd();
            } else {
                run();
            }
        },
        goToItemIndex: function (idx) {
            if (idx < 0 || idx > this.config.totalResults - 1) {
                return;
            }
            if (!('currentItemIndex' in this.config)) {
                this.selectLoadedItem(this.config.currentStartIndex);
            }
            var self = this,
                startIdx = this.config.currentItemIndex,
                gap = this.config.itemsPerLine,
                isNext = idx > startIdx,
                done = false,
                i = gap, step,
                t = setInterval(isNext ? function () {
                    step = startIdx + i;
                    if (step <= idx) {
                        if (step === idx) {
                            done = true;
                        }
                        self.selectLoadedItem(step);
                    } else {
                        if (!done) {
                            self.selectLoadedItem(idx);
                        }
                        clearInterval(t);
                    }
                    i = i + gap;
                } : function () {
                    step = startIdx - i;
                    if (step >= idx) {
                        if (step === idx) {
                            done = true;
                        }
                        self.selectLoadedItem(step);
                    } else {
                        if (!done) {
                            self.selectLoadedItem(idx);
                        }
                        clearInterval(t);
                    }
                    i = i + gap;
                }, 50);
        },
        /**
         * @method scrollTo
         * @param {Number} distance
         * @param {Number} duration
         * @param {Boolean} [doNotDetectEdge]
         * @returns {com.sesamtv.core.util.Animation}
         */
        scrollTo: function (distance, duration, doNotDetectEdge) {
            if (distance === 0) {
                return null;
            }
            var self = this,
                anims = [],
                tpl = this.config.transformCompiler,
                lastIdx = this.config.totalLinesInDOM - 1,
                animAttr = self.config.cssProps.transform.js,
                swipeDirection = distance > 0 ? 'next' : 'prev';
            this.config.rowNodes.forEach(function (row, i) {
                var pos = self.getCssTransform(row);
                anims.push(animation.animate({
                    //from: pos[self.config.direction],
                    from: function () {
                        return self.getCssTransform(row)[self.config.direction] - (this.prevDistance || 0);
                    },
                    to: pos[self.config.direction] - distance,
                    type: self.config.animType,
                    duration: duration
                }).on('animate', i === lastIdx ? function (toPos, bez) {
                        row.style[animAttr] = tpl.render({
                            value: toPos
                        });
                        self.updateRowPositions(swipeDirection, distance * bez);
                        !doNotDetectEdge && self.detectEdge(swipeDirection);
                    } : function (toPos) {
                        row.style[animAttr] = tpl.render({
                            value: toPos
                        });
                    }));
            });
            return animation.combine(anims).on('end', function () {
                delete self.config.combinedAnim;
            });
        },
        /**
         * @method scrollToElement
         * @param {HTMLElement} node
         * @param {Number} duration
         * @param {Boolean} [doNotDetectEdge]
         * @returns {com.sesamtv.core.util.Animation}
         */
        scrollToElement: function (node, duration, doNotDetectEdge) {
            var distance = this.getCssTransform(node)[this.config.direction];
            if (distance === 0) {
                return null;
            }
            return this.scrollTo(distance, duration, doNotDetectEdge);
        },
        moveRowsBy: function (gap) {
            if (this.config.disabled || gap === 0) {
                return;
            }
            var pos, tpl = this.config.transformCompiler, animAttr = this.config.cssProps.transform.js,
                i = 0, l = this.config.rowNodes.length, swipeDirection = gap > 0 ? 'next' : 'prev',
                row;
            for (; i < l; i++) {
                row = this.config.rowNodes[i];
                pos = this.getCssTransform(row);
                row.style[animAttr] = tpl.render({
                    value: pos[this.config.direction] - gap
                });
            }
            this.updateRowPositions(swipeDirection, gap);
        },
        getRowNode: function (idx) {
            return doc.getElementById(this.buildRowId(idx));
        },
        buildRowId: function (idx) {
            return this.config.id + '-' + idx;
        },
        updateRowPositions: function (swipeDirection, distance) {
            //console.log('update row position', swipeDirection);
            var transformCompiler = this.config.transformCompiler,
                rowNodes = this.config.rowNodes,
                self = this,
                transformAttr = this.config.cssProps.transform.js,
                itemColumnSize = this.config.itemStyle[this.config.column.unit],
                buffNode;
            if (swipeDirection === 'next') {
                buffNode = rowNodes[0];
                if (this.getCssTransform(buffNode)[this.config.direction] < -itemColumnSize * this.config.bufferLines) {

                    buffNode.style[transformAttr] = transformCompiler.render({
                        value: this.getCssTransform(rowNodes[this.config.totalLinesInDOM - 1])[this.config.direction] +
                            itemColumnSize
                    });

                    rowNodes.splice(this.config.totalLinesInDOM, 0, buffNode);
                    rowNodes.shift();
                    this.config.currentStartIndex = this.config.currentStartIndex + this.config.itemsPerLine;

                    this.updateItemData(buffNode, swipeDirection);

                }

            } else {
                buffNode = rowNodes[this.config.totalLinesInDOM - 1];
                if (this.getCssTransform(buffNode)[this.config.direction] >
                    itemColumnSize * (this.config.totalVisibleLines + this.config.bufferLines)) {
                    buffNode.style[transformAttr] = transformCompiler.render({
                        value: this.getCssTransform(this.config.rowNodes[0])[this.config.direction] -
                            itemColumnSize
                    });
                    rowNodes.splice(0, 0, buffNode);
                    rowNodes.pop();
                    this.config.currentStartIndex = this.config.currentStartIndex - this.config.itemsPerLine;
                    this.updateItemData(buffNode, swipeDirection);
                }
            }

            this.triggerScrollEvent(swipeDirection, distance);

        },
        triggerScrollEvent: function (swipeDirection, distance) {
            var self = this;
            this.emit('scroll', {
                direction: swipeDirection,
                distance: distance
            });
            clearTimeout(this.config.scrollEndTimer);
            this.config.scrollEndTimer = setTimeout(function () {
                self.emit('scrollEnd');
            }, 200);
        },
        updateItemData: function (rowNode, swipeDirection) {
            var start = swipeDirection === 'next' ?
                    this.config.currentStartIndex + this.config.totalItems - this.config.itemsPerLine :
                    this.config.currentStartIndex,
            /*itemNodes = rowNode.getElementsByClassName('item'),*/
                itemNodes = rowNode.children,
                range = {
                    start: start,
                    total: this.config.itemsPerLine
                },
                self = this;
            //empty invisible items
            this.updateItemNodes(itemNodes, [], range);
            if (start < 0 || start > this.config.totalResults) {

                return;
            }
            this.requestItems(range, function (opt) {
                self.updateItemNodes(itemNodes, opt.data, opt.range);
            });
        },

        stopInertiaAnim: function () {
            if (this.config.combinedAnim) {
                this.config.combinedAnim.stop();
                delete this.config.combinedAnim;
            }
        },
        stopAnims: function () {
            this.stopInertiaAnim();
            this.config.goToSelectedItemAnim && this.config.goToSelectedItemAnim.stop();
            this.config.edgeAnim && this.config.edgeAnim.stop();
        },
        detectEdge: function (swipeDirection, noSimulation) {
            return this[swipeDirection + 'Edge'](noSimulation);
        },
        nextEdge: function (noSimulation) {
            var totalIdx = this.config.currentStartIndex + this.config.totalItems -
                    this.config.bufferLines * (this.config.itemsPerLine - 1) - 1,
                rowIdx, self = this;
            if (totalIdx > Math.floor(this.config.totalResults / this.config.itemsPerLine) * this.config.itemsPerLine +
                this.config.itemsPerLine * 2) {
                rowIdx = Math.ceil((this.config.totalResults - this.config.currentStartIndex - this.config.itemsPerLine - 1) /
                    this.config.itemsPerLine);
                var row = this.config.rowNodes[rowIdx],
                    pos = this.getCssTransform(row)[this.config.direction],
                    itemColumnSize = this.config.itemStyle[this.config.column.unit],
                    rowPosition = pos + itemColumnSize,
                    visibleWidth = this.config.node[this.config.column.offset];
                if (Math.round(rowPosition) === visibleWidth) {
                    this.config.edgeAnim && this.config.edgeAnim.stop();
                    this.config.closedToEdge = 'next';
                    return true;
                }
                this.stopAnims();
                pos = Math.abs(pos);
                if (noSimulation) {
                    return true;
                }
                if ((this.config.edgeAnim = this.scrollTo(rowPosition - visibleWidth, pos > 400 ? 400 : pos, true)) !== null) {
                    this.config.edgeAnim.on('end',function () {
                        self.config.disabled = false;
                        self.config.closedToEdge = 'next';
                        delete self.config.edgeAnim;
                        self.triggerScrollEvent('next');
                    }).play();
                    this.config.disabled = true;
                    return true;
                }

            }

            if (this.config.closedToEdge !== 'next') {
                delete this.config.closedToEdge;
            }
            return false;
        },
        prevEdge: function (noSimulation) {
            if (this.config.currentStartIndex <= -this.config.itemsPerLine * this.config.bufferLines) {

                var self = this,
                    row = this.config.rowNodes[Math.abs(this.config.currentStartIndex) / this.config.itemsPerLine],
                    pos = this.getCssTransform(row)[this.config.direction], anim;

                if (Math.round(pos) === 0) {
                    this.config.edgeAnim && this.config.edgeAnim.stop();
                    this.config.closedToEdge = 'prev';
                    return true;
                }

                this.stopAnims();
                pos = Math.abs(pos) * 10;
                if (noSimulation) {
                    return true;
                }
                if ((this.config.edgeAnim = this.scrollToElement(row, pos > 400 ? 400 : pos, true)) !== null) {
                    this.config.edgeAnim.on('end',function () {
                        self.config.disabled = false;
                        self.config.closedToEdge = 'prev';
                        delete self.config.edgeAnim;
                        self.triggerScrollEvent('prev');
                    }).play();
                    this.config.disabled = true;
                    return true;
                }

            }

            if (this.config.closedToEdge !== 'prev') {
                delete this.config.closedToEdge;
            }
            return false;
        },
        postRender: function () {
            this.updateVariables();
            this.updateRows();
            this.prefillItems();
        },
        prefillItems: function () {
            var total = this.config.totalItems, i = 0, str = '',
                rows = this.config.node.children,
                rowId = 0,
                renderedItemStr = this.config.itemTplCompiler.render({
                    style: this.config.itemStyle
                });
            for (; i < total; i++) {
                str += renderedItemStr;
                if ((i + 1) % this.config.itemsPerLine === 0) {
                    rows[rowId].innerHTML = str;
                    str = '';
                    rowId++;
                }
            }
            this.config.itemNodes = slice.call(this.config.node.getElementsByTagName('figure'));
        },
        updateRows: function () {
            this.config.initialRowPositions.length = 0;
            var i = 0,
                row = this.config.row,
                column = this.config.column,
                totalLinesInDOM = this.config.totalLinesInDOM,
                rowStr = '',
                rowPosition,
                transformCompiler = this.config.transformCompiler;
            for (; i < totalLinesInDOM; i++) {
                rowPosition = i * this.config.itemStyle[this.config.column.unit];
                rowStr += this.config.rowTplCompiler.render({
                    i: i,
                    id: this.config.id,
                    column: column,
                    row: row,
                    unitValue: this.config.itemStyle[column.unit],
                    rowValue: this.config.itemStyle[row.unit] * this.config.itemsPerLine,
                    transformAttr: this.config.cssProps.transform.css,
                    transform: transformCompiler.render({
                        value: rowPosition
                    })
                });
                this.config.initialRowPositions[i] = rowPosition;
            }
            this.config.rowPositions = this.config.initialRowPositions.slice(0);
            rowStr = rowStr + '<div class="scrollbar"><div class="scroller"></div></div>';
            this.config.node.innerHTML = rowStr;
            this.config.rowNodes = slice.call(this.config.node.getElementsByClassName('row'));

        },
        updateVariables: function () {
            this['_updateVar' + this.config.direction.toUpperCase()]();
            this.config.itemsPerLine = Math.floor(this.config.node[this.config.row.offset] / this.config.itemStyle[this.config.row.unit]);
            this.config.totalVisibleLines = Math.ceil(this.config.node[this.config.column.offset] / this.config.itemStyle[this.config.column.unit]);
            this.config.totalVisibleItems = this.config.itemsPerLine * this.config.totalVisibleLines;
            this.config.totalLinesInDOM = this.config.bufferLines * 2 + this.config.totalVisibleLines;
            this.config.totalItems = this.config.totalLinesInDOM * this.config.itemsPerLine;
            this.config.transformCompiler = Hogan.compile(this.config.transformAttr);
            this.config.viewport = this.config.node.getBoundingClientRect();
        },
        _updateVarX: function () {
            this.config.scrollAttr = 'scrollLeft';
            this.config.pageAttr = 'pageX';
            this.config.transformAttr = "translate3d({{value}}px,0,0)";
            this.config.column = {
                offset: 'offsetWidth',
                unit: 'width'
            };
            this.config.row = {
                offset: 'offsetHeight',
                unit: 'height'
            };
        },
        _updateVarY: function () {
            this.config.scrollAttr = 'scrollTop';
            this.config.pageAttr = 'pageY';
            this.config.transformAttr = "translate3d(0,{{value}}px,0)";
            this.config.row = {
                offset: 'offsetWidth',
                unit: 'width'
            };
            this.config.column = {
                offset: 'offsetHeight',
                unit: 'height'
            };
        },
        /**
         * @method fillGrid
         * @param {Array} data
         * @param {Object} range
         * @param {Number} range.start
         * @param {Number} range.total
         */
        fillGrid: function (data, range) {
            console.log('fillGrid', range);
            var items = this.config.itemNodes,
                idx, node,
                j = 0,
                l = data.length,
                itemIndex, item, d;
            for (; j < l; j++) {
                d = data[j];
                idx = range.start - this.config.currentStartIndex + j;
                item = items[idx];
                itemIndex = range.start + j;
                if (!item || parseInt(item.getAttribute('data-item-index'), 10) === itemIndex) {
                    continue;
                }
                node = domHelper.toDOM(this.config.itemTplCompiler.render({
                    style: this.config.itemStyle,
                    itemIndex: itemIndex + 'I',
                    item: d
                }));
                item.parentNode.replaceChild(node, item);
                items[idx] = node;
            }
            this.config.scrollbar.enabled && this.initScrollbar();
            if (this.config.keyboard) {
                this.selectLoadedItem(0);
            }
        },
        initScrollbar: function () {
            var unit = this.config.column.unit,
                self = this, itemNode,
                tpl = this.config.transformCompiler,
                animAttr = self.config.cssProps.transform.js,
                totalLines = Math.ceil(this.config.totalResults / this.config.itemsPerLine),
                containerSize = this.config.viewport[unit],
                dataIndex, gap, scroller;
            this.config.scrollbarNode = this.config.node.getElementsByClassName('scrollbar')[0];
            scroller = this.config.scrollbarNode.firstElementChild;
            this.config.scrollbar.size = (1 / totalLines) * containerSize;
            if (this.config.scrollbar.size < this.config.scrollbar.minSize) {
                this.config.scrollbar.size = this.config.scrollbar.minSize;
            }
            scroller.style[unit] = this.config.scrollbar.size + 'px';
            this.connect.push(this.on('scroll', function (evt) {
                if (self.config.disabled) {
                    return;
                }
                itemNode = evt.direction === 'prev' ?
                    self.getFirstVisibleRow().firstElementChild :
                    self.getLastVisibleRow().lastElementChild;
                dataIndex = parseInt(itemNode.getAttribute('data-item-index'), 10);
                //console.log('dataIndex',dataIndex);
                gap = (dataIndex / self.config.totalResults) * containerSize;
                if (evt.direction === 'next') {
                    gap -= self.config.scrollbar.size;
                }
                scroller.style[animAttr] = tpl.render({
                    value: Math.floor(gap)
                });
            }));
        },
        updateItemNodes: function (itemNodes, data, range) {
            var i = 0, l = itemNodes.length,
                items = this.config.itemNodes,
                itemNode, itemData, itemDataIndex, node;
            for (; i < l; i++) {
                itemNode = itemNodes[i];
                itemDataIndex = range.start + i;
                if (!itemNode) {
                    continue;
                }

                itemData = itemDataIndex > this.config.totalResults - 1 ? null : data[i];
                itemNode.setAttribute('data-item-index', itemDataIndex + 'I');
                if (itemNode.classList.contains('selected')) {
                    this.unselect(itemNode);
                }
                itemNode.classList[itemData ? 'remove' : 'add']('empty');
                itemNode.innerHTML = this.config.itemTplCompiler.render({
                    inner: true,
                    item: itemData
                });
            }
        },
        unselect: function (itemNode) {
            if (!itemNode) {
                itemNode = this.config.node.getElementsByClassName('selected')[0];
            }
            if (!itemNode) {
                return;
            }
            itemNode.classList.remove('selected');
            delete this.config.currentItemIndex;
        },
        destroy: function () {
            this.config.node.parentNode.replaceChild(this.config.oldNode, this.config.node);
            this.config.node = null;
            this.config.oldNode = null;
        }
    });
    return DataGridInfiniteNativeScroll;
});