define(['../util/Class',
    '../util/Helper',
    '../util/Dom',
    '../util/DomEvent',
    '../util/Touch'
],function (Class, helper,domHelper, DomEvent,touch) {
        "use strict";
        /**
         *
         * @class com.sesamtv.core.ui.PageScroller
         * @requires com.sesamtv.core.util.DomEvent
         * @cfg {Object} opt
         * @cfg {HTMLElement} [opt.wrapper]
         * @cfg {Number} [opt.itemSize]
         * @cfg {Number} [opt.amplitude=0.2] minimum range to trigger swipe
         * @cfg {String} [opt.scrollDirection='y'] x or y
         * @cfg {Boolean} [opt.useTransform=false]
         * @cfg {Number} [opt.wrapperSize]
         * @cfg {Number} [opt.itemSize] if paginatedNav is false, itemSize == containerSize
         * @cfg {String} [opt.wrapperCls='wrapper']
         * @cfg {String} [opt.baseCls='simpleScroller']
         * @cfg {Number} [opt.basicDuration=350] basic animation duration, without swipe delta
         * @cfg {Boolean} [opt.snap] if simulate the inertance. this option can be disabled only when paginatedNav is true
         * @cfg {Boolean} [opt.paginatedNav] if it's a paginated navigation.
         * @cfg {HTMLElement} container
         */
        var PageScroller = Class({
            constructor: function (opt, container) {
                var config = this.config = {};

                this.config.amplitude = 0.2;
                this.config.scrollDirection = 'y';
                this.config.baseCls = 'pageScroller';
                this.config.wrapperCls = 'wrapper';
                this.config.basicDuration = 500;
                this.config.snap = false;

                Class.mixin(this.config, opt || {});
                this.config.container = container;
                this.config.wrapper = this.config.wrapper || container.firstElementChild;
                var styleAttrMapping = {
                    'css': {
                        'x': 'left',
                        'y': 'top'
                    },
                    'transform': {
                        'x': 'translate3d(${value},0,0)',
                        'y': 'translate3d(0,${value},0)'
                    }
                };
                Object.defineProperties(this, {
                    /**
                     * @property containerSize
                     * @type {Number}
                     */
                    "containerSize": {
                        get: function () {
                            return container[this.config.scrollDirection == 'x' ? 'offsetWidth' : 'offsetHeight'];
                        }
                    },
                    /**
                     * @property styleAttr
                     * @type {String}
                     */
                    "styleAttr": {
                        get: function () {
                            return styleAttrMapping.css[this.config.scrollDirection]
                        }
                    },
                    'translateAttr': {
                        get: function () {
                            return styleAttrMapping.transform[this.config.scrollDirection]
                        }
                    },
                    'wrapperSize': {
                        get: function () {
                            return config.wrapperSize || this.getSize(wrapper);
                        }
                    },
                    'itemSize': {
                        get: function () {
                            return this.config.paginatedNav ? config.itemSize || this.getSize(wrapper.firstElementChild) : this.containerSize;
                        }
                    }
                });
                this.transformAttr = domHelper.cssPropPrefix + "Transform";
                this.connect = [];
                this.container = container;
                var wrapper = config.wrapper;
                var self = this;
                var startValue = 0, endValue = 0, deltaD = 0, newTime = 0,
                    deltaT = 0, endTime = 0, firstPos = 0, totalMove = 0,
                    firstT = 0, totalT = 0;

                /**
                 * @method correctCoordinate
                 * @param {Number} pos
                 * @param {Number} [mousewheelDelta] -1 or 1
                 */
                this.correctCoordinate = function (pos, mousewheelDelta) {

                    var itemSize = self.itemSize;
                    if (pos > 0) {
                        pos = 0;
                    }
                    if (pos < -self.wrapperSize + itemSize) {
                        pos = Math.floor(-self.wrapperSize + itemSize);
                    }
                    if (mousewheelDelta) {
                        if (this.config.paginatedNav) {
                            return Math[mousewheelDelta < 0 ? 'ceil' : 'floor'](pos / itemSize) * itemSize;
                        } else {
                            //return Math[mousewheelDelta > 0 ? 'ceil' : 'floor'](pos / itemSize) * itemSize;
                            return this.detectEdge(pos, -mousewheelDelta);
                        }
                    }
                    //if it's a paginated navigation, correct the coordination
                    var cord = this.config.paginatedNav ? Math[totalMove < 0 ? 'ceil' : 'floor'](pos / itemSize) * itemSize : pos,
                        absMove = Math.abs(totalMove),
                        direction = totalMove / absMove,
                        toCord;

                    if (!this.config.paginatedNav) {
                        toCord = cord + totalMove + absMove * direction * Math.ceil(Math.abs(totalMove / totalT));
                        console.log('toCord %o, cord %o percentage %o', toCord, cord, totalMove / totalT);
                        return self.detectEdge(toCord, direction);
                    }

                    if (absMove < itemSize * config.amplitude) {
                        return cord;
                    } else {
                        toCord = cord + itemSize * direction;
                        if (self.config.snap) {

                            toCord = toCord + itemSize * direction * Math.round(Math.abs(totalMove / (totalT * 2)));
                        }
                        return self.detectEdge(toCord, direction);
                    }
                };

                /**
                 * @method ScrollMouse
                 * @param {HTMLElement} boxMouse
                 * @param {Function} callbackScroll
                 * @private
                 */
                function ScrollMouse(boxMouse, callbackScroll) {
                    var delta;
                    self.connect.push(DomEvent.on(boxMouse, 'mousewheel', function (event) {
                        if (!event) {
                            event = window.event;
                        }
                        if (event.wheelDelta) {
                            // IE and Opera
                            delta = event.wheelDelta / 120;
                        } else if (event.detail) {
                            // W3C
                            delta = -event.detail / 2;
                        }
                        callbackScroll(delta);
                    }));
                }

                /**
                 * @method onMouseScrollMenu
                 * @private
                 * @param {Number} delta
                 */
                function onMouseScrollMenu(delta) {
                    var pos = self.getWrapperPosition();
                    if (self.config.paginatedNav) {
                        pos += delta * self.itemSize;
                    } else {
                        pos += delta * self.itemSize / 2;
                    }
                    /* Test au limite */
                    self.scrollTo(pos, delta);
                }

                ScrollMouse(container, onMouseScrollMenu);


                /*
                 * onTouchStart
                 */
                var onTouchStart = function (evt) {

                    evt.preventDefault();
                    self.enableTransition(false);

                    newTime = firstT = Date.now();
                    firstPos = startValue = self.getRelativeMouseCoordinate(evt, this)[self.config.scrollDirection];

                }, onTouchEnd = function (evt) {
                    totalMove = endValue - firstPos;
                    totalT = endTime - firstT;
                    evt.preventDefault();
                    self.scrollTo(self.getWrapperPosition());
                    self.enableTransition(true, {
                        totalTime: totalT,
                        totalMove: totalMove
                    });
                    //reset();
                }, onTouchMove = function (evt) {
                    evt.preventDefault();
                    endValue = self.getRelativeMouseCoordinate(evt, this)[self.config.scrollDirection];
                    endTime = Date.now();
                    deltaT = endTime - newTime;
                    deltaD = endValue - startValue;
                    //var absDeltaD = Math.abs(deltaD);
                    self.moveTo(self.getWrapperPosition() + deltaD);
                    startValue = endValue;
                    newTime = endTime;
                };

                self.reset = function () {
                    totalMove = 0;
                    deltaD = 0;
                    totalT = 0;
                };

                self.connect.push(DomEvent.on(wrapper, touch.press, function (evt) {
                    var onMove, moved = false;
                    onTouchStart.call(this, evt);
                    self.connect.push(DomEvent.once(document, touch.release, function (evt) {
                        moved && onTouchEnd.call(wrapper, evt);
                        if (!moved) {
                            self.enableTransition(true);
                        }
                        onMove.remove();
                    }));
                    self.connect.push(onMove = DomEvent.on(document, touch.move, function (evt) {
                        moved = true;
                        onTouchMove.call(wrapper, evt);
                    }, false));
                }));

                this.initStyle();
            },
            /**
             * @method initStyle
             */
            initStyle: function () {
                //todo start at a given position
                if (!this.config.useTransform) {
                    this.config.wrapper.style[this.styleAttr] = "0px";
                } else {
                    this.config.wrapper.style[this.transformAttr] = 'translate3d(0,0,0)';
                }
                this.config.container.classList.add(this.config.baseCls);
                this.config.container.classList.add(this.config.scrollDirection);
                this.config.wrapper.classList.add(this.config.wrapperCls);
                this.enableTransition(true);
            },
            /**
             * @method detectEdge
             * @param {Number} toCord
             * @param {Number} direction 1 or -1
             * @returns {number}
             */
            detectEdge: function (toCord, direction) {
                var absToCord = Math.abs(toCord),
                    lastCord = this.wrapperSize - this.containerSize;
                if (direction < 0) {
                    return (absToCord >= lastCord) ? lastCord * direction : toCord;
                }
                return toCord >= 0 ? 0 : toCord;
            },
            /**
             * @method getRelativeMouseCoordinate
             * @param {Event} evt
             * @param {HTMLElement} node
             * @private
             */
            getRelativeMouseCoordinate: function (evt, node) {
                var coords = this.config.useTransform ? domHelper.cssTransform(node, 'translate3d') : {
                    x: node.offsetLeft,
                    y: node.offsetTop
                };
                return {
                    "x": ((evt.touches && evt.touches[0]) || evt).pageX - coords.x,
                    "y": ((evt.touches && evt.touches[0]) || evt).pageY - coords.y
                };
            },
            /**
             * @method scrollTo
             * @param {Number} pos
             * @param {Number} [mousewheelDelta] 1 or -1
             * @private
             */
            scrollTo: function (pos, mousewheelDelta) {
                var self = this;
                requestAnimationFrame(function (time) {
                    if (self.config.useTransform) {
                        return self.config.wrapper.style[self.transformAttr] = helper.substitute(self.translateAttr,{
                            value: self.correctCoordinate(pos, mousewheelDelta) + "px"
                        });
                    }
                    self.config.wrapper.style[self.styleAttr] = self.correctCoordinate(pos, mousewheelDelta) + "px";
                    self.reset();
                }, self.config.wrapper);

            },
            /**
             * @method moveTo
             * @param {Number} pos
             * @return {{revert:Function}}
             */
            moveTo: function (pos) {
                var origPos,self = this;
                if (this.config.useTransform) {
                    origPos = domHelper.cssTransform(this.config.wrapper,'translate3d')[this.config.scrollDirection];
                    this.config.wrapper.style[this.transformAttr] = helper.substitute(this.translateAttr,{
                        value: pos + "px"
                    });
                }else{
                    origPos = parseInt(this.config.wrapper.style[this.styleAttr],10);
                    this.config.wrapper.style[this.styleAttr] = pos + 'px';
                }
                return {
                   revert:function(){
                       self.moveTo(origPos);
                   }
                }
            },
            /**
             * @method moveBy
             * @param {Number} pos relative position number
             */
            moveBy: function (pos) {
                var node = this.config.wrapper;
                var coords = this.config.useTransform ? domHelper.cssTransform(node, 'translate3d') : {
                    x: node.offsetLeft,
                    y: node.offsetTop
                };
                this.moveTo(coords[this.config.scrollDirection] + pos);
            },
            /**
             * @method enableTransition
             * @param {Boolean} enabled
             * @param {Object} [opt]
             * @param {Number} [opt.totalMove]
             * @param {Number} [opt.totalTime]
             */
            enableTransition: function (enabled, opt) {
                opt = opt || {};
                var params = {
                    duration: this.config.basicDuration,
                    type: this.config.paginatedNav ? 'cubic-bezier(.7,0,.9,.6)' : 'cubic-bezier(.24,.18,.53,.9)',
                    target: 'all'
                };
                if ('totalMove' in opt && 'totalTime' in opt) {
                    var percentage = opt.totalMove / opt.totalTime;
                    if (opt.totalTime) {
                        params.duration = Math.round(Math.abs(params.duration * (opt.totalMove / opt.totalTime)));
                    }
                    //swipe far, speed up a little bit
                    if (Math.abs(percentage) > 1.5) {
                        params.type = 'cubic-bezier(.16,.84,.44,1)';
                        params.duration = params.duration - Math.abs(params.duration * (opt.totalTime / opt.totalMove));
                    }
                }

                this.config.wrapper.style[domHelper.cssPropPrefix + 'Transition'] = enabled ? [params.target, params.duration + 'ms', params.type].join(' ') : 'none';
            },
            getWrapperPosition: function () {
                if (this.config.useTransform) {
                    return parseInt(domHelper.cssTransform(this.config.wrapper, 'translate3d')[this.config.scrollDirection]);
                } else {
                    return parseInt(this.config.wrapper.style[this.styleAttr], 10);
                }
            },
            getSize: function (n) {
                return  n[this.config.scrollDirection == 'y' ? 'offsetHeight' : 'offsetWidth'];
            },
            /**
             * @method destroy
             */
            destroy: function () {
                this.connect.forEach(function (c) {
                    c.remove();
                });
                this.connect.length = 0;
                var classList = this.config.container.classList;
                classList.remove(this.config.baseCls);
                classList.remove(this.config.scrollDirection);
                this.config.wrapper.classList.remove(this.config.wrapperCls);
            }
        });
        return PageScroller;
    });