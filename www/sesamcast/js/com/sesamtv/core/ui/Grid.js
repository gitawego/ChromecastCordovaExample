define([
    'require',
    '../util/Class',
    './BaseGrid',
    './Panel',
    './BaseScroller',
    '../engine/input/Manager'
], function (require, Class, BaseGrid, Panel, BaseScroller, InputManager) {
    "use strict";
    var inputManager = new InputManager();
    /**
     * template:
     *      <section id='myScroller'><div class='grid' id='myGrid'>
     *          <div class='group'>
     *              <figure class='cell'></figure>
     *              <figure class='cell'></figure>
     *          </div>
     *      </div></section>
     *
     * notice for set-top box:
     *      * use css property background-image instead of tag <img>
     *      * use float:left instead of display:inline-block
     * @class com.sesamtv.core.ui.Grid
     * @extends com.sesamtv.core.ui.BaseGrid
     * @requires com.sesamtv.core.ui.Panel
     * @requires com.sesamtv.core.ui.BaseScroller
     * @cfg {Object} args
     * @cfg {Boolean} args.hasScroller
     * @cfg {String} args.cellQuery selector query string for cells
     * @cfg {String} [args.gridLayoutType=y] y (vertical) or x(horizontal)
     * @cfg {String} [args.usingScrollStyle] webkitTransform, top or left(todo)
     * @cfg {HTMLElement|String} node
     */
    var Grid = Class({
        extend: BaseGrid,
        constructor: function (args, node) {
            args = args || {};
            args.type = 'grid';
            args.baseClass = args.baseClass || 'grid';
            args.itemSelector = args.itemSelector || '* > div';
            this.gridLayoutType = args.gridLayoutType || 'y';

            this.cellQuery = args.cellQuery || '* > figure';
            BaseGrid.call(this, args, node);
            this.cellTag = this.cellTag || 'figure';
            this.cellTpl && this.setItemTemplate(this.cellTpl);
            this.maxCells = this.maxCells || 48;
            this.disabled = false;

        },
        /**
         * attach component and events to the HTMLElement
         * @method attachTo
         * @param {HTMLElement|String} node
         */
        attachTo: function (node) {
            var self = this;
            BaseGrid.prototype.attachTo.call(this, node);
            this.node.classList.add(this.gridLayoutType);
            if (this.hasScroller === true) {
                this.scroller = new BaseScroller({
                    scrollElementLayoutType: this.gridLayoutType,
                    scrollElement: this,
                    usingScrollStyle: this.usingScrollStyle
                }, this.node.parentNode);
            }
            this.importItems(Panel, null, {
                autoImport: true,
                baseClass: 'group',
                itemSelector: this.cellQuery,
                importCmp: Panel,
                importArgs: {
                    baseClass: 'cell'
                }
            });
            this.connect.push(inputManager.on('LeftKey', function () {
                if (self.disabled) {
                    return;
                }
                self.focusPrevItem();
            }));
            this.connect.push(inputManager.on('RightKey', function () {
                if (self.disabled) {
                    return;
                }
                self.focusNextItem();
            }));
            this.connect.push(inputManager.on('UpKey', function () {
                if (self.disabled) {
                    return;
                }
                self.currentVisibleItem().goPrev();
                self.scroller.scrollPrev();

            }));
            this.connect.push(inputManager.on('DownKey', function () {
                if (self.disabled) {
                    return;
                }
                /*if(self.currentVisibleItem().visibleItemList.length - self.currentVisibleItem().currentItemIndex ==3){
                 console.log('here');
                 self.setFromData(self.store.getItems(),{
                 range:{
                 min:0,
                 max:self.maxCells
                 },
                 startIndex:self.currentVisibleItem().visibleItemList.length-1
                 },true);
                 }*/
                self.currentVisibleItem().goNext();
                self.scroller.scrollNext();

            }));
            this.connect.push(inputManager.on('EnterKey', function () {
                if (self.disabled) {
                    return;
                }
                self.emit('enter', self.currentVisibleItem().currentVisibleItem());
            }));
            this.initStore();
        },
        detach: function () {
            BaseComponent.prototype.detach.call(this);
            this.node.classList.remove(this.gridLayoutType);
        },
        initStore: function () {
            var self = this;
            if (this.store) {
                return this.emit('loaded');
            }
            require(['../store/' + this.storeType], function (Store) {
                (self.store = new Store({
                    url: self.storeUrl,
                    defFetchParams: self.defFetchParams,
                    data: self.data
                })).once('loaded', function () {
                        self.emit('storeLoaded');
                    });
                self.store.load();
            });
        },
        /**
         * fille grid by given data
         * @method fillGrid
         */
        fillGrid: function () {
            if (this.setFromData(this.store.getItems(), {
                range: {
                    min: 0,
                    max: this.maxCells
                }
            })) {
                this.firstItem().selectCurrentItem();
                this.scroller.set('scrollSizeUnit', +getComputedStyle(this.firstItem().firstItem().node).height.replace('px', ''));
                this.scroller.focus();

            }
        }
    });
    return Grid;
});