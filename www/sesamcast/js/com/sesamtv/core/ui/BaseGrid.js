define([
        '../util/Class',
        './BaseComponent'
    ],
    function (Class, BaseComponent) {
        "use strict";
        /**
         * notice for set-top box:
         *      * use css property background-image instead of tag <img>
         *      * use float:left instead of display:inline-block
         * @class com.sesamtv.core.ui.BaseGrid
         * @extends com.sesamtv.core.ui.BaseComponent
         * @cfg {Object} args
         * @cfg {HTMLElement|String} node
         */
        var BaseGrid = Class({
            extend: BaseComponent,
            constructor: function (args, node) {
                args.type = args.type || 'grid';
                BaseComponent.call(this, args, node);
            },
            /**
             * go to next item in visible item list
             * set unfocus previous item
             * set focus style to current item .
             * call current element onGetFocus method if is defined
             * call previous onClearFocus method if is defined
             * @return {boolean} true if item exists or false.
             */
            focusNextItem: function () {

                if (this.getNextItem() && this.getNextItem().getItemByIndex(this.currentVisibleItem().currentItemIndex)) {
                    if (this.goToNextItem()) {
                        this.getPrevItem().unSelectCurrentItem();
                        this.currentVisibleItem().goToItem(this.getPrevItem().currentItemIndex);
                        this.currentVisibleItem().selectCurrentItem();
                        return true;
                    }
                }
                return false;

                /*if (this.goToNextItem()) {
                 this.getPrevItem().unSelectCurrentItem();
                 this.currentVisibleItem().goToItem(this.getPrevItem().currentItemIndex);
                 this.currentVisibleItem().selectCurrentItem();

                 }else{
                 if(this.firstVisibleItem().getItemByIndex(this.currentVisibleItem().currentItemIndex+1)){
                 var idx = this.currentVisibleItem().currentItemIndex+1;
                 this.currentVisibleItem().unSelectCurrentItem();
                 this.goToFirstItem();
                 this.hasScroller && this.scroller.scrollNext();
                 this.currentVisibleItem().goToItem(idx);
                 this.currentVisibleItem().selectCurrentItem();
                 return true;
                 }
                 }
                 return false;*/
            },
            /**
             * go to previous item in visible item list
             * set unfocus next item
             * set focus style to current item .
             * call current element onGetFocus method if is defined
             * call next onClearFocus method if is defined
             * @return {boolean} true if item exists or false.
             */
            focusPrevItem: function () {
                if (this.getPrevItem() && this.getPrevItem().getItemByIndex(this.currentVisibleItem().currentItemIndex)) {
                    if (this.goToPrevItem()) {
                        this.getNextItem().unSelectCurrentItem();
                        this.currentVisibleItem().goToItem(this.getNextItem().currentItemIndex);
                        this.currentVisibleItem().selectCurrentItem();
                        return true;
                    }
                }
                return false;

                /*if (this.goToPrevItem()) {
                 this.getNextItem().unSelectCurrentItem();
                 this.currentVisibleItem().goToItem(this.getNextItem().currentItemIndex);
                 this.currentVisibleItem().selectCurrentItem();
                 return true;
                 }else{
                 if(this.lastVisibleItem().getItemByIndex(this.currentVisibleItem().currentItemIndex-1)){
                 var idx = this.currentVisibleItem().currentItemIndex-1;
                 this.currentVisibleItem().unSelectCurrentItem();
                 this.goToLastItem();
                 this.hasScroller && this.scroller.scrollPrev();
                 this.currentVisibleItem().goToItem(idx);
                 this.currentVisibleItem().selectCurrentItem();
                 return true;
                 }
                 }
                 return false;*/

            }
        });
        return BaseGrid;
    });