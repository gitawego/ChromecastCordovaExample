define([
    './Class',
    './CustomEvent'
], function (Class, CustomEvent) {
    var regExp = {
            ref: /\$ref:([\w.].*)/g
        }, glb = typeof(global) === 'undefined' ? window : global,
        undef = {}.undef;

    function refParser(str, shore, opt) {
        str = str.replace(regExp.ref, function (ignore, ref) {
            var k, target;
            ref = ref.trim().split('.');
            k = ref.shift();
            target = shore.select(k === '$' ? opt.collectionName : k)[opt.type];
            if (!target) {
                return ignore;
            }
            target = target.get();
            if (target === undef) {
                return ignore;
            }
            while (k = ref.shift()) {
                target = target[k];
            }
            return JSON.stringify(target);
        });
        return JSON.parse(str);
    }

    function fromJson(str, shore, opt) {
        return JSON.parse(str, function (key, value) {
            if (typeof(value) === 'string') {
                return value.match(regExp.ref) ? (function (v) {
                    var handler = function () {
                        return refParser(v, shore, opt);
                    };
                    handler.ref = value;
                    return handler;
                })(value) : value;
            } else {
                return value;
            }
        });
    }

    function toJson(obj) {
        return JSON.stringify(obj, function (key, value) {
            if (typeof(value) === 'function') {
                return 'ref' in value ? value.ref : value;
            } else {
                return value;
            }
        })
    }

    /**
     * @class com.sesamtv.core.util.Storage
     * @singleton
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var Storage = Class({
        extend: CustomEvent,
        constructor: function () {
            CustomEvent.call(this);
            if (!('localStorage' in window)) {
                throw new Error('localStorage is not available');
            }
        },
        /**
         * select a collection
         *
         *      Storage.select('mycollection').local.set('id','toto');
         *      Storage.select('mycollection').local.set('name','myname');
         *      Storage.select('mycollection').local.truncate();
         *      //parse reference on demande
         *      var myCollect = Storage.select('mycollect');
         *      var data = myCollect.get('data');
         *      //if data.a is a function, it's a reference, execute this function to get the data
         *      var valueA = data.a();
         *      data.b = 'valueb';
         *      //return to reference: function data.a will be converted back to reference string
         *      myCollect.set('data',data);
         *
         * @method select
         * @param {String} collectionName
         * @return {Object}
         */
        select: function (collectionName) {
            var self = this, obj = {};
            Object.defineProperties(obj, {
                local: {
                    get: function () {
                        return new Operator({
                            parent: self,
                            type: 'local',
                            storageType: 'localStorage',
                            collectionName: collectionName
                        });
                    }
                },
                session: {
                    get: function () {
                        return new Operator({
                            parent: self,
                            type: 'session',
                            storageType: 'sessionStorage',
                            collectionName: collectionName
                        });
                    }
                }
            });
            return obj;
            /* return {
             get local() {
             return new Operator({
             parent: self,
             type:'local',
             storageType: 'localStorage',
             collectionName: collectionName
             });
             },
             get session() {
             return new Operator({
             parent: self,
             type:'session',
             storageType: 'sessionStorage',
             collectionName: collectionName
             });
             }
             };*/
        }
    });
    /**
     * @class com.sesamtv.core.util.Storage.Operator
     * @cfg {Object} args
     * @cfg {String} args.storageType
     * @cfg {String} args.collectionName
     * @cfg {Object} args.parent
     * @cfg {String} args.type
     */
    var Operator = Class({
        constructor: function (args) {
            Class.mixin(this, args);
        },
        /**
         * @method get
         * @param {String} key
         * @returns {*}
         */
        get: function (key) {
            var collection = glb[this.storageType].getItem(this.collectionName);
            if (!collection) {
                return;
            }
            collection = fromJson(collection, this.parent, {
                collectionName: this.collectionName,
                type: this.type
            });
            return key ? collection[key] : collection;
        },
        /**
         * @method set
         * @param {String|Object} key
         * @param {*} [value]
         */
        set: function (key, value) {
            var collectValue = {}, params = {
                type: this.storageType,
                collection: this.collectionName,
                action: 'set'
            }, self = this;

            function _set(key, value, collectValue) {
                var collection = glb[self.storageType].getItem(self.collectionName) || '{}', oldV;
                collection = JSON.parse(collection);
                oldV = collection[key];
                collection[key] = value;
                glb[self.storageType].setItem(self.collectionName, toJson(collection));

                collectValue[key] = {
                    oldValue: oldV,
                    newValue: value
                };
            }

            if (arguments.length === 1) {
                var keys = Object.keys(key), i = 0, l = keys.length, k;
                for (; i < l; i++) {
                    k = keys[i];
                    _set(k, key[k], collectValue);
                }
                params.values = collectValue;
            } else {
                _set(key, value, collectValue);
                params.key = key;
                params.values = collectValue[key];
            }

            this.parent.emit('storage', params);
            return this;
        },
        /**
         * @method remove
         * @param {String} key
         */
        remove: function (key) {
            var collection = glb[this.storageType].getItem(this.collectionName) || '{}';
            collection = JSON.parse(collection);
            delete collection[key];
            glb[this.storageType].setItem(this.collectionName, toJson(collection));
            this.parent.emit('storage', {
                type: this.storageType,
                collection: this.collectionName,
                action: 'remove',
                key: key
            });
        },
        /**
         * truncate collection
         * @method truncate
         */
        truncate: function () {
            glb[this.storageType].removeItem(this.collectionName);
            this.parent.emit('storage', {
                type: this.storageType,
                collection: this.collectionName,
                action: 'truncate'
            });
        }
    });
    return new Storage();
});
