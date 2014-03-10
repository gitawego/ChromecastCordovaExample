define([
    "./CustomEvent",
    "./Class",
    './Helper'
], function (CustomEvent, Class, helper) {
    var isObject = helper.isType('Object');
    /**
     * evented base component, use CustomEvent as compositor
     * @class com.sesamtv.core.util.BaseEvented
     * @requires com.sesamtv.core.util.CustomEvent
     */
    var BaseEvented = Class({
        constructor: function BaseEvented() {
            /**
             * @property event
             * @type {com.sesamtv.core.util.CustomEvent}
             */
            this.event = new CustomEvent();
            Class.applyIf(this, {
                /**
                 * named listener handlers
                 * @property evts
                 * @type {Object}
                 */
                evts: {},
                /**
                 * anonymous listener handlers
                 * @property connect
                 * @type {Array}
                 */
                connect: [],
                config: {}
            });
        },
        /**
         * @method on
         * @param {String} evt
         * @param {Function} fnc
         * @param {Boolean} [once]
         * @returns {{id: Number, remove: Function}}
         */
        on: function (evt, fnc, once) {
            return this.event[once ? 'once' : 'on'](evt, fnc.bind(this));
        },
        /**
         * @method once
         * @param {String} evt
         * @param {Function} fnc
         * @returns {{id: Number, remove: Function}}
         */
        once: function (evt, fnc) {
            return this.on(evt, fnc.bind(this), true);
        },
        /**
         * @method emit
         * @returns {Array}
         */
        emit: function () {
            return this.event.emit.apply(this.event, arguments);
        },
        /**
         * @method broadcast
         * @param {String} wildcard
         */
        broadcast: function (wildcard) {
            return this.event.broadcast.apply(this.event, arguments);
        },
        /**
         * set a property
         * @method set
         * @param k
         * @param v
         */
        set: function (k, v) {
            if (k === 'config') {
                return this.setConfigs(v);
            }
            if (k in this && this[k] === v) {
                return;
            }
            var res = {
                newValue: v
            };
            if (k in this) {
                res.oldValue = isObject(this[k]) ? helper.deepClone(this[k]) : this[k];
            }
            this[k] = v;
            this.emit(k, res);

        },
        /**
         * @method setConfigs
         * @param {Object} v
         */
        setConfigs: function (v) {
            Object.keys(v).forEach(function (k) {
                this.setConfig(k, v[k]);
            }, this);
        },
        /**
         * set a config property
         * @method setConfig
         * @param {String} k
         * @param {*} v
         */
        setConfig: function (k, v) {
            if (arguments.length === 1) {
                return this.setConfigs(k);
            }
            if (k in this.config && this.config[k] === v) {
                return;
            }
            var res = {
                key: k,
                newValue: v
            };
            if (k in this.config) {
                res.oldValue = isObject(this.config[k]) ? helper.deepClone(this.config[k]) : this.config[k];
            }
            this.config[k] = v;
            this.emit('config', res);
        },
        /**
         * @method getConfig
         * @param {String} k
         * @returns {*}
         */
        getConfig: function (k) {
            return this.config[k];
        },
        /**
         * @method destroy
         */
        destroy: function () {
            this.connect.forEach(function (c) {
                c.remove();
            });
            this.connect.length = 0;
            Object.keys(this.evts).forEach(function (e) {
                this.evts[e].remove();
            }, this);
            this.evts = {};
            this.event.purgeListeners();
        }
    });
    return BaseEvented;
});