define([
    'require',
    '../util/Class',
    './BaseGrid',
    './Panel',
    './BaseScroller',
    './DataGridAside',
    '../engine/input/Manager',
    '../util/Helper',
    '../util/DomEvent',
    '../engine/GestureManager'
], function (require, Class, BaseGrid, Panel, BaseScroller, DataGridAside, InputManager, helper, DomEvent, GestureManager) {
    "use strict";
    var inputManager = new InputManager();
    /**
     * template:
     *
     *      <div id='myGrid' class='dataGrid'>
     *          <div class='viewPanel'>
     *              <div class='group'>
     *                  <figure class='cell'></figure>
     *                  <figure class='cell'></figure>
     *              </div>
     *          </div>
     *          <div class='viewPanel'>
     *              <div class='group'><figure class='cell'></figure></div>
     *          </div>
     *      </div>
     *
     * @class com.sesamtv.core.ui.DataGrid
     * @extends com.sesamtv.core.ui.BaseGrid
     * @requires com.sesamtv.core.ui.Panel
     * @requires com.sesamtv.core.ui.DataGridAside
     * @requires com.sesamtv.core.BaseScroller
     * @requires com.sesamtv.core.engine.inputManager.Manager
     * @requires com.sesamtv.core.util.DomEvent
     * @cfg {Object} args
     * @cfg {Object} args.aside
     * @cfg {String} args.viewPanelClass className for view panels
     * @cfg {String} args.groupClass className for groups
     * @cfg {String} args.cellClass className for cells
     * @cfg {String} [args.gridLayoutType=y] y (vertical) or x(horizontal)
     * @cfg {String} [args.usingScrollStyle] webkitTransform, top or left(todo)
     * @cfg {Number} args.maxCells
     * @cfg {Number} args.cellGap
     * @cfg {HTMLElement|String} node
     */
    var DataGrid = Class({
        extend: BaseGrid,
        constructor: function (args, node) {
            args = args || {};
            args.type = 'dataGrid';
            args.baseClass = args.baseClass || 'dataGrid';

            this.gridLayoutType = args.gridLayoutType || 'y';

            args.viewPanelClass = args.viewPanelClass || 'viewPanel';
            args.groupClass = args.groupClass || 'group';
            args.cellClass = args.cellClass || 'cell';
            this.itemSelector = '* > .' + args.viewPanelClass;
            BaseGrid.call(this, args, node);

            /**
             * @property cellTpl
             * @type {String|Function}
             */
            if (this.cellTpl) {
                if (typeof(this.cellTpl) == 'string') {
                    this.cellTpl = helper.substitute(this.cellTpl);
                }
            }

            //this.cellTpl && this.setItemTemplate(this.cellTpl);
            this.maxCells = this.maxCells || 48;
            /**
             * calculated depends on total view panels number
             * @property cellsPerViewPanel
             * @type {Number}
             */
            this.cellsPerViewPanel = null;
            this.disabled = false;
            /**
             * if we are jumping to a given position
             * @property jumping
             * @type {Boolean}
             */
            this.jumping = false;
            /**
             * flag if we force to disable transition
             * @property noTransition
             * @type {Boolean}
             */
            this.noTransition = false;

            this._nextPanelSwapCounter = 0;
            this._prevPanelSwapCounter = 0;
            this.queue = [];
            this.currentLineNumber = 0;
            this.taskQueue = [];
            /**
             * item aside connector, it contains at least a function 'remove' to remove the aside
             * @property itemAside
             * @type {Object}
             */
            this.itemAside = null;
            Object.defineProperties(this, {
                itemsPerGroup: {
                    get: function () {
                        return this.maxCells / this.itemList.visibleItems[0].itemList.visibleItems.length;
                    }
                },
                groupsPerLine: {
                    get: function () {
                        return this.itemList.visibleItems[0].itemList.visibleItems.length;
                    }
                }
            });
            if (this.aside) {
                this.aside = new DataGridAside(Class.mixin({
                    grid: this
                }, this.aside));
            }
            this.scrollBarCls = this.scrollBarCls || 'gridScrollBar';
            this.scrollId = this.scrollId || 'gridScroll';
        },
        /**
         * import datagrid structure based on DOM
         * @method importStructure
         */
        importStructure: function () {
            this.importItems(BaseGrid, null, {
                autoImport: true,
                baseClass: this.viewPanelClass,
                itemSelector: '* > .' + this.groupClass,
                importCmp: Panel,
                importArgs: {
                    baseClass: this.groupClass,
                    autoImport: true,
                    itemSelector: '* > .' + this.cellClass,
                    importCmp: Panel,
                    importArgs: {
                        baseClass: this.cellClass
                    }
                }
            });
        },
        /**
         * attach component and events to the HTMLElement
         * @method attachTo
         * @param {HTMLElement|String} node
         */
        attachTo: function (node) {
            var self = this;
            console.log('attach to');
            BaseGrid.prototype.attachTo.call(this, node);


            this.node.classList.add(this.gridLayoutType);

            this.importStructure();

            this.node.classList.add(this.visibleItemList.length == 1 ? 'singleViewPanel' : 'doubleViewPanels');


            this.scroller = new BaseScroller(Class.mixin({
                controller: this,
                scrollItemBegin: this.scrollItemBegin,
                scrollElementLayoutType: this.gridLayoutType,
                direction: this.direction,
                scrollElement: this.visibleItemList,
                gap: this.cellGap,
                usingScrollStyle: this.usingScrollStyle,
                scrollBarCls: this.scrollBarCls,
                scrollId: this.scrollId
            }, this.scrollerConfig || {}), this.node);


            this.connect.push(inputManager.on('LeftKey', function () {
                if (self.disabled) {
                    return;
                }
                if (self.itemAside) {
                    return self.aside.close(function () {
                        self.goToPrevGridCell();
                        self.itemAside = null;
                    });
                }
                self.goToPrevGridCell();
            }));
            this.connect.push(inputManager.on('RightKey', function () {
                if (self.disabled) {
                    return;
                }
                if (self.itemAside) {
                    return self.aside.close(function () {
                        self.goToNextGridCell();
                        self.itemAside = null;
                    });
                }
                self.goToNextGridCell();
            }));
            this.connect.push(inputManager.on('UpKey', function () {
                self.emit('goToPrevLine');

            }));
            this.connect.push(inputManager.on('DownKey', function () {
                self.emit('goToNextLine');
            }));
            this.connect.push(inputManager.on('EnterKey', function () {
                if (self.disabled) {
                    return;
                }
                console.log('enter', self.currentVisibleCell());
                self.emit('enter', self.currentVisibleCell());
            }));
            this.connect.push(inputManager.on('keyhold', function () {
                self.set('holding', true);
                inputManager.once('keyreleased', function () {
                    //when key released, clear all cached tasks.
                    self.set('holding', false);
                    self.taskQueue.length = 0;
                });
            }));
            /**
             * @event fetchData
             */
            this.connect.push(this.on('fetchData', this[this.visibleItemList.length == 2 ? 'feedDoubleViewPanels' : 'feedSingleViewPanel']));

            this.connect.push(this.on('enter', this.aside ? function (cell) {
                if (self.itemAside) {
                    self.aside.close();
                    self.itemAside = null;
                    return;
                }
                self.itemAside = self.aside.open(cell);
            } : this.show));

            this.connect.push(this.on('goToNextLine', this.goToNextLine));
            this.connect.push(this.on('goToPrevLine', this.goToPrevLine));
            /**
             * if paused is false, remove and execute first task. (rule: FIFO)
             * @event paused
             */
            this.connect.push(this.on('paused', function (v) {
                if (!v.newValue && self.taskQueue.length) {
                    self.taskQueue.shift()();
                }
            }));


            if (this.gestureConfig) {
                this.gestureManager = new GestureManager(this.gestureConfig, this.node);
                this.attachTouchEvents();
            }

            this.initStore();
        },
        attachTouchEvents: function () {
            var self = this;
            if (this.gestureConfig.enableMousewheel) {
                this.scroller.attachMousewheel(this.gestureManager);
            }
            if (this.simulateDrag) {
                return this.scroller.attachDragSimulation(this.gestureManager);
            }

            this.connect.push(this.gestureManager.on('goUp', function (evt) {
                if (Math.abs(evt._distance) > 200) {
                    return self.jumpBy(3);
                }
                self.emit('goToNextLine');
            }));
            this.connect.push(this.gestureManager.on('goDown', function (evt) {
                if (Math.abs(evt._distance) > 200) {
                    return self.jumpBy(-3);
                }
                self.emit('goToPrevLine');
            }));
        },
        show: function () {

        },
        /**
         * @event goToNextLine
         */
        goToNextLine: function () {

            var self = this;
            var exec = function () {
                if (self.goToNextGridGroup()) {
                    self.currentLineNumber++;
                    if (!self.scroller.scrollNext()) {
                        self.set('paused', false);
                    }
                    self.scroller.setScrollBar();
                } else {
                    self.set('paused', false);
                    self.scroller.applyTransition();
                }
            };

            if (self.itemAside) {
                return self.aside.close(function () {
                    //self.goToNextLine();
                    exec();
                    self.itemAside = null;
                });
            }

            if (self.disabled) {
                return;
            }
            if (self.paused) {
                self.taskQueue.push(exec);
                return;
            }
            exec();
            /*if (self.goToNextGridGroup()) {
             self.currentLineNumber++;
             self.scroller.scrollNext();
             self.scroller.setScrollBar();
             }*/

        },
        /**
         * @event goToPrevLine
         */
        goToPrevLine: function () {
            if (this.currentLineNumber === 0) {
                return this.scroller.applyTransition();
            }
            var self = this;
            var exec = function () {
                if (self.goToPrevGridGroup()) {
                    self.currentLineNumber--;
                    if (!self.scroller.scrollPrev()) {
                        self.set('paused', false);
                    }
                    self.scroller.setScrollBar();
                } else {
                    self.set('paused', false);
                    self.scroller.applyTransition();
                }
            };

            if (self.itemAside) {
                return self.aside.close(function () {
                    //self.goToPrevLine();
                    exec();
                    self.itemAside = null;
                });
            }

            if (self.disabled) {
                return;
            }
            if (self.paused) {
                self.taskQueue.push(exec);
                return;
            }
            exec();


            /*if (self.disabled) {
             return;
             }

             if (self.goToPrevGridGroup()) {
             self.currentLineNumber--;
             self.scroller.scrollPrev();
             self.scroller.setScrollBar();
             }*/
        },
        /**
         * @method removeData
         * @param {Object} viewPanel
         * @param {Object} params
         * @param {Number} params.startIndex
         * @param {Number} params.totalItems
         */
        removeData: function (viewPanel, params) {
            var self = this;
            params = params || {};
            params.startIndex = params.startIndex || 0;
            var currentGroup = this.currentVisibleGroup();
            currentGroup.unSelectCurrentItem();
            //viewPanel.node.classList.add('noTransition');
            if (params.totalItems) {
                viewPanel.visibleItemList.forEach(function (group) {
                    for (var i = params.startIndex; i < params.totalItems; i++) {
                        //console.log('remove',i);
                        if (currentGroup == group) {
                            if (params.direction == 'next') {
                                group.goPrev();
                            } else {
                                group.visibleItemList[group.currentItemIndex + 1] && group.currentItemIndex++;
                            }
                            //self.scroller && self.scroller.scrollPrev();
                        }

                        if (params.direction == 'next' && group.getItemByIndex(self.itemsPerGroup - i - 1)) {
                            group.removeItem(0, true);
                        }
                        if (params.direction == 'prev' && group.getItemByIndex(self.itemsPerGroup - i - 1)) {
                            group.removeItem(self.itemsPerGroup - i - 1, true);
                        }

                        //group.removeItem(params.direction == 'next' ? 0 : group.visibleItemList.length - 1, true);
                    }
                    if (currentGroup == group && params.direction == 'next') {
                        group.unSelectPrevItem();
                        group.selectCurrentItem();
                    }
                });

                //viewPanel.node.classList.remove('noTransition');
            }
        },
        feedData: function (viewPanel, params) {
            var self = this, removeData, startIndex, cachedData;

            if (params.direction == 'next') {

                this._nextPanelSwapCounter++;
                startIndex = this._prevPanelSwapCounter < 1 ? viewPanel.startIndex + viewPanel.itemsPerPage :
                    viewPanel.startIndex + viewPanel.itemsPerPage;

                if (this.prevStep == 'prev') {
                    startIndex = viewPanel.startIndex + this.maxCells;
                }
                /*if(viewPanel.startIndex == 1){
                 startIndex = viewPanel.startIndex+this.maxCells;
                 }*/
            }
            if (params.direction == 'prev') {
                this._prevPanelSwapCounter++;
                startIndex = this._nextPanelSwapCounter <= 1 ? (this.store.firstItemIndex + 0) :
                    viewPanel.startIndex - viewPanel.itemsPerPage;
                if (this.prevStep == 'next') {
                    startIndex = viewPanel.startIndex + viewPanel.itemsPerPage - this.maxCells - viewPanel.itemsPerPage;
                }

            }
            this.prevStep = params.direction;
            removeData = startIndex <= this.store.maxResults && startIndex >= this.store.firstItemIndex;
            if (!removeData) {
                self.currentVisibleGroup().selectCurrentItem();
                return params.callback(false);
            }
            viewPanel.set('startIndex', startIndex);
            viewPanel.set('itemsPerPage', params.totalItems * viewPanel.visibleItemList.length);
            //this.removeData(viewPanel, params);
            if (cachedData = this.store.getItems({
                startIndex: startIndex,
                itemsPerPage: viewPanel.get('itemsPerPage')
            })) {
                return params.callback(function () {
                    self.removeData(viewPanel, params);
                    //self.store.data = data;
                    self.setFromData(self.store.getItems({
                        data: cachedData
                    }), viewPanel, {
                        startIndex: params.direction == 'next' ? viewPanel.visibleItemList[0].visibleItemList.length : 0,
                        itemCls: 'preparing',
                        insertBefore: params.direction != 'next'
                    }, true);
                    self.currentVisibleGroup().selectCurrentItem();
                });
            }

            this.store.fetchData({
                'startIndex': viewPanel.startIndex,
                'maxResults': viewPanel.itemsPerPage,
                callback: function (data) {
                    //viewPanel.visibleItemList[0].visibleItemList.length = 0;
                    console.log('data', data, viewPanel.visibleItemList[0].visibleItemList.length);
                    params.callback(function () {
                        self.removeData(viewPanel, params);
                        self.store.data = data;
                        self.setFromData(self.store.getItems({
                            data: data
                        }), viewPanel, {
                            startIndex: params.direction == 'next' ? viewPanel.visibleItemList[0].visibleItemList.length : 0,
                            itemCls: 'preparing',
                            insertBefore: params.direction != 'next'
                        }, true);
                        self.currentVisibleGroup().selectCurrentItem();
                    });
                }
            });
        },
        feedSingleViewPanel: function (options) {
            var self = this,
                params = {
                    startIndex: 0,
                    direction: options.direction,
                    totalItems: this.scroller.visibleLinesInViewPort
                };
            params.callback = options.callback;
            this.feedData(this.currentVisibleItem(), params);
        },
        /**
         * @method feedDoubleViewPanels
         * @param {Object} options
         * @param {String} options.direction next or prev
         * @param {function(object)} options.callback
         * @returns {*}
         */
        feedDoubleViewPanels: function (options) {
            var targetViewPanel, startIndex, itemsPerPage = this.cellsPerViewPanel, self = this,
                direction = options.direction,
                callback = options.callback,
                fillGap = function (arr) {
                    if (arr.length >= self.cellsPerViewPanel) {
                        return arr;
                    }
                    var gap = self.cellsPerViewPanel - arr.length;
                    return arr.concat(new Array(gap));
                },
                cachedData;

            targetViewPanel = this.scroller.scrollElement[direction == 'next' ? 0 : 1];

            //console.log(this.store.getValue('startIndex'), direction, targetViewPanel.startIndex);

            if (direction == 'next') {
                this._nextPanelSwapCounter <= 1 && this._nextPanelSwapCounter++;
                if (this._prevPanelSwapCounter < 1) {
                    startIndex = this.store.getValue('startIndex') + this.store.getValue('itemsPerPage');
                } else {
                    startIndex = targetViewPanel.get('startIndex') + targetViewPanel.get('itemsPerPage') * 2;
                }
            } else {
                this._prevPanelSwapCounter < 1 && this._prevPanelSwapCounter++;
                if (this._nextPanelSwapCounter <= 1) {
                    startIndex = this.store.getValue('startIndex') - this.store.getValue('itemsPerPage') - this.cellsPerViewPanel;
                } else {
                    startIndex = targetViewPanel.get('startIndex') - targetViewPanel.get('itemsPerPage') * 2;
                }
            }

            if (startIndex < 0 + this.store.firstItemIndex) {
                self.setFromData([], targetViewPanel);
                return callback(false);
            }
            targetViewPanel.set('startIndex', startIndex);
            targetViewPanel.set('itemsPerPage', this.cellsPerViewPanel);

            /*if (this.jumping) {
             return callback(false);
             }*/

            if ((cachedData = this.store.getItems({
                startIndex: startIndex,
                itemsPerPage: targetViewPanel.get('itemsPerPage')
            })).length) {
                return callback(function () {
                    self.setFromData(fillGap(cachedData), targetViewPanel);
                });
            }
            this.store.fetchData({
                'startIndex': startIndex,
                'maxResults': this.cellsPerViewPanel,
                callback: function (data) {
                    console.log('data', data/*,targetViewPanel.node*/);
                    self.store.data = data;
                    callback(function () {
                        self.setFromData(fillGap(self.store.getItems({
                            data: data
                        })), targetViewPanel);
                    });
                }
            });
        },
        jumpBy: function (distance, showTransition) {
            return this.jumpTo(this.scroller.currentRow + distance, showTransition);
        },
        /**
         * jump to a given position, it controls the scroller
         * @method jumpTo
         * @param {Number|String} position percentage (string) or line(row for vertical) index (number)
         * @param {Boolean} [showTransition]
         */
        jumpTo: function (position, showTransition) {
            if (this.jumping) {
                return;
            }
            var self = this;
            if (typeof(position) == 'string') {
                position = Math.floor((position.replace('%', '') / 100 * this.scroller.rowNumber));
            }
            position = position < 0 ? 0 : position;
            if (position < 0) {
                position = 0;
            }
            if (position > this.scroller.rowNumber - 1) {
                position = this.scroller.rowNumber - 1;
            }
            /*if (position < 0 || position > this.scroller.rowNumber) {
             return;
             }*/

            var distance = position - this.scroller.currentRow,
                abs = Math.abs(distance);
            console.log('position', position, distance);
            if (distance == 0 || (this.scroller.currentRow == 0 && distance < 0) || (this.scroller.currentRow == this.scroller.rowNumber - 1 && distance > 0)) {
                this.scroller.applyTransition();
                return;
            }
            var method = distance > 0 ? 'goToNextLine' : 'goToPrevLine',
                oldDelay = this.scroller.scrollDelay,
                connect = [],
                disconnect = function (c) {
                    c.remove();
                }, clear = function () {
                    console.log('clear');
                    self.set('jumping', false);
                    self.scroller.scrollDelay = oldDelay;
                    connect.map(disconnect);
                    connect.length = 0;
                }, counter = 0;
            this.scroller.scrollDelay = 0;

            //console.log('position', position, method, self.scroller.isScrollingPos());

            if (abs > 3) {
                !showTransition && self.scroller.disableTransition(true);
                self.set('jumping', true);
                connect.push(self.on('paused', function (v) {
                    if (v.newValue) {
                        return;
                    }
                    counter++;
                    if (Math.abs(distance) - counter == 3) {
                        self.scroller.scrollDelay = 10;
                        self.scroller.disableTransition(false);
                        self.set('jumping', false);
                    }
                    if (counter == Math.abs(distance)) {
                        clear();
                    }
                    console.log('taskQueue', counter, distance);
                }));
            }
            while (abs--) {
                this.emit(method);
            }
        },
        detach: function () {
            BaseComponent.prototype.detach.call(this);
            this.node.classList.remove(this.gridLayoutType);
            this.node.classList.remove(this.visibleItemList.length == 1 ? 'singleViewPanel' : 'doubleViewPanels');
        },
        currentVisibleCell: function () {
            return this.currentVisibleItem().currentVisibleItem().currentVisibleItem();
        },
        currentVisibleGroup: function () {
            return this.currentVisibleItem().currentVisibleItem();
        },
        /**
         * @method goToNextGridCell
         * @returns {boolean}
         */
        goToNextGridCell: function () {
            return this.currentVisibleItem().focusNextItem();
        },
        /**
         * @method goToPrevGridCell
         * @returns {boolean}
         */
        goToPrevGridCell: function () {
            return this.currentVisibleItem().focusPrevItem();
        },
        /**
         * @method goToPrevGridGroup
         * @returns {boolean}
         */
        goToPrevGridGroup: function () {
            if (this.scroller.currentRow <= 0) {
                return false
            }

            if (!this.currentVisibleItem().currentVisibleItem().goPrev()) {
                this.currentVisibleItem().currentVisibleItem().unSelectCurrentItem();
                var idx = this.currentVisibleItem().currentItemIndex, grid, group;


                var stopPrev = !(grid = this.getPrevItem()) || !(group = grid.getItemByIndex(idx)) || !group.getItemByIndex(group.visibleItemList.length - 1),
                    stopNext = this.scroller.currentRow > 0 &&
                        (!(grid = this.getNextItem()) || !(group = grid.getItemByIndex(idx)) || !group.getItemByIndex(group.visibleItemList.length - 1));

                if (stopPrev) {
                    if (stopNext) {
                        this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                        return false;
                    }
                }


                if (this.goToPrevItem()) {
                    this.currentVisibleItem().goToItem(idx);
                    this.currentVisibleItem().currentVisibleItem().goToItem(this.currentVisibleItem().currentVisibleItem().visibleItemList.length - 1);
                    return this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                } else {
                    if (this.scroller.currentRow > 0) {
                        if (this.goToNextItem()) {
                            this.currentVisibleItem().goToItem(idx);
                            this.currentVisibleItem().currentVisibleItem().goToItem(this.currentVisibleItem().currentVisibleItem().visibleItemList.length - 1);
                            return this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                        }
                    }
                }
                this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                return false;
            }
            return true;

        },
        /**
         * @method goToNextGridGroup
         * @returns {boolean}
         */
        goToNextGridGroup: function () {
            if (this.scroller.currentRow >= this.scroller.rowNumber - 1) {
                return false;
            }
            if (!this.currentVisibleItem().currentVisibleItem().goNext()) {
                this.currentVisibleItem().currentVisibleItem().unSelectCurrentItem();
                var idx = this.currentVisibleItem().currentItemIndex, grid, group;

                var stopNext = !(grid = this.getNextItem()) || !(group = grid.getItemByIndex(idx)) || !group.getItemByIndex(0),
                    stopPrev = this.scroller.currentRow < this.scroller.rowNumber - 1 &&
                        (!(grid = this.getPrevItem()) || !(group = grid.getItemByIndex(idx)) || !group.getItemByIndex(0));

                if (stopNext) {
                    if (stopPrev) {
                        this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                        return false;
                    }
                }

                if (this.goToNextItem()) {
                    this.currentVisibleItem().goToItem(idx);
                    this.currentVisibleItem().currentVisibleItem().goToItem(0);
                    return this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                } else {
                    if (this.scroller.currentRow < this.scroller.rowNumber - 1) {
                        if (this.goToPrevItem()) {
                            this.currentVisibleItem().goToItem(idx);
                            this.currentVisibleItem().currentVisibleItem().goToItem(0);
                            return this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                        }
                    }
                }
                this.currentVisibleItem().currentVisibleItem().selectCurrentItem();
                return false;
            }
            return true;
        },
        /**
         * @method setItemFromData
         * @param {Number} item item index
         * @param {Number} subItem sub item index
         * @param {Object} dataObject item data
         * @param {Object} [viewPanel]
         * @param {Object} [options]
         */
        setItemFromData: function (item, subItem, dataObject, viewPanel, options) {
            var currentScope = (viewPanel || this).itemList,
                currentItem = currentScope[item].itemList[subItem],
                self = this,
                updateVisibleItemList = options.updateVisibleItemList,
                create = function () {
                    var n = currentScope[item].itemList[0].node, insertRef;
                    // item don't exists
                    newItem = n.cloneNode(true); // clone previous item as new item
                    newItem.classList.remove("hidden"); // set new item as visible
                    newItem.classList.remove("selected"); // set new item as not selected
                    newItem.innerHTML = dataObject ? self.cellTpl(dataObject) : ''; // set new item innerHTML from compile template
                    if (options.insertBefore) {
                        n.parentNode.insertBefore(newItem, n);
                        //n.parentNode.insertBefore(newItem,n); // append parent node with new item
                    } else {
                        n.parentNode.appendChild(newItem); // append parent node with new item
                    }
                    itemInst = new (currentScope[item].importCmp || BaseComponent)(currentScope[item].importArgs || {}, newItem);
                    if (options.insertBefore) {
                        currentScope[item].addItem(itemInst, true, 'first');
                    } else {
                        currentScope[item].addItem(itemInst);
                    }
                    itemInst.set('data', dataObject);
                },
                newItem, targetNode, itemInst;
            //console.log("item %o, subItem %o, dataObject %o",item,subItem,dataObject);
            if (options.insertBefore) {
                create();
            } else {
                if (typeof currentItem != "undefined") {
                    // item exists
                    currentItem.node.classList.remove("hidden"); // set item as visible
                    currentItem.unselect(); // set item as not selected
                    currentItem.node.innerHTML = dataObject ? this.cellTpl(dataObject) : ''; // set item innerHTML from compile template
                    currentItem.set('data', dataObject);
                } else {
                    // item don't exists
                    create();
                }
            }

            targetNode = (currentItem || itemInst).node;
            !dataObject && targetNode.classList.add('hidden');
            if (options.itemStyle) {
                targetNode.style.cssText = options.itemStyle;
            }
            if (options.itemCls) {
                targetNode.classList.add(options.itemCls);
            }
            //if (updateVisibleItemList) {
            // if updateVisibleItemList , we reset(recalculate) visible item list
            currentScope[item].itemList.visibleItems.length = 0;
            //}
        },
        /**
         * fill data into all groups
         * @method setFromData
         * @param {Array} dataArray
         * @param {Object} [viewPanel]
         * @param {Object} [options]
         * @param {Object} [options.range]
         * @param {Number} options.range.min
         * @param {Number} options.range.max
         * @param {Number} [options.startIndex]
         * @param {Boolean} options.updateVisibleItemList
         * @param {String} [options.itemStyle]
         * @param {Boolean} [options.insertBefore]
         * @return {Boolean}
         */
        setFromData: function (dataArray, viewPanel, options) {
            options = options || {};
            options.range = options.range || {};
            var min = options.range.min || 0;
            var max = options.range.max || dataArray.length;
            var isOk = false, dataIndex = min,
                endOfLoop = Math.min(dataArray.length, max),
                subItem = options.startIndex || 0,
                currentLine, curItem;

            if (options.insertBefore) {
                dataArray = dataArray.reverse();
            }

            while (dataIndex < endOfLoop) {
                isOk = true;
                for (var item = 0, visibleItemLen = viewPanel.itemList.visibleItems.length; item < visibleItemLen; item++) {
                    currentLine = dataArray[options.insertBefore ? ((subItem + 1) * visibleItemLen - item - 1) : dataIndex];
                    this.setItemFromData(item, subItem, currentLine, viewPanel, options);
                    dataIndex++;
                }
                subItem++;
            }
            //cleaning all unused item as invisible
            /*for (var item = 0, itemLen = viewPanel.visibleItemList.length; item < itemLen; item++) {
             curItem = viewPanel.itemList[item];
             for (var clean = subItem, curItemLen = curItem.itemList.length; clean < curItemLen; clean++) {
             curItem.itemList[clean].node.classList.add("hidden");
             }
             //reset visible item list
             curItem.visibleItemList.length = 0;
             }*/
            // on end of function we recalculate visible item list;
            return isOk;
        },
        /**
         * @method setData
         * @param {Array} dataArray
         * @param {Object} [options]
         * @returns {boolean}
         */
        setData: function (dataArray, options) {
            var self = this;
            this.cellsPerViewPanel = this.cellsPerViewPanel || this.maxCells / this.itemList.visibleItems.length;

            return this.itemList.visibleItems.every(function (viewPanel, i) {
                viewPanel.set('startIndex', self.store.firstItemIndex + 0 + this.cellsPerViewPanel * i);
                viewPanel.set('itemsPerPage', this.cellsPerViewPanel);
                return this.setFromData(dataArray.slice(i * this.cellsPerViewPanel, this.cellsPerViewPanel * (i + 1)), viewPanel, options);
            }, this);
        },
        /**
         * @method initStore
         * @returns {*}
         */
        initStore: function () {
            var self = this;
            //this.cellsPerViewPanel = this.cellsPerViewPanel || this.maxCells / this.visibleItemList.length;
            if (this.store) {
                return this.emit('loaded');
            }
            require(['../store/' + this.storeType], function (Store) {
                (self.store = new Store({
                    url: self.storeUrl,
                    defFetchParams: self.defFetchParams,
                    itemsPerPage: self.maxCells,
                    data: self.data
                })).once('loaded', function () {
                        self.emit('storeLoaded');
                        self.scroller.set('maxResults', self.store.maxResults);
                    });
                self.store.load();
            });
        },
        /**
         * fille grid by given data
         * @method fillGrid
         */
        fillGrid: function () {
            if (this.setData(this.store.getItems())) {
                //this.firstItem().firstItem().firstItem().selectCurrentItem();
                this.setScrollerParams();
                this.scroller.initStyle();
                this.focus();
                this.firstItem().firstItem().selectCurrentItem();
                this.scroller.setScrollBar();
            }
        },
        setScrollerParams: function () {
            var cellStyle = getComputedStyle(this.currentVisibleCell().node, null),
                controllerStyle = getComputedStyle(this.node, null);
            this.scroller.set('scrollSizeUnit',
                +cellStyle[this.gridLayoutType == 'y' ? 'height' : 'width'].replace('px', ''));
            this.scroller.set('visibleLinesInViewPort',
                Math.floor(+controllerStyle[this.gridLayoutType == 'y' ? 'height' : 'width'].replace('px', '') / this.scroller.scrollSizeUnit));
            this.scroller.set('cellMargin', {
                top: +cellStyle.marginTop.replace('px', ''),
                right: +cellStyle.marginRight.replace('px', ''),
                bottom: +cellStyle.marginBottom.replace('px', ''),
                left: +cellStyle.marginLeft.replace('px', '')
            });

        }
    });
    return DataGrid;
});