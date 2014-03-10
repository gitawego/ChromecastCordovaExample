/*global IScroll*/
define(['../../util/DomEvent',
    './Adapter'],
    function (DomEvent, Adapter) {
        "use strict";
        /**
         * iScroll Adapter
         * @class com.sesamtv.core.ui.scrollAdapter.iScroll
         * @requires com.sesamtv.core.ui.scrollAdapter.Adapter
         * @requires com.sesamtv.core.util.DomEvent
         */
        var iScrollAdapter = {
            init: function () {
                var iScrollConfig = {
                        snap: this.config.snap,
                        scrollbars:true,
                        scrollX:true,
                        scrollY:true
                    },
                    disableScrollbarMapping = {
                        x: 'scrollY',
                        y: 'scrollX'
                    };
                if (this.config.direction && disableScrollbarMapping[this.config.direction]) {
                    iScrollConfig[disableScrollbarMapping[this.config.direction]] = false;
                }
                if(this.config.scrollbar === false){
                    iScrollConfig.scrollbars = false;
                }
                this.scrollbarWidth = 0;
                this.oldOverflow = this.config.element.style.overflow;
                /**
                 * iScroll instance
                 * @property adapter
                 * @type {iScroll}
                 */
                this.adapter = new IScroll(this.config.element, iScrollConfig);
                iScrollAdapter.createScrollEndEvent.call(this);
            },
            /**
             * @method addEventListener
             * @param {String} evtName
             * @param {Function} fnc
             * @param {Boolean} type
             * @return {{id:String,remove:Function}}
             */
            addEventListener: function (evtName, fnc, type) {
                return this.on(evtName, fnc, type);
            },
            /**
             * @method removeEventListener
             * @param {String} evtName
             * @param {Function} fnc
             * @return {{id:String,remove:Function}}
             */
            removeEventListener: function (evtName, fnc) {
                return this.off(evtName, fnc);
            },
            /**
             * @method scrollTo
             * @param {Number} x
             * @param {Number} y
             * @param {Number} time
             */
            scrollTo: function (x, y, time) {
                return this.adapter.scrollTo(+x, -y, time);
            },
            /**
             * @method scrollBy
             * @param {Number} x
             * @param {Number} y
             * @param {Number} time
             */
            scrollBy: function (x, y, time) {
                return this.adapter.scrollTo(+x, +y, time, true);
            },
            /**
             * @method scrollToElement
             * @param element
             * @param time
             */
            scrollToElement: function (element, time) {
                return this.adapter.scrollToElement(element, time);
            },
            refresh: function () {
                return this.adapter.refresh();
            },
            enable: function () {
                return this.adapter.enable();
            },
            disable: function () {
                return this.adapter.disable();
            },
            stop: function () {
                return this.adapter.stop();
            },
            destroy: function () {
                this.adapter.destroy();
                this.config.element.style.overflow = this.oldOverflow;
            },
            /**
             * private method to simulate scrollEnd event for browser scroller
             * @method createScrollEndEvent
             * @private
             */
            createScrollEndEvent: function () {
                var lastScrollY = this.adapter.y, lastScrollX = this.adapter.x, self = this, gapY, gapX;
                this.adapter.on('scrollEnd',function(evt){
                    console.log('IScroll scrollend',evt);
                    gapX = this.x - lastScrollX;
                    gapY = this.y - lastScrollY;
                    self.scrollDirectionY = gapY === 0 ? null : (gapY < 0 ? 'down' : 'up');
                    self.scrollDirectionX = gapX === 0 ? null : (gapX < 0 ? 'down' : 'up');
                    lastScrollY = this.y;
                    lastScrollX = this.x;
                    self.reachedBottom = self.config.element.scrollHeight - self.config.element.offsetHeight === -self.adapter.y;
                    self.reachedRight = self.config.element.scrollWidth - self.config.element.offsetWidth === -self.adapter.x;
                    self.prepaScrollEnd(function () {
                        this.emit('scrollEnd', {
                            scrollDirectionX: this.scrollDirectionX,
                            scrollDirectionY: this.scrollDirectionY
                        });
                    });
                });
            }
        };
        Adapter.addAdapter('iScroll', iScrollAdapter);
        return Adapter;
    });