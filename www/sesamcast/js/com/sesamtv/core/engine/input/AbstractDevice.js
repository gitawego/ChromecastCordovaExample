define([
    '../../util/Class',
    '../../util/CustomEvent'
], function (Class, CustomEvent) {
    "use strict";
    var slice = Array.prototype.slice;
    /**
     * @class com.sesamtv.core.engine.input.AbstractDevice
     * @requires com.sesamtv.core.util.CustomEvent
     * @cfg {com.sesamtv.core.engine.input.Manager} manager
     */
    var AbstractDevice = Class({
        constructor: function AbstractDevice(manager) {

            if (!manager) {
                throw new Error('manager is not defined');
            }
            /**
             * @property manager
             * @type {com.sesamtv.core.engine.input.Manager}
             */
            this.manager = manager;
            /**
             * @property name
             * @type {String}
             */
            this.name = this.name || "UnknownInputDevice";
            /**
             * @property separator
             * @type {String}
             */
            this.separator = "/";
            this.connect = {};
            this.evt = new CustomEvent();
        },
        deviceConfig: function (name) {
            name = name || this.name;
            var deviceConfigs = this.manager.getConfig('devicesConfig') || {};
            return deviceConfigs[name];
        },
        /**
         * @method getEventName
         * @param {String} evtName
         * @param {String} [channel]
         * @return {string}
         */
        getEventName: function (evtName, channel) {
            return [channel || this.manager.config.currentChannel, this.name, evtName].join(this.separator);
        },
        /**
         * @method parseChannelInfo
         * @param {String} query ex: 'channel1/click'
         * @returns {{eventName: String, channel: String}}
         */
        parseChannelInfo: function (query) {
            var parts = query.split(this.separator);
            if (parts.length === 1) {
                return null;
            }
            return {
                eventName: parts.pop(),
                channel: parts.join(this.separator)
            };
        },
        on: function (query, listener) {
            var channelInfo = this.parseChannelInfo(query);
            return this.evt.on(channelInfo ?
                this.getEventName(channelInfo.eventName, channelInfo.channel) : query, listener);
        },
        once: function (eventName, listener) {
            var h = this.on(eventName, function (evt) {
                listener(evt);
                h.remove();
            });
            return h;
        },
        /**
         * @method off
         * @param {String} evtName
         * @param {String|Function} handler
         * @param {String} [channel]
         */
        off: function (evtName, handler, channel) {
            return this.evt.off(this.getEventName(evtName, channel), handler);
        },
        /**
         * can be only emitted to current channel
         * @method emit
         * @param evtName
         * @return {*}
         */
        emit: function (evtName) {
            var args = slice.call(arguments, 1);
            evtName = this.getEventName(evtName);
            return this.evt.emit.apply(this.evt, [evtName].concat(args));
        },
        /**
         * @method broadcast
         * @param {String} evtName
         * @param {String} [channel]
         * @return {*}
         */
        broadcast: function (evtName, channel) {
            var args = slice.call(arguments, 2);
            evtName = this.getEventName(evtName, channel);
            return this.evt.broadcast.apply(this.evt, [evtName].concat(args));
        },
        /**
         * @method destroy
         */
        destroy: function () {
            Object.keys(this.connect).forEach(function (k) {
                this.connect[k].remove();
            }, this);
            this.connect = {};
            this.evt.purgeListeners();
        }
    });
    return AbstractDevice;
});