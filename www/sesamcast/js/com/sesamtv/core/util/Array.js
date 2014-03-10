define(function () {
    var slice = Array.prototype.slice;
    /**
     * @class com.sesamtv.core.util.Array
     * @singleton
     */
    var ArrayHelper = {
        /**
         * an optimized version of array.prototype.forEach
         * @method forEach
         * @param {Object|Array} obj an array or a json object
         * @param {Function} fnc
         * @param {Object} [scope] reference node
         */
        forEach: function (obj, fnc, scope) {
            "use strict";
            if (typeof fnc != "function") {
                throw new TypeError();
            }
            var i = 0, l, keys, key;
            if (obj instanceof Array) {
                l = obj.length;
                for (; i < l; i++) {
                    fnc.call(scope, obj[i], i, obj);
                }
            } else {
                keys = Object.keys(obj);
                l = keys.length;
                for (; i < l; i++) {
                    key = keys[i];
                    fnc.call(scope, obj[key], i, key, obj);
                }
            }
        },
        /**
         * an optimized version of array.prototype.map
         * @method map
         * @param {Object} obj an array or a json object
         * @param {Function} fnc
         * @param {Object} [scope] reference node
         * @return {Object|Array} Creates a new array with the result of calling the specified function on each element of the Array.
         */
        map: function (obj, fnc, scope) {
            if (typeof fnc != "function") {
                throw new TypeError();
            }
            var i = 0, l, keys, key, newObj;
            if (obj instanceof Array) {
                newObj = []
                l = obj.length;
                for (; i < l; i++) {
                    newObj[i] = fnc.call(scope, obj[i], i, obj);
                }
            } else {
                keys = Object.keys(obj);
                l = keys.length;
                newObj = {};
                for (; i < l; i++) {
                    key = keys[i];
                    newObj[key] = fnc.call(scope, obj[key], i, key, obj);
                }
            }
            return newObj;
        },
        /**
         * @method some
         * @param {Object|Array} obj an array or a json object
         * @param {Function} fnc
         * @param {Object} [scope] reference node
         * @return {Boolean} Passes each element through the supplied function until "true" is returned.
         */
        some: function (obj, fnc, scope) {
            if (typeof fnc != "function") {
                throw new TypeError();
            }
            var i = 0, l, keys, key;
            if (obj instanceof Array) {
                l = obj.length;
                for (; i < l; i++) {
                    if (fnc.call(scope, obj[i], i, obj)) {
                        return true;
                    }
                }
            } else {
                keys = Object.keys(obj);
                l = keys.length;
                for (; i < l; i++) {
                    key = keys[i];
                    if (fnc.call(scope, obj[key], i, key, obj)) {
                        return true;
                    }
                }
            }
        },
        /**
         * @method filter
         * @param {Object|Array} obj
         * @param {Function} fnc
         * @param {Object} [scope] function scope
         * @return {Array|Object}
         */
        filter: function (obj, fnc, scope) {
            if (typeof fnc != "function") {
                throw new TypeError();
            }
            var i = 0, l, keys, key, res;
            if (obj instanceof Array) {
                l = obj.length;
                res = [];
                for (; i < l; i++) {
                    if (fnc.call(scope, obj[i], i, obj)) {
                        res.push(obj[i]);
                    }
                }
            } else {
                keys = Object.keys(obj);
                l = keys.length;
                res = {};
                for (; i < l; i++) {
                    key = keys[i];
                    if (fnc.call(scope, obj[key], i, key, obj)) {
                        res[key] = obj[key];
                    }
                }
            }
            return res;
        },
        /**
         * @method sort
         * @param {Array|Object} obj
         * @param {Function} fnc func params contain:
         *  {Object} current (current.key,current.value)
         *  {Object} next (next.key,next.value)
         * @param {Object} scope function scope
         * @return {Array|Object}
         */
        sort: function (obj, fnc, scope) {
            if (typeof fnc != "function") {
                throw new TypeError();
            }
            if (obj instanceof Array) {
                return obj.sort(fnc);
            }
            var newObj = {}, keys = Object.keys(obj), i = 0, l = keys.length, key;
            keys = keys.sort(function (curr, next) {
                return fnc.call(scope, {
                    key: curr,
                    value: obj[curr]
                }, {
                    key: next,
                    value: obj[next]
                }, obj);
            });
            for (; i < l; i++) {
                key = keys[i];
                newObj[key] = obj[key];
            }
            return newObj;
        },
        /**
         * @method every
         * @param {Object|Array} obj an array or a json object
         * @param {Function} fnc
         * @param {Object} [scope] reference node
         * @return {Boolean} Calls a function for every element of the array until false is returned.
         */
        every: function (obj, fnc, scope) {
            if (typeof fnc != "function") {
                throw new TypeError();
            }
            var i = 0, l, keys, key;
            if (obj instanceof Array) {
                l = obj.length;
                for (; i < l; i++) {
                    if (!fnc.call(scope, obj[i], i, obj)) {
                        return false;
                    }
                }
            } else {
                keys = Object.keys(obj);
                l = keys.length;
                for (; i < l; i++) {
                    key = keys[i];
                    if (!fnc.call(scope, obj[key], i, key, obj)) {
                        return false;
                    }
                }
            }
            return true;
        },
        /**
         *
         * use for loop
         *
         * see [forloop vs indexOf](http://jsperf.com/js-for-loop-vs-array-indexof/127)
         *
         * @method indexOf
         * @param {Array} arr
         * @param {*} ele
         * @returns {Number}
         */
        indexOf: function (arr, ele) {
            var i = 0, l = arr.length;
            for (; i < l; i++) {
                if (arr[i] === ele) {
                    return i;
                }
            }
            return -1;
        },
        /**
         *
         *      var arr = [{'id':1},{'id':2},{'id':3}];
         *      indexOf(arr,2,'id'); // return 1
         *
         * @method getIndexByKeyValue
         * @param {Array.<Object>} arr
         * @param {*} value
         * @param {String} key
         * @param {Function} [formatter]
         * @returns {number}
         */
        getIndexByKeyValue: function (arr, value, key, formatter) {
            formatter = formatter || function (v) {
                return v;
            };
            var i = 0, l = arr.length;
            for (; i < l; i++) {
                if (key in arr[i] && formatter(arr[i][key]) === value) {
                    return i;
                }
            }
            return -1;
        },
        /**
         * @method getItemByKeyValue
         * @param {Array.<Object>|Object} arr
         * @param {*} value
         * @param {String} key
         * @param {Function} [formatter]
         * @returns {*}
         */
        getItemByKeyValue: function (arr, value, key, formatter) {
            formatter = formatter || function (v) {
                return v;
            };
            var i = 0, l, keys;
            if (arr instanceof Array) {
                l = arr.length;
                for (; i < l; i++) {
                    if (key in arr[i] && formatter(arr[i][key]) === value) {
                        return arr[i];
                    }
                }
            } else {
                keys = Object.keys(arr);
                l = keys.length;
                for (; i < l; i++) {
                    if (key in arr[keys[i]] && formatter(arr[keys[i]][key]) === value) {
                        return {
                            key:keys[i],
                            item:arr[keys[i]]
                        };
                    }
                }
            }
        },
        /**
         * must search in a sorted array
         * @method binarySearch
         * @param arr
         * @param searchElement
         * @returns {number}
         */
        binarySearch: function binarySearch(arr, searchElement) {
            'use strict';
            var minIndex = 0,
                maxIndex = arr.length - 1,
                currentIndex, currentElement, resultIndex;

            while (minIndex <= maxIndex) {
                resultIndex = currentIndex = (minIndex + maxIndex) >> 1;
                currentElement = arr[currentIndex];

                if (currentElement < searchElement) {
                    minIndex = currentIndex + 1;
                }
                else if (currentElement > searchElement) {
                    maxIndex = currentIndex - 1;
                }
                else {
                    return currentIndex;
                }
            }
            return ~maxIndex;
        },
        /**
         * Converts an enumerable object to an array.
         * ex: toArray(arguments).splice(1);
         * @method toArray
         * @param enu
         * @return Array
         */
        toArray: function (enu) {
            return slice.call(enu, 0);
        },
        list: function (variables, values, scope) {
            var i = 0, l = variables.length, lv = values.length;
            for (; i < l && i < lv; i++) {
                (scope || this)[variables[i]] = values[i];
            }
        },
        /**
         * return array with unique items
         * only for array
         * @method unique
         * @param arrayData
         * @return {Array}
         */
        unique: function (arrayData) {
            return ArrayHelper.filter(arrayData, function (val, idx, arr) {
                return arr.slice(0, idx).indexOf(val) == -1
            });
        },
        /**
         * generate a plain array with a set of numbers of a certain range
         * @method range
         * @param start
         * @param stop
         * @return Array
         */
        range: function (start, stop) {
            var r = [];
            for (; start < stop; r.push(start++));
            return r;
        },
        /**
         * Returns a copy of the array with all falsy values removed.
         * In JavaScript, false, null, 0, "", undefined and NaN are all falsy.
         * @method compact
         * @param array
         */
        compact: function (array) {
            return ArrayHelper.filter(array, function (value) {
                return !!value;
            });
        },
        /**
         * if arr is an object, item is an object as well, and refItem is the key of reference item
         *
         *      var x = {a:1,b:2};
         *      insertInto(x,{c:3},'b','before');
         *
         *      var x = [1,2,3];
         *      insertInto(x,5,2,'after');
         *
         * @method insertInto
         * @param {Array|Object} arr original array
         * @param {*} item item to be inserted
         * @param {*} refItem reference item
         * @param {String} [pos='after'] before or after
         * @return {Array|Object}
         */
        insertInto: function (arr, item, refItem, pos) {
            var insert = function (arr, item, refItem, pos) {
                if (!(arr instanceof Array)) {
                    throw new Error("first argument must be an array");
                }
                pos = pos || "after";
                var mapping = {
                    "before": 0,
                    "after": 1
                }, idx;
                if ((idx = arr.indexOf(refItem)) === -1) {
                    throw new Error("refItem not found in the array");
                }
                idx = idx + mapping[pos];
                arr.splice(idx, 0, item);
                return arr;
            };
            if (!(arr instanceof Array)) {
                var keys = Object.keys(arr),
                    itemK = Object.keys(item)[0],
                    obj = {};
                ArrayHelper.forEach(insert(keys, itemK, refItem, pos), function (k) {
                    obj[k] = (k in arr) ? arr[k] : item[k];
                });
                return obj;
            }
            return insert(arr, item, refItem, pos);
        }
    };
    return ArrayHelper;
});