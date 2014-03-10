define([
    '../../Class',
    '../../CustomEvent',
    '../../Helper',
    '../Builder'
],function(Class,CustomEvent, helper, Builder){
    var slice = Array.prototype.slice,
        splice = Array.prototype.splice;
    /**
     * @class com.sesamtv.core.util.databinding.types.Style
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var Style = Class({
        extend:CustomEvent,
        constructor:function StyleBType(opt,builder,binder){
            var styleAttrMapping = {
                'backgroundImage': 'url(${data})'
            }, value = opt.data
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
                    if(!v){
                        value = v;
                        return;
                    }
                    var attrTpl = styleAttrMapping[opt.key.attr];
                    this.node.style[opt.key.attr] = attrTpl ? helper.substitute(attrTpl, {
                        data: v
                    }) : v;
                    value = v;
                    if(!opt.key.id){
                        return;
                    }
                    this.emit(opt.key.id, {
                        data: v
                    });
                },
                /**
                 * @method get
                 * @returns {String}
                 */
                get: function () {
                    return value;
                }
            });
            if (typeof(opt.data) === 'function') {
                /**
                 * @method update
                 */
                this.update = function () {
                    builder.setDefaultValue(this, opt.data, arguments);
                };
            }
            builder.setDefaultValue(this, opt.data);
        }
    });
    //return Style;
    Builder.addBindingType('style',Style,{
        multiAttr:true
    });
    return Style;
});