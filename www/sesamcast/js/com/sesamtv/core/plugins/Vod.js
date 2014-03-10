define([
    '../util/Class',
    '../abstract/plugin/BasePlugin',
    '../util/Helper'
], function (Class, BasePlugin, helper) {
    "use strict";

    /**
     * @class com.sesamtv.core.plugins.vod.Plugin
     * @extends com.sesamtv.core.abstract.BasePlugin
     * @requires com.sesamtv.core.util.XHR
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     */
    var Vod = Class({
        extend: BasePlugin,
        constructor: function (config) {
            BasePlugin.call(this, config);

            this.url = this.url || '../common/localdata/epg/getChannels.json';

            this.itemsPerPage = this.itemsPerPage || 48;
            this.startIndex = 0;
            this.defFetchParams = this.defFetchParams || {};
            Object.defineProperties(this, {
                'maxResults': {
                    get: function () {
                        return Math.min(1000, this.getValue('totalResults'));
                    }
                }
            });
            this.binders = {};
        },
        show:function(){
            console.log('show called');
        },
        list:function(param){
            console.log('list called');
            var self = this;
            //for hacking only
            this.config.root = document.querySelector('#container');
            this.config.root.innerHTML = '<div class="vodMenu" style="float:left;width:20%">' +
                '</div><div class="trailers" style="float:left;width:80%"></div>';
            //end hacking
            this.bindView(helper.shallowMixin(param|| {},this.config.components.vodMenu)).then(function(){
                  self.bindView(self.config.components.trailers).then(function(binder){
                      binder.model.trailers.update('tf1');
                  });
            });
        },
        getTrailers:function(){
            console.log('getTrailers called');
            var bindCfg = this.config.components.getTrailers,
                self = this;
            this.bindView(bindCfg).then(function(binder){

            });

        },
        play:function(){
            console.log('play called');
        },
        launch:function(){

        },
        stop:function(){

        }
    });
    return Vod;
});