/*global define,require,console*/
define([
    'require',
    'com/sesamtv/core/util/Class',
    'com/sesamtv/core/util/Promise',
    'com/sesamtv/core/util/XHR',
    'com/sesamtv/core/util/DomEvent',
    'com/sesamtv/core/engine/Topic',
    'com/sesamtv/core/abstract/plugin/BaseModel',
    'com/sesamtv/core/util/Helper',
    'com/sesamtv/core/util/HTML5Player',
    'com/sesamtv/core/util/ChromeCastReceiver',
    'bower_components/hogan/web/builds/2.0.0/hogan-2.0.0.amd',
    'text!../views/detailTemplate.html'
], function (require, klass, promise, xhr, domEvent, topic, BaseModel, helper, HTML5Player, ChromeCastReceiver, Hogan, detailTemplate) {
    'use strict';
    var CastReceiver = klass({
        extend: BaseModel,
        constructor: function CastReceiver(binder, plugin) {
            BaseModel.call(this, binder, plugin);
            this.config.detailTpl = Hogan.compile(detailTemplate);
        },
        start: function () {
            this.receiver = new ChromeCastReceiver({
                appId: this.plugin.config.chromecast.appId,
                namespaces: ['sesamcast'],
                mediaElement: 'video'
                //namespaces: ['showDetail', 'playVideo', 'stopVideo', 'playingVideo', 'seekVideoBy', 'socketClosed']
            });

            window.receiver = this.receiver;
            this.player = new HTML5Player(null, document.getElementsByTagName('video')[0]);
            this.attachEvents();
            //this.receiver.start();
            this.startSlider();
            //this.receiver.init();
        },
        startSlider: function () {
            var bg = document.querySelector('[data-bg]'), imgs = ['bg1', 'bg2', 'bg3'], total = imgs.length;
            clearInterval(this.sliderInterv);
            this.sliderInterv = setInterval(function () {
                var id = bg.getAttribute('data-bg'), idx = imgs.indexOf(id);
                bg.setAttribute('data-bg', idx === total - 1 ? imgs[0] : imgs[idx + 1]);
            }, 10000);
        },
        attachEvents: function () {
            console.log('attachEvent', this);
            var self = this;
            this.receiver.on('sesamcast', function (evt) {
                if (typeof(evt) === 'string') {
                    evt = JSON.parse(evt);
                }
                if (!evt.data) {
                    return;
                }
                self.emit(evt.data.name, evt.data.message);
            });
            this.on('showDetail', function (data) {
                clearInterval(self.sliderInterv);
                self.showDetail(data);
            });
            this.receiver.on('mediaStop', function () {
                console.log('mediaStop');
                self.player.config.node.classList.remove('show');
            });
            /*this.on('stopVideo', function () {
             self.player.stopVideo();
             self.player.config.node.classList.remove('show');
             self.receiver.sendMessage('stopVideo', {
             status: 'ok'
             });
             });*/

            this.on('closed', function (evt) {
                console.log('evt closed', evt);
                self.receiver.sendMessage('socketClosed', {
                    status: 'closed'
                });
                self.config.node.classList.remove('show');
            });

            this.player.config.node.addEventListener('play', function (evt) {
                this.classList.add('show');
            });
            /* this.player.config.node.addEventListener('pause', function (evt) {
             if (this.currentTime === this.duration) {
             this.classList.remove('show');
             self.receiver.sendMessage('stopVideo', {
             status: 'ok'
             });
             self.startSlider();
             }
             });*/
            /* this.player.config.node.addEventListener('timeupdate', function (evt) {
             self.receiver.sendMessage('playingVideo', {
             currentTime: this.currentTime,
             duration: this.duration
             });
             });*/
            this.receiver.once('initialized', function () {
                self.initRemoteMedia();
            });
        },
        initRemoteMedia: function () {
            this.receiver.remoteMedia(this.player.config.node);
        },
        showDetail: function (data) {
            this.config.node = this.config.node || document.getElementById('detail');
            this.config.node.innerHTML = this.config.detailTpl.render(data);
            this.config.node.classList.add('show');
            this.receiver.sendMessage('showDetail', {
                status: 'ok'
            });
        },
        seekVideoBy: function (value) {
            this.player.seekTo(this.player.getCurrentTime() + value);
        }
    });
    return CastReceiver;
});