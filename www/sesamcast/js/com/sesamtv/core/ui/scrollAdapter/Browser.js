define([
    '../../util/DomEvent',
    '../../util/Animation',
    './Adapter'
], function (DomEvent, animation, Adapter) {
    "use strict";
    /**
     * default adapter for scroller
     * @class com.sesamtv.core.ui.scrollAdapter.Browser
     * @requires com.sesamtv.core.ui.scrollAdapter.Adapter
     * @requires com.sesamtv.core.util.DomEvent
     */
    var Browser = {
        init: function () {
            // Create the measurement node
            var scrollDiv = document.createElement("div"), hasTouch = 'createTouch' in document;
            scrollDiv.className = "scrollbar-measure";
            document.body.appendChild(scrollDiv);
            this.scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
            document.body.removeChild(scrollDiv);
            this.browserAnimPropMapping = {
                x: {
                    //prop: 'marginLeft',
                    prop: 'left',
                    translate: 'translateX(${x})'
                },
                y: {
                    /*prop: 'marginTop',*/
                    prop: 'top',
                    translate: 'translateY(${y})'
                },
                xy: {
                    translate: 'translate3d(${x},${y},0)'
                }
            };
            if (!this.config.scrollbar) {
                this.config.element.classList.add('disableScrollbar');
            }
            this.connect.push(DomEvent.on(this.config.element, hasTouch ? 'touchmove' : 'mousemove', function (e) {
                //e.stopPropagation();
                //e.preventDefault();
            }, false));
            Browser.createScrollEndEvent.call(this);
        },
        /**
         * @method addEventListener
         * @param {String} evtName
         * @param {Function} fnc
         * @param {Boolean} type
         * @return {{remove:Function}}
         */
        addEventListener: function (evtName, fnc, type) {
            var h = DomEvent.on(this.config.element, evtName, fnc, type);
            this.connect.push(h);
            //return this.config.element.addEventListener(evtName, fnc, type);
        },
        /**
         * @method removeEventListener
         * @param {String} evtName
         * @param {Function} fnc
         * @return {{remove:Function}}
         */
        removeEventListener: function (evtName, fnc) {
            return DomEvent.off(this.config.element, evtName, fnc);
            //return this.config.element.removeEventListener(evtName, fnc);
        },
        /**
         * @method scrollTo
         * @param {Number} x
         * @param {Number} y
         * @param {Number} [time]
         */
        scrollTo: function (x, y, time) {
            var hasX = typeof(x) === 'number', hasY = typeof(y) === 'number';

            if (hasX) {
                if (x < 0) {
                    x = 0;
                }
                if (x > this.config.element.scrollWidth - this.config.element.offsetWidth) {
                    x = this.config.element.scrollWidth - this.config.element.offsetWidth
                }
            }
            if (hasY) {
                if (y < 0) {
                    y = 0;
                }
                if (y > this.config.element.scrollHeight - this.config.element.offsetHeight) {
                    y = this.config.element.scrollHeight - this.config.element.offsetHeight;
                }
            }
            if (!time) {
                hasX && (this.config.element.scrollLeft = x);
                hasY && (this.config.element.scrollTop = y);
                return;
            }
            if (hasX && hasY) {
                Browser.scrollAnim.call(this, {
                    duration: time,
                    to: [x, y]
                });
            } else {
                hasX && Browser.scrollAnim.call(this, {
                    attribute: 'scrollLeft',
                    duration: time,
                    to: x
                });
                hasY && Browser.scrollAnim.call(this, {
                    attribute: 'scrollTop',
                    duration: time,
                    to: y
                });
            }
        },
        /**
         * @method scrollAnim
         * @param {Object} opt
         * @param {Number|Array.<Number>} opt.to
         * @param {String} [opt.attribute] if not defined, there are 2 attributes: scrollLeft and scrollTop
         * @param {Number} opt.duration
         */
        scrollAnim: function (opt) {
            opt = opt || {};
            var mapping = this.browserAnimPropMapping, self = this, currentMap = mapping[this.config.direction],
                inner = this.config.element.firstElementChild, hasBiDirection = Array.isArray(opt.to),
                defineAnim = function defineAnim(args) {
                    var gap, translateV = {
                        x: 0,
                        y: 0
                    };
                    args.forEach(function (arg) {
                        gap = arg.to - self.config.element[arg.attribute];
                        if (self.config.useAnimation) {
                            translateV[arg.direction] = gap + 'px';
                        } else {
                            inner.style[mapping[arg.direction].prop] = gap + 'px';
                        }
                        self.config.element[arg.attribute] = arg.to;
                    });
                    if (self.config.useAnimation) {
                        inner.style[self.config.cssProps.transform.js] = self.substitute(mapping[args.length === 2 ?
                            'xy' : args[0].direction].translate, translateV);
                    }
                };
            /*if (this.scrolling) {
             console.warn('scrolling, no another anim');
             return;
             }*/

            if (hasBiDirection) {
                if (opt.to[0] === this.config.element.scrollLeft &&
                    opt.to[1] === this.config.element.scrollTop) {
                    return;
                }
                defineAnim([
                    {
                        to: opt.to[0],
                        direction: 'x',
                        attribute: 'scrollLeft'
                    },
                    {
                        to: opt.to[1],
                        direction: 'y',
                        attribute: 'scrollTop'
                    }
                ]);
            } else {
                if (opt.to === this.config.element[opt.attribute]) {
                    return;
                }
                defineAnim([
                    {
                        to: opt.to,
                        direction: this.config.direction,
                        attribute: opt.attribute
                    }
                ]);
            }

            inner.classList.add('scrollAnim');
            this.scrollAnimOnEnd && this.scrollAnimOnEnd.remove();
            if(this.scrolling){
                inner.style[this.config.cssProps.transition.js] = 'all 0ms ' + self.config.easingType;
            }
            this.scrollAnimOnEnd = DomEvent.once(inner, this.config.cssProps.transitionEnd.js, function () {
                delete self.scrollAnimOnEnd;
                self.scrolling = false;
                self.emit('scrollAnimStopped', hasBiDirection);
            });

            //when using translateZ, the graphical layout is slow to be ready, so we have to wait a little bit

            window.requestAnimationFrame(function () {
                self.scrolling = true;
                inner.style[self.config.cssProps.transition.js] = 'all ' + opt.duration + 'ms ' + self.config.easingType;
                if (self.config.useAnimation) {
                    return inner.style[self.config.cssProps.transform.js] = hasBiDirection ? 'translate3d(0,0,0)' :
                        'translate' + self.config.direction.toUpperCase() + '(0)';
                }
                if (hasBiDirection) {
                    inner.style[mapping['x'].prop] = 0;
                    inner.style[mapping['y'].prop] = 0;
                } else {
                    inner.style[currentMap.prop] = 0;
                }
            });
        },
        resetScrollAnim: function (hasBiDirection) {
            var inner = this.config.element.firstElementChild,
                mapping = this.browserAnimPropMapping,
                currentMap = mapping[this.config.direction];
            inner.style[this.config.cssProps.transition.js] = '';

            //this.emit('scrollAnimStopped');
            if (this.config.useAnimation) {
                inner.style[this.config.cssProps.transform.js] = '';
            } else {
                if (hasBiDirection) {
                    inner.style[mapping['x'].prop] = '';
                    inner.style[mapping['y'].prop] = '';
                } else {
                    inner.style[currentMap.prop] = '';
                }
            }
            inner.classList.remove('scrollAnim');
        },
        /**
         * @method scrollBy
         * @param {Number} x
         * @param {Number} y
         * @param {Number} [time]
         */
        scrollBy: function (x, y, time) {

            var hasX = typeof(x) === 'number', hasY = typeof(y) === 'number';
            if (!hasY && ((this.config.element.scrollLeft === 0 && x < 0) || (x > 0 && this.reachedRight))) {
                return;
            }
            if (!hasX && ((this.config.element.scrollTop === 0 && y < 0) || (y > 0 && this.reachedBottom))) {
                return;
            }
            return this.scrollTo(hasX ? this.config.element.scrollLeft + x : null,
                hasY ? this.config.element.scrollTop + y : null,
                time);
        },
        /**
         * element must be inside of container
         * @method scrollToElement
         * @param {HTMLElement} element
         * @param {Number} [time]
         */
        scrollToElement: function (element, time) {
            var mapping = {
                x: [element.offsetLeft, null, time],
                y: [null, element.offsetTop, time],
                xy: [element.offsetLeft, element.offsetTop, time]
            };
            this.scrollTo.apply(this, mapping[this.config.direction]);
        },
        /**
         * first call is an initializer
         * @method detectScrollDirection
         * @param {HTMLElement} node
         */
        detectScrollDirection: function detectScrollDirection(node) {
            if (!('lastScrollTop' in detectScrollDirection)) {
                detectScrollDirection.lastScrollLeft = this.config.element.scrollLeft;
                detectScrollDirection.lastScrollTop = this.config.element.scrollTop;
                return;
            }
            this.scrollDirectionY = node.scrollTop === detectScrollDirection.lastScrollTop ? null :
                (node.scrollTop > detectScrollDirection.lastScrollTop ? 'down' : 'up');
            this.scrollDirectionX = node.scrollLeft === detectScrollDirection.lastScrollLeft ? null :
                (node.scrollLeft > detectScrollDirection.lastScrollLeft ? 'down' : 'up');
            detectScrollDirection.lastScrollTop = node.scrollTop;
            detectScrollDirection.lastScrollLeft = node.scrollLeft;
        },
        /**
         * private method to simulate scrollEnd event for browser scroller
         * @method createScrollEndEvent
         * @private
         */
        createScrollEndEvent: function () {
            var contentHeight, reachedRight, reachedBottom, self = this;
            //init detection
            Browser.detectScrollDirection.call(this, this.config.element);

            this.connect.push(DomEvent.on(this.config.element, 'scroll', function () {
                var selfNode = this;

                contentHeight = this.scrollHeight - this.offsetHeight;

                Browser.detectScrollDirection.call(self, this);

                self.prepaScrollEnd(function () {
                    if (self.scrolling) {
                        self.scrollAnimStoppedEvt && self.scrollAnimStoppedEvt.remove();
                        self.scrollAnimStoppedEvt = self.once('scrollAnimStopped', function (hasBiDirection) {
                            Browser.resetScrollAnim.call(self, hasBiDirection);

                            DomEvent.emit('scrollEnd', {
                                el: selfNode,
                                scrollDirectionY: self.scrollDirectionY,
                                scrollDirectionX: self.scrollDirectionX
                            });
                        });
                        return;
                    }
                    DomEvent.emit('scrollEnd', {
                        el: selfNode,
                        scrollDirectionY: this.scrollDirectionY,
                        scrollDirectionX: this.scrollDirectionX
                    });
                });
                reachedRight = self.reachedRight = self.config.element.scrollLeft + self.config.element.offsetWidth == self.config.element.scrollWidth;
                reachedBottom = self.reachedBottom = contentHeight <= this.scrollTop;
                if (reachedRight || reachedBottom) {
                    DomEvent.emit('reachedEnd', {
                        el: this,
                        reachedBottom: reachedBottom,
                        reachedRight: reachedRight
                    });
                }
            }, false));
        },
        enable: function () {
            this.disabledEvts.forEach(function (e) {
                e.remove();
            });
            this.disabledEvts.length = 0;
        },
        disable: function () {
            if (this.disabledEvts.length !== 0) {
                return;
            }
            var self = this, oldOverflow;

            function preventDefault(e) {
                e = e || window.event;
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.returnValue = false;
            }

            this.disabledEvts.push(DomEvent.on(this.config.element, 'DOMMouseScroll', preventDefault, false));
            this.disabledEvts.push(DomEvent.on(this.config.element, 'mousewheel', preventDefault, false));
            this.disabledEvts.push(DomEvent.on(this.config.element, 'createTouch' in document ?
                'touchmove' : 'mousemove', preventDefault, false));

            oldOverflow = this.config.element.style.overflow;
            this.config.element.style.overflow = 'hidden';
            this.disabledEvts.push({
                remove: function () {
                    self.config.element.style.overflow = oldOverflow;
                }
            });

        },
        destroy: function () {
            this.connect.forEach(function (c) {
                c.remove();
            });
            this.connect.length = 0;
            this.config.element.classList.remove('disableScrollbar');
            this.enable();
        }
    };
    Adapter.addAdapter('browser', Browser);
    return Adapter;
});