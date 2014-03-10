define(['../util/Class','./BaseComponent'],
    function (Class,BaseComponent) {
        "use strict";
        /**
         * @class com.sesamtv.core.ui.Panel
         * @extends com.sesamtv.core.ui.BaseComponent
         * @cfg {Object} args
         * @cfg {HTMLElement|String} node
         */
        var Panel = Class({
            extend: BaseComponent,
            constructor: function (args,node) {
                args = args || {};
                args.type = 'panel';
                args.baseClass = args.baseClass || 'panel';
                BaseComponent.call(this,args,node);
                //this.getVisibleItemList();
            }
        });
        return Panel;
    });