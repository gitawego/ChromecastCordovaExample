define([
    '../util/Class'
], function (Class) {
    "use strict";
    /**
     * @class com.sesamtv.core.ui.ItemList
     * @uses com.sesamtv.core.ui.BaseView
     * @cfg {com.sesamtv.core.ui.BaseView} parent
     */
    var ItemList = Class({
        constructor: function ItemList(parent) {
            /**
             * @property items
             * @type {Array.<com.sesamtv.core.ui.BaseView>}
             */
            this.items = [];
            this.parent = parent;
            this.currentItemIndex = 0;
            var _visibleItems = [];
            /**
             * @method visibleItems
             * @returns {Array}
             */
            this.visibleItems = function () {
                if (_visibleItems.length) {
                    return _visibleItems;
                }
                _visibleItems = this._getVisibleItemList();
                return _visibleItems;
            };

        },
        set: function (k, v) {
            var oldV = this[k];
            this[k] = v;
            this.parent.emit(k, {
                oldValue: oldV,
                newValue: v
            });
        },

        /**
         * @method _getVisibleItemList
         * @private
         * @return {Array}
         */
        _getVisibleItemList: function () {
            return this.items.filter(function (child) {
                return child.isVisible();
            });
        },
        /**
         * @method firstVisibleItem
         * @return {Object}
         */
        firstVisibleItem: function () {
            return this.visibleItems()[0];
        },
        /**
         * @method lastVisibleItem
         * @return {Object}
         */
        lastVisibleItem: function () {
            var visibleItems = this.visibleItems();
            return visibleItems[visibleItems.length - 1];
        },
        /**
         * @method currentVisibleItem
         * @return {Object}
         */
        currentVisibleItem: function () {
            return this.visibleItems()[this.currentItemIndex];
        },
        /**
         * @method firstItem
         * @return {Object}
         */
        firstItem: function () {
            return this.items[0];
        },

        /**
         * @method lastItem
         * @return {Object}
         */
        lastItem: function () {
            return this.items[this.items.length - 1];
        },

        /**
         * @method currentItem
         * @return {Object}
         */
        currentItem: function () {
            return this.items[this.currentItemIndex];
        },

        /**
         * @method getPrevItem
         * @return {Object}
         */
        getPrevItem: function () {
            return this.visibleItems()[this.currentItemIndex - 1];
        },
        /**
         * @method getNextItem
         * @return {Object}
         */
        getNextItem: function () {
            return this.visibleItems()[this.currentItemIndex + 1];
        },
        getItemByIndex: function (index) {
            return this.visibleItems()[index];
        },
        /**
         * increase item index from visible item list .
         * @return {boolean} return true or false if is that the last element.
         */
        goToNextItem: function () {
            if (this.currentItemIndex < (this.itemList.visibleItems().length - 1)) {
                this.itemList.set('currentItemIndex', this.currentItemIndex + 1);
                return true;
            }
            return false;
        },
        /**
         * decrease item index from visible item list .
         * @return {boolean} return true or false if is that the first element.
         */
        goToPrevItem: function () {
            if (this.currentItemIndex > 0) {
                //this.currentItemIndex--;
                this.set('currentItemIndex', this.currentItemIndex - 1);
                return true;
            }
            return false;
        },
        goToItem: function (index) {
            if (!~this.visibleItems().indexOf(index)) {
                this.set('currentItemIndex', index);
                return true;
            }
            return false;
        },
        goToFirstItem: function () {
            this.set('currentItemIndex', 0);
        },
        goToLastItem: function () {
            this.set('currentItemIndex', this.visibleItems().length - 1);
        },
        /**
         * set selected style to current visible item .
         * execute onSelected method as call back
         * @return {boolean} .
         */
        selectCurrentItem: function () {
            var item = this.visibleItems()[this.currentItemIndex];
            item.select();
            return true;
        },
        /**
         * remove selected style to current visible item
         * @return {boolean} .
         */
        unSelectCurrentItem: function () {
            var item = this.visibleItems()[this.currentItemIndex];
            item.unselect();
            return true;
        },
        unSelectNextItem: function () {
            var item = this.visibleItems()[this.currentItemIndex + 1];
            item.unselect();
            return true;
        },
        unSelectPrevItem: function () {
            var item = this.visibleItems()[this.currentItemIndex - 1];
            item.unselect();
            return true;
        },
        /**
         * go to next item in visible item list
         * set selected style to current visible item .
         * set unselected previous item
         * call element onSelected method if is defined
         * @return {boolean} true if next item exists or false.
         */
        goNext: function () {
            if (this.goToNextItem()) {
                this.unSelectPrevItem();
                this.selectCurrentItem();
                return true;
            }
            return false;
        },
        /**
         * go to previous item in visible item list
         * set selected style to current visible item .
         * set unselected next item
         * call element onSelected method if is defined
         * @return {boolean} true if previous item exists or false.
         */
        goPrev: function () {
            if (this.goToPrevItem()) {
                this.unSelectNextItem();
                this.selectCurrentItem();
                return true;
            }
            return false;
        },
        /**
         * set unselected current item
         * go to index item in visible item list
         * set selected style to index visible item .
         * call element onSelected method if is defined
         *
         * @param {Number} index wanted item index
         * @return {Boolean} true if index item exists or false.
         */
        goIndex: function (index) {
            this.unSelectCurrentItem();
            if (this.goToItem(index)) {
                this.selectCurrentItem();
                return true;
            }
            this.selectCurrentItem();
            return false;
        },

        /**
         * go to next item in visible item list
         * set unfocus previous item
         * set focus style to current item .
         * call current element onGetFocus method if is defined
         * call previous onClearFocus method if is defined
         * @method focusNextItem
         * @return {boolean} true if item exists or false.
         */
        focusNextItem: function () {
            if (this.goToNextItem()) {
                this.currentVisibleItem().focus();
                this.currentVisibleItem().selectCurrentItem();
                this.unFocusPrevItem();
                return true;
            }
            return false;
        },
        /**
         * go to previous item in visible item list
         * set unfocus next item
         * set focus style to current item .
         * call current element onGetFocus method if is defined
         * call next onClearFocus method if is defined
         * @method focusPrevItem
         * @return {boolean} true if item exists or false.
         */
        focusPrevItem: function () {
            if (this.goToPrevItem()) {
                this.getNextItem().unSelectCurrentItem();
                this.getNextItem().goToFirstItem();
                this.currentVisibleItem().focus();
                this.unFocusNextItem();
                this.currentVisibleItem().selectCurrentItem();
                return true;
            }
            return false;
        },
        unFocusNextItem: function () {
            this.getNextItem().blur();
        },
        unFocusPrevItem: function () {
            this.getPrevItem().blur();
        },
        /**
         * import sub items based on query string
         * @method importItems
         * @param {Object} [CmpClass]
         * @param {String} [queryStr={@link #itemSelector}] DOM selector
         * @param {Object} [defArgs] default arguments for each item
         * @return {*}
         */
        importItems: function (CmpClass, queryStr, defArgs) {
            var items = this.parent.config.node.querySelectorAll(queryStr || this.parent.config.itemSelector),
                i = 0, l = items.length;
            for (; i < l; i++) {
                this.addItem(new (CmpClass || this.parent.config.importCmp)(defArgs || this.parent.config.importArgs || {}, items[i]), true);
            }
            //refresh visible item list
            this.visibleItems().length = 0;
            return this;
        },
        /**
         * add a child component
         * @method addItem
         * @param {Object} item
         * @param {Boolean} [create]
         * @param {String|Number} [pos] position: first (insert before) or last (insert after) or an index number
         */
        addItem: function (item, create, pos) {
            var idx, m1 = ['last', 'first'], m2 = ['push', 'unshift'];
            if (this.items.indexOf(item) !== -1) {
                return false;
            }
            if (typeof(pos) === 'undefined') {
                pos = 'last';
            }
            item.set('parent', this);
            idx = m1.indexOf(pos);
            if (idx !== -1) {
                this.items[m2[idx]](item);
            } else {
                pos = +pos;
                this.items.splice(pos, 0, item);
            }

            if (create) {
                item.config.container = this.parent.config.innerElement || this.parent.config.node;
                item.attachTo(item.config.container, true, pos);
            }
            this.parent.emit('addItem', item);
            return true;
        },
        /**
         * remove item, if item has ID, remove it from cmpList as well
         * @method removeItem
         * @param {Number|String|Object} item item index or item id
         * @param {Boolean} [removeFromDOM]
         * @param {Boolean} [noRefresh]
         */
        removeItem: function (item, removeFromDOM, noRefresh) {
            var itemInst, type;
            switch (typeof(item)) {
                case 'number':
                    type = 'index';
                    itemInst = this.items[item];
                    this.items.splice(item, 1);
                    break;
                case 'string':
                    type = 'id';
                    this.items.some(function (itm, i) {
                        if (itm.config.id === item) {
                            itemInst = itm;
                            this.items.splice(i, 1);
                            return true;
                        }
                    }, this);
                    break;
                default:
                    type = 'item';
                    itemInst = item;
                    this.items.splice(this.items.indexOf(item), 1);
            }
            if (!itemInst) {
                return false;
            }
            itemInst.destroy();
            !noRefresh && (this.visibleItems().length = 0);
            this.parent.emit('removeItem', {
                type: type,
                item: item
            });
            //break reference
            itemInst = null;
            return true;
        }
    });
    return ItemList;
});