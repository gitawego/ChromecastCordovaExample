/*global require,define,console,alert, YT*/
/*jslint plusplus: true */
/*jslint expr:true */
define([
    '../util/Class',
    '../util/HTML5Player',
    '../util/YouTubeVideo',
    '../abstract/plugin/BasePlugin',
    '../engine/Topic',
    '../util/has',
    'module'
], function (klass, HTML5Player, YouTubeVideo, BasePlugin, topic, has, module, xhr) {
    "use strict";
    /**
     * @class com.sesamtv.core.plugins.YoutubePlayer
     * @extends com.sesamtv.core.abstract.BasePlugin
     * @requires com.sesamtv.core.util.XHR
     * @cfg {Object} config
     * @cfg {Object} config.defFetchParams
     */
    var YoutubePlayer = klass({
        extend: BasePlugin,
        constructor: function (config) {
            this.config = {
                html5: true,
                initialized: false,
                playerReady: false
            };
            if (typeof(YT) !== 'undefined') {
                this.PlayerClass = YT;
            }
            klass.mixin(this.config, module.config());
            BasePlugin.call(this, config);
            if (this.config.html5) {
                this.fetcher = YouTubeVideo;
                this.PlayerClass = HTML5Player;
            }
            //this.init();
            this.attachEvents();
        },
        init: function () {
            var self = this;
            if (typeof(YT) === 'undefined') {
                window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
                    self.createPlayer();
                    delete window.onYouTubeIframeAPIReady;
                };
            } else {
                this.createPlayer();
            }

        },
        attachEvents: function () {
            var self = this, node;
            this.connect.push(this.on('selected', function () {
                console.log('player selected');
                topic.pub('inputManager/getCurrentChannel', function (channelId) {
                    self.prevInputChannel = channelId;
                });
                topic.pub('inputManager/setCurrentChannel', self.config.id);
                node = self.getPlayer();
                if (node) {
                    node.classList.add('selected');
                }

            }));
            this.connect.push(this.on('unselected', function () {
                self.prevInputChannel && topic.pub('inputManager/setCurrentChannel', self.prevInputChannel);
                delete self.prevInputChannel;
                node = self.getPlayer();
                if (node) {
                    node.classList.remove('selected');
                }
            }));
        },
        getPlayer: function () {
            if (!this.player) {
                return;
            }
            if (this.config.html5) {
                return this.player.getPlayer();
            }
            return this.player.getIframe();
        },
        initPlayer:function(){
            this.player && this.player.init();
        },
        createPlayer: function () {
            var self = this;
            if (this.player) {
                return;
            }
            if (this.config.html5) {
                this.player = new HTML5Player(null, this.config.playerId);
                self.setConfig('playerReady', true);
            } else {
                this.player = new YT.Player(this.config.playerId, {
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        rel: 0,
                        modestbranding: true,
                        enablejsapi: 1,
                        //in ios, video can't be auto-started, it must be confirmed by user.
                        controls: /iPhone|iPod|iPad/.test(navigator.userAgent) ? 1 : 0,
                        format: 5
                    },
                    events: {
                        'onReady': function Youtube_player_onReady() {
                            //console.log('onPlayerReady')
                            self.setConfig('playerReady', true);

                        }
                    }
                });
            }

            this.setConfig('initialized', true);
        },
        attachEventViaTopic: function (evtName, fnc, opt) {
            opt = opt || {};
            var h = this[opt.once ? 'once' : 'on'](evtName, fnc);
            opt.callback && opt.callback(h);
            return h;
        },
        loadVideoFromData: function (data) {
            var self = this,
                fetchParams = {
                    data: data,
                    callback: function (video) {
                        console.log('video', video);
                        var mp4 = video.getSource("video/mp4", "hd720");
                        self.emit('selected');
                        self.player.loadVideo({
                            sources: [
                                {
                                    src: mp4.url,
                                    type: mp4.type ? mp4.type.replace(/\+/g, ' ') : 'mp4'
                                }
                            ],
                            poster: self.player.config.node.style.backgroundImage.match(/url\((.*)\)/)[1],
                            controls: true,
                            autoplay: true
                        });
                    }
                };
            if (this.config.html5) {
                if (!this.config.playerReady) {
                    return;
                }

                this.fetcher(null, fetchParams);

            }
        },
        loadVideo: function (id, format) {
            var self = this,
                fetchParams = {
                    callback: function (video) {
                        console.log('video', video);
                        var mp4 = video.getSource("video/mp4", "hd720");
                        self.emit('selected');
                        self.player.loadVideo({
                            sources: [
                                {
                                    src: mp4.url,
                                    type: mp4.type ? mp4.type.replace(/\+/g, ' ') : 'mp4'
                                }
                            ],
                            poster: self.player.config.node.style.backgroundImage.match(/url\((.*)\)/)[1],
                            controls: true,
                            autoplay: true
                        });
                    }
                };
            if (this.config.html5) {
                if (!this.config.playerReady) {
                    return;
                }
                if (has('cordova')) {
                    return xhr.request(this.fetcher.buildInfoUrl(id)).
                        on('load',function (data) {
                            fetchParams.data = data;
                            self.fetcher(null, fetchParams);
                        }).send();
                }
                this.fetcher(id, fetchParams);

                return;
            }
            if (this.config.playerReady) {
                this.emit('selected');
                this.player.loadVideoById(id, null, format || 'default');
            } else {
                var h = this.on('config', function (v) {
                    if (v.key === 'playerReady' && v.newValue === true) {
                        h.remove();
                        h = null;
                        self.emit('selected');
                        self.player.loadVideoById(id, null, format || 'default');
                    }
                });
            }
        },
        playVideo: function () {
            return this.player.playVideo();
        },
        stopVideo: function () {
            //this.emit('unselected');
            console.log('stop video');
            return this.player.stopVideo();
        },
        seekTo: function (seconds, allowSeekAhead) {
            return this.player.seekTo(seconds, allowSeekAhead);
        },
        seekBy: function (evt, num) {
            this.seekTo(Math.round(this.player.getCurrentTime() + num));
        },
        pauseVideo: function () {

            var state = this.player.getPlayerState();

            if (state === this.PlayerClass.PlayerState.PAUSED) {
                return this.player.playVideo();
            }
            if (state === this.PlayerClass.PlayerState.PLAYING) {
                return this.player.pauseVideo();
            }
        },
        muteVideo: function (unmute) {
            return this.player[unmute ? 'unmute' : 'mute']();
        },
        volume: function (vol) {
            return this.player[typeof(vol) === 'number' ? 'setVolume' : 'getVolume'](vol);
        },
        setVolumeBy: function (num) {
            return this.volume(this.volume() + num);
        },
        stepBack: function () {
            var state = this.player.getPlayerState(), states = this.PlayerClass.PlayerState;
            if (state === states.PLAYING) {
                this.stopVideo();
            }
            if (state === states.UNSTARTED) {
                this.destroyPlayer();
            }
        },
        fullscreen: function () {
            var node = this.getPlayer(), classList;
            if (!node) {
                return;
            }
            classList = node.classList;
            if (classList.contains('fullscreen')) {
                classList.remove('fullscreen');
                node.style.height = '';
                return;
            }

            classList.add('fullscreen');
            if (!has('phonegap')) {
                //node.style.height = screen.availHeight+'px';
            }


        },
        destroyPlayer: function () {
            if (!this.player) {
                return;
            }
            this.stopVideo();
            this.player.destroy();
            this.setConfig('playerReady', false);
            delete this.player;
            this.emit('unselected');
            this.emit('playerDestroyed');
        },
        launch: function () {

        },
        stop: function () {

        }
    });
    return YoutubePlayer;
});