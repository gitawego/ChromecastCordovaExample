define([
    '../util/Class',
    '../util/DomEvent',
    '../util/Dom',
    './BaseView',
    'text!assets/common/template/_CheckBox.html'
], function (Class, domEvent, domHelper, BaseView, checkboxTpl) {
    'use strict';
    /**
     * @class com.sesamtv.core.ui._CheckBox
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} [node]
     */
    var _CheckBox = Class({
        extend: BaseView,
        constructor: function (args, node) {
            /**
             * @cfg {String} id
             */
            if (!!document.getElementById(args.id)) {
                throw new Error('checkbox ID conflict: ' + args.id);
            }
            args.hasChild = false;
            args.applyOnly = false;

            Class.applyIf(args, {
                templateStr: checkboxTpl,
                inputType: 'checkbox',
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
            this.config.inputEl = this.config.node.querySelector('input');

        },
        /**
         * usage:
         *
         *      this.setConfig('checked',true);
         *      this.setConfig('label','new label');
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
         * @method check
         * @param {Boolean} [checked]
         * @private
         * @fires checked
         * @fires unchecked
         */
        check: function (checked) {
            this.config.inputEl.checked = checked;
            this.emit(checked ? 'checked' : 'unchecked', {
                target: this.config.inputEl
            });
        },
        /**
         * @method _labelSetter
         * @param {Object} opt
         * @private
         */
        _labelSetter: function (opt) {
            this.config.node.querySelector('.label').innerHTML = opt.newValue;
        },
        /**
         * @method _themeSetter
         * @param {Object} opt
         * @param {String} opt.newValue
         * @param {String} opt.oldValue
         * @private
         */
        _themeSetter: function (opt) {
            var classList = this.config.node.querySelector('div').classList;
            classList.remove(opt.oldValue);
            classList.add(opt.newValue);
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
        postCreate: function (input) {
            var self = this;
            this.domEvent = domEvent(input);
            /**
             * @event checked
             */
            /**
             * @event unchecked
             */
            this.connect.push(this.domEvent.on('input', 'click', function (evt) {
                self.emit(this.checked ? 'checked' : 'unchecked', evt);
            }));
        },
        on: function (evtName, fnc) {
            var self = this, realEvtName, evts = ['unchecked', 'checked'];
            if (this.domEvent) {
                if (evts.indexOf(evtName) !== -1) {
                    realEvtName = 'click';
                }
                this.evts[realEvtName || evtName] = this.evts[realEvtName || evtName] ||
                    this.domEvent.on('input', realEvtName || evtName, function (evt) {
                        self.emit(realEvtName || evtName, evt);
                        if (realEvtName) {
                            self.emit(evts[+this.checked], evt);
                        }
                    });
            }

            return BaseView.prototype.on.call(this, evtName, fnc);
        },
        destroy: function () {
            delete this.config.inputEl;
            BaseView.prototype.destroy.call(this);
        }
    });
    return _CheckBox;
});