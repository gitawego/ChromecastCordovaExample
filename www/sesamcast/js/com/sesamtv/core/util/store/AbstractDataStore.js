define([
    '../Class',
    '../CustomEvent',
    './SimpleQueryEngine',
    '../Helper'
], function (Class, CustomEvent, SimpleQueryEngine, helper) {
    "use strict";
    var history = [];
    /**
     * @class com.sesamtv.core.util.store.AbstractDataStore
     * @extends com.sesamtv.core.util.CustomEvent
     * @requires com.sesamtv.core.util.store.SimpleQueryEngine
     * @requires com.sesamtv.core.util.Helper
     * @abstract
     * @cfg {Object} config
     * @cfg {Object|Array} config.data
     * @cfg {Object.<String,Object>} config.rules ex: 'items':{unique:true}
     * @cfg {Number} config.maxHistory
     */
    var AbstractDataStore = Class({
        extend: CustomEvent,
        constructor: function (config) {
            CustomEvent.call(this);
            this.maxHistory = 10;
            Class.mixin(this, config || {});
            this.queryEngine = SimpleQueryEngine;
        },
        get: function (key) {
            return this[key];
        },
        set: function (key, value) {
            var old = this[key];
            this[key] = value;
            this.emit('key', {
                oldValue: old,
                newValue: this[key]
            });
        },
        /**
         * query from data
         *      query({id:1},'level1.level2',{start:0,count:12});
         *      //it will search items in this.data['level1']['level2']
         * @method query
         * @param {Object} q query criteria
         * @param {String} [context] ex: level1.level2
         * @param {Object} [opt] options to query
         */
        query: function (q, context, opt) {
            return this.queryEngine(q, opt)(!context ? this.data : this._getScope(context));
        },
        /**
         * @method _getScope
         * @param {String} context
         * @param {Boolean} [create] if create the empty namespace based on context
         * @return {Object}
         * @private
         */
        _getScope: function (context, create) {
            var scope = context ? helper.getObject(context, create, this.data) : this.data;
            if (!scope) {
                throw new Error('context ' + context + 'not found');
            }
            return scope;
        },
        /**
         * @method _addHistory
         * @param {Object} h
         * @private
         */
        _addHistory: function (h) {
            if (history.length == this.maxHistory) {
                history.shift();
            }
            history.push(h);
            this.emit(h.action, h);
        },
        /**
         * @method update
         */
        update: function (crit, replacement, context, opt) {
            var scope = this._getScope(context);
            this.query(crit, context, opt).forEach(function (item) {
                var idx = scope.indexOf(item), itm = JSON.stringify(item);
                helper.mixin(item, replacement);
                this._addHistory({
                    action: 'update',
                    context: context,
                    index: idx,
                    record: itm,
                    replacement: JSON.stringify(replacement)
                });
            }, this);
            return this;
        },
        /**
         * @method del
         * @param crit
         * @param context
         * @param opt
         * @return {boolean}
         */
        del: function (crit, context, opt) {
            var res = this.query(crit, context, opt),
                scope = this._getScope(context);
            if (!res.length) {
                return false;
            }
            res.forEach(function (d) {
                this._addHistory({
                    action: 'del',
                    context: context,
                    index: scope.indexOf(d),
                    record: JSON.stringify(d)
                });
                scope.splice(scope.indexOf(d), 1);
            }, this);
            return true;
        },
        /**
         * @method add
         * @param {Object} item
         * @param {String} [context]
         * @param {String} [identifier]
         * @return {*}
         */
        add: function (item, context, identifier) {
            var scope = this._getScope(context), queryCrit,
                h = {
                    action: 'add',
                    context: context,
                    record: item
                };
            if (identifier) {
                queryCrit = {};
                queryCrit[identifier] = item[identifier];
            } else {
                queryCrit = item;
            }
            if (helper.isType('Array')(scope)) {
                if (this.query(queryCrit, context).length && this.rules[context].unique) {
                    throw new Error('unique index conflict: record has already existed');
                }
                h.index = scope.push(item) - 1;
            } else {
                throw new Error('add to an object is not supported');
            }
            this._addHistory(h);
            return this;
        },
        /**
         * revert to previous step
         * @method revert
         * @return {boolean}
         */
        revert: function () {
            if (!history.length) {
                return false;
            }
            var prevStep = history[history.length - 1],
                scope = this._getScope(prevStep.context, true);
            switch (prevStep.action) {
                case 'add':
                    scope.splice(prevStep.index, 1);
                    break;
                case 'del':
                case 'update':
                    scope.splice(prevStep.index, 1, JSON.parse(prevStep.record));
                    break;
            }
            this.emit('revert', prevStep);
            history.pop();
            return true;
        },
        /**
         * @method sync
         * @abstract
         */
        sync: function () {
        },
        /**
         * save to local
         * @method save
         * @abstract
         */
        save: function () {
        }
    });
    return AbstractDataStore;
});