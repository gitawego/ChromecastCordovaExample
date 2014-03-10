define(["./../AbstractDevice",
    '../../../util/CustomEvent',
    '../../../util/Class',
    '../Manager'],
    function (AbstractDevice, CustomEvent, Class, InputManager) {
        "use strict";
        /**
         * @class com.sesamtv.core.engine.input.devices.Clock
         * @extends com.sesamtv.core.engine.input.AbstractDevice
         */
        var ClockDevice = Class({
            extend: AbstractDevice,
            constructor: function ClockDevice() {
                this.name = "clock";
                AbstractDevice.apply(this, arguments);
                this.durations = {
                    second: 1000,
                    minute: 1000 * 60,
                    hour: 1000 * 60 * 60
                };
                this.counters = {};
            },
            startClock: function () {
                var now, self = this;
                this.counters.clock = setInterval(function () {
                    now = new Date();
                    self.evt.emit(self.getEventName('clock'), {
                        second: now.getSeconds(),
                        minute: now.getMinutes(),
                        hour: now.getHours(),
                        date:now.getDate(),
                        month:now.getMonth(),
                        year: now.getFullYear()
                    });
                }, this.durations.second);
            },
            stopClock: function () {
                clearInterval(this.counters.clock);
            },
            startTimer:function(){
                var self = this,counter = 0;
                this.counters.timer = setInterval(function(){
                    self.evt.emit(self.getEventName('timer'),++counter);
                },this.durations.second);
            },
            stopTimer:function(){
                clearInterval(this.counters.timer);
            }
        });
        InputManager.addDevice('clock', ClockDevice);
        return ClockDevice;
    }
);