define([
    '../../Class',
    '../../DomEvent',
    '../../CustomEvent',
    '../Builder'
],function(Class,DomEvent, CustomEvent, Builder){
    var slice = Array.prototype.slice,
        splice = Array.prototype.splice;
    /**
     * @class com.sesamtv.core.util.databinding.types.Event
     * @extends com.sesamtv.core.util.CustomEvent
     */
    var EventBindingType = Class({
        extend:CustomEvent,
        constructor:function EventBType(opt,builder,binder){

            CustomEvent.call(this);

            var m = opt.key.id.match(/\$\((.*)\)/), handler, value, fncStr, level;
            if (m) {
                fncStr = m.pop();
                if (fncStr in binder.boundModel) {
                    value = function () {
                        return binder.boundModel[fncStr].apply(binder.boundModel, arguments);
                    };
                }
            } else {
                value = opt.data;
            }
            //support custom event

            if (opt.key.attr in binder.model) {
                handler = opt.pubSub.on(opt.key.attr, function (evt) {
                    value && value(evt, {
                        params: opt,
                        model: binder.model[opt.key.id],
                        scope: binder
                    });
                });
            } else {
                handler = DomEvent.on(opt.node, opt.key.attr, function (evt) {
                    value && value(evt, {
                        params: opt,
                        model: binder.model[opt.key.id],
                        scope: binder
                    });
                });
            }

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
                 * @property handler
                 * @type {{remove:Function}}
                 */
                handler: handler,
                /**
                 * @method set
                 * @param {Function} fnc
                 */
                set: function (fnc) {
                    value = fnc;
                    this.emit(opt.key.id, {
                        data: value
                    });
                },
                /**
                 * @method get
                 * @returns {Function}
                 */
                get: function () {
                    return value;
                }
            });
        }
    });
    //return EventBindingType;
    Builder.addBindingType('event',EventBindingType,{
        multiAttr:true
    });
    return EventBindingType;
});