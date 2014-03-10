define([
    '../util/Class',
    '../util/DomEvent',
    '../util/Dom',
    './BaseView',
    'text!assets/common/template/_Image.html'
], function (Class, domEvent, domHelper, BaseView, imgTpl) {
    'use strict';
    /**
     *
     * @class com.sesamtv.core.ui._Image
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} [node]
     */
    var _Image = Class({
        extend: BaseView,
        constructor: function (args, node) {
            args.hasChild = false;
            args.applyOnly = false;
            Class.applyIf(args, {
                templateStr: imgTpl,
                tmplHelper: {
                    buildProps: function (props) {
                        var str = "", keys = Object.keys(props), l = keys.length, i = 0, key;
                        for (; i < l; i++) {
                            key = keys[i];
                            str += key + "=\"" + props[key] + "\" ";
                        }
                        return str;
                    }
                },
                /**
                 * @cfg {String} [theme='default']
                 */
                theme: 'default'
            });
            BaseView.call(this, args, node);
        },
        /**
         * @method detach
         * @param {Boolean} [keepNode] if keep the created button node
         */
        detach: function (keepNode) {
            BaseView.prototype.detach.call(this, keepNode);
            this.domEvent = null;
            return this;
        },
        /**
         * @method postCreate
         */
        postCreate: function (btn) {
            this.domEvent = domEvent(btn);
        },
        on: function (evtName, fnc) {
            var self = this;
            if (this.domEvent) {
                this.evts[evtName] = this.evts[evtName] || this.domEvent.on(evtName, function (evt) {
                    self.emit(evtName, evt);
                });
            }
            return BaseView.prototype.on.call(this, evtName, fnc);
        }
    });
    return _Image;
});