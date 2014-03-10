define([
    './Class',
    './BaseEvented',
    './DomEvent',
    './has'
], function (Class, BaseEvented, DomEvent, has) {
    var HTML5Player = Class({
        extend: BaseEvented,
        statics: {
            MimeType: {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'ogg': 'video/ogg',
                '3gpp': 'video/3gpp',
                'x-flv': 'video/x-flv',
                'flv': 'video/x-flv'
            },
            PlayerState: {
                BUFFERING: 3,
                CUED: 5,
                ENDED: 0,
                PAUSED: 2,
                PLAYING: 1,
                UNSTARTED: -1
            }
        },
        constructor: function (args, node) {
            this.config = {
                node: typeof(node) === 'string' ? document.getElementById(node) : node,
                attrs: ['controls', 'autoplay', 'loop', 'poster', 'preload', 'muted', 'width', 'height']
            };
            args && Class.mixin(this.config, args);
            BaseEvented.call(this);

        },
        init: function () {
            if (this.config.initialized) {
                return;
            }
            var videoNode;
            if (this.config.node.tagName.toLowerCase() !== 'video') {
                this.config.origNode = this.config.node;
                videoNode = this.createVideoNode(this.config.node);
                this.config.node.parentNode.replaceChild(videoNode, this.config.node);
                this.config.node = videoNode;
            }
            this.config.initialized = true;
            this.emit('initialized');
            //this.loadVideo(this.config);
        },
        createVideoNode: function (refNode) {
            var node = document.createElement('video');
            node.className = refNode.className;
            node.id = refNode.id;
            if ('baseCls' in this.config) {
                node.classList.add(this.config.baseCls);
            }
            if ('style' in this.config) {
                Object.keys(this.config.style).forEach(function (k) {
                    node.style[k] = this.config.style[k];
                }, this);
            }
            if ('width' in this.config) {
                node.style.width = this.config.width;
            }
            if ('height' in this.config) {
                node.style.height = this.config.height;
            }
            return node;
        },
        getPlayer: function () {
            return this.config.node;
        },
        loadVideo: function (opt) {
            var srcNode, trackNode, self = this, defLang = window.navigator.language;
            this.init();
            this.config.attrs.forEach(function (attr) {
                if (attr in opt) {
                    if (opt[attr]) {
                        this.config.node.setAttribute(attr, opt[attr] === true ? attr : opt[attr]);
                    } else {
                        this.config.node.removeAttribute(attr);
                    }
                }
            }, this);
            opt.sources && opt.sources.forEach(function (src) {
                srcNode = document.createElement('source');
                srcNode.src = src.src;
                srcNode.type = HTML5Player.MimeType[src.type] ?
                    HTML5Player.MimeType[src.type] + (src.codecs ? ';codecs="' + src.codecs + '"' : '') :
                    src.type;
                this.config.node.appendChild(srcNode);
            }, this);

            opt.tracks && opt.tracks.forEach(function (track) {
                trackNode = document.createElement('track');
                trackNode.src = track.src;
                trackNode.kind = track.kind || 'subtitles';
                trackNode.srclang = track.srclang || defLang.substr(0, 2);
                trackNode.label = track.label || defLang;
                this.config.node.appendChild(trackNode);
            }, this);
            this.config.node.load();
            if (has('phonegap') && opt.sources) {
                if (opt.loop) {
                    this.config.node.addEventListener('timeupdate', function () {
                        if (this.currentTime === this.duration) {
                            this.currentTime = 0;
                        }
                    }, false);
                }

                if (opt.sources) {
                    this.playVideo();
                }
            }

        },
        playVideo: function () {
            if (has('phonegap')) {
                DomEvent.emit('click', {
                    el: this.config.node
                });
            }
            this.config.node.play();
        },
        stopVideo: function () {
            this.pauseVideo();
            this.seekTo(0);
        },
        pauseVideo: function () {
            if (!this.config.node.paused) {
                if (has('phonegap')) {
                    DomEvent.emit('click', {
                        el: this.config.node
                    });
                }
            }
            this.config.node.pause();
        },
        getCurrentTime: function () {
            return this.config.node.currentTime;
        },
        seekTo: function (num) {
            this.config.node.currentTime = num;
        },
        mute: function () {
            this.config.node.muted = true;
        },
        unmute: function () {
            this.config.node.muted = false;
        },
        /**
         * 0 - 100
         * @method setVolume
         * @param num
         */
        setVolume: function (num) {
            this.config.node.volume = (num / 100).toFixed(2);
            this.config.currentVolume = this.config.node.volume;
        },
        getVolume: function () {
            return this.config.node.volume;
        },
        getPlayerState: function () {
            var node = this.config.node, states = HTML5Player.PlayerState;
            if (node.paused) {
                if (node.currentTime === 0) {
                    return states.UNSTARTED;
                }
                if (node.currentTime === node.duration) {
                    return states.ENDED;
                }
                return states.PAUSED;
            } else {
                return states.PLAYING;
            }
        },
        destroy: function () {
            if (!this.config.node.paused) {
                if (has('phonegap')) {
                    DomEvent.emit('click', {el: this.config.node});
                } else {
                    this.config.node.pause();
                }
            }

            if (this.config.origNode) {
                this.config.node.parentNode.replaceChild(this.config.origNode, this.config.node);
                this.config.node = this.config.origNode;
                delete this.config.origNode;
            }
        }
    });
    return HTML5Player;
});