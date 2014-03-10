define([
    'module',
    '../../abstract/BaseSystem',
    '../../util/Class'
], function (module, BaseSystem, Class) {
    "use strict";

    /**
     * @class com.sesamtv.core.engine.input.Manager
     * @extends com.sesamtv.core.abstract.BaseSystem
     * @singleton
     * @cfg {Object} args
     * @cfg {Object} [args.envMapping]
     */
    /**
     * @property inputDevices
     * @private
     * @type {Object.<String,Function>}
     */
    var inputDevices = {};
    var Manager = Class({
        extend: BaseSystem,
        singleton: true,
        constructor: function InputManager(args) {
            /**
             * @property inputDevicesList
             * @type {Object.<String, Object>}
             */
            this.inputDevicesList = {};
            this.config = {
                currentChannel: 'default'
            };
            this.channels = {};
            BaseSystem.call(this,args);

        },
        /**
         * @method addDevice
         * @param {String} name
         * @param {com.sesamtv.core.engine.input.AbstractDevice} device
         */
        addDevice: function (name, device) {
            !inputDevices[name] && (inputDevices[name] = device);
        },
        /**
         * @method hasDevice
         * @param {String} name
         * @returns {Boolean}
         */
        hasDevice: function (name) {
            return name in inputDevices;
        },
        /**
         * browser scroll adapter can't be removed
         * @method removeDevice
         * @param name
         */
        removeDevice: function (name) {
            delete inputDevices[name];
        },
        /**
         * @method listDevices
         * @returns {Array}
         */
        listDevices: function () {
            return Object.keys(inputDevices);
        },
        /**
         * @method setCurrentChannel
         * @param {String} [channelName='default']
         */
        setCurrentChannel: function (channelName) {
            this.config.currentChannel = channelName || 'default';
            /**
             * notify when current channel changed
             * @event channel
             */
            this.emit('channel', this.config.currentChannel);
        },
        getCurrentChannel:function(callback){
            callback && callback(this.config.currentChannel);
            return this.config.currentChannel;
        },
        /**
         * detect environment, ex: pc, stb, tablet, etc.
         * @method detectEnv
         * @returns {String}
         */
        detectEnv: function () {
            //todo detect environment, ex: pc, stb, tablet, etc.
            //return 'createTouch' in document ? 'device': 'computer';
            return 'computer';
        },
        /**
         * mapping example:
         *
         *      var mapping = {
         *       "stb":['Mouse','Keyboard'],
         *       "computer":['Mouse',"Keyboard","platform"],
         *       "clock":["Clock"]
         *      };
         *
         * @method importInputMapping
         * @param {Object} mapping
         * @param {String} [envType]
         */
        importDevices: function (mapping, envType) {
            mapping = mapping || this.config.envMapping;
            var currentMapping, i, l, currDeviceId;
            if (!(currentMapping = mapping[envType || this.detectEnv()])) {
                return this;
            }
            for (i = 0, l = currentMapping.length; i < l; i++) {
                currDeviceId = currentMapping[i].toLowerCase();
                if (!this.hasDevice(currDeviceId)) {
                    //todo add warning
                    continue;
                }
                this.addInputDevice(new inputDevices[currDeviceId](this));
            }
            return this;
        },
        /**
         * Add an InputDevice to the Input Manager
         * @method addInputDevice
         */
        addInputDevice: function (inputDevice) {
            if (!this.hasDevice(inputDevice.name) || inputDevice.name in this.inputDevicesList) {
                //todo add warning
                return;
            }
            this.inputDevicesList[inputDevice.name] = inputDevice;
        },
        /**
         * @method getDevice
         * @param {String} name
         * @param {Function} [callback]
         * @return {com.sesamtv.core.engine.input.AbstractDevice}
         */
        getDevice: function (name,callback) {
            var device =  this.inputDevicesList[name];
            callback && callback(device);
            return device;
        },
        /**
         * @method broadcast
         * @param {String} evtName it supports wildcard
         * @param {String} [channel] default to current channel
         */
        broadcast: function (evtName, channel) {
            var keys = Object.keys(this.inputDevicesList), i = 0, l = keys.length, device;
            for (; i < l; i++) {
                device = this.inputDevicesList[keys[i]];
                device.broadcast.apply(device, arguments);
            }
        }
    });
    return new Manager(module.config());
});
