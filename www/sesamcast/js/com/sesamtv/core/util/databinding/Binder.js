define([
    './Builder',
    '../CustomEvent',
    './types/Attr',
    './types/Event',
    './types/Foreach',
    './types/Style',
    './types/TextNode'
], function (Builder, CustomEvent) {
    /**
     * a Looser Data-Bindings system
     * @class com.sesamtv.core.util.databinding.Binder
     * @requires com.sesamtv.core.util.databinding.Builder
     * @requires com.sesamtv.core.util.databinding.types.Foreach
     * @requires com.sesamtv.core.util.databinding.types.Attr
     * @requires com.sesamtv.core.util.databinding.types.Event
     * @requires com.sesamtv.core.util.databinding.types.Style
     * @requires com.sesamtv.core.util.databinding.types.TextNode
     * @requires com.sesamtv.core.util.CustomEvent
     * @requires com.sesamtv.core.util.DomEvent
     * @cfg {Object} args
     * @cfg {HTMLElement|String} args.root
     * @cfg {String} [args.namespace]
     */

    function DataBinding(args) {
        args = args || {};
        args.root = args.root || document;
        this.connect = [];
        this.model = {};
        typeof(args.root) === 'string' && (args.root = document.querySelector(args.root));
        this.root = args.root;
        // Create a simple PubSub object
        var pubSub = new CustomEvent(),
            self = this,
            changeHandler = function (evt) {
                var target = evt.target || evt.srcElement, // IE8 compatibility
                    propName = target.getAttribute(self.dataAttr);

                if (propName && propName !== "") {
                    [].concat(builder.parseId(propName)).some(function (k) {
                        if (!(k.type in builder)) {
                            pubSub.emit(k.id, {
                                data: target.value
                            });
                            return true;
                        }
                    });
                }
            }, setter = function (k, v) {
                if(k in this.model){
                    if('set' in this.model[k]){
                        this.model[k].set(v);
                        if (k in this.boundModel) {
                            this.boundModel[k] = v;
                        }
                    }else if('update' in this.model[k]){
                        this.model[k].update(v);
                    }

                }
                /*if (k in this.model && 'set' in this.model[k]) {
                    this.model[k].set(v);
                    if (k in this.boundModel) {
                        this.boundModel[k] = v;
                    }
                }*/
            };
        this.dataAttr = "data-bind" + (args.namespace ? '-' + args.namespace : '');
        /**
         * not available for foreach
         * @method set
         * @param {String|Object} k
         * @param {*} [v]
         */
        this.set = function (k, v) {
            if (arguments.length === 1) {
                Object.keys(k).forEach(function (_k) {
                    setter.call(this, _k, k[_k]);
                }, this);
            } else {
                setter.call(this, k, v);
            }
        };


        /**
         * @method get
         * @param {String} k
         * @returns {*}
         */
        this.get = function (k) {
            return this.model[k] && this.model[k].get();
        };
        /**
         * @method getModel
         * @param {String} k
         * @returns {Object}
         */
        this.getModel = function (k) {
            return this.model[k];
        };
        /**
         * @method on
         * @param {String} evt
         * @param {Function} fnc
         */
        this.on = function (evt, fnc) {
            return pubSub.on(evt, fnc);
        };
        /**
         * @method once
         * @param {String} evt
         * @param {Function} fnc
         */
        this.once = function (evt, fnc) {
            return pubSub.once(evt, fnc);
        };
        /**
         * @method toJsonData
         * @returns {Object}
         */
        this.toJsonData = function () {
            var keys = Object.keys(this.model), i = 0, l = keys.length, key, jsonData = {};
            for (; i < l; i++) {
                key = keys[i];
                if ('get' in this.model[key]) {
                    jsonData[key] = this.model[key].get();
                }
            }
            return jsonData;
        };
        /**
         * example:
         *
         *      //in html
         *      <div>
         *          <span data-bind="title"></span>
         *          <div data-bind="when: display" >show text</div>
         *          <ul data-bind="foreach: list1">
         *              <li data-bind="${item}"></li>
         *          </ul>
         *          <ul data-bind="foreach: list2">
         *              <li data-bind="${item.name}"></li>
         *          </ul>
         *          <img data-bind="attr:attr1#src|attr2#alt" />
         *          <button data-bind='event: $(btn1)#click,text:clickBtn'></button>
         *      </div>
         *
         *      //in js
         *      this.bind({
         *          title:'test',
         *          display:function(status){
         *              this.style.display = status?'':'none';
         *          },
         *          list1:[1,2,3],
         *          list2:[{name:'a'},{name:'b'}],
         *          clickBtn:'submit',
         *          btn1:function(evt){
         *
         *          }
         *      });
         *      this.set('title','test2');
         *      this.set('display',false);
         *
         * @method bind
         * @param {Object} mod
         */
        this.bind = function (mod) {
            //this.model = mod;
            // Listen to change events and proxy to PubSub
            this.boundModel = mod;

            if (args.root.addEventListener) {
                args.root.addEventListener("change", changeHandler, false);
                this.connect.push({
                    remove: function () {
                        args.root.removeEventListener('change', changeHandler);
                    }
                });
            } else {
                // IE8 uses attachEvent instead of addEventListener
                args.root.attachEvent("onchange", changeHandler);
                this.connect.push({
                    remove: function () {
                        args.root.removeEvent('onchange', changeHandler);
                    }
                });
            }

            this.root = args.root;
            this.namespace = args.namespace;

            var builder = this.builder = new Builder(mod),
                els = this.root.querySelectorAll('[' + this.dataAttr + ']'),
                bindingInfo,i = 0, l = els.length, el;

            for (; i < l; i++) {
                el = els[i];
                bindingInfo = el.getAttribute(this.dataAttr);
                el.removeAttribute(this.dataAttr);
                builder.parseDataAttr(bindingInfo).forEach(function (k) {
                    if (k.id.substr(0,2) === '${') {
                        return;
                    }

                    this.model[k.id] = builder.build({
                        node: el,
                        key: k,
                        data: mod[k.id],
                        pubSub: pubSub
                    }, this);
                }, this);
            }
            if (this.boundModel.init) {
                this.boundModel.init();
            }
        };
        /**
         * if viewModel has 'destroy' defined, call this method.
         * @method unbind
         */
        this.unbind = function () {
            if (args.root.removeEventListener) {
                args.root.removeEventListener("change", changeHandler, false);
            } else {
                // IE8 uses attachEvent instead of addEventListener
                args.root.removeEvent("onchange", changeHandler);
            }
            Object.keys(this.model).forEach(function (mod) {
                mod.handler && mod.handler.remove();
                mod.destroy && mod.destroy();
            });
            if ('destroy' in this.boundModel) {
                this.boundModel.destroy();
            }
            this.connect.forEach(function (c) {
                c.remove();
            }).length = 0;
        };
    }

    return DataBinding;
});