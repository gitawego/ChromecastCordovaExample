define([
    '../util/Class',
    '../util/DomEvent',
    '../util/Dom',
    './BaseView',
    'text!assets/common/template/_TextArea.html'
], function (Class, domEvent, domHelper, BaseView, textAreaTpl) {
    'use strict';
    /**
     *
     * @class com.sesamtv.core.ui._TextArea
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} [node]
     */
    var _TextArea = Class({
        extend: BaseView,
        constructor: function (args, node) {
            if (!args.prop) {
                args.prop = {};
            }
            args.hasChild = false;
            args.applyOnly = false;
            Class.applyIf(args, {
                templateStr: textAreaTpl,
                /**
                 * @cfg {String} [theme='default']
                 */
                theme: 'default',
                labelPosition: 'before'
            });
            BaseView.call(this, args, node);
            this.config.textarea = this.config.node.querySelector('textarea');
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
                this.evts[evtName] = this.evts[evtName] || this.domEvent.on('textarea', evtName, function (evt) {
                    self.emit(evtName, evt);
                });
            }
            return BaseView.prototype.on.call(this, evtName, fnc);
        },
        prop: function (key, value) {
            var attrNoValue = ['disabled','required'];
            if (arguments.length === 1) {
                return this.config.textarea[key];
            }
            if(attrNoValue.indexOf(key)!== -1 && value === false){
                this.config.textarea.removeAttribute(key);
            }else
            if(key === 'value'){
                this.config.textarea[key] = value;
            }else{
                this.config.textarea.setAttribute(key, value);
            }
            this.config.prop[key] = value;
        },
        remove: function (key) {
            this.config.textarea.removeAttribute(key);
            delete this.config.prop[key];
        },
        destroy:function(){
            delete this.config.textarea;
            BaseView.prototype.destroy.call(this);
        }
    });
    return _TextArea;
});