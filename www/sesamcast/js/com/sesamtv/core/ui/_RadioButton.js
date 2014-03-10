define([
    '../util/Class',
    '../util/DomEvent',
    '../util/Dom',
    '../util/Array',
    './BaseView',
    'text!assets/common/template/_RadioButton.html'
], function (Class, domEvent, domHelper, arrayHelper, BaseView, radioTpl) {
    'use strict';
    /**
     *
     * @class com.sesamtv.core.ui._RadioButton
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} [node]
     */
    var _RadioButton = Class({
        extend: BaseView,
        buttonPropHandler: {
            label: function (btn, value) {
                return btn.querySelector('.label').innerHTML = value;
            },
            cls: function (btn, value, btnIdx) {
                btn.classList.remove(this.config.items[btnIdx].cls);
                btn.classList.add(value);
            }
        },
        constructor: function (args, node) {
            /**
             * @cfg {String} name
             */
            if (document.getElementsByName(args.name).length > 0) {
                throw new Error('radio button name conflict: ' + args.name);
            }
            args.hasChild = false;
            args.applyOnly = false;
            Class.applyIf(args, {
                templateStr: radioTpl,
                inputType: 'radio',
                /**
                 * @cfg {String} [theme='default']
                 */
                theme: 'default',
                /**
                 * @cfg {String} [labelPosition='before'] before or after
                 */
                labelPosition: 'before'
            });
            BaseView.call(this, args, node);
            this.attachEvents();
        },
        /**
         * usage:
         *
         *      this.setConfig('theme','new_theme_name');
         *
         * @method attachEvents
         */
        attachEvents: function () {
            this.on('config', function (v) {
                var k = '_' + v.key + 'Setter';
                if (this[k]) {
                    this[k](v);
                }
            });
        },
        /**
         * @method _themeSetter
         * @param {Object} opt
         * @param {String} opt.newValue
         * @param {String} opt.oldValue
         * @private
         */
        _themeSetter: function (opt) {
            var nodes = this.config.node.querySelectorAll('* > li > div'),i= 0,l=nodes.length, classList;
            for(;i<l;i++){
                classList = nodes[i].classList;
                classList.remove(opt.oldValue);
                classList.add(opt.newValue);
            }
        },
        /**
         * @method check
         * @param {Number|HTMLElement} idx
         * @fires checked
         */
        check: function (idx) {
            var node;
            if (typeof(idx) === 'number') {
                node = this.config.node.querySelectorAll('input')[idx];
                if (node) {
                    node.checked = true;
                    this.emit('checked', {
                        target: node
                    });
                }
            } else {
                if (this.config.node.contains(idx)) {
                    idx.checked = true;
                    this.emit('checked', {
                        target: idx
                    });
                }
            }
        },
        /**
         * @method setButton
         * @param {Object|String} opt
         * @param {String} opt.label
         * @param {String} opt.cls
         * @param {Number} btnIdx
         */
        setButton: function (opt, btnIdx) {
            var btn;
            opt = opt || {};
            if (btn = this.config.node.querySelectorAll('li')[btnIdx]) {
                return arrayHelper.forEach(opt, function (prop, i, key) {
                    if (this.buttonPropHandler[key]) {
                        this.buttonPropHandler[key].call(this, btn, prop, btnIdx);
                        this.config.items[btnIdx][key] = prop;
                    }
                }, this);
            }
            throw new Error('button not found at index ' + btnIdx);
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
            var self = this, realEvtName;
            if(this.domEvent){
                if (evtName === 'checked') {
                    realEvtName = 'click';
                }
                this.evts[realEvtName || evtName] = this.evts[realEvtName || evtName] ||
                    this.domEvent.on('input', realEvtName || evtName, function (evt) {
                        self.emit(realEvtName || evtName, evt);
                        if (realEvtName) {
                            self.emit(evtName, evt);
                        }
                    });
            }

            return BaseView.prototype.on.call(this, evtName, fnc);
        }
    });
    return _RadioButton;
});