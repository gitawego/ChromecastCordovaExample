define([
    "./../AbstractDevice",
    '../../../util/Class',
    '../../../util/DomEvent',
    '../../../util/Touch',
    '../Manager'
], function (AbstractDevice, Class, DomEvent, touch, InputManager) {
        "use strict";
        /**
         * @class com.sesamtv.core.engine.input.devices.Mouse
         * @extends com.sesamtv.core.engine.input.AbstractDevice
         * @requires com.sesamtv.core.util.DomEvent
         * @requires com.sesamtv.core.engine.input.Manager
         */
        var MouseDevice = Class({
            extend: AbstractDevice,
            constructor: function MouseDevice() {
                this.name = "mouse";
                AbstractDevice.apply(this, arguments);
            },
            /**
             * @method on
             * @param {String|HTMLElement} selector
             * @param {String} query channelid/eventType
             * @param {Function} listener
             * @return {{id:String,remove:Function}}
             */
            on: function (selector, query, listener) {

                var self = this, channelInfo = this.parseChannelInfo(query),
                    type = channelInfo.eventName, channel = channelInfo.channel,
                    realType = touch[type] || type,
                    connectName, evtName, _uid;
                if (typeof(selector) !== 'string') {
                    _uid = selector.getAttribute('data-inputManager-uid');
                    if (!_uid) {
                        _uid = (new Date()).getTime();
                        selector.setAttribute('data-inputManager-uid', _uid);
                    }
                    connectName = _uid + this.separator + type;
                } else {
                    connectName = selector + this.separator + type;
                }
                if (!(connectName in this.connect)) {
                    this.connect[connectName] = DomEvent.on(selector, realType, function (evt) {
                        //evtName shouldn't be cached
                        evtName = self.getEventName(type);
                        if (self.evt.hasListeners(evtName)) {
                            return self.evt.emit(evtName, evt);
                        }

                    }, false);
                }
                return self.evt.on(self.getEventName(type, channel), listener);
            },
            /**
             * @method once
             * @param {String|HTMLElement} selector
             * @param {String} type
             * @param {Function} listener
             * @return {{id:String,remove:Function}}
             */
            once: function (selector, type, listener) {
                var h = this.on(selector, type, function (evt) {
                    listener(evt);
                    h.remove();
                });
                return h;
            }

        });
        InputManager.addDevice('mouse', MouseDevice);
        return MouseDevice;
    }
);