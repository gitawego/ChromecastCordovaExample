define([
    '../util/Class',
    '../util/Helper',
    '../util/Touch',
    '../util/CustomEvent',
    '../util/DomEvent'
], function (Class, helper, touch, CustomEvent, DomEvent) {
    /**
     * @class com.sesamtv.core.engine.GestureManager
     * @extends com.sesamtv.core.util.CustomEvent
     * @requires com.sesamtv.core.util.DomEvent
     * @requires com.sesamtv.core.util.Helper
     * @cfg {Object} args
     * @cfg {Boolean} args.preventDocDefault
     * @cfg {Boolean} args.enableMousewheel
     * @cfg {HTMLElement} node
     */
    /**
     * @method mixin
     * @private
     * @param {Object} dest
     * @param {Object} source
     * @param {Function} [copyFunc]
     * @return {Object}
     */
    function mixin(dest, source, copyFunc) {
        var name, s, empty = {};
        for (name in source) {
            s = source[name];
            if (!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
                dest[name] = copyFunc ? copyFunc(s) : s;
            }
        }
        return dest;
    }

    /**
     * @method cloneObject
     * @private
     * @param {Object} source
     * @returns {Object}
     */
    function cloneObject(source) {
        var r = source.constructor ? new source.constructor : {};
        return mixin(r, source);
    }

    var preset = {
        positions: {
            "start": {},
            "end": {},
            "prev": {}
        }
    };

    var GestureManager = Class({
        extend: CustomEvent,
        constructor: function (args, node) {
            var self = this;
            CustomEvent.call(this);
            this.minDistance = {
                x: 50,
                y: 50
            };
            this.dblClickTimeout = 500;
            this.disabled = false;
            this.positions = {
                "start": {},
                "end": {},
                "prev": {}
            };
            this.onHoldTime = 1500;
            this.onHoldTimer = null;
            this.ignoreEls = ['input', 'textarea'];

            Class.mixin(this, args || {});

            this.containerNode = node || document;
            if (typeof(this.containerNode) == 'string') {
                this.containerNode = document.getElementById(this.containerNode);
            }

            this.actions = {
                'onmousedown': DomEvent.on(this.containerNode, touch.press, function (evt) {
                    if (touch.hasTouch && helper.isIos) {
                        var callback = function (evt) {
                                if (evt.timeStamp - timestamp < 100) {
                                    //self.onClick(evt);
                                    self.emit('click', evt);
                                }
                                self.containerNode.removeEventListener('touchend', callback);
                                self.containerNode.removeEventListener('touchmove', moveCb);
                            },
                            moveCb = function () {
                                self.containerNode.removeEventListener('touchend', callback);
                                self.containerNode.removeEventListener('touchmove', moveCb);
                            }, timestamp = evt.timeStamp;
                        self.containerNode.addEventListener('touchmove', moveCb);
                        self.containerNode.addEventListener('touchend', callback);
                    }

                    !self.onHoldTimer && (self.onHoldTimer = setTimeout(function () {
                        //self.onHold && self.onHold(evt);
                        self.emit('hold');
                    }, self.onHoldTime));
                    if (evt.button) {
                        //disable right click
                        return;
                    }
                    if (self.disabled) {
                        return;
                    }

                    var target = touch.hasTouch ? evt.touches[0].target : evt.target;
                    //disable detection on input and textarea
                    if (self.ignoreEls.indexOf(target.tagName.toLowerCase()) != -1) {
                        return;
                    }
                    self.actions.ondrag = DomEvent.on(document, touch.move, function (e) {
                        if (self.disabled) {
                            return;
                        }
                        self.drag(e, target);
                    });
                    self.actions.ondocmouseup = DomEvent.on(document, touch.release, function (e) {
                        //clear drag event
                        self.actions.ondrag && self.actions.ondrag.remove();
                        self.actions.ondocmouseup && self.actions.ondocmouseup.remove();
                        self.actions.onnodecancel && self.actions.onnodecancel.remove();
                        /* if (self.disabled) {
                         return;
                         }*/
                        self.touchEnd(e, target);
                    });
                    self.actions.onnodecancel = DomEvent.on(self.containerNode, touch.cancel, function (e) {
                        self.actions.ondrag && self.actions.ondrag.remove();
                        self.actions.ondocmouseup && self.actions.ondocmouseup.remove();
                        self.actions.onnodecancel && self.actions.onnodecancel.remove();
                        /*if (self.disabled) {
                         return;
                         }*/
                        self.touchEnd(e, target);
                    });
                    self.touchStart(evt);
                }),
                'onmousemove': DomEvent.on(this.containerNode, touch.move, function (evt) {
                    self.onHoldTimer && clearTimeout(self.onHoldTimer);
                    self.onHoldTimer = null;
                    if (self.disabled) {
                        return;
                    }
                    self.moving(evt);
                }),
                'onmouseup': DomEvent.on(this.containerNode, touch.release, function (evt) {
                    self.onHoldTimer && clearTimeout(self.onHoldTimer);
                    self.onHoldTimer = null;
                }),
                "ongesturestart": DomEvent.on(this.containerNode, "gesturestart", function (evt) {
                    //TODO ongesturestart
                }),
                "ongesturechange": DomEvent.on(this.containerNode, "gesturechange", function (evt) {
                    //TODO ongesturechange
                }),
                "ongestureend": DomEvent.on(this.containerNode, "gestureend", function (evt) {
                    //TODO ongestureend
                }),
                "ondragstart": DomEvent.on(this.containerNode, "dragstart", function (evt) {
                    evt.preventDefault();
                })
            };
            if (this.preventDocDefault) {
                this.actions.docDefault = DomEvent.on(document, touch.press, function (evt) {
                    evt.preventDefault();
                });
            }
            !touch.hasTouch && (this.actions.ondblclick = DomEvent.on(this.containerNode, 'dblclick', function (evt) {
                //self.onDblTap(evt);
                self.emit('dblTap', evt);
            }));
            if (this.enableMousewheel) {
                this.addMouseScroll();
            }
        },
        addMouseScroll: function () {
            var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel",
                self = this;
            this.actions.onmousewheel = DomEvent.on(this.containerNode, mousewheelevt, function (evt) {
                evt = evt || window.event;
                !('delta' in evt) && (evt.delta = evt.detail ? evt.detail * (-120) : evt.wheelDelta);
                self.emit('mousewheel', evt);
            }, false);
        },
        setDisabled: function (disable) {
            this.disabled = disable;
        },
        moving: function (evt) {
            if (touch.hasTouch && evt.touches.length > 1) {
                //TODO: multiple touches
                return;
            }
            //this.onMove(evt);
            this.emit('move', evt);
        },
        doubleTapCounter: function (evt) {
            var timer = new Date();
            if ("clickCount" in this.containerNode) {
                //timeout
                if (timer - this.containerNode.clickTimer >= this.dblClickTimeout) {
                    //count as first tap
                    delete this.containerNode.clickTimer;
                    delete this.containerNode.clickCount;
                    this.containerNode.clickCount = 1;
                    this.containerNode.clickTimer = new Date();
                } else {
                    this.containerNode.clickCount++;
                }
            } else {
                //first time
                this.containerNode.clickCount = 1;
                this.containerNode.clickTimer = new Date();
            }
            if (this.containerNode.clickCount == 2) {
                if (timer - this.containerNode.clickTimer < this.dblClickTimeout) {
                    console.log("onDblTap");
                    //this.onDblTap(evt);
                    this.emit('dblTap', evt);
                }
                delete this.containerNode.clickTimer;
                delete this.containerNode.clickCount;
            }
        },
        touchStart: function (evt) {
            if (touch.hasTouch && evt.touches.length > 1) {
                //TODO: multiple touches
                return;
            }
            var position = touch.hasTouch ? evt.touches[0] : evt;
            var now = (new Date()).getTime();
            this.positions.start = {
                pageX: position.pageX,
                pageY: position.pageY,
                time: now
            };
            this.positions.prev = {
                pageX: position.pageX,
                pageY: position.pageY,
                time: now
            };
            this.doubleTapCounter(evt);
            /**
             * @event touchStart
             */
            this.emit('touchStart', evt);
        },
        drag: function (evt, target) {
            if (touch.hasTouch && evt.touches.length > 1) {
                //TODO: multiple touches
                return;
            }
            var position = touch.hasTouch ? evt.touches[0] : evt;
            var now = (new Date()).getTime();
            this.positions.end.pageX = position.pageX;
            this.positions.end.pageY = position.pageY;
            this.positions.end.time = now;
            //this.onDrag(evt, target);
            this.emit('drag', evt);
            this.positions.prev.pageX = position.pageX;
            this.positions.prev.pageY = position.pageY;
            this.positions.prev.time = now;
        },
        touchEnd: function (evt, target) {
            var now = (new Date()).getTime();
            if (!("pageX" in this.positions.end)) {
                this.positions.end = {
                    pageX: this.positions.start.pageX,
                    pageY: this.positions.start.pageY,
                    time: now
                }
            }
            //this.onTouchEnd(evt, target);
            this.emit('touchEnd', evt);

            /*var x = this.positions.end.pageX - this.positions.start.pageX;
             var y = this.positions.end.pageY - this.positions.start.pageY;*/
            var _direction = this.simpleDirection = this.detectSimpleDirection(this.positions.start, this.positions.end);

            delete this.positions;
            this.positions = cloneObject(preset.positions);

            if (touch.hasTouch && evt.touches.length > 1) {
                //TODO: multiple touches
                return;
            }
            if (!_direction) {
                return;
            }
            /**
             * @event goLeft
             */
            /**
             * @event goRight
             */
            /**
             * @event goUp
             */
            /**
             * @event goDown
             */
            evt._distance = _direction.distance;
            this.emit("go" + helper.ucFirst(_direction.direction), evt);

        },
        /**
         * @method dragChain
         * @param {Object} evts
         * @param {Function} [evts.start]
         * @param {Function} [evts.end]
         * @param {Function} [evts.drag]
         * @returns {Object} 3 event connections
         */
        dragChain: function (evts) {
            var connect = {};
            connect.start = this.on('touchStart', function (evt) {
                evts.start && evts.start.call(this, evt);
                evts.drag && (connect.drag = this.on('drag', evts.drag));
                connect.end = this.once('touchEnd', function (evt) {
                    evts.end && evts.end.call(this, evt);
                    connect.drag && connect.drag.remove();
                    delete connect.drag;
                    delete connect.end;
                });
            });
            connect.remove = function () {
                Object.keys(connect).forEach(function (c) {
                    c.remove();
                });
                connect = null;
            };
            return connect;
        },

        detectSimpleDirection: function (start, end) {
            var x = end.pageX - start.pageX,
                y = end.pageY - start.pageY,
                absX = Math.abs(x),
                absY = Math.abs(y);
            var _direction = null, distance;
            if (x >= this.minDistance.x && (absY <= this.minDistance.y)) {
                _direction = "right";
                distance = x;
            }
            if (x <= -this.minDistance.x && (absY <= this.minDistance.y)) {
                _direction = "left";
                distance = x;
            }
            if (y >= this.minDistance.y && (absX <= this.minDistance.x)) {
                _direction = "down";
                distance = y;
            }
            if (y <= -this.minDistance.y && (absX <= this.minDistance.x)) {
                _direction = "up";
                distance = y;
            }
            return _direction === null ? _direction : {
                direction: _direction,
                distance: distance
            };
        },
        destroy: function () {
            Object.keys(this.actions).forEach(function (act) {
                this.actions[act].remove();
                delete this.actions[act];
            }, this);
            delete this.containerNode.clickTimer;
            delete this.containerNode.clickCount;
        }
    });
    return GestureManager;
});