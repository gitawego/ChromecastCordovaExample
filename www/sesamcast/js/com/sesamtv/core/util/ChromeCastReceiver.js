/* global define,console,cast */

//doc
//https://github.com/googlecast/cast-custom-receiver/blob/master/sample_media_receiver.html
//https://github.com/googlecast/CastHelloText-chrome/blob/master/receiver.html
//https://github.com/googlecast/Cast-Media-Player-Library-Sample/blob/master/MediaPlayerLibrarySample.html
define([
    './Class',
    './BaseEvented',
    './Aspect',
    './polyfill/WeakMap'
], function (klass, BaseEvented, aspect, WeakMap) {
    'use strict';
    var slice = Array.prototype.slice;
    /**
     * add this tag in head: <script src="https://www.gstatic.com/cast/js/receiver/1.0/cast_receiver.js">
     * @class com.sesamtv.core.util.ChromeCastReceiver
     * @extends com.sesamtv.core.util.BaseEvented
     */
    var ChromeCastReceiver = klass({
        extend: BaseEvented,
        constructor: function (config) {
            this.config = {
                msgPrefix: 'urn:x-cast:',
                packageName: 'com.sesamtv.chromecast',
                messageType: 'JSON',
                autoCloseTimeout: 30000,
                STATE: {
                    STARTING: 'STARTING',
                    READY: 'READY'
                },
                libs: [
                    "//www.gstatic.com/cast/sdk/libs/receiver/2.0.0/cast_receiver.js",
                    "//www.gstatic.com/cast/sdk/libs/mediaplayer/0.3.0/media_player.js"
                ],
                defaultNS: ['media'],
                debug: true,
                maxInactivityForDebug: 6000,
                appId: null,
                mediaElement: null,
                namespaces: [],
                mediaPlayer: null,
                channelHandlers: {}
            };
            config && klass.mixin(this.config, config);
            BaseEvented.call(this);
            this.config.namespaces = this.config.namespaces.concat(this.config.defaultNS);
            this.init();
        },
        init: function () {
            var self = this;
            if (document.readyState === "complete" || document.readyState === "loaded") {
                this.addLibs(this.config.libs, this.start.bind(this));
            } else {
                document.addEventListener("DOMContentLoaded", function () {
                    self.addLibs(self.config.libs, self.start.bind(self));
                }, false);
            }
        },
        addLibs: function (urls, callback) {
            var load = function (url) {
                var script = document.createElement('script');
                script.src = url;
                script.type = "text/javascript";
                script.onload = function () {
                    if (urls.length) {
                        load(urls.shift());
                    } else {
                        callback && callback();
                    }
                };
                document.body.appendChild(script);
            };
            load(urls.shift());
        },
        start: function () {
            var self = this;
            if (this.config.initialized) {
                return;
            }
            if (this.config.debug) {
                cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
            }

            this.config.initialized = true;
            this.receiver = cast.receiver.CastReceiverManager.getInstance();
            this.receiver.onReady = function (event) {
                console.log('Received Ready event: ' + JSON.stringify(event.data));
                self.receiver.setApplicationState(self.config.STATE.READY);
            };
            this.receiver.onSenderConnected = function (event) {
                self.emit('connected', event);
                console.log('Received Sender Connected event: ' + event.data);
                clearTimeout(self.config.timeout);
            };
            this.receiver.onSenderDisconnected = function (event) {
                console.log('Received Sender Disconnected event: ' + event.data);
                self.emit('disconnected', self.receiver.getSender(event.data));
                if (self.receiver.getSenders().length === 0) {
                    self.closeReceiver();
                }
            };
            this.receiver.onSystemVolumeChanged = function (event) {
                self.emit('volume', event);
                console.log('Received System Volume Changed event: ' + event.data.level + ' ' +
                    event.data.muted);
            };

            if (this.config.onVisibilityChanged) {
                this.receiver.onVisibilityChanged = this.config.onVisibilityChanged.bind(this);
                document.addEventListener('webkitvisibilitychange', function () {
                    self.config.onVisibilityChanged.bind(self);
                });
            } else {
                this.receiver.onVisibilityChanged = this.visibilityChanged.bind(this);
                document.addEventListener('webkitvisibilitychange', function () {
                    self.visibilityChanged();
                });
            }


            this.addChannels();
            this.remoteMedia(this.config.mediaElement);
            var appConfig = new cast.receiver.CastReceiverManager.Config();
            appConfig.statusText = this.config.STATE.STARTING;
            if (this.config.debug) {
                appConfig.maxInactivity = this.config.maxInactivityForDebug;
            }
            this.receiver.start(appConfig);
            this.emit('initialized');

        },
        closeReceiver: function () {
            clearTimeout(this.config.timeout);
            this.config.timeout = window.setTimeout(function () {
                window.close();
            }, this.config.autoCloseTimeout);
        },
        visibilityChanged: function (event) {
            console.log("### Cast Receiver Manager - Visibility Changed : " + JSON.stringify(event));
            /** check if visible and pause media if not - add a timer to tear down after a period of time
             if visibilty does not change back **/
            var resume = function () {
                this.config.currentMediaElement && this.config.currentMediaElement.pause();
                this.closeReceiver();
            }.bind(this);
            var pause = function () {
                this.config.currentMediaElement && this.config.currentMediaElement.pause();
                this.closeReceiver();
            }.bind(this);

            if (!event) {
                document.webkithidden ? pause() : resume();
            } else {
                event.data ? resume() : pause();
            }
        },
        getRawNSName: function (ns) {
            return this.config.msgPrefix + this.config.packageName + '.' + ns;
        },
        getNSName: function (ns) {
            return ns.replace(this.config.msgPrefix + this.config.packageName + '.', '');
        },
        remoteMedia: function (node) {
            if (typeof(node) === 'string') {
                node = document.querySelector(node);
            }
            if (this.config.mediaManager) {
                if (this.config.mediaElement === node) {
                    return this.config.mediaManager;
                } else {
                    this.config.mediaManager.setMediaElement(node);
                    this.config.mediaElement = node;
                    this.config.mediaElement.addEventListener('timeupdate', this.emitProgress.bind(this));
                }
            } else {
                this.config.mediaElement = node;
                this.config.mediaManager = new cast.receiver.MediaManager(node);
                this.config.mediaElement.addEventListener('timeupdate', this.emitProgress.bind(this));
                this.customizeMediaManagerEvents();
            }
            return this.config.mediaManager;
        },
        customizeMediaManagerEvents: function () {
            var mediaManager = this.config.mediaManager,
                self = this;
            /*mediaManager.origOnLoad = this.config.mediaManager.onLoad;
             mediaManager.onLoad = this.mediaOnLoad.bind(this);*/
            aspect.around(mediaManager, 'onLoad', function (origOnLoad) {
                return function (event) {
                    return self.mediaOnLoad(event, origOnLoad.bind(this));
                };
            });
            aspect.around(mediaManager, 'onStop', function (origOnStop) {
                return function (event) {
                    return self.mediaOnStop(event, origOnStop.bind(this));
                };
            });

        },
        mediaOnStop: function (event, origOnStop) {
            this.emit('mediaStop', event);
            origOnStop(event);
        },
        mediaOnLoad: function (event, origOnLoad) {
            var self = this,
                initialTimeIndexSeconds = event.data.media.currentTime || 0,
                protocol = null;
            if (this.config.mediaPlayer) {
                this.config.mediaPlayer.unload(); // Ensure unload before loading again
            }
            if (event.data.media && event.data.media.contentId) {
                var url = event.data.media.contentId;
                this.config.mediaHost = new cast.player.api.Host({
                    'mediaElement': this.config.mediaElement,
                    'url': url
                });
                this.config.mediaHost.onError = function (errorCode) {
                    console.error('### HOST ERROR - Fatal Error: code = ' + errorCode);
                    self.emit('playeError', errorCode);
                    if (self.config.mediaPlayer !== null) {
                        self.config.mediaPlayer.unload();
                    }
                };
                if (url.lastIndexOf('.m3u8') >= 0) {
                    // HTTP Live Streaming
                    protocol = cast.player.api.CreateHlsStreamingProtocol(this.config.mediaHost);

                } else if (url.lastIndexOf('.mpd') >= 0) {
                    // MPEG-DASH
                    protocol = cast.player.api.CreateDashStreamingProtocol(this.config.mediaHost);
                } else if (url.indexOf('.ism/') >= 0) {
                    // Smooth Streaming
                    protocol = cast.player.api.CreateSmoothStreamingProtocol(this.config.mediaHost);
                }
                if (protocol === null) {
                    // Call on original handler
                    delete this.config.mediaPlayer;
                    origOnLoad(event); // Call on the original callback
                } else {
                    // Advanced Playback - HLS, MPEG DASH, SMOOTH STREAMING
                    // Player registers to listen to the media element events through the mediaHost property of the
                    // mediaElement
                    this.config.mediaPlayer = new cast.player.api.Player(this.config.mediaHost);
                    this.config.mediaPlayer.load(protocol, initialTimeIndexSeconds);
                }

            }
            this.emit('mediaLoad', event);
        },
        emitProgress: function (evt) {
            if (this.config.mediaPlayer) {
                //do not emit for live streaming
                return;
            }
            var video = evt.target;
            if (!video.currentTime && !video.duration) {
                this.emit('mediaStop');
            }
            this.sendMessage('media', {
                name: "timeupdate",
                message: {
                    currentTime: video.currentTime,
                    duration: video.duration
                }
            });
        },
        addChannels: function () {
            var self = this;
            this.config.namespaces.forEach(function (ns) {
                ns = this.getRawNSName(ns);
                this.config.channelHandlers[ns] = self.receiver.
                    getCastMessageBus(ns, cast.receiver.CastMessageBus.MessageType[this.config.messageType]);
                this.config.channelHandlers[ns].onMessage = function (event) {
                    console.log('onmessage from sender', ns, event);
                    self.emit(self.getNSName(ns), event);
                };
            }, this);
        },
        /**
         * @method sendMessage
         * @param {String} channelName
         * @param {*} message
         * @param {Number} [senderId]
         */
        sendMessage: function (channelName, message, senderId) {
            var handler = this.config.channelHandlers[this.getRawNSName(channelName)];
            console.log('send message to sender', channelName, handler);
            if (handler) {
                if (typeof(senderId) === 'undefined') {
                    handler.broadcast(message);
                } else {
                    handler.send(senderId, message);
                }
            }
            return this;
        },
        stop: function () {
            this.receiver.stop();
        }
    });
    return ChromeCastReceiver;
});