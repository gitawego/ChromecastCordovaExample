define([
    'module',
    '../../util/Class',
    '../../util/Array'
], function (module, Class, arrayHelper) {
    'use strict';
    /**
     * parse keyCode from middle-ware
     * @class com.sesamtv.core.engine.input.KeyCodeMap
     * @param {Object} args
     */
    var KeyCodeMap = Class({
        singleton: true,
        constructor: function (args) {
            this.config = {
                /**
                 * @cfg {Object} maps
                 */
                maps: {}
            };
            args && Class.mixin(this.config, args);
        },
        /**
         * @method parseKeyCode
         * @param {Number} keyCode ex: 0x10001002
         * @returns {{type: number, value: number}}
         */
        parseKeyCode: function (keyCode) {
            return {
                type: (keyCode >> 28) & 0x0000000F,
                value: keyCode & 0x0FFFFFFF
            }
        },
        /**
         * @method get
         * @param {Number} keyCode
         * @returns {*}
         */
        get: function (keyCode) {
            var info = this.parseKeyCode(keyCode), maps = this.config.maps,
                map, rawItem, item = {};
            if (map = this.getMap((info.type).toString(16))) {

                //no advanced structure
                if (!maps.items) {
                    return map[info.value];
                }

                rawItem = arrayHelper.getItemByKeyValue(map, info.value, maps.header.indexOf(maps.keyCode), function (v) {
                    return +v;
                });

                if (!rawItem) {
                    return;
                }
                arrayHelper.forEach(rawItem, function (v, i) {
                    item[maps.header[i]] = v;
                });
                return item;
            }
        },
        /**
         * @method addMap
         * @param {Number|String} type
         * @param {Object} map
         */
        addMap: function (type, map) {
            this.config.maps[type] = Class.mixin(this.config.maps[type] || {}, map);
            return this;
        },
        /**
         * @method getMap
         * @param {String} type
         * @returns {*}
         */
        getMap: function (type) {
            return "items" in this.config.maps ? this.config.maps.items[type] : this.config.maps[type];
        }
    });
    return new KeyCodeMap(module.config());
});