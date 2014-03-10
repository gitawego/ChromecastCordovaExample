/* global define,console,chrome */

define([
    './Class',
    './BaseEvented',
    './DomEvent',
    './Promise'
], function (klass, BaseEvented, domEvent, promise) {
    'use strict';
    /**
     *
     * @class com.sesamtv.core.util.ChromeCast
     * @extends com.sesamtv.core.util.BaseEvented
     */
    var ChromeCast = klass({
        extend: BaseEvented,
        constructor: function ChromeCast(args) {
            this.config = {
                msgPrefix: 'urn:x-cast:',
                timerStep: 1000,
                currentMediaTime: 0,
                packageName: 'com.sesamtv.chromecast',
                /**
                 * @cfg {String} appId
                 */
                appId: '',
                libSrc: '//www.gstatic.com/cv/js/sender/v1/cast_sender.js',
                msgCache: {}
            };
            Object.defineProperties(this.config, {
                "playerState": {
                    get: function () {
                        return this.currentMediaSession && this.currentMediaSession.playerState;
                    }
                },
                PLAYER_STATE: {
                    get: function () {
                        return chrome.cast.media.PlayerState;
                    }
                }
            });
            args && klass.mixin(this.config, args);
            BaseEvented.call(this);
            //this.init();
        },
        init: function () {
            if (this.config.initialized) {
                return;
            }
            var self = this;
            if (window.chrome.cast && window.chrome.cast.isAvailable) {
                // Cast is known to be available
                this.initializeApi();
            } else {
                this.addLib(function () {
                    var timer = setInterval(function () {
                        if (window.chrome.cast && window.chrome.cast.isAvailable) {
                            self.initializeApi();
                            clearInterval(timer);
                        }
                    }, 10);

                });
            }
        },
        addLib: function (callback, src) {
            src = src || this.config.libSrc;
            var script = document.createElement('script');
            script.onload = function () {
                callback && callback();
            };
            document.body.appendChild(script);
            script.src = src;
        },
        initializeApi: function () {
            if (this.config.initialized) {
                return;
            }
            if (!this.config.appId) {
                this.config.appId = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
            }
            var self = this;
            var sessionRequest = new chrome.cast.SessionRequest(this.config.appId);
            var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
                function (session) {
                    console.log('New session ID: ' + session.sessionId, session);
                    self.config.session = session;
                    if (session.media.length) {
                        self.onRequestSessionSuccess(session);
                        self.onMediaDiscovered('activeSession', session.media[0]);
                        self.emit('activeSession', session);
                    }
                    self.emit('session', session);
                    self.attachCoreEvents();
                    session.addUpdateListener(self.sessionUpdateListener.bind(self));
                },
                function (e) {
                    console.log('receiver ready', e);
                    self.config.receiverAvailable = e === chrome.cast.ReceiverAvailability.AVAILABLE;
                    self.emit('receiverAvailable', self.config.receiverAvailable);
                });

            chrome.cast.initialize(apiConfig, function () {

                self.emit('initialized');
                self.config.initialized = true;
            }, function (e) {
                self.emit('initFailed', e);
            });
        },
        attachCoreEvents: function () {
            var self = this;
            this.onMessage('media', function (msg) {
                console.log('onmedia', msg);
                if (typeof(msg) === 'string') {
                    msg = JSON.parse(msg);
                }
                self.emit(msg.name, msg.message);

            });
            this.on('timeupdate', function (evt) {
                self.config.currentTime = evt.currentTime;
            });
        },
        /**
         * @method launch
         * @param {Function} callback
         * @param {Function} fallback
         */
        launch: function (callback, fallback) {
            var self = this;
            if (!this.config.receiverAvailable) {
                console.warn('no receiver is available');
                fallback && fallback();
                return;
            }
            chrome.cast.requestSession(function (e) {
                self.onRequestSessionSuccess(e);
                callback && callback(e);
            }, function (e) {
                self.emit('requestSessionError', e);
                fallback && fallback(e);
            });
        },
        onRequestSessionSuccess: function (session) {
            console.log("session success: " + session.sessionId);
            this.config.session = session;
            this.config.session.addUpdateListener(this.sessionUpdateListener.bind(this));
            this.emit('requestSessionSuccess', session);
        },
        onMediaDiscovered: function (how, mediaSession, autoPlay) {
            this.config.currentMediaSession = mediaSession;
            if (how === 'activeSession') {
                this.currentMediaTime = mediaSession.currentTime;
            }
            if (how === 'loadMedia') {
                if (autoPlay) {
                    this.playMedia();
                }
            }
            this.config.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));

            this.emit('mediaDiscoverred', how, mediaSession);
        },
        onLoadMediaError: function (err) {
            console.error(err);
            this.emit('mediaError', err);
        },
        sessionUpdateListener: function (isAlive) {
            this.emit('sessionUpdated', isAlive);
            if (!isAlive) {
                this.config.session = null;
                this.config.currentMediaSession = null;
            }
        },
        hasNamespace: function (ns) {
            var hasNs = false;
            if (!this.config.session) {
                return hasNs;
            }
            Object.keys(this.config.session.namespaces).some(function (nsObj) {
                if (nsObj.name === ns) {
                    hasNs = true;
                    return hasNs;
                }
            });
            return hasNs;
        },
        getRawNSName: function (ns) {
            return this.config.msgPrefix + this.config.packageName + '.' + ns;
        },
        onMessage: function (namespace, fnc) {
            var self = this;
            namespace = this.getRawNSName(namespace);
            if (!this.config.session) {
                return;
            }

            if (!this.hasNamespace(namespace)) {
                this.config.session.addMessageListener(namespace, function (ns, msg) {
                    self.emit(ns, msg);
                });
            }
            return this.on(namespace, fnc);
        },
        sendMessage: function (namespace, msg, callback, fallback) {
            if (!this.config.session) {
                return;
            }
            namespace = this.getRawNSName(namespace);
            this.config.session.sendMessage(namespace, msg, callback, fallback);
        },
        /**
         * @method loadMedia
         * @param {Object} opt
         * @param {Boolean} [opt.autoplay]
         * @param {Object} opt.mediaInfo
         * @param {Object} [opt.request]
         * @param {Function} [callback]
         * @param {Function} [fallback]
         */
        loadMedia: function (opt, callback, fallback) {
            if (!this.config.session) {
                return;
            }
            var mediaInfo = this.buildMediaInfo(opt.mediaInfo);
            var request = new chrome.cast.media.LoadRequest(mediaInfo);
            var self = this;
            if (opt.request) {
                klass.mixin(request, opt.request);
            }
            this.config.session.loadMedia(request,
                function (mediaSession) {
                    callback && callback();
                    self.onMediaDiscovered('loadMedia', mediaSession, opt.autoplay);
                },
                function (err) {
                    self.onLoadMediaError(err);
                    fallback && fallback(err);
                });
            return this;
        },
        buildMediaInfo: function (opt) {
            var mediaInfo = new chrome.cast.media.MediaInfo();
            klass.mixin(mediaInfo, opt);
            return mediaInfo;
        },
        playMedia: function () {
            if (!this.config.currentMediaSession) {
                return;
            }
            var PLAYER_STATE = this.config.PLAYER_STATE,
                currentMediaSession = this.config.currentMediaSession,
                playerState = currentMediaSession.playerState;
            switch (playerState) {
                case PLAYER_STATE.LOADED:
                case PLAYER_STATE.PAUSED:
                    currentMediaSession.play(null,
                        this.mediaCommandSuccessCallback.bind(this, 'play', {
                            playerState: currentMediaSession.playerState,
                            oldPlayerState: playerState
                        }),
                        this.onMediaError.bind(this, 'play'));
                    currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
                    break;
            }
        },
        seekMedia: function (time) {
            if (!this.config.currentMediaSession || !this.config.playing) {
                return;
            }
            var currentMediaSession = this.config.currentMediaSession;
            var request = new chrome.cast.media.SeekRequest();
            request.currentTime = time;
            currentMediaSession.seek(request,
                this.mediaCommandSuccessCallback.bind(this, 'seek', time),
                this.onMediaError.bind(this, 'seek'));
        },
        seekMediaBy: function (value) {
            value = this.config.currentTime + value;
            if (value < 0) {
                value = 0;
            } else if (value > this.config.currentMediaSession.media.duration) {
                value = this.config.currentMediaSession.media.duration;
            }
            return this.seekMedia(value);
        },
        pauseMedia: function () {
            if (!this.config.currentMediaSession || !this.config.playing) {
                return;
            }
            var PLAYER_STATE = this.config.PLAYER_STATE,
                currentMediaSession = this.config.currentMediaSession;
            if (currentMediaSession.playerState === PLAYER_STATE.PLAYING) {
                currentMediaSession.pause(null,
                    this.mediaCommandSuccessCallback.bind(this, 'pause', null),
                    this.onMediaError.bind(this, 'pause'));
            }
        },
        stopMedia: function () {
            if (!this.config.currentMediaSession || this.config.playerState !== this.config.PLAYER_STATE.PLAYING) {
                return;
            }
            var currentMediaSession = this.config.currentMediaSession;
            currentMediaSession.stop(null,
                this.mediaCommandSuccessCallback.bind(this, 'stop', null),
                this.onMediaError.bind(this, 'stop'));
        },
        setMediaVolume: function (volumeOpt) {
            if (!this.config.currentMediaSession) {
                return;
            }
            var currentMediaSession = this.config.currentMediaSession;
            var volume = new chrome.cast.Volume();
            if ('level' in volumeOpt) {
                volume.level = volumeOpt.level;
            }
            volume.muted = volumeOpt.muted;
            var request = new chrome.cast.media.VolumeRequest();
            request.volume = volume;
            currentMediaSession.setVolume(request,
                this.mediaCommandSuccessCallback.bind(this, 'setVolume', volumeOpt),
                this.onMediaError.bind(this, 'setVolume'));
        },
        setMediaVolumeBy: function (value) {
            value = this.config.currentMediaSession.volume.level + value;
            if (value < 0) {
                value = 0;
            } else if (value > 1) {
                value = 1;
            }
            return this.setMediaVolume({
                level: value
            });
        },
        toggleMute: function () {
            return this.setMediaVolume({
                muted: !this.config.currentMediaSession.volume.muted
            });
        },
        setReceiverVolume: function (vol, callback, fallback) {
            if (vol < 0) {
                vol = 0;
            } else if (vol > 1) {
                vol = 1;
            }
            return this.config.session.setReceiverVolumeLevel(vol, callback, fallback);
        },
        setReceiverVolumeBy: function (vol, callback, fallback) {
            var currentVol = this.config.session.receiver.volume.level;
            return this.setReceiverVolume(currentVol + vol, callback, fallback);
        },
        toggleReceiverMute: function (callback, fallback) {
            var session = this.config.session;
            return session.setReceiverMuted(!session.receiver.volume.muted, callback, fallback);
        },
        onMediaStatusUpdate: function (e) {
            if (!e) {
                return this.emit('mediaStatus');
            }
            this.emit('mediaStatus', this.config.currentMediaSession);
        },
        onMediaError: function (action, e) {
            console.error(action, e);
        },
        mediaCommandSuccessCallback: function (action, params) {
            console.log("started action " + action);
            switch (action) {
                case 'play':
                    this.config.playing = true;
                    break;
                case 'pause':
                case 'stop':
                    this.config.playing = false;
            }
            this.emit(action, params);
        }
    });
    return ChromeCast;

});