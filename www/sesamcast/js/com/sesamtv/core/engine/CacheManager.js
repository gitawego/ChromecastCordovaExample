define([
    "../util/Class",
    "../util/Storage"
], function (Class, Storage) {
    'use strict';
    var undef = {}.undef;
    /**
     * @class com.sesamtv.core.engine.CacheManager
     * @singleton
     */
    var CacheManager = Class({
        singleton: true,
        constructor: function CacheManager() {

        },
        /**
         * @method select
         * @param {String} collectionName
         * @param {Object} params
         * @param {Number} [params.lifetime=3600000]
         * @param {Boolean} [params.isArray]
         * @returns {{
             *      local:com.sesamtv.core.engine.CacheManager.Operator,
             *      session:com.sesamtv.core.engine.CacheManager.Operator,
             *      fileSystem:com.sesamtv.core.engine.CacheManager.Operator
             * }}
         */
        select: function (collectionName, params) {
            params = params || {};
            var lifetime = params.lifetime || 3600000;
            var obj = {};

            Object.defineProperties(obj, {
                local: {
                    get: function () {
                        return new Operator({
                            collectionName: collectionName,
                            isArray: params.isArray,
                            storageClass: Storage,
                            storageType: 'local',
                            lifetime: lifetime
                        });
                    }
                },
                session: {
                    get: function () {
                        return new Operator({
                            collectionName: collectionName,
                            isArray: params.isArray,
                            storageClass: Storage,
                            storageType: 'session',
                            lifetime: lifetime
                        });
                    }
                },
                fileSystem: {
                    get: function () {
                        return new Operator({
                            collectionName: collectionName,
                            isArray: params.isArray,
                            storageClass: FileSystem,
                            storageType: 'fs',
                            lifetime: lifetime
                        });
                    }
                }
            });
            return obj;
        }
    });
    /**
     * @class com.sesamtv.core.engine.CacheManager.Operator
     * @cfg {Object} args
     * @cfg {Function} args.storageClass
     * @cfg {String} args.collectionName
     * @cfg {String} args.storageType
     * @cfg {Number} args.lifetime
     */
    var Operator = Class({
        constructor: function (args) {
            args && Class.mixin(this, args);
            this.select = this.storageClass.select(this.collectionName)[this.storageType];
            this.isArray && this.select.set('isArray', true);
        },
        /**
         * @method get
         * @param {String} key
         * @returns {*}
         */
        get: function (key) {
            var val = this.select.get(key),
                timestamp = this.select.get(key + 'Timestamp'),
                now = new Date().getTime();
            if (!val) {
                return undef;
            }
            if (!timestamp || timestamp < now - this.lifetime) {
                this.select.remove(key);
                this.select.remove(key + 'Timestamp');
                return undef;
            }
            return val;
        },
        /**
         * @method query
         * @param {Object} opt
         * @param {Number} opt.start
         * @param {Number} opt.total
         * @returns {{data:Array,length:Number}}
         */
        query: function (opt) {
            opt = opt || {};

            if (!this.select.get('isArray')) {
                return undef;
            }
            var start = opt.start,
                total = opt.total,
                tab = this.select.get('data'),
                startTab = this.select.get('start'),
                timestamp = this.select.get('timestamp'),
                now = (new Date()).getTime(),
                total2, i, gap , emptyArgs;
            if (tab === undef || startTab > start) {
                return {
                    data: new Array(total),
                    length: 0
                };
            }

            i = gap = start - startTab;
            total2 = gap + total;

            for (; i < total2; i++) {
                //use == to get undefined == null as true
                if (tab[i] == null || timestamp[i] < now - this.lifetime) {
                    break;
                }
            }

            if (i !== total2) {
                emptyArgs = [i, total2 - i].concat(new Array(total2 - i));
                tab.splice.apply(tab, emptyArgs);
                timestamp.splice.apply(timestamp, emptyArgs);
            }

            this.select.set({
                'data': tab,
                'timestamp': timestamp
            });


            return {
                'data': tab.slice(gap, total2),
                'length': i - gap
            };

        },
        /**
         * @method set
         * @param {Array|String|Object} key
         * @param {*} [value] if key is an array, value is the start index
         * @returns {com.sesamtv.core.engine.CacheManager.Operator}
         */
        set: function (key, value) {
            var now = new Date().getTime(), start, length, tab, tabTimestamp, j = 0, i, deb;
            if (key instanceof Array) {
                value = value || 0;
                start = this.select.get('start');
                length = this.length();
                tab = this.select.get('data') || [];
                tabTimestamp = this.select.get('timestamp') || [];
                if (start + length < value && (start + length) != 0) {
                    for (i = start + length; i < value; i++) {
                        tab[i] = undef;
                        tabTimestamp[i] = undef;
                        j++;
                    }
                }
                else if (!start) {
                    start = value;
                }
                j = 0;
                deb = ((start >= value) ? 0 : value);
                for (i = deb; i < (deb + key.length); i++) {
                    tab[i] = key[j];
                    tabTimestamp[i] = now;
                    j++;
                }
                if (start > value) {
                    start = value;
                }
                this.select.set({
                    data: tab,
                    timestamp: tabTimestamp,
                    isArray: true,
                    start: start
                });
            }
            else if (arguments.length === 1 && key instanceof Object) {
                for (i in key) {
                    key.hasOwnProperty(i) &&
                    this.select.set(i, key[i]).set(i + 'Timestamp', now);
                }
            }
            else {
                this.select.set(key, value).
                    set(key + 'Timestamp', now);
            }
            return this;
        },
        /**
         * @method splice
         * @param {Number} start
         * @param {Number} total
         */
        splice: function (start, total) {
            var tabTimestamp,
                tab = this.select.get('data') || [],
                now = new Date().getTime(),
                args2 = [],
                startTab = this.select.get('start'),
            //On passe par une variable temporaire car start est un pointeur vers arguments[0]
                startTmp = arguments[0], i, l;
            if (start > startTab) {
                arguments[0] = start;
            }
            else {
                var calc = arguments[1] + start - startTab;
                arguments[0] = 0;
                arguments[1] = calc;
            }
            tabTimestamp = this.select.get('timestamp') || [];
            for (i = 0, l = arguments.length; i < l; i++) {
                if (i <= 1) {
                    args2[i] = arguments[i];
                } else {
                    args2[i] = now;
                }
            }
            tab.splice.apply(tab, arguments);
            tabTimestamp.splice.apply(tabTimestamp, args2);
            start = Math.min(startTmp, startTab);
            this.select.set({
                data: tab,
                start: start,
                timestamp: tabTimestamp,
                isArray: true
            });
        },
        /**
         * @method remove
         * @param {String} key
         */
        remove: function (key) {
            this.select.remove(key);
            this.select.remove(key + 'Timestamp');
            return this;
        },
        /**
         * @method truncate
         */
        truncate: function () {
            this.select.truncate();
        },
        /**
         * @method length
         * @returns {Number}
         */
        length: function () {
            var collection = this.select.get();
            if (collection && collection.data) {
                return collection.data.length;
            }
            return 0;
        },
        /**
         * @method sync
         * @param {Array|Object} arr
         * @param {Object} obj
         */
        sync: function (arr, obj) {
            if (!(arr instanceof Array)) {
                arr = arr.items;
            }
            arr = arr.slice(0);
            var tab = this.select.get('data') || [];
            arr.unshift(obj.start, obj.total);

            tab.splice.apply(tab, arr);
            return this.set(tab);
        },
        /**
         * @method abort
         */
        abort: function () {
            //todo
        }
    });
    return new CacheManager();
});