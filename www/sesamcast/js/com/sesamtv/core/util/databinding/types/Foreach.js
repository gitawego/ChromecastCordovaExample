define([
    '../../Class',
    '../../CustomEvent',
    '../../Helper',
    '../Builder',
    '../../polyfill'
], function (Class, CustomEvent, helper, Builder) {
    var slice = Array.prototype.slice,
        splice = Array.prototype.splice;
    /**
     * @class com.sesamtv.core.util.databinding.types.Foreach
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var Foreach = Class({
        extend: CustomEvent,
        constructor: function ForeachBType(opt, builder, binder) {

            CustomEvent.call(this);

            var tplNode = opt.node.firstElementChild.cloneNode(true),
                self = this, value = opt.data, weakMap = new WeakMap(),
                /**
                 * @method buildItemNode
                 * @private
                 * @param {HTMLElement} node
                 * @param {Object} key
                 * @param {Object} item
                 */
                    buildItemNode = function (node, key, item) {
                    var parsedData = helper.substitute(key.id, typeof(item) === 'object' ? item : {
                        item: item
                    }), nodeData, tag = key.id.match(/\$\{(.*)\}/);
                    if (tag) {
                        key.id = tag.pop();
                    }

                    if (!weakMap.get(node)) {
                        weakMap.set(node, {});
                    }
                    nodeData = weakMap.get(node);
                    nodeData[key.id] = builder.build({
                        node: node,
                        key: key,
                        parent: self,
                        item: item,
                        data: parsedData
                    }, binder);

                },
                /**
                 * parse data, and convert to HTMLElement
                 * @method parse
                 * @private
                 * @param {Object} d
                 * @returns {HTMLElement}
                 */
                    parse = function (d) {
                    var clone = tplNode.cloneNode(true),
                        rootKey = tplNode.getAttribute(binder.dataAttr);

                    if (rootKey) {
                        clone.removeAttribute(binder.dataAttr);
                        builder.parseDataAttr(rootKey).forEach(function (k) {
                            buildItemNode(clone, k, d);
                        });
                    }
                    slice.call(clone.querySelectorAll('* > [' + binder.dataAttr + ']')).forEach(function (c, i) {
                        var childAttr = c.getAttribute(binder.dataAttr);
                        c.removeAttribute(binder.dataAttr);
                        builder.parseDataAttr(childAttr).forEach(function (k) {
                            buildItemNode(c, k, d);
                        });
                    });
                    return clone;
                },
                /**
                 * fill list
                 * @method run
                 */
                    run = function () {
                    opt.node.firstElementChild && opt.node.removeChild(opt.node.firstElementChild);
                    var children = slice.call(opt.node.children), child;
                    value.forEach(function (d, i) {
                        if (child = children.shift()) {
                            child.parentNode.removeChild(child);
                        }
                        d.index = i;
                        opt.node.appendChild(parse(d));
                    });
                    if (children.length) {
                        children.forEach(function (c) {
                            c.parentNode.removeChild(c);
                        });
                    }
                    self.emit(opt.key.id, {
                        action: 'update',
                        total: value
                    });
                };


            Class.mixin(this, {
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
                 * @method push
                 * @param {*} item
                 */
                push: function (item) {
                    opt.node.appendChild(parse(item));
                    value.push(item);
                    this.emit(opt.key.id, {
                        action: 'add',
                        total: value,
                        data: item
                    });
                },
                /**
                 * @method unshift
                 * @param {*} item
                 */
                unshift: function (item) {
                    opt.node.insertBefore(parse(item), opt.node.firstElementChild);
                    value.unshift(item);
                    this.emit(opt.key.id, {
                        action: 'add',
                        total: value,
                        data: item
                    });
                },
                /**
                 * @method shift
                 */
                shift: function () {
                    opt.node.removeChild(opt.node.firstElementChild);
                    this.emit(opt.key.id, {
                        action: 'remove',
                        total: value,
                        data: value.shift()
                    });
                },
                /**
                 * @method pop
                 * @param {*} item
                 */
                pop: function () {
                    opt.node.removeChild(opt.node.lastElementChild);
                    this.emit(opt.key.id, {
                        action: 'remove',
                        total: value,
                        data: value.pop()
                    });
o
                },
                /**
                 * @method sort
                 * @param {Function} criterion
                 */
                sort: function (criterion) {
                    var children = slice.call(opt.node.children),
                        clone = value.slice(0);
                    criterion = criterion || function (a, b) {
                        return a - b;
                    };
                    value.sort(function (a, b) {
                        var order = +criterion(a, b), idxA, idxB;
                        if (order > 0) {
                            idxA = clone.indexOf(a);
                            idxB = clone.indexOf(b);
                            children[idxA].parentNode.insertBefore(children[idxB], children[idxA]);
                        }
                        return order;
                    });
                    this.emit(opt.key.id, {
                        action: 'sort',
                        total: value
                    });
                },
                /**
                 * @method splice
                 * @param {Number} index
                 * @param {Number} [howMany]
                 */
                splice: function (index, howMany) {
                    if (index === -1) {
                        return;
                    }
                    var children = slice.call(opt.node.children),
                        arg = splice.call(arguments, 2),
                        i = index, toIndex = index + howMany, refNode = index ? children[index - 1] : children[0],
                        isEmpty, item, l = arg.length;

                    if (typeof(howMany) === 'undefined') {
                        toIndex = children.length;
                    }
                    for (; i < toIndex; i++) {
                        children[i] && children[i].parentNode.removeChild(children[i]);
                    }
                    children.splice(index, howMany);
                    isEmpty = children.length === 0;

                    if (l > 0) {
                        for (i = 0; i < l; i++) {
                            item = arg[i];
                            if (isEmpty && i === 0) {
                                opt.node.appendChild(parse(item));
                                refNode = opt.node.firstElementChild;
                            } else {
                                opt.node.insertBefore(parse(item), refNode.nextSibling);
                                refNode = refNode.nextSibling;
                            }
                        }
                    }
                    this.emit(opt.key.id, {
                        action: 'update',
                        total: value,
                        data: {
                            removed: splice.apply(value, arguments),
                            added: arg
                        }
                    });
                },
                /**
                 * @method getItemData
                 * @param {HTMLElement} itemNode
                 * @returns {Object}
                 */
                getItemData: function (itemNode) {
                    var children = slice.call(opt.node.children);
                    return value[children.indexOf(itemNode)];
                },
                /**
                 * @method remove
                 * @param {*} item
                 * @returns {*}
                 */
                remove: function (item) {
                    return this.splice(value.indexOf(item), 1);
                },
                /**
                 * @method get
                 * @returns {Array}
                 */
                get: function () {
                    return value;
                },
                /**
                 * this method is pretty brutal, it removes existing items one by one and inserts the new ones.
                 * @method set
                 * @param {Array} v
                 */
                set: function (v) {
                    value = v;
                    run();
                },
                /**
                 * @method getItemModels
                 * @param {Number} idx
                 * @param {Boolean} [release] if empty the cache
                 * @returns {Object}
                 */
                getItemModels: function getItemModels(idx, release) {
                    if (release) {
                        getItemModels.handler.remove();
                        delete getItemModels.cache;
                        delete getItemModels.handler;
                    }
                    if (!('cache' in getItemModels)) {
                        getItemModels.cache = {};
                        getItemModels.handler = {};
                    }
                    if (!(idx in value)) {
                        return null;
                    }
                    if (getItemModels.cache[idx]) {
                        return getItemModels.cache[idx];
                    }
                    var children = slice.call(opt.node.children), model, connect = [];
                    if (!children[idx]) {
                        return null;
                    }

                    model = getItemModels.cache[idx] = weakMap.get(children[idx]);
                    Object.keys(model).forEach(function (mName) {
                        connect.push(model[mName].on(mName, function (opt) {
                            value[idx][mName] = opt.data;
                        }));
                    }, this);
                    getItemModels.handler.remove = function () {
                        connect.forEach(function (c) {
                            c.remove();
                        });
                        connect.length = 0;
                    };
                    return model;
                }
            });
            if (typeof(opt.data) === 'function') {
                /**
                 * @method update
                 */
                this.update = function () {
                    value = opt.data.apply(builder.model, arguments);
                    if (builder.isPromise(value)) {
                        value.then(function (v) {
                            value = v;
                            run();
                        });
                    } else {
                        run();
                    }
                };
                this.update();
            } else {
                run();
            }
        }
    });
    //return Foreach;
    Builder.addBindingType('foreach', Foreach);
    return Foreach;
});