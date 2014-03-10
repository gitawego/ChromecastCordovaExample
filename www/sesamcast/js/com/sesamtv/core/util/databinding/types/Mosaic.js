/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true */
define([
    '../../Class',
    '../../CustomEvent',
    '../../Helper',
    '../../has',
    '../Builder',
    '../../../ui/SimpleDataGrid'
], function (klass, CustomEvent, helper, has, Builder, SimpleDataGrid) {
    'use strict';
    var slice = Array.prototype.slice,
        splice = Array.prototype.splice;
    /**
     * @class com.sesamtv.core.util.databinding.types.Mosaic
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var Mosaic = klass({
        extend: CustomEvent,
        constructor: function MosaicBType(opt, builder, binder) {
            var value = opt.data,
                self = this, paramsId,
                isSTB = !!navigator.userAgent.match(/\(Unknown; Linux.*?sba/),
                paramDataAttr = 'data-mosaic-params';
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
                        this.mosaic(value);
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
                mosaic: function (args) {
                    args = args || {};
                    if (this.grid) {
                        return this.grid.reload({
                            totalResults:args.totalResults
                        });
                    }
                    this.grid = new SimpleDataGrid(helper.merge({
                        totalResults: args.totalResults || 24,
                        itemTag: 'figure',
                        scrollAdapter: {
                            adapter: 'browser',
                            scrollbar: "createTouch" in document && !isSTB && !has('androidTV'),
                            useTranslate: true
                        },
                        //data: data,
                        fetchItems: function (args) {
                            var p = {}, conf = {
                                range: args.range
                            };
                            p['max-results'] = args.range[1] - args.range[0] + 1;
                            p['start-index'] = args.range[0] + 1;

                            value = opt.data.call(builder.model, p);
                            if (builder.isPromise(value)) {
                                value.then(function (v) {
                                    //value = v;
                                    if (v instanceof Array) {
                                        conf.items = v;
                                    } else {
                                        klass.mixin(conf, v);
                                    }
                                    args.callback(null, conf);
                                });
                            } else {
                                if (value instanceof Array) {
                                    conf.items = value;
                                } else {
                                    klass.mixin(conf, value);
                                }
                                args.callback(null, conf);
                            }
                        },
                        itemTemplate: '<div class="cellInner" style="background-image:url(${thumbnail});" ><div class="glass"><figcaption class="cellTitle">${title}</figcaption></div></div>'

                    }, this.gridParams), opt.node);
                }
            });
            if (typeof(value) === 'function') {
                /**
                 * @method update
                 */
                this.update = function (args) {

                    //value = opt.data.call(builder.model, args);
                    self.mosaic(args);
                };
            }

        }

    });
    //return Mosaic;
    Builder.addBindingType('mosaic', Mosaic);
    return Mosaic;
});