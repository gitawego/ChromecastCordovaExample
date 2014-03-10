/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true */
define([
    '../../Class',
    '../../CustomEvent',
    '../../Helper',
    '../../Promise',
    '../../has',
    '../Builder',
    '../../../ui/LazyLoadData'
], function (klass, CustomEvent, helper, promise, has, Builder, LazyLoadData) {
    'use strict';
    var slice = Array.prototype.slice,
        splice = Array.prototype.splice;
    /**
     * @class com.sesamtv.core.util.databinding.types.LazyLoad
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var LazyLoad = klass({
        extend: CustomEvent,
        constructor: function LazyLoadBType(opt, builder, binder) {
            var value = opt.data,
                self = this, paramsId,
                isSTB = !!navigator.userAgent.match(/\(Unknown; Linux.*?sba/),
                paramDataAttr = 'data-lazyloadData-params';
            paramsId = opt.node.getAttribute(paramDataAttr);
            opt.node.removeAttribute(paramDataAttr);
            this.gridParams = paramsId in binder.boundModel ? binder.boundModel[paramsId] : {};
            CustomEvent.call(this);
            klass.mixin(this, {
                /**
                 * @property node
                 * @type HTMLElement
                 */
                node: opt.node,
                /**
                 * @property bindInfo
                 * @type Object
                 */
                bindInfo: opt.key,
                /**
                 * @method set
                 * @param {*} v
                 */
                set: function (v) {
                    value = v;
                    if (typeof(value) === 'function') {
                        this.update();
                    } else {
                        this.lazyLoad(value);
                    }

                },
                /**
                 * @method get
                 * @returns {String}
                 */
                get: function () {
                    return value;
                },
                getItemData: function (node) {
                    var idx = node.getAttribute('data-index');
                    return this.grid.getItemData(+idx);
                },
                lazyLoad: function (args) {
                    args = args || {};
                    if (this.grid) {
                        return this.grid.reload({
                            totalResults: args.totalResults
                        });
                    }
                    this.grid = new LazyLoadData(helper.merge({
                        totalResults: args.totalResults || 500,
                        scrollAdapter: {
                            adapter: 'browser',
                            //scrollbar: "createTouch" in document && !isSTB && !has('androidTV'),
                            useTranslate: true
                        },
                        //data: data,
                        fetchItems: function (range, callback) {
                            var conf = {
                                range: range
                            };
                            value = opt.data.call(builder.model, range);
                            if (builder.isPromise(value)) {
                                value.then(function (v) {
                                    //value = v;
                                    if (v instanceof Array) {
                                        conf.items = v;
                                    } else {
                                        klass.mixin(conf, v);
                                    }
                                    callback(null, conf);
                                });
                            } else {
                                if (value instanceof Array) {
                                    conf.items = value;
                                } else {
                                    klass.mixin(conf, value);
                                }
                                callback(null, conf);
                            }
                        }
                    }, this.gridParams), opt.node);
                    this.grid.render();
                }
            });
            if (typeof(value) === 'function') {
                /**
                 * @method update
                 */
                this.update = function (args) {

                    //value = opt.data.call(builder.model, args);
                    self.lazyLoad(args);
                };
            }

        }

    });
    Builder.addBindingType('lazyloadData', LazyLoad);
    return LazyLoad;
});