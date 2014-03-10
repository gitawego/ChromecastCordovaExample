define([
    '../util/Class',
    '../util/DomEvent',
    '../util/Dom',
    '../util/Array',
    './BaseView',
    'text!assets/common/template/_TextBox.html',
    '../util/has',
    '../util/RegEx',
    '../util/hasFeature/html5'
], function (Class, domEvent, domHelper, arrayHelper, BaseView, textTpl, has, regEx) {
    'use strict';
    /**
     *
     * @class com.sesamtv.core.ui._TextBox
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} [node]
     */
    var _TextBox = Class({
        extend: BaseView,
        constructor: function (args, node) {
            if (!args.prop) {
                args.prop = {};
            }
            /**
             * @cfg {String} id
             */
            /**
             * @cfg {String} name
             */
            /**
             * @cfg {String} placeholder
             */

            args.hasChild = false;
            args.applyOnly = false;
            Class.applyIf(args, {
                handlers: {},
                templateStr: textTpl,
                /**
                 * @cfg {String} [theme='default']
                 */
                theme: 'default'
            });
            Class.applyIf(args.prop, {
                /**
                 * @cfg {String} [type='text'] text,password,number,email,date
                 */
                type: 'text'
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
            arrayHelper.forEach(this.config.prop, function (prop, i, key) {
                this.builder(key, prop);
            }, this);

        },
        on: function (evtName, fnc) {
            var self = this;
            if (this.domEvent) {
                this.evts[evtName] = this.evts[evtName] || this.domEvent.on(evtName, function (evt) {
                    self.emit(evtName, evt);
                });
            }
            return BaseView.prototype.on.call(this, evtName, fnc);
        },
        builder: function (key, value) {
            if (key in builder) {
                if (key in this.config.handlers) {
                    throw new Error('handler conflict: ' + key);
                }
                this.config.handlers[key] = builder[key].call(this, value);
            }
        },
        prop: function (key, value) {
            var attrNoValue = ['disabled', 'required','checked'];
            if (arguments.length === 1) {
                return this.config.node[key];
            }
            if (this.config.handlers[key]) {
                this.config.handlers[key].destroy();
                delete this.config.handlers[key];
            }
            if (attrNoValue.indexOf(key) !== -1 && value === false) {
                this.config.node.removeAttribute(key);
            } else {
                this.config.node.setAttribute(key, value);
            }

            this.config.prop[key] = value;
            this.builder(key, value);
        },
        remove: function (key) {
            if (this.config.handlers[key]) {
                this.config.handlers[key].destroy();
                delete this.config.handlers[key];
            }
            this.config.node.removeAttribute(key);
            delete this.config.prop[key];
        }
    });
    var builder = {
        "placeholder": function (value) {
            var self = this, connect = [];
            this.placeholder = false;
            if (has('input-placeholder')) {
                return;
            }
            self.placeholder = true;
            if (this.config.node.value != '') {
                this.config.node.value = value;
                this.config.node.classList.add('placeholder');
            }
            connect.push(this.domEvent.on('focus', function (e) {
                this.classList.remove('placeholder');
                if (self.placeholder) {
                    this.value = '';
                }
            }));
            connect.push(this.domEvent.on('change', function () {
                self.placeholder = false;
                this.classList.remove('placeholder');
            }));
            connect.push(this.domEvent.on('blur', function () {
                if (this.value == '') {
                    self.placeholder = true;
                }
                if (self.placeholder) {
                    this.value = value;
                    this.classList.add('placeholder');
                }
            }));
            return {
                destroy: function () {
                    connect.forEach(function (c) {
                        c.remove();
                    });
                    connect.length = 0;
                    delete self.placeholder;
                    self.config.node.classList.remove('placeholder');
                }
            }

        },
        "required": function () {
            if (has('input-required')) {
                return;
            }
            var self = this, connect = [];
            this.config.node.classList.add('required');
            connect.push(this.domEvent.on('blur', function () {
                setTimeout(function () {
                    if (self.placeholder) {
                        return self.config.node.classList.add('warning');
                    }
                    self.config.node.classList[self.config.node.value == '' ? 'add' : 'remove']('warning');
                }, 0);
            }));
            return {
                destroy: function () {
                    connect.forEach(function (c) {
                        c.remove();
                    });
                    connect.length = 0;
                    self.config.node.classList.remove('required');
                    self.config.node.classList.remove('warning');
                }
            }
        },
        "autofocus": function () {
            var self = this;
            if (has('input-autofocus')) {
                return;
            }
            setTimeout(function () {
                self.config.node.focus();
            }, 0);
        },
        "type": function (type) {
            var node = this.config.node,
                self = this,
                handleTypes = {
                    text: function (value) {
                        if (!pattern) {
                            node.classList.remove('invalid');
                            return;
                        }
                        node.classList[value.match(pattern) ? 'remove' : 'add']('invalid');

                    },
                    number: function (value) {
                        pattern = regEx[step === 'any' ? 'anyNumber' : 'number'];
                        node.classList[value.match(pattern) ? 'remove' : 'add']('invalid');
                    }
                },
                pattern = node.getAttribute('pattern'),
                step = node.getAttribute('step'),
                connect = [];
            if (has('input-type' + type) && has('input-pattern') && has('input-step')) {
                return;
            }
            if (!(type in handleTypes)) {
                return;
            }
            if (pattern) {
                pattern = new RegExp(pattern);
            }
            connect.push(this.domEvent.on('change', function () {
                setTimeout(function () {
                    if (self.placeholder || node.value == '') {
                        node.classList.remove('invalid');
                        return;
                    }
                    handleTypes[type](node.value);
                }, 0);
            }));
        }
    };
    return _TextBox;
});