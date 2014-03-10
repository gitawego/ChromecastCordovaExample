define([
    '../../Class',
    '../../CustomEvent',
    '../Builder'
],function(Class,CustomEvent, Builder){
    var slice = Array.prototype.slice,
        splice = Array.prototype.splice;
    /**
     * @class com.sesamtv.core.util.databinding.types.TextNode
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var TextNode = Class({
        extend:CustomEvent,
        constructor:function TextNodeBType(opt,builder,binder){
            var tagName = opt.node.tagName.toLowerCase(),
                tags = ['input', 'textarea', 'select'],
                isValueType = tags.indexOf(tagName) !== -1,
                value = opt.data;
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
                 * @param {String} v
                 */
                set: function (v) {
                    if (isValueType) {
                        this.node.value = v;
                    } else {
                        this.node[opt.key.type === 'html' ? 'innerHTML' : 'textContent'] = v;
                    }
                    value = v;

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
                this.update = function () {
                    builder.setDefaultValue(this, opt.data, arguments);
                };
            }
            builder.setDefaultValue(this, value);
        }
    });
    //return TextNode;
    Builder.addBindingType('textNode',TextNode);
    return TextNode;
});