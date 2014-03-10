define([
    '../util/Class',
    './BaseView',
    '../util/Helper',
    '../util/DomEvent'
], function (Class, BaseView, helper, DomEvent) {
    "use strict";
    var protectedAttrs = ['addChild', 'set', 'get', 'attachTo', 'detach', '_addProtectedAttribute',
        'style', 'resize', 'on', 'off', 'once', 'focus', 'blur'];
    /**
     * @class com.sesamtv.core.ui.BaseComponent
     * @extends com.sesamtv.core.BaseView
     * @requires com.sesamtv.core.util.Helper
     * @requires com.sesamtv.core.util.DomEvent
     * @cfg {Object} args
     * @cfg {Object} args.parent
     * @cfg {String} args.type
     * @cfg {String} args.baseClass
     * @cfg {Boolean} args.autoImport if import items automatically
     * @cfg {Object} args.importCmp Component while instantiate the child items
     * @cfg {Object} args.importArgs  arguments to be passed to the child items
     * @cfg {String} args.itemSelector
     * @cfg {HTMLElement} [node]
     */
    var BaseComponent = Class({
        extend: BaseView,
        constructor: function (args, node) {
            this.config = Class.mixin({
                type:'component',
                baseClass:'component'
            },this.config || {});

            BaseView.call(this, args,node);
        },
        animate: function (animation, callbackMehod, beforeTraitement) {
            beforeTraitement && beforeTraitement();
            callbackMehod && DomEvent.once(this.node, 'webkitAnimationEnd', callbackMehod, false);
            //this[animation]();
            this.set('animation', animation);
            return this;
        }
    });
    return BaseComponent;
})
;