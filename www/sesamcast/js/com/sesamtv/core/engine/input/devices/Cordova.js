define([
    "./../AbstractDevice",
    '../../../util/Class',
    '../../../util/DomEvent',
    '../Manager'
], function (AbstractDevice, Class, DomEvent, InputManager) {
        "use strict";
        document.addEventListener('backbutton',function(){
            DomEvent.emit('keydown',{
                keyCode:27,
                el:document
            });
        });
        /**
         * @class com.sesamtv.core.engine.input.devices.Cordova
         * @extends com.sesamtv.core.engine.input.AbstractDevice
         * @requires com.sesamtv.core.util.DomEvent
         * @requires com.sesamtv.core.engine.input.Manager
         * @param {String} targetId
         */
        var CordovaDevice = Class({
            extend: AbstractDevice,
            constructor: function CordovaDevice() {
                this.name = "cordova";
                this.eventNames = ['deviceready','pause','resume','online','offline','backbutton','batterycritical',
                    'batterylow','batterystatus','menubutton','searchbutton','startcallbutton','endcallbutton',
                    'volumedownbutton','volumeupbutton'];
                AbstractDevice.apply(this, arguments);

            },
            /**
             * @method on
             * @param {String} query channelid/eventType
             * @param {Function} listener
             * @return {{id:String,remove:Function}}
             */
            on: function (query, listener) {
                var self = this, channelInfo = this.parseChannelInfo(query),
                    type = channelInfo.eventName, channel = channelInfo.channel, evtName;
                if (!(type in this.connect) && this.eventNames.indexOf(type) !== -1) {
                    this.connect[type] = DomEvent.on(document, type, function (evt) {
                        //evtName shouldn't be cached
                        evtName = self.getEventName(type);
                        if (self.evt.hasListeners(evtName)) {
                            return self.evt.emit(evtName, evt);
                        }
                        /*self.connect[type].remove();
                         delete self.connect[type];*/
                    }, false);
                }
                return self.evt.on(self.getEventName(type, channel), listener);
            },
            /**
             * @method once
             * @param {String} type
             * @param {Function} listener
             * @return {{id:String,remove:Function}}
             */
            once: function (type, listener) {
                var h = this.on(type, function (evt) {
                    listener(evt);
                    h.remove();
                });
                return h;
            }
        });
        InputManager.addDevice('cordova', CordovaDevice);
        return CordovaDevice;
    }
);