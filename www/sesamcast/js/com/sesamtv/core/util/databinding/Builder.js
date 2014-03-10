define([
    '../Class'
], function (Class) {

    /**
     * @class com.sesamtv.core.util.databinding.Builder
     */
    var slice = Array.prototype.slice, bindingType = {}, multiAttr = [];
    var Builder = Class({
        constructor: function Builder(boundModel) {
            this.model = boundModel;
        },
        statics: {
            /**
             * @method addBindingType
             * @static
             * @param {String} type
             * @param {Function} fnc
             */
            addBindingType: function (type, fnc, opt) {
                opt = opt || {};
                if (type in bindingType) {
                    return;
                }
                bindingType[type] = fnc;
                if(opt.multiAttr && multiAttr.indexOf(type) === -1){
                    multiAttr.push(type);
                }
            },
            /**
             * @method removeBindingType
             * @static
             * @param {String} type
             */
            removeBindingType: function (type) {
                delete bindingType[type];
                var idx = multiAttr.indexOf(type);
                idx > -1 && multiAttr.splice(multiAttr.indexOf(type,1));
            }
        },
        /**
         * @method build
         * @param {Object} opt
         * @param {Object} opt.key
         * @param {*} opt.data
         * @param {com.sesamtv.core.util.CustomEvent} opt.pubSub
         * @param {Object} [opt.parent]
         * @param {Object} [opt.item]
         * @param {com.sesamtv.core.util.databinding.Binder} scope
         */
        build: function BuildNode(opt, scope) {
            var model;
            if (opt.key.type in bindingType) {
                model =  new bindingType[opt.key.type](opt,this, scope);
            }else{
                model =  new bindingType.textNode(opt, this, scope);
            }
            opt.pubSub && model.on(opt.key.id,function(){
               opt.pubSub.emit.apply(opt.pubSub,[opt.key.id].concat(slice.call(arguments)));
            });
            return model;
        },
        parseDataAttr: function (dataStr) {
            var v = [], res;
            dataStr.split(',').forEach(function (id) {
                res = this.parseId(id.trim());
                v = v.concat(res);
            }, this);
            return v;
        },
        /**
         * format multi attributes:
         *
         *      style:backgroundImage#imgId1|width#imgWidth
         *
         * format:
         *
         *      text:textId1
         *
         * @method parseId
         * @param {String} id
         * @returns {{attr:?String,id:?String,type:?String}}
         */
        parseId: function parseId(id) {
            var parts = id.trim().split(":"),
                type, id, attr;
            if (parts.length === 1) {
                id = parts[0];
            } else {
                type = parts.shift().trim();
                id = parts.join(":").trim();
            }

            /*if (type in typeMapping) {
             id = typeMapping[type](id);
             }*/
            if (multiAttr.indexOf(type) !== -1) {
                return id.split('|').map(function (k) {
                    parts = k.split('#');
                    return {
                        attr: parts.pop().trim(),
                        id: parts.pop().trim(),
                        type: type
                    }
                });
            }
            return {
                type: type,
                attr: attr,
                id: id
            };
        },
        isPromise: function (obj) {
            if (!obj) {
                return false;
            }
            if (['object', 'function'].indexOf(typeof(obj)) === -1) {
                return false;
            }
            return 'then' in obj;
        },
        /**
         * @method setDefaultValue
         * @param {Object} model
         * @param {*} value
         * @param {arguments} [args]
         */
        setDefaultValue: function (model, value, args) {
            if (typeof(value) === 'undefined') {
                return;
            }

            if (typeof(value) !== 'function') {
                return model.set(value);
            }
            value = args ? value.apply(this.model, args) : value();
            if (this.isPromise(value)) {
                value.then(function (v) {
                    model.set(v);
                });
            } else {
                model.set(value);
            }
        }

    });

    return Builder;
});