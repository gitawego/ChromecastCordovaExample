define([
    '../util/Class',
    '../abstract/plugin/BasePlugin',
    'module'
], function (Class, BasePlugin,module, xhr) {
    "use strict";
    /**
     * @class com.sesamtv.core.plugins.Player
     * @extends com.sesamtv.core.abstract.BasePlugin
     * @requires com.sesamtv.core.util.XHR
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     */
    var Player = Class({
        extend: BasePlugin,
        constructor: function (config) {
            this.config = {
                initialized:false
            };
            Class.mixin(this.config,module.config());
            BasePlugin.call(this, config);

            //this.init();
        },
        init: function () {
            var self = this;
            window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
                self.player = new YT.Player(self.config.playerId, {
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        rel: 0,
                        modestbranding: true,
                        enablejsapi: 1
                        //in ios, video can't be auto-started, it must be confirmed by user.
                        , controls: /iPhone|iPod|iPad/.test(navigator.userAgent) ? 1 : 0, format: 5
                    },
                    events: {
                        'onReady': function Youtube_player_onReady() {
                            //console.log('onPlayerReady')
                            self.player.ready = true;

                            self.player.hide = function Youtube_player_hide() {
                                this.getIframe().style.display = 'none';
                                return this;
                            };
                            self.player.show = function Youtube_player_show() {
                                this.getIframe().style.display = 'block';

                                return this;
                            };
                        }
                    }
                });
                self.setConfig('initialized',true);
                delete window.onYouTubeIframeAPIReady;
            };
            var tag = document.createElement('script');
            tag.src = "http://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
        },
        launch: function () {

        },
        stop: function () {

        }
    });
    return Player;
});