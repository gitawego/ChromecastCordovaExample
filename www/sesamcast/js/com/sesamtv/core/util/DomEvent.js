define([
    './Touch'
], function (touch) {
    "use strict";
    var slice = Array.prototype.slice;
    /**
     * example:
     *
     *      var delegate = DomEvent(document.getElementById('myid'));
     *      delegate.on('click',function(evt){},false);
     *      //search for child element which contains class "subclass"
     *      delegate.on('.subclass','click',function(evt){},false);
     *      delegate.emit('click',{el:'.subclass',canBubble:true});
     *
     * you can use it in this way as well:
     *
     *      var c = DomEvent.on(mynode,'click',function(evt){},false);
     *      c.remove();
     *      c = DomEvent.on('#myid','click',function(evt){},false);
     *
     * @class com.sesamtv.core.util.DomEvent
     * @cfg {HTMLElement} root
     */
    var delegate = {
        /**
         * @method on
         * @param {HTMLElement|String} node an HTMLElement or a selector
         * @param {String} evtName
         * @param {Function} callback
         * @param {Boolean} [type] capture mode or not
         * @param {Boolean} [once]
         * @return {Object}
         */
        on: function (node, evtName, callback, type, once) {
            var args;
            if (typeof(node) === 'string' && typeof(evtName) === 'string') {
                //res = slice.call((this.root || document).querySelectorAll(node));
                return this._on((this.root || document).querySelectorAll(node), evtName, callback, type, once);
            }
            if (this === DomEvent) {
                return this._on.apply(this, arguments);
            }
            //if we get here, there are only 4 parameters
            args = slice.call(arguments);
            args.splice(0, 0, this.root);
            //args.unshift(this.root);
            return this._on.apply(this, args);
        },
        /**
         * @method _on
         * @private
         * @param {HTMLElement|NodeList} node
         * @param {String} evtName
         * @param {Function} callback
         * @param {Boolean} [type] capture mode or not
         * @param {Boolean} [once]
         * @return {{remove: Function}}
         */
        _on: function (node, evtName, callback, type, once) {
            evtName = touch[evtName] || evtName;
            var cb = callback, isList = node instanceof NodeList, i = 0, l;
            if ((evtName === 'click' && touch.hasTouch) || evtName === 'tap') {
                return this.onTap(node, callback, once);
            }
            if (once) {
                callback = function _cb(evt) {
                    cb.call(this, evt);
                    this.removeEventListener(evtName, _cb);
                };
            }
            if (isList) {
                l = node.length;
                for (; i < l; i++) {
                    node[i].addEventListener(evtName, callback, type);
                }
            } else {
                node.addEventListener(evtName, callback, type);
            }
            return {
                remove: function () {
                    if (isList) {
                        l = node.length;
                        for (i = 0; i < l; i++) {
                            node[i].removeEventListener(evtName, callback);
                        }
                    } else {
                        node.removeEventListener(evtName, callback);
                    }
                }
            };
        },
        /**
         * resolve the 300m delay on mobile
         * @method onTap
         * @param {HTMLElement|NodeList} node
         * @param {Function} callback
         * @param {Boolean} [once]
         * @returns {{remove: remove}}
         */
        onTap: function (node, callback, once) {
            var self = this, timer, end, move,
                tapH = this[once ? 'once' : 'on'](node, touch.press, function (evt) {
                    //ignore right click
                    if (evt.button === 2) {
                        return;
                    }
                    timer = setTimeout(function () {
                        end.remove();
                    }, 300);
                    move = self.once(this, touch.move, function () {
                        end.remove();
                        clearTimeout(timer);
                    });
                    end = self.once(this, touch.release, function (evt) {
                        clearTimeout(timer);
                        callback && callback.call(this, evt);
                    });
                });
            return {
                remove: function () {
                    tapH.remove();
                    move.remove();
                    end.remove();
                    clearTimeout(timer);
                }
            };
        },
        /**
         * @method once
         * @param {HTMLElement|String} node an HTMLElement or a selector
         * @param {String} evtName
         * @param {Function} callback
         * @param {Boolean} type capture mode or not
         */
        once: function (node, evtName, callback, type) {
            var args;
            if (typeof(node) === 'string' && typeof(evtName) === 'string') {
                //res = slice.call((this.root || document).querySelectorAll(node));
                return this._on((this.root || document).querySelectorAll(node), evtName, callback, type, true);
            }
            if (this === DomEvent) {
                return this._on(node, evtName, callback, type, true);
            }
            //if we get here, there are only 4 parameters
            args = slice.call(arguments);
            args.splice(0, 0, this.root);
            //args.unshift(this.root);
            return this._on.apply(this, args);
        },
        /**
         * @method delegate
         * @param {HTMLElement} root
         * @param {String} selector dom query selector
         * @param {String} evtName event name
         * @param {function(Event)} callback
         * @param {Boolean} [once]
         * @returns {{remove:Function}}
         */
        delegate: function (root, selector, evtName, callback, once) {
            root = root || this.root || document.body;
            var connect = this.on(root, touch[evtName] || evtName, function (evt) {
                var nodes = this.querySelectorAll(selector), target = evt.target, i, len;
                if ((len = nodes.length) === 0) {
                    return;
                }
                if (target.nodeType === Node.TEXT_NODE) {
                    target = target.parentNode;
                }
                while (target && target !== root) {
                    i = 0;
                    for (; i < len; i++) {
                        if (nodes[i] === target) {
                            if (once) {
                                connect.remove();
                            }
                            callback && callback.call(target, evt);
                            break;
                        }
                    }
                    target = target.parentElement;
                }
            });
            return connect;
        },
        /**
         * @method emit
         * @param {String} evtName
         * @param {Object} params
         * @param {HTMLElement|String} [params.el] an HTMLElement or a selector
         * @param {Boolean} [params.canBubble]
         * @param {Boolean} [params.cancelable]
         * @param {Number} [params.keyCode]
         */
        emit: function (evtName, params) {
            params = params || {};
            if (params.el && typeof(params.el) === 'string') {
                params.el = (this.root || document).querySelectorAll(params.el);
            }
            return this._emit(evtName, params);
        },
        /**
         * @method _emit
         * @private
         * @param {String} evtName
         * @param {Object} params
         * @param {HTMLElement} [params.el=document]
         * @param {Boolean} [params.canBubble]
         * @param {Boolean} [params.cancelable]
         * @param {Number} [params.keyCode]
         * @return {Boolean}
         */
        _emit: function (evtName, params) {
            var eventObj = this.buildEvent(evtName, params),
                el = params.el || document, i = 0, l;
            if (el instanceof NodeList) {
                l = el.length;
                for (; i < l; i++) {
                    el[i].dispatchEvent ? el[i].dispatchEvent(eventObj) : el[i].fireEvent("on" + evtName, eventObj);
                }
            }
            return el.dispatchEvent ? el.dispatchEvent(eventObj) : el.fireEvent("on" + evtName, eventObj);
        },
        /**
         * @method buildEvent
         * @param {String} evtName
         * @param {Object} [params]
         * @returns {Event}
         */
        buildEvent: function (evtName, params) {
            var eventObj = document.createEventObject ?
                    document.createEventObject() : document.createEvent("Events"),
                params = params || {};

            if (eventObj.initEvent) {
                eventObj.initEvent(evtName,
                    ('canBubble' in params) ? params.canBubble : true,
                    ('cancelable' in params) ? params.cancelable : true);
            }
            Object.keys(params).forEach(function (name) {
                if (name === 'el') {
                    return;
                }
                eventObj[name] = params[name];
            });
            if ('keyCode' in params) {
                eventObj.which = params.keyCode;
            }
            return eventObj;
        }
    };

    function DomEvent(root) {
        var h = Object.create(delegate);
        h.root = root;
        return h;
    }

    Object.keys(delegate).forEach(function (k) {
        DomEvent[k] = delegate[k];
    });
    return DomEvent;
});