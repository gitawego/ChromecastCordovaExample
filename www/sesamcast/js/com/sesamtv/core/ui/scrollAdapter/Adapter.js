define(['../../util/Class',
    '../../util/DomEvent',
    '../../util/Dom',
    '../../util/keyboard',
    '../../util/CustomEvent',
    '../../util/polyfill'
], function (Class, DomEvent, domHelper, keyboard, CustomEvent) {
    "use strict";
    var adapters = {};
    /**
     * @class com.sesamtv.core.ui.scrollAdapter.Adapter
     * @requires com.sesamtv.core.util.DomEvent
     * @requires com.sesamtv.core.util.CustomEvent
     * @cfg {HTMLElement|String} node
     * @cfg {Object} [config]
     * @cfg {String} [config.adapter='browser'] browser,iScroll, etc.
     * @cfg {String} [config.direction='y'] x,y or xy
     * @cfg {String} [config.lockDirection] x,y prevent from scrolling to that direction
     * @cfg {Object} [config.adapterConfig]
     */

    var ScrollAdapter = Class({
        extend: CustomEvent,
        statics: {
            /**
             * @method addAdapter
             * @static
             * @param {Number} name
             * @param {Object} adpt
             */
            addAdapter: function (name, adpt) {
                !adapters[name] && (adapters[name] = adpt);
            },
            /**
             * browser scroll adapter can't be removed
             * @method removeAdapter
             * @static
             * @param name
             */
            removeAdapter: function (name) {
                if (name === 'browser') {
                    return;
                }
                delete adapters[name];
            },
            /**
             * @method listAdapters
             * @static
             * @returns {Array}
             */
            listAdapters: function () {
                return Object.keys(adapters);
            }
        },
        constructor: function (config) {
            CustomEvent.call(this);
            this.connect = [];
            this.disabledEvts = [];
            this.timer = null;
            /**
             * down or up
             * @property scrollDirectionY
             * @type {String}
             */
            this.scrollDirectionY = '';
            this.scrollDirectionX = '';
            this.config = {
                adapter: 'browser',
                direction: 'y',
                initialOffset: 0,
                arrowScrollSize: 150,
                delay: 100,
                easingType: 'ease-out',
                baseCls: 'scrollAdapter',
                snap: false,
                useAnimation: true,
                /**
                 * @cfg {String} [animationType='css3'] css3 or js
                 */
                animationType:'css3',
                cssProps:{
                    transitionEnd:domHelper.getPrefixedCssProp('transitionEnd'),
                    transition:domHelper.getPrefixedCssProp('transition'),
                    transform:domHelper.getPrefixedCssProp('transform')
                },
                duration: 200,
                supportKeyboard: true,
                scrollbar: true
            };
            this.deviceMapping = {
                'Desktop': 'iScroll',
                'Phone': {
                    'Android': 'iScroll'
                },
                'Tablet': {
                    'Android': {
                        3: 'iScroll',
                        4: 'browser'
                    },
                    'iOS': 'browser'
                }
            };
            config && Class.mixin(this.config, config);

            if (!this.config.adapter) {
                //auto detect
                //this.config.adapter = this.detectAdapterType();
            }

            if (!adapters[this.config.adapter]) {
                throw new Error('Adapter ' + this.config.adapter + ' is not defined');
            }

            this.config.element = typeof(this.config.element) === 'string' ?
                document.getElementById(this.config.element) : this.config.element;
            if (this.config.initialOffset) {
                adapters[this.config.adapter].scrollTo.apply(this, this.config.direction === 'y' ?
                    [null, this.config.initialOffset] : [this.config.initialOffset]);
            }
            var clsList = this.config.element.classList;
            clsList.add(this.config.baseCls);
            clsList.add(this.config.direction);
            clsList.add(this.config.adapter + 'Adapter');
            this.config.useAnimation && clsList.add('useAnimation');
            this.config.supportKeyboard && this.attachKeyboard();
            adapters[this.config.adapter].init && adapters[this.config.adapter].init.call(this, this.config);

        },
        /**
         * @method detectAdapterType
         * @param {Object} info
         * @param {String} info.deviceType device type: Desktop,Tablet,Phone, etc.
         * @param {String} info.name device name
         * @param {Number} info.majorVer major version of device
         * @return {String}
         */
        detectAdapterType: function (info) {
            /*info = info || {
             deviceType:Ext.os.deviceType,
             name:Ext.os.name,
             majorVer:Ext.os.version.major
             };*/
            var adpForPlatform, adbForDevice, adbForDeivceVer;
            if (this.config.snap) {
                return 'iScroll';
            }
            if (!(adpForPlatform = this.deviceMapping[info.deviceType])) {
                return 'iScroll';
            }
            if (typeof(adpForPlatform) === 'string') {
                return adpForPlatform;
            }
            if (!(adbForDevice = adpForPlatform[info.name])) {
                return 'iScroll';
            }
            if (typeof(adbForDevice) === 'string') {
                return adbForDevice;
            }
            if (!(adbForDeivceVer = adbForDevice[info.majorVer])) {
                return 'iScroll';
            }
            return adbForDeivceVer;
        },
        attachKeyboard: function () {
            var mapping = {}, self = this;
            mapping[keyboard.LEFT_ARROW] = function () {
                self.config.direction !== 'y' && self.scrollBy(-self.config.arrowScrollSize, null, self.config.duration);
            };
            mapping[keyboard.RIGHT_ARROW] = function () {
                self.config.direction !== 'y' && self.scrollBy(self.config.arrowScrollSize, null, self.config.duration);
            };
            mapping[keyboard.UP_ARROW] = function () {
                self.config.direction !== 'x' && self.scrollBy(null, -self.config.arrowScrollSize, self.config.duration);
            };
            mapping[keyboard.DOWN_ARROW] = function () {
                self.config.direction !== 'x' && self.scrollBy(null, self.config.arrowScrollSize, self.config.duration);
            };
            this.connect.push(DomEvent.on(document, 'keydown', function (evt) {
                if (self.config.focused || self.config.element.contains(document.activeElement)) {
                    mapping[evt.keyCode] && mapping[evt.keyCode]();
                }
            }, false));
        },
        addEventListener: function (evtName, fnc, type) {
            return adapters[this.config.adapter].addEventListener.apply(this, arguments);
        },
        removeEventListener: function (evtName, fnc) {
            return adapters[this.config.adapter].removeEventListener.apply(this, arguments);
        },
        refresh: function () {
            return adapters[this.config.adapter].refresh && adapters[this.config.adapter].refresh.apply(this, arguments);
        },
        substitute: function (str, data) {
            return str.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, function (match, key, format) {
                return key in data ? data[key] : match;
            });
        },
        focus: function () {
            this.config.focused = true;
            /**
             * @event focus
             */
            this.emit('focus');
        },
        blur: function () {
            this.config.focused = false;
            /**
             * @event blur
             */
            this.emit('blur');
        },
        /**
         * @method scrollTo
         * @param {Number} x
         * @param {Number} y
         * @param {Number} [time]
         */
        scrollTo: function (x, y, time) {
            return adapters[this.config.adapter].scrollTo.apply(this, arguments);
        },
        /**
         * @method scrollBy
         * @param {Number} x
         * @param {Number} y
         * @param {Number} [time]
         */
        scrollBy: function (x, y, time) {
            return adapters[this.config.adapter].scrollBy.apply(this, arguments);
        },
        /**
         * @method scrollToElement
         * @param {HTMLElement|String} element
         * @param {Number} [time]
         */
        scrollToElement: function (element, time) {
            return adapters[this.config.adapter].scrollToElement && adapters[this.config.adapter].scrollToElement.apply(this, arguments);
        },
        /**
         * @method prepaScrollEnd
         * @param {Function} emitter
         */
        prepaScrollEnd: function (emitter) {
            var self = this;
            clearTimeout(this.timer);
            this.timer = setTimeout(function () {
                emitter.call(self);
            }, this.config.delay);
        },
        stop: function () {
            return adapters[this.config.adapter].stop && adapters[this.config.adapter].stop.call(this);
        },
        enable: function () {
            return adapters[this.config.adapter].enable && adapters[this.config.adapter].enable.call(this);
        },
        disable: function () {
            return adapters[this.config.adapter].disable && adapters[this.config.adapter].disable.call(this);
        },
        destroy: function () {
            var clsList = this.config.element.classList;
            clsList.remove(this.config.baseCls);
            clsList.remove(this.config.direction);
            clsList.remove(this.config.adapter + 'Adapter');
            clsList.remove('useTranslate');
            adapters[this.config.adapter].destroy && adapters[this.config.adapter].destroy.call(this);
            this.config.element = null;
        }
    });

    return ScrollAdapter;
});