define([
    '../Manager',
    "../AbstractDevice",
    '../KeyCodeMap',
    '../../Topic',
    '../../../util/Class',
    '../../../util/DomEvent'
], function (InputManager, AbstractDevice, keyCodeMap, topic, Class, DomEvent) {
    'use strict';
    /**
     * @class com.sesamtv.core.engine.input.devices.Bbox
     * @extends com.sesamtv.core.engine.input.AbstractDevice
     * @cfg {com.sesamtv.core.engine.input.Manager} manager
     */
    var Bbox = Class({
        extend: AbstractDevice,
        constructor: function PlatformDevice(manager) {
            this.name = 'bbox';
            AbstractDevice.call(this, manager);
            this.initEvent();
        },
        /**
         * @method initEvent
         */
        initEvent: function () {
            var self = this, deviceConfig = self.deviceConfig(),
                triggerEvent = (deviceConfig && deviceConfig.eventName) || 'keydown',
                keyCode, code,evtName;
            this.connect[triggerEvent] = this.connect[triggerEvent] || DomEvent.on(document, triggerEvent, function (evt) {
                keyCode = evt.keyCode;
                deviceConfig = self.deviceConfig();
                code = keyCodeMap.get(keyCode);
                if (!code) {
                    return;
                }
                if (code.type === 'error') {
                    return topic.pub('errorManager/error', code.key, keyCode);
                }
                //found code in global setting, trigger it in both global and channel
                if (deviceConfig && deviceConfig.globalCode && deviceConfig.globalCode.indexOf(code.key) !== -1) {
                    self.evt.emit(code.key, evt);
                }
                evtName = self.getEventName(code.key);
                //found keycode listeners in channels, trigger them
                if (self.evt.hasListeners(evtName)) {
                    self.evt.emit(evtName, evt);
                } else if (deviceConfig && deviceConfig.defaultToGlobalCode && deviceConfig.defaultToGlobalCode.indexOf(code.key) !== -1) {
                    //if found in defaultToGLobalCode, trigger the default action in global
                    self.evt.emit(code.key, evt);
                }
            });
        }
    });
    InputManager.addDevice('bbox', Bbox);
    return Bbox;
});