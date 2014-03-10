define([
        '../util/Class',
        './BaseComponent',
        './MenuItem',
        '../engine/input/Manager'
    ],
    function (Class, BaseComponent, MenuItem, InputManager) {
        "use strict";
        var inputManager = new InputManager();
        /**
         * @class com.sesamtv.core.ui.Menu
         * @extends com.sesamtv.core.ui.BaseComponent
         * @requires com.sesamtv.core.ui.MenuItem
         * @requires com.sesamtv.core.engine.InputManager
         */
        var Menu = Class({
            extend: BaseComponent,
            constructor: function (args, node) {
                args.type = 'menu';
                args.baseClass = args.baseClass || 'menu';
                args.itemSelector = args.itemSelector || '* > li';
                BaseComponent.call(this, args, node);
                //this.importItems(MenuItem,this.itemSelector);
            },
            attachTo: function (node) {
                var self = this;
                BaseComponent.prototype.attachTo.call(this, node);
                this.importItems(MenuItem, this.itemSelector);
                this.connect.push(inputManager.on('LeftKey', function () {
                    self.focusPrevItem();
                }));
                this.connect.push(inputManager.on('RightKey', function () {
                    self.focusNextItem();
                }));
                this.connect.push(inputManager.on('UpKey', function () {
                    self.currentVisibleItem().goPrev();
                }));
                this.connect.push(inputManager.on('DownKey', function () {
                    self.currentVisibleItem().goNext();
                }));
                this.connect.push(inputManager.on('EnterKey', function () {
                    self.emit('enter');
                }));
                this.firstItem().focus();
                this.firstItem().selectCurrentItem();
            }
        });
        return Menu;
    });