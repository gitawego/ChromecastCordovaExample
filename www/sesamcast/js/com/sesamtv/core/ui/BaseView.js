define([
    '../util/Class',
    '../util/BaseEvented',
    './ItemList',
    '../util/Dom',
    'bower_components/blueimp-tmpl/js/tmpl',
    '../util/polyfill'
], function (Class, BaseEvented, ItemList, domHelper, tmpl) {
    "use strict";
    var protectedAttrs = ['addChild', 'set', 'get', 'create', 'destroy', '_addProtectedAttribute',
            'style', 'resize', 'on', 'off', 'once', 'focus', 'blur'],
        cmpList = new WeakMap(),
        addCmp = function (cmp) {
            if (cmpList.has(cmp.config.node)) {
                if (cmpList.get(cmp.config.node) !== cmp) {
                    throw new Error('component id ' + cmp.id + ' conflict');
                }
                return;
            }
            cmpList.set(cmp.config.node, cmp);
        };
    /**
     * @class com.sesamtv.core.ui.BaseView
     * @extends com.sesamtv.core.util.BaseEvented
     * @constructor
     * @param {Object} args
     * @param {String|HTMLElement} node
     */
    var BaseView = Class({
        extend: BaseEvented,
        constructor: function (args, node) {
            this.config = Class.mixin({
                /**
                 * @cfg {String} baseClass
                 */
                baseClass: '',
                /**
                 * @cfg {String} [itemSelector='div'] css selector for child item
                 */
                itemSelector: 'div',
                /**
                 * @cfg {String} [type='view'] view type
                 */
                type: 'view',
                container: null,
                node: node,
                animation: '',
                /**
                 * @cfg {Function} importCmp component class to be instantiated for each child item
                 */
                importCmp: BaseView,
                isCmpIdOwner: false,
                id: null,
                /**
                 * @cfg {String} templateStr
                 */
                templateStr: '',
                /**
                 * @cfg {Boolean} [applyOnly=true] whether trying to create the node
                 */
                applyOnly: true,
                /**
                 * @cfg {Boolean} [autoImport=true] import automatically the child items
                 */
                autoImport: true,
                createPosMapping: {
                    last: function (node, nodeInDom) {
                        return node.appendChild(nodeInDom);
                    },
                    first: function (node, nodeInDom) {
                        node.insertBefore(nodeInDom, node.firstElementChild);
                    },
                    idx: function (node, nodeInDom, pos) {
                        node.insertBefore(nodeInDom, node.children[pos]);
                    }
                }
            }, this.config || {});

            BaseEvented.call(this);

            args && Class.mixin(this.config, args);

            /**
             * @property _uuid
             * @type {string}
             * @private
             */
            this._uuid = '#cmp:' + (+new Date() + Math.floor(Math.random() * 100));

            this.on('animation', function (obj) {
                this.config.node.setAttribute('data-cmp-animation', obj.newValue || '');
            });
            if (this.config.hasChild) {
                /**
                 * @property itemList
                 * @type {com.sesamtv.core.ui.ItemList}
                 */
                this.itemList = new ItemList(this);
            }
            if (node) {
                return this.attachTo(node);
            }
            if (this.config.applyOnly) {
                delete this.create;
                delete this.postCreate;
                return;
            }
            if (this.config.container) {
                if (typeof(this.config.container) === 'string') {
                    this.config.container = document.querySelector(this.config.container);
                }
                this.attachTo(this.config.container, true);
            }
        },
        /**
         * add a protected attribute to avoid been overwritten by set method.
         * @method _addProtectedAttribute
         * @param {String} key
         * @private
         */
        _addProtectedAttribute: function (key) {
            protectedAttrs.push(key);
        },
        /**
         * @method create
         * @param {HTMLElement} node
         * @param {Boolean} [replace]
         * @param {String|Number} [pos] first, last, or an index
         * @returns {HTMLElement}
         */
        create: function (node, replace, pos) {
            var createPosMapping = this.config.createPosMapping, frag, nodeInDom, clsNames;
            if (typeof(pos) === 'undefined') {
                pos = 'last';
            }
            node = node || this.config.node;
            if (!this.config.parsedTpl) {
                this.config.parsedTpl = tmpl(this.config.templateStr, this.config);
            }
            frag = document.createElement('div');
            frag.innerHTML = this.config.parsedTpl;
            nodeInDom = frag.firstElementChild;
            node.className.split(" ").forEach(function(cls){
                cls = cls.trim();
                if(cls){
                    nodeInDom.classList.add(cls);
                }
            });

            if (replace) {
                domHelper.replace(node, nodeInDom);
            } else {
                (createPosMapping[pos] || createPosMapping['idx'])(node, nodeInDom, +pos);
            }
            return nodeInDom;
        },
        postCreate: function (node) {

        },
        /**
         * @method attachTo
         * @param {String|HTMLElement} node id or dom node
         * @param {Boolean} [append] append or replace
         * @param {String|Number} [pos] 'first', 'last' or index number
         */
        attachTo: function (node, append, pos) {
            if (!this.config.applyOnly) {
                node = this.create(node, !append, pos);
            }
            /**
             * @property node
             * @type {HTMLElement}
             */
            this.config.node = node = typeof(node) != 'string' ? node : document.getElementById(node);
            if (this.config.style) {
                this.style(this.config.style);
            }
            if (this.config.size && typeof(this.config.size) === 'object') {
                var _mapping = {
                    w: 'width',
                    h: 'height'
                };
                Object.keys(this.config.size).forEach(function (k) {
                    node.style[_mapping[k] || k] = this.config.size[k] + 'px';
                }, this);
            }
            this.config.id = node.id || this._uuid;
            if (!cmpList.has(node)) {
                this.config.isCmpIdOwner = true;
                addCmp(this);
                this.config.baseClass && node.classList.add(this.config.baseClass);
                node.setAttribute('data-cmp-id', this.config.id);
                node.setAttribute('data-cmp-type', this.config.type);
                node.setAttribute("data-cmp-animation", this.config.animation || '');
            }
            if (this.itemList && this.config.autoImport) {
                this.itemList.importItems();
            }
            this.postCreate(this.config.node);
            return this;
        },
        /**
         * detach component from dom node
         * @method detach
         * @param {Boolean} [keepNode]
         */
        detach: function (keepNode) {
            var node = this.config.node;

            if (this.config.isCmpIdOwner) {
                cmpList.delete(node);
                node.removeAttribute('data-cmp-id');
                node.removeAttribute('data-cmp-type');
                node.removeAttribute('data-cmp-animation');
                this.config.baseClass && node.classList.remove(this.config.baseClass);
            }
            this.connect.forEach(function (connect) {
                connect.remove();
            });
            this.connect.length = 0;
            this.itemList && (this.itemList.items.length = 0);
            if (!this.config.applyOnly && !keepNode) {
                node.parentNode.removeChild(node);
                delete this.config.node;
            }
            return this;
        },
        destroy: function () {
            this.detach();
        },
        destroyRecursive: function () {
            this.itemList && this.itemList.items.forEach(function (item) {
                item.destroyRecursive && item.destroyRecursive();
            });
            this.destroy();
        },
        render: function () {
            //console.error('not implemented!');
        },
        /**
         * @event focus
         */
        focus: function () {
            this.config.node.classList.add('focus');
            this.config.node.focus();
            this.emit('focus');
            return this;
        },
        /**
         * @event blur
         */
        blur: function () {
            this.config.node.classList.remove('focus');
            this.config.node.blur();
            this.emit('blur');
            return this;
        },
        /**
         * @event select
         */
        select: function () {
            this.config.node.classList.add('selected');
            this.config.node.focus();
            this.emit('selected');
            return this;
        },
        /**
         * @event unselect
         */
        unselect: function () {
            this.config.node.classList.remove('selected');
            this.config.node.blur();
            this.emit('unselected');
            return this;
        },
        isFocused: function () {
            return this.config.node.classList.contains('focus');
        },
        isVisible: function () {
            return !this.config.node.classList.contains('hidden') && this.config.node.style.display !== 'none';
        },
        getCmp: function (id) {
            return cmpList.get(document.querySelector('*[data-cmp-id="' + id + '"]'));
        },
        removeFromCmpList: function (id) {
            cmpList.delete(document.querySelector('*[data-cmp-id="' + id + '"]'));
        },
        /**
         * @method style
         * @param {String|Object} style
         */
        style: function (style) {
            if (typeof(style) == 'string') {
                var old = this.config.node.getAttribute('style');
                this.config.node.setAttribute('style', old + ";" + style);
            } else {
                Object.keys(style).forEach(function (s) {
                    this.config.node.style[s] = style[s];
                }, this);
            }
            return this;
        },
        /**
         * @method resize
         * @param {Object} opt
         * @param {Number} opt.w
         * @param {Number} opt.h
         * @param {Number} opt.x
         * @param {Number} opt.y
         */
        resize: function (opt) {
            opt = opt || {};
            if (opt.w) {
                this.config.node.style.width = opt.w + 'px';
            }
            if (opt.h) {
                this.config.node.style.height = opt.h + 'px';
            }
            if (opt.x) {
                this.config.node.style.left = opt.x + 'px';
            }
            if (opt.y) {
                this.config.node.style.top = opt.y + 'px';
            }
            this.emit('resize', opt);
            return this;
        }
    });
    return BaseView;
});