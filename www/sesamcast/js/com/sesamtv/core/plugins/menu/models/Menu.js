define([
    '../../../util/Class',
    '../../../abstract/plugin/BaseModel'
], function (Class, BaseModel) {
    'use strict';
    var VodMenu = Class({
        extend: BaseModel,
        constructor: function VodMenu(binder, plugin) {
            BaseModel.call(this, binder, plugin);
        },
        init: function () {

        },
        grid: function () {
            return xhr();
        },
        menu: function () {
            return [
                {
                    name: 'tf1 France',
                    keyword: 'tf1 france',
                    subTitle: "sub title",
                    logo: './assets/common/images/logo_bbox_vod.png?t=1',
                    cls: 'selected'
                },
                {
                    name: 'France 24',
                    //keyword: '',
                    author:'france24',
                    subTitle: "sub title",
                    logo: './assets/common/images/logo_bbox_vod.png?t=1',
                    cls: ''
                },
                {
                    name: 'M6 France',
                    keyword: 'M6 france',
                    subTitle: "sub title",
                    logo: './assets/common/images/logo_bbox_vod.png?t=2',
                    cls: ''
                },
                {
                    name: 'HBO',
                    keyword: 'trailer',
                    author:'hbo',
                    subTitle: "toutes les bande annonces récentes du HBO",
                    logo: './assets/common/images/logo_bbox_vod.png?t=3',
                    cls: ''
                }
            ];
        },
        loadGrid: function (evt, data) {

            var itemInfo = data.params.item;
            console.log('itemInfo', itemInfo, evt);
            //this.binder.set('logo',itemInfo.logo);
            this.plugin.selectCurrentItem(evt.target.nodeName === 'SPAN' ? evt.target.parentNode : evt.target, itemInfo);


        },
        subTitle: ''
    });
    return VodMenu;
});