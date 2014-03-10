define(function(){
    /**
     * Simple hash map class.
     * @class com.sesamtv.core.util.HashMap
     */
    var HashMap = function() {
        this._size = 0;
        this._map = {};
    };

    HashMap.prototype = {

        /**
         * Puts the key/value pair into the map, overwriting
         * any existing entry.
         * @method put
         * @param {String} key
         * @param {*} value
         */
        put: function(key, value) {
            if (!this.containsKey(key)) {
                this._size++;
            }
            this._map[key] = value;
        },

        /**
         * Removes the entry associated with the key
         * and returns the removed value.
         * @method remove
         * @param {String} key
         */
        remove: function(key) {
            if (this.containsKey(key)) {
                this._size--;
                var value = this._map[key];
                delete this._map[key];
                return value;
            } else {
                return null;
            }
        },

        /**
         * Checks if this map contains the given key.
         * @method containsKey
         * @param {String} key
         */
        containsKey: function(key) {
            return this._map.hasOwnProperty(key);
        },

        /**
         * Checks if this map contains the given value.
         * Note that values are not required to be unique.
         * @method containsValue
         * @param {*} value
         * @returns {Boolean}
         */
        containsValue: function(value) {
            for (var key in this._map) {
                if (this._map.hasOwnProperty(key)) {
                    if (this._map[key] === value) {
                        return true;
                    }
                }
            }

            return false;
        },

        /**
         * Returns the value associated with the given key.
         * @method get
         * @param {String} key
         * @returns {*}
         */
        get: function(key) {
            return this.containsKey(key) ? this._map[key] : null;
        },

        /**
         * Clears all entries from the map.
         * @method clear
         */
        clear: function() {
            this._size = 0;
            this._map = {};
        },

        /**
         * Returns an array of all keys in the map.
         * @method keys
         * @returns {Array.<String>}
         */
        keys: function() {
            var keys = [];
            for (var key in this._map) {
                if (this._map.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }
            return keys;
        },

        /**
         * Returns an array of all values in the map.
         * @method values
         * @returns {Array}
         */
        values: function() {
            var values = [];
            for (var key in this._map) {
                if (this._map.hasOwnProperty(key)) {
                    values.push(this._map[key]);
                }
            }
            return values;
        },

        /**
         * Returns the size of the map, which is
         * the number of keys.
         * @method size
         * @returns {Number}
         */
        size: function() {
            return this._size;
        }
    };
    return HashMap;
});