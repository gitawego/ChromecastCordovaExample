define([
    '../util/Class',
    '../abstract/plugin/BasePlugin',
    '../engine/Topic',
    '../util/Helper',
    '../util/DomEvent',
    '../util/Dom',
    '../util/Array',
    '../util/keyboard'
], function (klass, BasePlugin, topic, helper, DomEvent, domHelper, arrayHelper, keyboard) {
    "use strict";

    /**
     * @class com.sesamtv.core.plugins.Menu
     * @extends com.sesamtv.core.abstract.plugin.BasePlugin
     * @requires com.sesamtv.core.util.XHR
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     */
    var Menu = klass({
        extend: BasePlugin,
        constructor: function Menu(config) {
            BasePlugin.call(this, config);

            this.url = this.url || '../common/localdata/epg/getChannels.json';

            this.itemsPerPage = this.itemsPerPage || 48;
            this.startIndex = 0;
            this.defFetchParams = this.defFetchParams || {};
            this.timer = null;
            this.timeout = 400;
            Object.defineProperties(this, {
                'maxResults': {
                    get: function () {
                        return Math.min(1000, this.getValue('totalResults'));
                    }
                }
            });
            this.binders = {};
        },
        initEvents: function () {
            var self = this;
            BasePlugin.prototype.initEvents.call(this);
            this.connect.push(this.on('focus', function () {
                topic.pub('focusManager/selectMap');
            }));

            this.connect.push(this.on('unselected', function () {
                self.unselect.apply(self, arguments);
            }));
            this.connect.push(this.on('selected', function () {
                self.select.apply(self, arguments);
            }));
            this.connect.push(this.on('selectItem', function (itemData) {
                self.setConfig('currentMenuItem', itemData);
            }));
        },
        exitApp: function () {
            navigator.notification.confirm("Vous voulez vraiment quitter l'application ?",
                function (buttonIndex) {
                    if (buttonIndex === 1) {
                        navigator.app.exitApp();
                    }
                },
                'SesamTV Vod',
                ['YES', 'NO']
            );
        },
        goToPrevItem: function (evt) {
            console.log('goToPrevItem');
            var root = this.getRoot(),
                self = this,
                node = root.getElementsByClassName('focus')[0] || root.getElementsByClassName('selected')[0];
            clearTimeout(this.timer);
            if (node.previousElementSibling) {
                node.classList.remove('focus');
                node.previousElementSibling.classList.add('focus');
                this.timer = setTimeout(function () {
                    self.selectCurrentItem();
                }, this.timeout);
            }

        },
        goToNextItem: function (evt) {
            console.log('goToNextItem');
            var root = this.getRoot(),
                self = this,
                node = root.getElementsByClassName('focus')[0] || root.getElementsByClassName('selected')[0];
            clearTimeout(this.timer);
            if (node.nextElementSibling) {
                node.classList.remove('focus');
                node.nextElementSibling.classList.add('focus');
                this.timer = setTimeout(function () {
                    self.selectCurrentItem();
                }, this.timeout);
            }
        },
        selectCurrentItem: function (target, itemData) {
            var selectedNode = this.getRoot().getElementsByClassName('selected')[0],
                focusNode = target || this.getRoot().getElementsByClassName('focus')[0],
                binder = this.binders[this.config.components.vodMenu.namespace];
            if (!focusNode) {
                return;
            }
            itemData = itemData || binder.model.menu.getItemData(focusNode);
            binder.set('subTitle', itemData.name + ' > ' + itemData.subTitle);
            focusNode.classList.remove('focus');
            focusNode.classList.add('selected');
            selectedNode.classList.remove('selected');
            this.emit('selectItem', itemData);
        },
        handleToFocusManager: function (evt, params) {
            this.emit('unselected', evt, params);
        },
        unselect: function (evt, params) {
            this.getRoot().classList.remove('selected');
            var focusNode = this.getRoot().getElementsByClassName('focus')[0];
            if (focusNode) {
                focusNode.classList.remove('focus');
            }
        },
        select: function () {
            this.getRoot().classList.add('selected');
        },
        show: function () {
            console.log('show called');
        },
        list: function (param) {
            console.log('list called');
            if (this.initialized) {
                return;
            }

            var self = this, itemData;
            this.bindView(helper.shallowMixin(param || {}, this.config.components.vodMenu)).then(function (binder) {
                /*self.loadingScreen(true,function(){
                 itemData = binder.model.menu.getItemData(self.getRoot().querySelector('.selected'));
                 self.emit('selectItem',itemData);
                 binder.set('subTitle',itemData.name+' > '+itemData.subTitle);
                 self.initialized = true;
                 });*/
                itemData = binder.model.menu.getItemData(self.getRoot().querySelector('.selected'));
                self.emit('selectItem', itemData);
                binder.set('subTitle', itemData.name + ' > ' + itemData.subTitle);
                self.initialized = true;

            });
        },
        loadingScreen: function (hide, callback) {
            var node = document.body.getElementsByClassName('loader')[0],
                isHidden = node.classList.contains('off');
            if ((hide && isHidden) || (!hide && !isHidden)) {
                return callback && callback();
            }
            DomEvent.once(node, domHelper.whichTransitionEvent(), function () {
                if (hide) {
                    node.style.display = 'none';
                }
                callback && callback();
            });
            if (!hide) {
                node.style.display = '';
            }
            node.classList[hide ? 'add' : 'remove']('off');
        },
        play: function () {
            console.log('play called');
        },
        launch: function () {

        },
        stop: function () {

        }
    });
    return Menu;
});