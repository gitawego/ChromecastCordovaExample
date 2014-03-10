/*global require,define,console,alert,SESAM_APP*/
/*jslint plusplus: true */
/*jslint expr:true */
define([
    'com/sesamtv/core/util/Class',
    'com/sesamtv/core/util/DomEvent',
    'com/sesamtv/core/util/Dom',
    'com/sesamtv/core/util/XHR',
    'com/sesamtv/core/util/Helper',
    'com/sesamtv/core/util/keyboard',
    'com/sesamtv/core/engine/Topic',
    'com/sesamtv/core/abstract/plugin/BasePlugin',
    './videosbrowser/models/CastReceiver',
    'com/sesamtv/core/util/ChromeCast',
    'com/sesamtv/core/util/YouTubeVideo',
    'com/sesamtv/core/util/has',
    'com/sesamtv/core/util/Animator',
    'bower_components/hogan/web/builds/2.0.0/hogan-2.0.0.amd',
    'text!./videosbrowser/views/deviceList.html',
    'text!./videosbrowser/views/videoController.html',
    'text!./videosbrowser/views/vodController.html',
    'com/sesamtv/core/util/databinding/types/LazyLoadData'
], function (klass, domEvent, domHelper, xhr, helper, keyboard, topic, BasePlugin, CastReceiver, ChromeCast, youTubeVideo, has, Animator, Hogan, deviceListTemplate, videoController, vodControllerStr) {
    'use strict';
    //window.SESAM_APP = 'vod';
    var doc = document;
    var VideosBrowser = klass({
        extend: BasePlugin,
        constructor: function (config) {
            BasePlugin.call(this, config);
            if (typeof(SESAM_APP) !== 'undefined' && SESAM_APP === 'vod') {
                this.chromeCast = has('cordova') ? new window.ChromeCast(this.config.chromecastVod) :
                    new ChromeCast(this.config.chromecastVod);
            } else {
                this.chromeCast = has('cordova') ? new window.ChromeCast(this.config.chromecast) :
                    new ChromeCast(this.config.chromecast);
            }

            this.config.deviceListTpl = Hogan.compile(deviceListTemplate);
            this.config.videoControllerTpl = Hogan.compile(videoController);
            this.config.playerNodes = {};
            this.attachEvents();
            this.animator = Animator.load(this.config.animator, this);

            window.vid = this;
        },
        attachEvents: function () {
            var self = this;
            if (this.chromeCast.initialized) {
                this.attachNamespace();
            }else{
                this.connect.push(this.chromeCast.on('initialized', function (session) {
                    self.attachNamespace();
                }));
            }

            this.connect.push(this.on('focus', function () {
                topic.pub('focusManager/selectMap');
            }));
        },
        attachNamespace: function () {
            var self = this;
            this.chromeCast.onMessage('sesamcast', this.dispatchEvents.bind(this));
            this.chromeCast.on('sessionUpdated', function (isAlive) {
                !isAlive && self.resetCastReceiver();
            });
            this.chromeCast.on('session',function(session){
                self.switchCastIcon('on');
            });
            /*this.chromeCast.on('activeSession', function () {
                console.log("active session");
                self.switchCastIcon('on');
            });*/
        },
        /**
         * @method dispatchEvents
         * @param {Object} evt
         * @param {String} evt.name
         * @param {*} evt.message
         *
         */
        dispatchEvents: function (evt) {
            if (typeof(evt) === 'string') {
                evt = JSON.parse(evt);
            }
            this.emit(evt.name, evt.message);
        },
        startup: function (itemData) {
            if (has('chromecast')) {
                return this.initCastReceiver();
            }
            //this.chromeCast.init();
            this.initStyle();
            if (typeof(SESAM_APP) !== 'undefined' && SESAM_APP === 'vod') {
                return this.initControllersForVod();
            }
            itemData = itemData || {
                keyword: 'm6'
            };
            var binder = this.binders[this.config.components.videos.namespace],
                self = this,
                update = function (itemData, binder) {
                    binder.boundModel.updateQueryParams(itemData);
                    binder.model.videos.update(itemData);
                },
                showGrid = function (binder) {
                    update(itemData, binder);
                    self.attachGridEvents(binder.getModel('videos').grid);
                    self.chromeCast.init();
                };

            if (binder) {
                update(itemData, binder);
            } else {
                this.bindView(this.config.components.videos).then(function (binder) {
                    showGrid(binder);
                    self.closeWelcomepage();

                });
            }
        },
        initControllersForVod: function () {
            var self = this, receiver;
            //this.chromeCast.init();
            var vodCtrlTpl = Hogan.compile(vodControllerStr);
            this.showVideoController({}, vodCtrlTpl);
            this.closeWelcomepage();
            this.attachChromeEvents();
            this.chromeCast.on('receiverAvailable', function () {
                self.showVideoController({}, vodCtrlTpl);
                self.on('sesamvod', function (evt) {
                    console.log('get from receiver', evt);
                    if (evt.action === 'getVideoData') {
                        return xhr.request(youTubeVideo.buildInfoUrl(evt.videoId)).
                            on('load',function (data) {
                                youTubeVideo(null, {
                                    data: data,
                                    callback: function (video) {
                                        if (video.status === 'fail') {
                                            alert(video.reason);
                                            return;
                                        }
                                        var mp4 = video.getSource("video/mp4", "hd720");
                                        self.preStartVideo();
                                        self.chromeCast.loadMedia({
                                            mediaInfo: {
                                                contentId: mp4.url,
                                                contentType: 'video/mp4'
                                            },
                                            autoplay: true
                                        }, function (loadRes) {
                                            //evt.target.classList.add('pause');
                                        });
                                    }
                                });
                            }).send();
                    }
                });
            });

        },
        sendMessage: function (evtName, msg, callback, fallback) {
            this.chromeCast.sendMessage('sesamcast', {
                name: evtName,
                message: msg
            }, callback, fallback);
        },
        sendKey: function (keyId) {
            if (!this.detectReceiver()) {
                return;
            }
            this.sendMessage('sesamvod', {
                keyCode: keyboard.getKeyCode(keyId),
                cordova: has('cordova')
            });
        },
        sendUpKey: function () {
            this.sendKey('UP_ARROW');
        },
        sendDownKey: function () {
            this.sendKey('DOWN_ARROW');
        },
        sendLeftKey: function () {
            this.sendKey('LEFT_ARROW');
        },
        sendRightKey: function () {
            this.sendKey('RIGHT_ARROW');
        },
        sendEnterKey: function () {
            this.sendKey('ENTER');
        },
        sendEscapeKey: function () {
            this.sendKey('ESCAPE');
        },
        exitApp: function () {
            navigator.notification.confirm("Vous voulez vraiment quitter l'application ?",
                function (buttonIndex) {
                    if (buttonIndex === 1) {
                        navigator.app.exitApp();
                    }
                },
                'SesamTV Cast',
                ['YES', 'NO']
            );
        },
        onWelcomepageAnimEnd: function () {
            this.classList.remove(this.config.className);
            this.classList.remove('pt-page-current');
        },
        onContainerAnimBegin: function () {
            this.classList.add('pt-page-current');
        },
        onContainerAnimEnd: function () {
            this.classList.remove(this.config.className);
        },
        closeWelcomepage: function () {

            return this.animator.emit('sesamcast/open');

        },
        initCastReceiver: function () {
            console.log('init cast receiver');
            this.castReceiver = new CastReceiver(null, this);
            this.castReceiver.start();
            this.closeWelcomepage();
        },
        initStyle: function () {
            var header = doc.getElementsByTagName('header')[0];

            header.style.height = this.config.headerHeight + 'px';
            //document.getElementById('videoController').style.top = this.config.headerHeight+'px';
        },
        attachGridEvents: function (grid) {
            var self = this,
                navbarGap = this.config.headerHeight;
            grid.on('itemClick', function (evt, target) {
                if (self.chromeCast.config.session) {
                    self.showDetailOnClick(target);
                } else {
                    self.switchCastIcon('loading');
                    self.chromeCast.launch(function () {
                        self.switchCastIcon('on');
                        self.showDetailOnClick(target);
                    }, function () {
                        self.switchCastIcon('off');
                    });
                }
            });
            grid.once('itemsUpdate', function () {
                grid.style({
                    height: (doc.documentElement.clientHeight - navbarGap) + 'px'
                });
                grid.scroller.refresh();
            });
            window.addEventListener('resize', function () {
                grid.style({
                    height: (doc.documentElement.clientHeight - navbarGap) + 'px'
                });
            }, false);
            this.attachChromeEvents();
        },
        attachChromeEvents: function () {
            var castIcon = doc.getElementsByClassName('cast-icon')[0],
                self = this;
            this.connect.push(domEvent.on(castIcon, 'click', function (evt) {
                evt.preventDefault();
                if (this.classList.contains('disabled')) {
                    return;
                }
                if (!has('cordova')) {
                    self.switchCastIcon('loading');
                    return self.chromeCast.launch(function () {
                        self.switchCastIcon('on');
                    }, function () {
                        self.switchCastIcon('off');
                    });
                }
                self.showDevicesWindow();
            }));
            this.chromeCast.once('receiverAvailable', function () {
                self.switchCastIcon('off');
            });
            //for cordova
            this.connect.push(this.chromeCast.on('receivers', function (list) {
                self.updateCastDeviceList(list);
            }));
        },
        switchCastIcon: function (status) {
            var castIcon = doc.getElementsByClassName('cast-icon')[0],
                classList = castIcon.classList,
                statusList = ['disabled', 'off', 'on', 'loading'];
            if (classList.contains(status) || statusList.indexOf(status) === 0) {
                return castIcon;
            }
            statusList.forEach(function (s) {
                classList[s === status ? 'add' : 'remove'](s);
            });
            return castIcon;
        },
        buildDevicesWindow: function () {
            var self = this;
            if (this.config.deviceWindow) {
                return this.config.deviceWindow;
            }
            this.config.deviceWindow = doc.getElementsByClassName('devicesWindow')[0];
            this.updateCastDeviceList([]);
            this.connect.push(domEvent.delegate(this.config.deviceWindow, 'li.deviceItem:not(.active)', 'click', function (evt) {

                evt.preventDefault();
                self.showDevicesWindow();
                self.launchReceiver(this.getAttribute('data-id'));
            }));
            this.connect.push(domEvent.on(this.config.deviceWindow, 'click', function (evt) {
                var win = this.getElementsByClassName('deviceListContainer')[0];
                if (!win || !win.contains(evt.target)) {
                    //this.classList.remove('show');
                    self.showDevicesWindow();
                }
            }));
            return this.config.deviceWindow;
        },
        launchReceiver: function (receiverId) {
            var rec = this.chromeCast.getReceiver(receiverId),
                node,
                self = this;

            if (rec) {
                this.switchCastIcon('loading');
            }
            this.chromeCast.once('requestSessionSuccess', function () {
                self.attachReceiverEvents();
                node = self.config.deviceWindow.querySelector('.deviceItem[data-id="' + receiverId + '"]');
                node && node.classList.add('active');
                self.switchCastIcon('on');
            });
            this.chromeCast.once('requestSessionError', function (err) {
                console.error('requestSessionError', err.stack);
            });
            this.chromeCast.launch(rec);

        },
        disconnectDevice: function () {
            if (!this.config.deviceWindow) {
                return;
            }
            var node = this.config.deviceWindow.getElementsByClassName('active')[0];
            node && node.classList.remove('active');
        },
        detectReceiver: function () {
            if (!has('cordova')) {
                return true;
            }
            if (this.chromeCast.getSelectedReceiver() && this.chromeCast.config.session) {
                return true;
            }
            this.showDevicesWindow();
            this.closeVideoController();
            return false;
        },
        resetCastReceiver: function () {
            this.switchCastIcon('off');
            this.closeVideoController();
            this.disconnectDevice();
        },
        attachReceiverEvents: function (receiver) {
            var self = this;

            var h = this.chromeCast.on('mediaStatus', function (res) {
                console.log('onMediaStatus', res);

                if (res.state === 1 && res.contentId === null) {
                    self.resetCastReceiver();
                    h.remove();
                }
            });
            if (has('cordova')) {
                this.chromeCast.once('closed', function () {
                    self.resetCastReceiver();
                    //window.location.reload();
                    //self.chromeCast = new window.ChromeCast(self.config.chromecast);
                });
            } else {
                var socketClosed = this.on('socketClosed', function () {
                    console.log('socketClosed');
                    self.resetCastReceiver();
                    socketClosed.remove();
                });
            }

        },
        updateCastDeviceList: function (list) {
            if (list.length === 0) {
                this.switchCastIcon('off');
            }
            var selectedReceiver = this.chromeCast.getSelectedReceiver();
            if (selectedReceiver) {
                if (!this.chromeCast.getReceiver(selectedReceiver.id)) {
                    this.switchCastIcon('off');
                }

                //this.launchReceiver(selectedReceiver.id);
            }

            var deviceWindow = this.buildDevicesWindow();
            deviceWindow.innerHTML = this.config.deviceListTpl.render({
                deviceList: this.chromeCast.config.session ? list : helper.deepClone(list).map(function (l) {
                    l.isSelected = false;
                    return l;
                })
            });

        },
        showDetailOnClick: function (target) {
            var binder = this.binders[this.config.components.videos.namespace],
                grid = binder.getModel('videos').grid,
                self = this,
                itemData = grid.getItemData(target);
            console.log("show detail on click");
            if (!this.detectReceiver()) {
                console.log("showDetailOnClick: detect receiver failed");
                return;
            }

            this.stopVideo();
            console.log("showDetailOnClick: ok, next");

            var h = this.on('showDetail', function (status) {
                h.remove();
                if (status === 'ok') {
                    console.log('detail info built in receiver');
                }
            });
            this.sendMessage('showDetail', itemData);

            this.showVideoController(itemData);

        },
        showVideoController: function (itemData, tplEngine) {
            var classList;
            tplEngine = tplEngine || this.config.videoControllerTpl;
            console.log('showVideoController', itemData);
            this.config.videoController = this.config.videoController || document.getElementById('videoController');
            if (!itemData) {
                this.config.videoController.classList.remove('show');
                return;
            }
            classList = this.config.videoController.classList;
            if (classList.contains('footer')) {
                this.clearFooter();
                classList.remove('show');
            }
            this.config.videoController.innerHTML = tplEngine.render(itemData);
            classList.add('show');
            this.attachCtrlEvents();
        },
        closeVideoController: function () {
            this.config.videoController && this.config.videoController.classList.remove('show');
        },
        attachCtrlEvents: function () {
            var keys = Object.keys(this.config.ctrlEvents),
                self = this,
                makeListener = function (mtd) {
                    return function (evt) {
                        self[mtd](evt);
                    };
                },
                i = 0, l = keys.length, key, node, param;
            for (; i < l; i++) {
                key = keys[i];
                param = this.config.ctrlEvents[key];
                node = doc.querySelector(key);
                if (!node) {
                    continue;
                }
                domEvent.on(node, param.event, makeListener(param.method));

            }
        },
        showDevicesWindow: function () {
            console.log('showDevicesWindow');
            var deviceWindow = this.buildDevicesWindow(), classList = deviceWindow.classList;
            classList.toggle('show');

        },
        clearFooter: function () {
            var ctrlNode = this.config.videoController;
            ctrlNode.classList.remove('footer');
            ctrlNode.style.height = '';
        },
        backToVideoList: function (evt) {
            var ctrlNode = this.config.videoController,
                self = this,
                toolbar = ctrlNode.getElementsByClassName('toolbar')[0];
            if (toolbar === evt.target || toolbar.contains(evt.target)) {
                return;
            }
            ctrlNode.classList.add('footer');
            ctrlNode.style.height = this.config.footerHeight + 'px';

            domEvent.once(toolbar, 'click', function () {
                self.clearFooter();
            }, false);
        },
        castVideo: function (evt) {
            if (!this.detectReceiver()) {
                return;
            }
            if (this.config.pauseStatus) {
                return this.resumeVideo(evt);
            }
            if (evt.target.classList.contains('pause')) {
                return this.pauseVideo(evt);
            }

            var id = evt.target.parentNode.getAttribute('data-videoid'),
                self = this,
                title = evt.target.parentNode.getAttribute('data-title'),
                fetchParams = {
                    callback: function (video) {
                        if (video.status === 'fail') {
                            alert(video.reason);
                            return;
                        }
                        var mp4 = video.getSource("video/mp4", "hd720");
                        self.preStartVideo();
                        self.chromeCast.loadMedia({
                            mediaInfo: {
                                contentId: mp4.url,
                                contentType: 'video/mp4'
                            },
                            autoplay: true
                        }, function (loadRes) {
                            evt.target.classList.add('pause');
                        });
                    }
                };

            if (this.config.playing && this.config.currentVideoId === id) {
                return;
            }
            this.config.currentVideoId = id;
            this.config.playerNodes.play = evt.target;
            if (has('cordova')) {
                return xhr.request(youTubeVideo.buildInfoUrl(id)).
                    on('load',function (data) {
                        fetchParams.data = data;
                        youTubeVideo(null, fetchParams);
                    }).send();
            }
            youTubeVideo(id, fetchParams);
        },
        preStartVideo: function () {
            var self = this;
            var h = this.chromeCast.on('stop', function () {
                h.remove();
                self.postStopVideo();
            }), progressHandler = doc.querySelector('.player .scrubber .handle');


            this.evts.onprogress = this.chromeCast.on('timeupdate', function (data) {
                console.log('onprogress', data);
                progressHandler.style.width = (data.currentTime / data.duration) * 100 + '%';
            });
            this.config.playing = true;
        },
        postStopVideo: function () {
            this.evts.onprogress && this.evts.onprogress.remove();
            delete this.evts.onprogress;
            delete this.config.playing;
            delete this.config.pauseStatus;
        },
        resumeVideo: function (evt) {
            if (!this.detectReceiver() || !this.config.pauseStatus) {
                return;
            }
            this.chromeCast.once('play', function (res) {
                console.log('resumed', res);
                evt.target.classList.add('pause');
            });
            this.chromeCast.playMedia();
            delete this.config.pauseStatus;
        },
        stopVideo: function (evt) {
            if (!this.detectReceiver()) {
                return;
            }
            this.config.playerNodes && this.config.playerNodes.play
            && this.config.playerNodes.play.classList.remove('pause');
            this.chromeCast.stopMedia();
            this.postStopVideo();
            delete this.config.pauseStatus;
        },
        pauseVideo: function (evt) {

            if (!this.detectReceiver()) {
                return;
            }
            evt.target.classList.remove('pause');
            this.chromeCast.pauseMedia();
            delete this.config.playing;
            this.config.pauseStatus = {};
            /*this.chromeCast.getMediaStatus(function (evt) {
             self.config.pauseStatus = evt.status;
             });*/
        },
        seekVideoPrev: function () {
            var receiver = this.config.currentCastReceiver;
            if (!this.detectReceiver()) {
                return;
            }
            this.chromeCast.seekMediaBy(-10);
        },
        seekVideoNext: function () {
            var receiver = this.config.currentCastReceiver;
            if (!this.detectReceiver()) {
                return;
            }
            this.chromeCast.seekMediaBy(10);

        },
        /**
         * @method setVolumeBy
         * @param {Number} value
         */
        setVolumeBy: function (value) {

            if (!this.detectReceiver()) {
                return;
            }
            this.chromeCast.setReceiverVolumeBy(value);

        },
        incrVolume: function () {
            if (!this.detectReceiver()) {
                return;
            }
            return this.setVolumeBy(0.1);
        },
        decrVolume: function () {
            if (!this.detectReceiver()) {
                return;
            }
            return this.setVolumeBy(-0.1);
        },
        /**
         * @method mute
         * @param {Event} evt
         * @returns {*}
         */
        mute: function (evt) {
            if (!this.detectReceiver()) {
                return;
            }
            this.config.playerNodes.mute = evt.target;

            this.chromeCast.toggleReceiverMute(function () {
                evt.target.classList.toggle('enabled');
            });

        },
        launch: function () {

        },
        stop: function () {

        },
        buildDetail: function () {

        }
    });
    return VideosBrowser;
});