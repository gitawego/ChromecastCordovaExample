define([
    '../util/Class',
    '../util/XHR',
    '../util/AdjustContentPaths',
    './BaseView',
    'text!assets/common/template/_Box.html'
], function (Class, xhr, adjustContentPaths, BaseView, boxTpl) {
    'use strict';
    /**
     * @class com.sesamtv.core.ui._Box
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} node
     */
    var _Box = Class({
        extend: BaseView,
        constructor: function (args, node) {
            args.hasChild = true;
            args.applyOnly = false;
            args.templateStr = boxTpl;
            Class.applyIf(args, {
                layout: null,
                /**
                 * @cfg {String} [tag='div']
                 */
                tag: 'div',
                /**
                 * @cfg {Boolean} [adjustPaths=false] if adjust html/css paths when set url
                 */
                adjustPaths: false
            });
            BaseView.call(this, args, node);
            /**
             * @cfg {HTMLElement} innerElement
             */
            this.config.innerElement = this.config.node.firstElementChild;
            if (this.config.url) {
                this._setUrl(url);
            }
            this.attachEvents();
        },
        /**
         * @method attachEvents
         */
        attachEvents: function () {
            this.on('config', function (v) {
                if (v.key === 'url') {
                    this._setUrl(v.newValue);
                }
            });
        },
        /**
         * @method _setUrl
         * @param {String} url
         * @param {Function} [callback]
         * @fires contentUpdated
         * @private
         */
        _setUrl: function (url, callback) {
            var self = this, regJson = /json/i;
            xhr.request(url).on('load',function (data, evt) {
                if (self.config.adjustPaths && !evt.getHeaders('content-type').match(regJson) && !url.match(regJson)) {
                    data = adjustContentPaths.adjust(data, url);
                }
                self.config.innerElement.innerHTML = data;
                self.emit('contentUpdated');
                callback && callback();
            }).send();
        },
        /**
         * @method addItem
         * @param {com.sesamtv.core.ui.BaseView} inst
         * @param {String|Number} pos
         * @returns {*}
         */
        addItem: function (inst, pos) {
            return this.itemList.addItem(inst, true, pos);
        },
        /**
         * @method removeItem
         * @param {Number|String|com.sesamtv.core.ui.BaseView} item
         */
        removeItem: function (item) {
            this.itemList.removeItem(item, true);
            return this;
        },
        destroy:function(){
            delete this.config.innerElement;
            BaseView.prototype.destroy.call(this);
        }
    });
    return _Box;
});