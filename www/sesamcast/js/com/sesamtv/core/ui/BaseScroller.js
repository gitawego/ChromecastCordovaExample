define([
    '../util/Class',
    './BaseView',
    '../util/Helper',
    '../util/Dom',
    '../util/DomEvent'
], function (Class, BaseView, helper,domHelper, DomEvent) {
    "use strict";
    var _rowNumber = Infinity, _columnNumber = null;
    /**
     * basic scroller controller.
     *
     * todo: add horizontal scroller
     *
     * notice:
     *      it's recommended to use css property "background-image" instead of tag "img" to work better with set-top box
     *      try first use translateX  or translateY to position the elements, STB likes absolute position with transform.
     *      controller must dispose 2 basic methods: jumpTo, jumpBy
     * @class com.sesamtv.core.ui.BaseScroller
     * @extends com.sesamtv.core.abstract.BaseView
     * @requires com.sesamtv.core.util.Helper
     * @cfg {Object} args
     * @cfg {Number} args.scrollSizeUnit
     * @cfg {Object} args.scrollElement
     * @cfg {Number} [args.scrollItemBegin=2] row or column number that begin scroll
     * @cfg {Number} [args.scrollDelay=60]
     * @cfg {String} [args.usingScrollStyle='webkitTransform']
     * @cfg {HTMLElement|String} node
     */
    var BaseScroller = Class({
        extend: BaseView,
        constructor: function (args, node) {
            args = args || {};
            BaseView.call(this, args, node);
            this.visibleLinesInViewPort = this.visibleLinesInViewPort || 4;
            if (!Array.isArray(this.scrollElement)) {
                this.scrollElement = [this.scrollElement];
            }
            if (this.type == 'view') {
                this.type = 'scroller';
            }

            this.scrollElementLayoutType = this.scrollElementLayoutType || 'y';
            this.direction = this.direction || 'vertical';
            //this.scrollElement = this.scrollElement;

            this.scrollSizeUnit = this.scrollSizeUnit || 140;

            this.scrollItemBegin = this.scrollItemBegin || 2;

            this.currentRow = 0;
            this.currentPosition = 0;


            this.usingScrollStyle = this.usingScrollStyle || "webkitTransform";
            this.origPosition = [];
            this.currentRealPosition = [];
            if (typeof(this.scrollDelay) != 'number') {
                this.scrollDelay = 200;
            }
            if (typeof(this.gap) != 'number') {
                this.gap = 2;
            }

            this.disabled = false;
            this.cmpPos = [];
            this.usingScrollTpl = helper.substitute(this.usingScrollStyle == 'webkitTransform' ?
                (this.direction == 'vertical' ?
                    'translate3d(0 ,${position}px , 0) ' : 'translate3d(${position}px ,0 , 0)') :
                //'translateY(${position}px) translateZ(0)' : 'translateX(${position}px) translateZ(0)') :
                '${position}px');


            Object.defineProperties(this, {
                /**
                 * @property rowNumber
                 * @type {Number}
                 */
                rowNumber: {
                    get: function () {
                        if (_rowNumber !== null) {
                            return _rowNumber
                        }
                        if (this.scrollElementLayoutType == 'y') {

                            if (this.scrollElement.length == 1) {
                                return _rowNumber = this.scrollElement[0].firstItem().visibleItemList.length;
                            }
                            return _rowNumber = this.scrollElement.reduce(function (prev, current) {
                                return (typeof(prev) != 'number' ? prev.firstItem().visibleItemList.length : prev) + current.firstItem().visibleItemList.length;
                            });
                        }
                        return _rowNumber = this.scrollElement[0].visibleItemList.length;
                    }
                },
                /**
                 * @property columnNumber
                 * @type {Number}
                 */
                columnNumber: {
                    get: function () {
                        if (_columnNumber !== null) {
                            return _columnNumber
                        }
                        if (this.scrollElementLayoutType != 'y') {
                            if (this.scrollElement.length == 1) {
                                return _columnNumber = this.scrollElement[0].firstItem().visibleItemList.length;
                            }
                            return _columnNumber = this.scrollElement.reduce(function (prev, current) {
                                return (typeof(prev) != 'number' ? prev.firstItem().visibleItemList.length : prev) + current.firstItem().visibleItemList.length;
                            });
                        }
                        return _columnNumber = this.scrollElement[0].visibleItemList.length;
                    }
                }
            });

            this.on('maxResults', function (evt) {
                if (this.scrollElementLayoutType == 'y') {
                    _rowNumber = Math.ceil(evt.newValue / this.columnNumber);
                } else {
                    _columnNumber = Math.ceil(evt.newValue / this.rowNumber);
                }
            });


            if (node) {
                this.attachTo(node);
            }

            this.scrollBarCls = this.scrollBarCls || 'gridScrollBar';
            this.scrollId = this.scrollId || 'gridScroll';
            this.attachToScrollBar();
        },
        attachTo: function (node) {
            BaseView.prototype.attachTo.call(this, node);
            var classList = this.node.classList, self = this;
            classList.add(this.type);
            classList.add(this.scrollElementLayoutType);
            classList.add(this.direction);
            //hack for STB, webkit can't repaint the layout at some time, we have to force the repaint.
            DomEvent.on(this.node, 'webkitTransitionEnd', function () {
                self.set('animating', false);
                /*var _self = this;
                 setTimeout(function () {
                 _self.className = _self.className;
                 }, 100);*/
            });
        },
        /**
         * attach component of the scrollBar the HTMLElement
         * @method attachToScrollBar
         */
        attachToScrollBar: function () {
            this.scrollBarNode = this.node.querySelector('.' + this.scrollBarCls);
            this.scrollIdNode = document.getElementById(this.scrollId);
            var self = this;

            this.scrollIdNode && DomEvent.on(this.scrollIdNode, "click", function (e) {
                e = e || window.event;
                var position = {'x': e.clientX, 'y': e.clientY};
                var ypos = position.y - (self.node.offsetTop + self.scrollIdNode.offsetTop);
                var scrollBarTop;
                var totHeight = self.scrollIdNode.offsetHeight;
                var scrollBarHeight = self.scrollBarNode.offsetHeight;
                var oldScrollBarNodeTop = self.scrollBarNode.offsetTop;

                //Calcul du currentRow
                var currentRow = Math.floor(ypos * self.rowNumber / (totHeight - scrollBarHeight));
                currentRow = Math.min(currentRow, self.rowNumber - 1);

                if (currentRow <= 0) {
                    scrollBarTop = 0;
                }
                else if (currentRow >= self.rowNumber - 1) {
                    scrollBarTop = (totHeight - scrollBarHeight);
                }
                else {
                    scrollBarTop = Math.ceil(((currentRow) * (totHeight - scrollBarHeight)) / self.rowNumber);
                }
                self.scrollBarNode.style.top = scrollBarTop + 'px';

                console.log('On a cliqué sur :' + currentRow);
                self.controller.jumpTo(currentRow);
            });
        },
        detach: function () {
            BaseView.prototype.detach.call(this);
            var classList = this.node.classList;
            classList.remove(this.type);
            classList.remove(this.scrollElementLayoutType);
            classList.remove(this.direction);
        },
        getCmpSize: function (idx) {
            return this.scrollElement[idx || 0].currentVisibleItem().node.offsetHeight;
        },
        /**
         * @method initStyle
         * @param {Number} [prevPos]
         * @param {Boolean} [noStyle] if add style initialized
         */
        initStyle: function (prevPos) {
            prevPos = prevPos || 0;
            this.scrollElement.forEach(function (cmp, i) {
                var cmpSize = this.getCmpSize(i);
                this.cmpPos[i] = i ? (cmpSize + prevPos) : prevPos;
                this.currentRealPosition[i] = this.cmpPos[i];
                cmp.node.style[this.usingScrollStyle] = this.setScrollStyle(this.cmpPos[i]);
                prevPos = this.cmpPos[i];
                cmp.node.classList.add('initialized');
            }, this);
            if (this.scrollElement.length != 1) {
                return;
            }
            this.styleCells();
        },
        styleCells: function () {
            this.scrollElement.forEach(function (viewPanel) {
                viewPanel.visibleItemList.forEach(function (group) {
                    group.visibleItemList.length = 0;
                    group.visibleItemList.forEach(function (cell, y) {
                        //cell.node.style.top = (this.scrollSizeUnit + this.gap) * y + 'px';
                        cell.node.style.webkitTransform = 'translateY(' + ((this.scrollSizeUnit + this.gap) * y + 'px') + ')';
                        //cell.node.style.webkitTransform = 'translateY('+((this.scrollSizeUnit + gap) * y + 'px')+') translateZ(0)';
                        cell.node.classList.remove('preparing');
                    }, this);
                }, this);
            }, this);

        },
        initNextStyle: function () {
            this.swapScrollElementsOrder('next');

            var prevPos = this.currentRealPosition[1],
                s = this.scrollSizeUnit + this.scrollSizeUnit / 2;
            prevPos = +(prevPos / s).toFixed(0) * s;
            this.cmpPos = [prevPos, prevPos + this.getCmpSize(0)];

            this.currentRealPosition = [prevPos, this.cmpPos[1]];
            this.applyTransition();

            this.appendCurrentPosition();
        },
        swapScrollElementsOrder: function (direction) {
            var order = [this.scrollElement[1], this.scrollElement[0]];
            this.scrollElement = order;

            if (direction == 'prev') {
                this.currentRealPosition.reverse();
                this.cmpPos.reverse();
            }
        },
        appendCurrentPosition: function () {
            this.cmpPos = this.cmpPos.map(function (pos) {
                return pos - this.currentPosition;
            }, this);
        },
        resetCounters: function () {
            _columnNumber = _rowNumber = null;
        },
        /**
         * @method setScrollElement
         * @deprecated
         * @param {Object} scrollElement
         */
        setScrollElement: function (scrollElement) {
            this.scrollElement = scrollElement;
            //this.scrollElement.setVisibleItemQuery();
            this.rowNumber = this.scrollElement.firstItem().visibleItemList.length;
            this.columnNumber = this.scrollElement.visibleItemList.length;
        },
        /**
         * set style value template
         * example for top :
         *      ${position}px
         * @method setUsingScrollTpl
         * @param {String} scrollStyleTpl
         */
        setUsingScrollTpl: function (scrollStyleTpl) {
            this.usingScrollTpl = helper.substitute(scrollStyleTpl);
        },
        /**
         * @method setScrollStyle
         * @param {Number} pos
         * @return {String}
         */
        setScrollStyle: function (pos) {
            return this.usingScrollTpl({
                position: pos
            });
        },
        /**
         * is scroll first line
         * @method isFirstLine
         * @return {Boolean}
         */
        isFirstLine: function () {
            return this.currentRow == 0;
        },
        /**
         * is scroll last line
         * @method isLastLine
         * @return {Boolean}
         */
        isLastLine: function () {
            return this.currentRow == this.rowNumber - 1;
        },
        /**
         * is scroll next to last line
         * @method isNextToLastLine
         * @return {Boolean}
         */
        isNextToLastLine: function () {
            return this.currentRow == this.rowNumber - 2;
        },
        /**
         * if the selected item need scroll
         * define scroll item with scrollItemBegin
         * @method isScrollingPos
         * @param {Number} [currentRow] default to system calculated current row number
         * @return {Boolean}
         */
        isScrollingPos: function (currentRow) {
            currentRow = currentRow || this.currentRow;
            //return this.currentRow > this.scrollItemBegin - 1 && this.currentRow <= this.rowNumber - (this.scrollItemBegin + 1);
            return currentRow > this.scrollItemBegin - 1 && currentRow < this.rowNumber - this.scrollItemBegin;
        },
        /**
         * increment currentPos with scrollSizeUnit
         * @method goFar
         * @return {Boolean}
         */
        goFar: function () {
            if (this.currentRow < (this.rowNumber - 1)) {
                this.currentRow++;
                this.currentPosition += this.scrollSizeUnit;
                return true;
            }
            return false;
        },
        /**
         * decrement currentPos with scrollSizeUnit
         * @method goClose
         * @return {boolean}
         */
        goClose: function () {
            if (this.currentRow > 0) {
                this.currentRow--;
                this.currentPosition -= this.scrollSizeUnit;
                return true;
            }
            return false;
        },
        /**
         * @method calcPosition
         * @param {String} [pos] first, last
         * @param {Object} [config]
         * @param {Number} [config.currentRow]
         * @param {Number} [config.rowNumber]
         * @param {Boolean} [config.doNotApply]
         * @return {Number}
         */
        calcPosition: function (pos, config) {
            config = config || {};
            var size = this.computedCellSize(), currentPosition;
            !('currentRow' in config) && (config.currentRow = this.currentRow);
            !('scrollItemBegin' in config) && (config.scrollItemBegin = this.scrollItemBegin);
            if (!pos) {
                currentPosition = -(size * (config.currentRow - config.scrollItemBegin) + (size / 2));
            }
            if (pos == 'first') {
                currentPosition = 0;
            }
            if (pos == 'last') {
//                    this.currentPosition = -(size * (this.rowNumber - (this.scrollItemBegin * 2)));
                currentPosition = -(size * (this.rowNumber - (config.scrollItemBegin * 2)));
            }
            if (!config.doNotApply) {
                this.currentPosition = currentPosition;
            }
            return currentPosition;
        },
        computedCellSize: function () {
            return this.scrollSizeUnit + this.gap;
        },
        /**
         * calculate up scroll position
         * call element onGetScroll method if is defined
         * @method scrollPrev
         * @return {boolean} true if scroll action needed.
         */
        scrollPrev: function () {
            //this.applyTransition();

            if (this.goClose()) {
                if (this.isScrollingPos()) {
                    this.calcPosition();
                    this.execScroll('prev');
                    this.emit('scroll', this.direction == 'vertical' ? 'top' : 'left');
                    /*if(typeof this.onGetScroll == "function") {
                     this.onGetScroll('top');
                     }*/
                    return true;
                }
                if (this.isFirstLine()) {
                    this.calcPosition('first');
                    this.execScroll('prev');
                    return true;
                }
            }
            this.applyTransition();
            return false;
        },
        /**
         * calculate bottom scroll position
         * call element onGetScroll method if is defined
         * @method scrollNext
         * @return {boolean} true if scroll action needed.
         */
        scrollNext: function () {
            if (this.goFar()) {
                if (this.isScrollingPos()) {
                    this.calcPosition();
                    this.execScroll('next');
                    this.emit('scroll', this.direction == 'vertical' ? 'bottom' : 'right');
                    return true;
                }
                if (this.isLastLine() || this.isNextToLastLine()) {
                    this.calcPosition('last');
                    this.execScroll('next');
                    return true;
                }
            }
            this.applyTransition();
            return false;
        },
        transform: function (elements) {
            var rules = '';
            elements.forEach(function (panel, i) {
                //rules['*[data-stb-cmp-id='+this.controller.id+'] > *:nth-child('+(i+1)+')'] = {
                rules += '.el' + (i + 1) + '{' +
                    '-webkit-transform:' + panel.style + ';' +
                    '} \n';
            }, this);
            domHelper.addCss(rules, 'panelsTransform', 'replace');

        },
        moveBy: function (distance) {
            console.log('distance', distance);
            var pos;
            this.scrollElement.forEach(function (panel, i) {
                pos = domHelper.cssTransform(panel.node, 'translate3d');
                if (!this.origPosition[i]) {
                    this.origPosition[i] = pos;
                }
                panel.node.style[this.usingScrollStyle] = this.setScrollStyle(Math.ceil(pos.y + distance));

            }, this);
        },
        disableTransition: function (disabled) {
            this.scrollElement.forEach(function (item) {
                item.node.classList[disabled ? 'add' : 'remove']('noTransition');
            }, this);
            this.set('noTransition', disabled);
        },
        /**
         * @method attachMousewheel
         * @param {com.sesamtv.core.GestureManager} gestureManager
         */
        attachMousewheel: function (gestureManager) {
            var self = this;
            this.connect.push(gestureManager.on('mousewheel', function (evt) {
                evt = evt || window.event;
                self.controller.jumpBy(-evt.delta / 120);
            }));
        },
        /**
         * @method attachDragSimulation
         * @param {com.sesamtv.core.GestureManager} gestureManager
         */
        attachDragSimulation: function (gestureManager) {
            var self = this, moveBy,
                getMoveBy = function () {
                    console.log(gestureManager.positions.end.pageY, gestureManager.positions.prev.pageY);
                    return Math.ceil((gestureManager.positions.end.pageY - gestureManager.positions.prev.pageY));
                }, getTotalMove = function () {
                    return gestureManager.positions.end.pageY - gestureManager.positions.start.pageY;
                },
                getTotalLines = function () {
                    return self.scrollElement[0].visibleItemList[0].visibleItemList.length * 1.5;
                    //return self.visibleLinesInViewPort;
                }, onEnd = function () {
                    self.disableTransition(false);
                    totalMove = getTotalMove();
                    duration = gestureManager.positions.end.time - gestureManager.positions.start.time;
                    if (duration <= 0) {
                        return;
                    }
                    var percentage = +(-totalMove / self.controller.node.offsetHeight).toFixed(2),
                    //gap = Math.floor(percentage * self.scroller.visibleLinesInViewPort);
                        gap = Math.ceil(percentage * getTotalLines()),
                        absGap = Math.abs(gap);
                    console.log('percentage %o, moveBy %o, gap %o, duration %o,totalMove %o', percentage, moveBy, gap, duration, totalMove);
                    if (Math.abs(totalMove) <= self.scrollSizeUnit * 1.5) {
                        gap = gap / Math.abs(gap);
                    }
                    self.controller.jumpBy(gap, true);
                    /*while(absGap--){
                     self.controller[gap<0?'goToPrevLine':'goToNextLine']();
                     }*/
                    firstMove = true;
                    totalMove = 0;
                }, totalMove = 0, duration = 0, firstMove = true, deltaT;

            this.connect.push(gestureManager.dragChain({
                end: function (evt) {
                    if (!self.animating) {
                        return onEnd();
                    }
                    DomEvent.once(self.controller.node, 'webkitTransitionEnd', onEnd);
                },
                drag: function (evt) {
                    if (self.controller.disabled || self.controller.paused || self.controller.jumping) {
                        return;
                    }
                    moveBy = getMoveBy();
                    if (firstMove) {
                        self.disableTransition(true);
                        firstMove = false;
                    }

                    deltaT = this.positions.end.time - this.positions.prev.time;
                    console.log('deltaT %o, moveBy %o', deltaT, moveBy);


                    if ('createTouch' in document) {
                        moveBy = moveBy > 0 ? moveBy * 7 / (deltaT) : moveBy * 8 / (deltaT);
                    } else {
                        //when in PC, move slower than in touch device.
                        moveBy = moveBy * 4 / deltaT;
                    }


                    if (self.controller.jumping) {
                        return;
                    }

                    self.moveBy(moveBy);

                    //totalMove += moveBy;
                }
            }));
        },
        /**
         * @method applyTransition
         * @param {Array} [order]
         * @param {Array} [pos]
         */
        applyTransition: function (order, pos) {
            if (this.controller.jumping) {
                return;
            }
            var defOrder = [0, 1];
            this.scrollElement.length == 1 && !order && defOrder.pop();
            order = order || defOrder;
            pos = pos || this.currentRealPosition;
            order.forEach(function (i) {
                this.scrollElement[i].node.style[this.usingScrollStyle] = this.setScrollStyle(pos[i]);
            }, this);
        },
        /**
         * run scroll to defined currentPosition
         * @method execScroll
         */
        execScroll: function (direction) {
            this.set('animating', true);
            console.log('currentRow', this.currentRow, this.rowNumber);
            var toPos = this.currentPosition, self = this,
                _pos = [toPos + this.cmpPos[0], toPos + this.cmpPos[1]],
                _toSwap, realPos,
                cellSize = this.computedCellSize(),
                toSwap = function (d) {
                    return d == direction && _toSwap;
                },
                addTransition = function () {
                    self.animating = false;
                    if (!self.noTransition || self.controller.jumping) {
                        return;
                    }
                    self.disableTransition(false);
                },
                scrollDoubleViewPanels = (function () {
                    addTransition();
                    if (this.currentRow === 0) {
                        realPos = [0, this.getCmpSize(0)];
                        this.cmpPos[0] = 0;
                        this.cmpPos[1] = this.getCmpSize(0);
                    } else if (this.currentRow == this.rowNumber - 1) {
                        //var lastX = Math.floor((toPos + this.cmpPos[1]) / cellSize) * cellSize;
                        //var lastX = toPos + this.cmpPos[1];
                        var s = this.scrollSizeUnit / 2
                        var lastX = +((toPos + this.cmpPos[1]) / s).toFixed(0) * s;
                        realPos = [lastX - this.getCmpSize(0), lastX];

                    } else {
                        realPos = [toPos + this.cmpPos[0], toPos + this.cmpPos[1]];

                    }
                    this.currentRealPosition = realPos;
                    this.applyTransition();

                    if (toSwap('next') || toSwap('prev')) {
                        self.swapCmpOrder(direction, {
                            currentPos: _pos
                        });
                    }

                }).bind(this),
                scrollSingleViewPanel = (function () {
                    var postFetch = function () {
                        exec();
                        if (direction == 'prev') {
                            self.disableTransition(true);
                        }
                        var distance = self.scrollSizeUnit * self.visibleLinesInViewPort;
                        if (direction == 'next') {
                            self.cmpPos[0] += distance;
                        } else {
                            self.cmpPos[0] -= distance;
                        }
                        self.styleCells();

                        self.currentRealPosition = [toPos + self.cmpPos[0]];
                        //self.scrollElement[0].node.style[self.usingScrollStyle] = self.setScrollStyle(self.currentRealPosition[0]);
                        self.applyTransition([0]);

                        self.controller.set('paused', false);
                    }, transitionEnd = function () {
                        if (direction == 'next') {
                            self.disableTransition(true);
                        }
                        animEnd = true;
                        exec && postFetch();
                    }, animEnd, exec;
                    this.controller.set('paused', true);
                    self.controller.emit('fetchData', {
                        direction: direction,
                        callback: function (changed) {
                            if (!changed) {
                                self.controller.set('paused', false);
                                return;
                            }
                            exec = changed;
                            animEnd && postFetch();
                        }
                    });
                    if (self.controller.jumping) {
                        return transitionEnd();
                    }
                    DomEvent.once(this.scrollElement[0].node, 'webkitTransitionEnd', transitionEnd);
                }).bind(this),
                hiddenLines = (toPos + this.cmpPos[0]) / cellSize;


            if (this.scrollElement.length == 1) {
                _toSwap = direction == 'next' ? (this.currentRow < this.rowNumber - 1 &&
                    Math.abs(hiddenLines) << 0 == this.visibleLinesInViewPort) :
                    (this.currentRow > this.scrollItemBegin && Math.abs(hiddenLines) << 0 == 0);
                if (this.noTransition) {
                    this.disableTransition(false);
                }

                //console.log('down toPos %o,realPos %o, hiddenLines %o, visibleLines %o', toPos, toPos + this.cmpPos[0], hiddenLines, this.visibleLinesInViewPort);
                if (toSwap('next') || toSwap('prev')) {
                    this.currentRealPosition[0] = toPos + this.cmpPos[0];
                    this.applyTransition();
                    scrollSingleViewPanel();
                } else {
                    this.controller.set('paused', true);
                    setTimeout((function () {
                        this.currentRealPosition[0] = toPos + this.cmpPos[0];
                        this.applyTransition();
                        this.currentRealPosition = realPos;
                        this.controller.set('paused', false);
                    }).bind(this), this.scrollDelay);
                }
                return;
            }

            _toSwap = direction == 'prev' ?
                (this.currentRow > 2 && toPos + this.cmpPos[1] >= this.getCmpSize(0) - this.scrollSizeUnit) :
                (this.currentRow < this.rowNumber - 1 && _pos[1] <= 0 - this.scrollSizeUnit);
            if (toSwap('prev') || toSwap('next')) {
                scrollDoubleViewPanels();
            } else {
                this.controller && this.controller.set('paused', true);
                scrollDoubleViewPanels();

                this.controller && this.scrollDelay ? setTimeout(function () {
                    self.controller.set('paused', false);
                }, this.scrollDelay) : self.controller.set('paused', false);
            }
        },
        swapCmpOrder: function (direction, options) {
            return this[direction == 'next' ? '_swapNextCmpOrder' : '_swapPrevCmpOrder'](options);
        },
        _swapNextCmpOrder: function (options) {
            var self = this,
                exec, animEnd,
                postSwap = function () {
                    exec && exec();
                    self.scrollElement[0].node.classList.add('invisible');
                    self.scrollElement[0].node.classList.add('noTransition');
                    self.set('noTransition', true);
                    self['initNextStyle']();
                    self.scrollElement.forEach(function (cmp) {
                        // self.cmpPos[i] = self.cmpPos[i]-self.currentPosition;
                        cmp.node.classList.remove('invisible');
                        //cmp.node.classList.remove('noTransition');
                    });
                    self.controller && self.controller.set('paused', false);
                },
                transitionEnd = function () {
                    animEnd = true;
                    exec && postSwap();
                };

            if (!this.controller) {
                return postSwap();
            }
            this.controller.set('paused', true);
            self.controller.emit('fetchData', {
                direction: 'next',
                callback: function (cb) {
                    if (!cb) {
                        return postSwap();
                    }
                    exec = cb;
                    animEnd && postSwap();
                }
            });
            if (this.controller.jumping) {
                return transitionEnd();
            }
            DomEvent.once(this.scrollElement[1].node, 'webkitTransitionEnd', transitionEnd);
        },
        _swapPrevCmpOrder: function (options) {
            var self = this,
                exec,
                postSwap = function () {
                    exec && exec();
                    self.scrollElement[1].node.classList.add('invisible');
                    self.scrollElement[1].node.classList.add('noTransition');
                    self.set('noTransition', true);
                    //self.initPrevStyle(null,true);

                    //var prevPos = helper.cssTransform(self.scrollElement[0].node, 'translate3d').y;
                    var prevPos = self.currentRealPosition[0];

                    self.cmpPos = [options.currentPos[0], options.currentPos[0] - self.getCmpSize(0)];
                    self.currentRealPosition[1] = prevPos - self.getCmpSize(0);

                    self.applyTransition([1]);
                    //update current real position


                    self.scrollElement.forEach(function (cmp) {
                        cmp.node.classList.remove('invisible');
                    });

                    self.swapScrollElementsOrder('prev');
                    self.appendCurrentPosition();
                    self.controller.set('paused', false);
                };

            if (!this.controller) {
                return postSwap();
            }

            this.controller.set('paused', true);

            this.controller.emit('fetchData', {
                direction: 'prev',
                callback: function (cb) {
                    exec = cb;
                    postSwap();
                }
            });

        },
        bufferRotate: function () {

        },
        /**
         * Set grid's scroll bar
         * @method setScrollBar
         */
        setScrollBar: function () {
            var self = this;
            if (this.rowNumber == Infinity) {
                return this.once('maxResults', function () {
                    self._setScrollBar();
                });
            }
            this._setScrollBar();
        },
        _setScrollBar: function () {
            if (this.scrollIdNode && this.scrollBarNode) {
                var self = this;
                var scrollBarTop;
                //height of the gridPanel
                var totHeight = self.node.offsetHeight - 15;
                self.scrollIdNode.style.height = totHeight + 'px';
                //height of the scroll bar
                var scrollBarHeight = Math.ceil(((totHeight / this.scrollSizeUnit) * totHeight) / this.rowNumber);

                (scrollBarHeight <= 10) && (scrollBarHeight = 10);
                //height of the scroll bar
                if (scrollBarHeight < totHeight) {
                    this.scrollBarNode.style.height = scrollBarHeight + 'px';

                    if (this.currentRow <= 0) {
                        scrollBarTop = 0;
                    }
                    else if (this.currentRow >= this.rowNumber - 1) {
                        scrollBarTop = (totHeight - scrollBarHeight);
                    }
                    else {
                        scrollBarTop = Math.ceil(((this.currentRow) * (totHeight - scrollBarHeight)) / this.rowNumber);
                    }
                    //position of the scroll bar
                    this.scrollBarNode.style.top = scrollBarTop + 'px';
                    setTimeout(function () {
                        self.scrollBarNode.style.top = scrollBarTop + 'px';
                    }, 1);
                }
            }
        }

    });
    return BaseScroller;
});