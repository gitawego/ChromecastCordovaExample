define(['../util/Class','./BaseComponent'],
    function (Class,BaseComponent) {
        "use strict";
        /**
         * @class com.sesamtv.core.ui.MenuItem
         * @extends com.sesamtv.core.ui.BaseComponent
         */
        var MenuItem = Class({
            extend: BaseComponent,
            constructor: function (args,node) {
                args = args || {};
                args.type = 'menuItem';
                args.baseClass = args.baseClass || 'menuItem';

                //BaseComponent.call(this,args,node);
                BaseComponent.call(this,args,node);
                //this.importItems(this.itemSelector,Menu);
                //this.getVisibleItemList();
            }
        });
        return MenuItem;
    });