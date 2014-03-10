define([
    '../util/Class',
    '../util/DomEvent',
    '../util/Dom',
    '../util/Array',
    './BaseView',
    'bower_components/blueimp-tmpl/js/tmpl',
    'text!assets/common/template/_Button.html'
], function (Class, domEvent, domHelper, arrayHelper, BaseView, tmpl, btnTpl) {
    'use strict';
    /**
     * preset button themes: default, blue, orange, green, red
     *
     *      //it will replace target node by the button
     *      var btn = new _Button({
     *          items:[{label:'button1'},'caret'],
     *          theme:'orange'
     *      },node);
     *
     *      //create a btn handler, then attach to a node
     *      var btn1 = new _Button({
     *          items:[{label:'button1'},{label:'button2'}]
     *      });
     *      //replace node
     *      btn1.attachTo(node);
     *      //or append to the node
     *      btn1.attacTo(node,true);
     *
     *      //create a btn, and append to the container
     *      var btn2 = new _Button({
     *          items:[{label:'button1',cls:'btn1Style'}],
     *          theme:'blue',
     *          container:document.body
     *      });
     *
     * @class com.sesamtv.core.ui._Button
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} [node]
     */
    var _Button = Class({
        extend: BaseView,
        buttonPropHandler: {
            label: function (btn, value) {
                return btn.innerHTML = value;
            },
            cls: function (btn, value, btnIdx) {
                btn.classList.remove(this.config.items[btnIdx].cls);
                btn.classList.add(value);
            },
            icon: function (btn, value, btnIdx) {
                var icon = btn.querySelector('span');
                icon.classList.remove(this.config.items[btnIdx]);
                icon.classList.add(value);
            }
        },
        constructor: function (args, node) {
            args.hasChild = false;
            args.templateStr = btnTpl;
            args.applyOnly = false;
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
         * @method setButton
         * @param {Object|String} opt
         * @param {String} opt.label
         * @param {String} opt.cls
         * @param {Number} btnIdx
         */
        setButton: function (opt, btnIdx) {
            var btn;
            opt = opt || {};
            if (btn = this.config.node.querySelectorAll('button')[btnIdx]) {
                if (typeof(opt) === 'string') {
                    if (this.buttonPropHandler[key]) {
                        this.buttonPropHandler[key].call(this, btn, opt, btnIdx);
                        this.config.items[btnIdx] = opt;
                    }
                    return;
                }
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
         * @method postCreate
         */
        postCreate: function (btn) {
            var self = this;
            this.domEvent = domEvent(btn);
            this.connect.push(this.domEvent.on('button', 'click', function (evt) {
                self.emit('click', evt);
            }));
        }
    });
    return _Button;
});