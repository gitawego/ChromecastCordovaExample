/**
 * Created by hongbo on 12/12/13.
 */
define([
    '../../util/Class',
    '../../util/BaseEvented',
    '../../util/DomEvent',
    '../../util/Helper',
    'bower_components/hogan/web/builds/2.0.0/hogan-2.0.0.amd'
], function (Class, BaseEvented, DomEvent, helper, Hogan) {
    var UIModule = Class({
        extend: BaseEvented,
        constructor: function UIModule(opt) {
            this.config = {
                slotCounter: 0,
                slots: {},
                data: {},
                children: {},
                insertPosition: {
                    "before": "beforebegin",
                    "after": "afterend"
                },
                tplStr: ''

            };
            helper.merge(this, opt);
            if (!this.config.id) {
                this.config.id = 'ui_' + (new Date()) % 1e9;
            }
            BaseEvented.call(this);
            this.attachEvents();
        },
        template: function (data) {
            if (this.config.template) {
                return this.config.template(data);
            }
            if (this.compiler && this.compiler.text === this.config.tplStr) {
                return this.compiler.render(data);
            }
            this.compiler = Hogan.compile(this.config.tplStr);
            return this.compiler.render(data);
        },
        delegate: function (selector, evtName, fnc, once) {
            return DomEvent.delegate(this.config.node, selector, evtName, fnc, once);
        },
        attachEvents: function () {
            this.connect.push(this.on('config', function (evt) {
                if (evt.key === 'data') {
                    this.emit('data', evt.newValue);
                }
            }));
            this.connect.push(this.on('destroy', this.destroy));
            this.once('render', function () {
                this._attachEvents();
                this._attachDelegates();
            });
        },
        _attachEvents: function () {
            if (!this.config.events) {
                return;
            }
            var i = 0, l = this.config.events.length, conf, method;
            if (l === 0) {
                return;
            }
            for (; i < l; i++) {
                conf = this.config.events[i];
                method = typeof(conf.method) === 'string' ? this[conf.method] : conf.method;
                method && this.connect.push(this[conf.once ? 'once' : 'on'](conf.eventName, method.bind(this)));
            }
        },
        _attachDelegates: function () {
            if (!this.config.delegates) {
                return;
            }
            var i = 0, l = this.config.delegates.length, conf, method;
            if (l === 0) {
                return;
            }
            for (; i < l; i++) {
                conf = this.config.delegates[i];
                method = typeof(conf.method) === 'string' ? this[conf.method] : conf.method;
                method && this.connect.push(this.delegate(conf.selector, conf.eventName, method.bind(this), conf.once));
            }
        },
        update: function (conf, replace) {
            if (replace) {
                this.config = Class.mixin(this.config, conf);
            } else {
                this.config = helper.merge(this.config, conf);
            }
            var domNode = this.buildDOM();
            Object.keys(this.config.children).forEach(function (childId) {
                var cls = '.' + this.getSlotClassName(childId), childNode = this.config.node.querySelector(cls), virtualChildNode;
                if (!childNode) {
                    return;
                }
                virtualChildNode = domNode.querySelector(cls);
                virtualChildNode.parentNode.replaceChild(childNode, virtualChildNode);
            }, this);
            this.config.node.parentNode.replaceChild(domNode, this.config.node);
            this.config.node = domNode;
            return this.postRender();
        },
        buildDOM: function () {
            var frag = document.createElement(this.config.tag || 'div');
            frag.innerHTML = this.template(this.config.data);
            return this.config.tag ? frag : frag.firstElementChild;
        },
        render: function (target) {
            var parent = this.config.parent;
            this.config.node = this.buildDOM();
            if (!parent) {
                if (target) {
                    this.placeAt(target);
                }
            } else {
                var slotContainer = parent.config.node.querySelector('.' + parent.getSlotClassName(this.config.slot));
                if (!slotContainer) {
                    throw new Error('slot ' + this.config.slot + 'not found in DOM');
                }
                this.placeAt(slotContainer);
            }
            this.postRender();
            this.emit('render');
            this.setConfig('rendered', true);
            return this;
        },
        postRender: function () {
            var node = this.config.node;
            if (this.config.classList) {
                this.config.classList.forEach(function (cls) {
                    node.classList.add(cls);
                });
            }
            node.setAttribute('data-ui-id', this.config.id);
            return this;
        },
        destroy: function () {
            var parent, evts, pNode = this.config.node.parentNode;
            this.config.node.removeAttribute('data-ui-id');
            Object.keys(this.evts).forEach(function (e) {
                e.remove();
            });
            pNode.removeChild(this.config.node);
            if (parent = this.config.parent) {
                pNode.parentNode.removeChild(pNode);
                evts = ['slot_destroy_' + this.config.slot, 'slot_render_' + this.config.slot];
                evts.forEach(function (e) {
                    if (parent.evts[e]) {
                        parent.evts[e].remove();
                        delete parent.evts[e];
                    }
                });
                delete parent.config.data[this.config.slot];
                delete parent.config.children[this.config.slot];
            }
        },
        placeAt: function (target) {
            target.appendChild(this.config.node);
            return this;
        },
        getChild: function (id, type) {
            type = type || 'id';
            var mapping = {
                id: function (id) {
                    var children = self.config.children,
                        keys = Object.keys(children), i = 0, l = keys.length, slot;
                    for (; i < l; i++) {
                        slot = keys[i];
                        if (children[slot].config.id === id) {
                            return children[slot]
                        }
                    }
                },
                slot: function (slot) {
                    return self.config.children[slot];
                }
            }, self = this;
            return mapping[type](id);
        },
        getSlotClassName: function (slot) {
            return ['slot', this.config.id, slot].join('_');
        },
        /**
         * @method add
         * @param {Object} module
         * @param {*} opt
         * @returns {boolean|*|Prompt|String}
         */
        add: function (module, opt) {
            var optType = typeof(opt), tag = 'div', slot, ref, position, noRender;
            if (['undefined', 'object'].indexOf(optType) !== -1) {
                opt = opt || {};
                slot = opt.slot;
                ref = 'ref' in opt ? opt.ref : (this.config.slotCounter > 0 ? this.config.slotCounter - 1 : 0);
                position = opt.position || 'after';
                noRender = opt.noRender;
                if (opt.tag) {
                    tag = opt.tag;
                }
            } else {
                slot = opt;
            }
            if (typeof(slot) === 'undefined') {
                slot = this.config.slotCounter++;
            }

            if (slot in this.config.children) {
                throw new Error('slot id conflict ' + slot);
            }
            this.config.children[slot] = module;
            module.config.slot = slot;
            module.config.parent = this;

            this.config.data[slot] = '<' + tag + ' class="' + this.getSlotClassName(slot) + '"></' + tag + '>';

            this.evts['slot_destroy_' + slot] = this.evts['slot_destroy_' + slot] || this.on('destroy', function () {
                this.config.children[slot].destroy();
            });

            if (this.config.rendered && (position = this.config.insertPosition[position])) {
                if (this.config.children[ref] && this.config.children[ref] !== module) {
                    ref = this.config.children[ref];
                    (this.config.parent ? ref.config.node.parentNode : ref.config.node).insertAdjacentHTML(position, this.config.data[slot]);
                } else {
                    this.config.node.insertAdjacentHTML('afterbegin', this.config.data[slot]);
                }
                !noRender && module.render();
                return this;
            }

            this.evts['slot_render_' + slot] = this.evts['slot_render_' + slot] || this.on('render', function () {
                this.config.children[slot].render();
            });
            return this;
        },
        remove: function (id, type) {
            type = type || 'id';
            var mapping = {
                id: function (id) {
                    var children = self.config.children,
                        keys = Object.keys(children), i = 0, l = keys.length, slot;
                    for (; i < l; i++) {
                        slot = keys[i];
                        if (children[slot].config.id === id) {
                            return this.slot(slot);
                        }
                    }
                },
                slot: function (slot) {
                    if (!self.config.children[slot]) {
                        return;
                    }
                    self.config.children[slot].destroy();
                }
            }, self = this;
            mapping[type](id);
            return this;
        }
    });
    return UIModule;
});
