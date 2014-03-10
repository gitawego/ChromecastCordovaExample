define([
    '../../Class',
    '../../CustomEvent',
    '../Builder'
],function(Class,CustomEvent,Builder){
    var slice = Array.prototype.slice,
        splice = Array.prototype.splice;
    /**
     * @class com.sesamtv.core.util.databinding.types.Attr
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var Attr = Class({
        extend:CustomEvent,
        constructor:function AttrBType(opt,builder,binder){
            var value = opt.data;
            CustomEvent.call(this);
            Class.mixin(this,{
                /**
                 * @property node
                 * @type HTMLElement
                 */
                node:opt.node,
                /**
                 * @property bindInfo
                 * @type Object
                 */
                bindInfo:opt.key,
                /**
                 * @method set
                 * @param {*} v
                 */
                set: function (v) {
                    if(opt.key.attr === 'className'){
                        v = (""+v).trim();

                        value && typeof(value) === 'string' && this.node.classList.remove(value);

                        v && this.node.classList.add(v);
                    }else{
                        this.node.setAttribute(opt.key.attr, v);
                    }
                    value = v;
                    opt.key.id && this.emit(opt.key.id, {
                        data: v
                    });
                },
                /**
                 * @method get
                 * @returns String
                 */
                get: function () {
                    return value;
                }
            });
            if (typeof(value) === 'function') {
                /**
                 * available only when data is a function
                 * @method update
                 */
                this.update = function () {
                    builder.setDefaultValue(this, value, arguments);
                };
            }
            builder.setDefaultValue(this, value);
        }
    });
    //return Attr;
    Builder.addBindingType('attr',Attr,{
        multiAttr:true
    });
    return Attr;
});