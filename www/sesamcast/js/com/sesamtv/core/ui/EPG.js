/*global require,define,console,alert,IScroll*/
define([
    'require',
    '../util/Class',
    '../util/BaseEvented',
    '../util/Date',
    '../util/XHR',
    '../util/Helper',
    '../util/has',
    '../util/keyboard',
    '../util/DomEvent',
    '../util/Dom',
    '../util/polyfill/WeakMap',
    '../ui/LazyLoadData',
    '../util/KeyboardNavigation',
    'bower_components/hogan/web/builds/2.0.0/hogan-2.0.0.amd',
    'text!assets/common/template/epg/structure.html',
    'text!assets/common/template/epg/channel.html',
    'text!assets/common/template/epg/channelIcon.html',
    'text!assets/common/template/epg/programmes.html',
    'text!assets/common/template/epg/detail.html',
    'IScroll'
], function (require, klass, BaseEvented, dateHelper, xhr, helper, has, keyboard, domEvent, domHelper, WeakMap, LazyLoadData, KeyboardNavigation, Hogan, struTplStr, channelTplStr, channelIconStr, programmesStr, detailStr, IScroll) {
    'use strict';
    /**
     * @class com.sesamtv.core.ui.EPG
     * @extends com.sesamtv.core.util.BaseEvented
     */
    var EPG = klass({
        extend: BaseEvented,
        constructor: function (opt, node) {
            var self = this;
            this.config = {
                dateRegxp: /([\d]{4})([\d]{2})([\d]{2})([\d]{2})([\d]{2})([\d]{2})/g,
                use24h: false,
                useIScroll: false,
                leadingSize: 100,
                timelineUnitSize: 200,
                prefillChannelNumber: 50,
                borderSize: 5,
                tplTagReg: /{{(.*?)}}/,
                lang: 'fr',
                programmeUnit: '%',
                today: new Date().toLocaleDateString(),
                providerClass: "XMLTV",
                keyboardNavDistance: 50,
                keyboard: true,
                supportRemoteController: false,
                providerConfig: {},
                cssTag: {
                    transform: domHelper.getPrefixedCssProp('transform'),
                    transition: domHelper.getPrefixedCssProp('transition'),
                    transitionEnd: domHelper.getPrefixedCssProp('transitionEnd')
                },
                navigation: {
                    "plugin": this,
                    "defaultMap": "channelLogoList",
                    "stateTransitionTable": {
                        "channelLogoList": {
                            "selector": ".epg .channelLogoListBar .logoListInner",
                            "defaultAction": "channelLogoNavigation",
                            "stopOnTheEdge": ['DOWN_ARROW'],
                            "UP_ARROW": "today",
                            "childOption": {
                                "DOWN_ARROW": "nextElementSibling",
                                "UP_ARROW": "previousElementSibling",
                                "RIGHT_ARROW": "channelList"
                            }
                        },
                        "today": {
                            "selector": ".epg .button.now",
                            "ENTER": "positionAtCurrentTime",
                            "DOWN_ARROW": "channelLogoList",
                            "RIGHT_ARROW": "dayButton"
                        },
                        "dayButton": {
                            "selector": ".epg .dayButtons",
                            "defaultAction": "RIGHT_ARROW",
                            "LEFT_ARROW": "today",
                            "DOWN_ARROW": "channelList",
                            "stopOnTheEdge": ["RIGHT_ARROW"],
                            "childOption": {
                                "RIGHT_ARROW": "nextElementSibling",
                                "LEFT_ARROW": "previousElementSibling",
                                "ENTER": "switchDay"
                            }
                        },
                        "channelList": {
                            "selector": ".epg .channels",
                            "defaultAction": "programeNavigation",
                            "LEFT_ARROW": "channelLogoList",
                            "UP_ARROW": "today",
                            "stopOnTheEdge": ['RIGHT_ARROW'],
                            "childOption": {
                                "selector": ".programmes .item",
                                "RIGHT_ARROW": {
                                    "action": "next",
                                    "handler": "findNextPrevProgramme"
                                },
                                "LEFT_ARROW": {
                                    "action": "previous",
                                    "handler": "findNextPrevProgramme"
                                },
                                "DOWN_ARROW": {
                                    "action": "next",
                                    "handler": "findDownUpProgramme"
                                },
                                "UP_ARROW": {
                                    "action": "previous",
                                    "handler": "findDownUpProgramme"
                                },
                                "ESCAPE": "channelLogoList",
                                "ENTER": "showProgrammeOnEnter"
                            }
                        }
                    }
                },
                /**
                 * data provider class
                 * @cfg {Function} [Provider]
                 *
                 */
                Provider: null,
                translation: {
                    "timeFormat": "HH:MM",
                    "nowLabel": "maintenant",
                    "dayLabel": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    "loading": "chargement en cours...",
                    "today": "Aujourd'hui",
                    "categories": {
                        "série/feuilleton": "serie",
                        "série": "serie",
                        "série documentaire": "documentary",
                        "documentaire": "documentary",
                        "météo": "weather",
                        "dessin animé": "kids",
                        "film": "movie",
                        "clips": "music"
                    }
                },
                rowsToBeUpdated: [],
                timerCache: new WeakMap(),
                baseCls: 'epg',
                days: [],
                forecastDays: 2,
                rendered: false,
                node: node
            };
            BaseEvented.call(this);
            opt && helper.merge(this.config, opt);


            this.genTimelineLabel();
            this.getDayLabel();
            this.config.struTpl = Hogan.compile(this.config.struTplStr || struTplStr);
            this.config.channelTpl = Hogan.compile(this.config.channelTplStr || channelTplStr);
            this.config.channelIconTpl = Hogan.compile(this.config.channelIconStr || channelIconStr);
            this.config.programmesTpl = Hogan.compile(this.config.programmesStr || programmesStr);
            this.config.detailTpl = Hogan.compile(this.config.detailStr || detailStr);
            this.config.totalLayoutSize = this.config.timelineUnitSize * 24 + this.config.leadingSize + 10;
            if (has('touch')) {
                this.config.keyboard = false;
                this.config.supportRemoteController = false;
            }

            if (this.config.supportRemoteController) {
                this.config.keyboard = false;
            }

            if (!this.config.Provider) {
                require(['./epg/' + this.config.providerClass], function (K) {
                    self.provider = new K(self.config.providerConfig, self);
                    self.config.initialized = true;
                    self.emit('initialized');
                });
            } else {
                this.provider = new this.config.Provider(this.config.providerConfig, this);
                this.config.initialized = true;
                this.emit('initialized');
            }
        },
        enableRemoteControl: function () {
            var self = this;
            if (!this.config.supportRemoteController) {
                return;
            }
            this.config.navigator = new KeyboardNavigation(this.config.navigation, this.config.node);
            this.config.navigator.on('childNodeSelected', function (node, key) {
                self.scrollToViewPort(node, key);
            });
        },
        scrollToViewPort: function (node, key) {
            var rect, containerRect, maxY, leftEdge;
            if (this.config.channelLogoListBar) {
                if (this.config.channelLogoListBar.contains(node)) {
                    rect = node.getBoundingClientRect();
                    containerRect = this.config.channelLogoListBar.getBoundingClientRect();
                    maxY = containerRect.top + containerRect.height;

                    if (rect.top + rect.height > maxY * 0.7) {
                        console.log('should scroll');
                        this.config.channelLogoListBar.scrollTop += rect.height;
                    } else if (rect.top < containerRect.top + rect.height / 2) {
                        this.config.channelLogoListBar.scrollTop -= rect.height;
                    }
                }
            }
            if (this.config.channelsNode.contains(node)) {
                console.log('found', node);
                rect = node.getBoundingClientRect();
                containerRect = this.config.channelsNode.getBoundingClientRect();
                maxY = containerRect.top + containerRect.height;
                leftEdge = containerRect.left + this.config.leadingSize;
                if (['UP_ARROW', 'DOWN_ARROW'].indexOf(key) !== -1) {
                    if (rect.top + rect.height > maxY * 0.7) {
                        console.log('should scroll');
                        this.config.channelLogoListBar.scrollTop += rect.height;
                    } else if (rect.top < containerRect.top + containerRect.height / 2) {
                        this.config.channelLogoListBar.scrollTop -= rect.height;
                    }
                }
                if (rect.width === 0) {
                    return;
                }
                console.log(rect.left, leftEdge, this.config.channelsNode.scrollLeft);
                if (rect.left > containerRect.right) {
                    this.config.channelsNode.scrollLeft += rect.left - containerRect.right + containerRect.width / 2;
                } else if (rect.left > containerRect.left + containerRect.width / 2) {
                    this.config.channelsNode.scrollLeft += rect.left - containerRect.left - containerRect.width / 2;
                } else if (rect.left < leftEdge) {
                    this.config.channelsNode.scrollLeft -= Math.abs(rect.left);
                } else if (rect.left < containerRect.left + containerRect.width / 2) {
                    //value = this.config.channelsNode.scrollLeft - (containerRect.left );
                    //this.config.channelsNode.scrollLeft;
                    this.config.channelsNode.scrollLeft -= containerRect.left + containerRect.width / 2 - rect.left;
                }

            }
        },
        findNextPrevProgramme: function (opt) {
            var itemNode,
                attr = opt.action === 'next' ? 'nextElementSibling' : 'previousElementSibling';
            if (opt.selectedChild) {
                //progNode = opt.selectedChild.parentNode;
                itemNode = opt.selectedChild[attr];
                while (itemNode && itemNode.offsetWidth === 0) {
                    itemNode = itemNode[attr];
                }
                return itemNode;
            }
        },
        findDownUpProgramme: function (opt) {
            var progNode, focusRect, targetRect, channelNode, itemNode,
                mainRect = this.config.channelsNode.getBoundingClientRect(),
                leftEdge = mainRect.left + this.config.leadingSize,
                attr = opt.action === 'next' ? 'nextElementSibling' : 'previousElementSibling';
            if (opt.selectedChild) {
                progNode = opt.selectedChild.parentNode;
                channelNode = this.findChannelNode(progNode);
                if (channelNode = channelNode[attr]) {
                    itemNode = channelNode.getElementsByClassName('programmes')[0].firstElementChild;
                    while (itemNode) {
                        targetRect = itemNode.getBoundingClientRect();
                        if (targetRect.left > leftEdge) {
                            while (itemNode && itemNode.offsetWidth === 0) {
                                itemNode = itemNode.nextElementSibling;
                            }
                            return itemNode;
                        }
                        itemNode = itemNode.nextElementSibling;
                    }
                }
            }
        },
        findChannelNode: function (node, maxLevel) {
            maxLevel = maxLevel || 4;
            while (node && maxLevel > 0) {
                if (node.classList.contains('channel')) {
                    return node;
                }
                node = node.parentNode;
                maxLevel--;
            }
        },
        /**
         * find closest item node in horizontal
         * @method findClosestItemNode
         * @param {Number} x
         * @param {Number} y
         * @returns {?HTMLElement}
         */
        findClosestItemNode: function (x, y) {
            var node = document.elementFromPoint(x, y),
                rect = this.config.channelsNode.getBoundingClientRect(),
                distance = 50, xx, d = 'next', maxSearch = 20,
                itemNode;
            xx = x;
            if (!node) {
                return null;
            }
            if (node.classList.contains('programmes')) {
                while (!itemNode && maxSearch > 0) {
                    if (d === 'prev') {
                        xx -= distance;
                        if (xx > 0) {
                            node = document.elementFromPoint(xx, y);
                            if (node.classList.contains('programmes')) {
                                continue;
                            }
                            itemNode = this.findItemNode(node);
                            if (itemNode) {
                                break;
                            }
                        } else {
                            /*xx = x;
                             d = 'next';*/
                            break;
                        }
                    } else {
                        xx += distance;
                        if (xx <= rect.right) {
                            node = document.elementFromPoint(xx, y);
                            if (node.classList.contains('programmes')) {
                                continue;
                            }
                            itemNode = this.findItemNode(node);
                        } else {
                            xx = x;
                            d = 'prev';
                        }
                    }
                    --maxSearch;
                }
            } else {
                itemNode = this.findItemNode(node);
            }
            return itemNode;
        },
        findItemNode: function (node, maxLevel) {
            if (node.classList.contains('programmes')) {
                return;
            }
            maxLevel = maxLevel || 4;
            while (node && maxLevel > 0) {
                if (node.classList.contains('item')) {
                    return node;
                }
                node = node.parentNode;
                --maxLevel;
            }
        },
        findLogoNode: function (node) {
            while (node) {
                if (node.getAttribute('data-channel')) {
                    return node;
                }
                node = node.parentNode;
            }
        },
        channelLogoNavigation: function (opt) {
            var mainRect = opt.node.parentNode.getBoundingClientRect();
            var node = document.elementFromPoint(mainRect.left + 10, mainRect.top + 10);
            var logoNode = this.findLogoNode(node);
            this.config.navigator.selectChildNode(logoNode);
        },

        programeNavigation: function (opt, navigator) {
            console.log(opt);
            var mainRect = opt.node.getBoundingClientRect(),
                map = this.config.navigator.getMap(),
                itemNode, idx, fcRect, handler,
                selectedChild = this.config.navigator.getSelectedChildNode();
            if (!selectedChild) {
                itemNode = this.findClosestItemNode(mainRect.left + this.config.leadingSize * 2,
                        mainRect.top + this.config.leadingSize / 2);
                this.config.navigator.selectChildNode(itemNode);
                if (itemNode.offsetWidth === 0) {
                    this.programeNavigation(opt, navigator);
                } else {
                    this.scrollToViewPort(itemNode, opt.keyName);
                }
            } else {
                idx = this.config.navigator.findIndexInNodes(selectedChild, opt.children);
                switch (opt.keyName) {
                    case 'RIGHT_ARROW':
                        itemNode = opt.children[idx + 1];
                        if (itemNode) {
                            if (itemNode.parentNode === selectedChild.parentNode) {
                                this.config.navigator.unselectCurrentChild();
                                this.config.navigator.selectChildNode(itemNode);
                                this.scrollToViewPort(itemNode, opt.keyName);
                                break;
                            }

                        }
                        if (handler = map[opt.keyName]) {
                            this.config.navigator.triggerHandler(handler, opt);
                        }
                        break;
                    case 'LEFT_ARROW':
                        itemNode = idx - 1 !== -1 ? opt.children[idx - 1] : null;
                        if (itemNode) {
                            if (itemNode.parentNode === selectedChild.parentNode) {
                                this.config.navigator.unselectCurrentChild();
                                this.config.navigator.selectChildNode(itemNode);
                                this.scrollToViewPort(itemNode, opt.keyName);
                                break;
                            }
                        }
                        if (handler = map[opt.keyName]) {
                            this.config.navigator.triggerHandler(handler, opt);
                        }
                        break;
                    case 'UP_ARROW':
                        fcRect = selectedChild.getBoundingClientRect();
                        itemNode = this.findClosestItemNode(fcRect.left,
                                fcRect.top - fcRect.height / 2);
                        if (!itemNode) {
                            itemNode = this.findClosestItemNode(fcRect.right,
                                    fcRect.top - fcRect.height * 1.5);
                        }
                        console.log('upp arrow', itemNode);
                        if (itemNode) {
                            this.config.navigator.unselectCurrentChild();
                            this.config.navigator.selectChildNode(itemNode);
                            this.scrollToViewPort(itemNode, opt.keyName);
                        } else {
                            if (handler = map[opt.keyName]) {
                                this.config.navigator.triggerHandler(handler, opt);
                            }
                        }
                        break;
                    case 'DOWN_ARROW':
                        fcRect = selectedChild.getBoundingClientRect();
                        itemNode = this.findClosestItemNode(fcRect.left,
                                fcRect.top + fcRect.height * 1.5);
                        if (!itemNode) {
                            itemNode = this.findClosestItemNode(fcRect.right,
                                    fcRect.top + fcRect.height * 2);
                        }
                        console.log('downarrow', itemNode);
                        if (itemNode) {
                            this.config.navigator.unselectCurrentChild();
                            this.config.navigator.selectChildNode(itemNode);
                            this.scrollToViewPort(itemNode, opt.keyName);
                        } else {
                            if (handler = map[opt.keyName]) {
                                this.config.navigator.triggerHandler(handler, opt);
                            }
                        }
                        break;
                }
                if (itemNode && itemNode.offsetWidth === 0) {
                    this.programeNavigation(opt, navigator);
                }

            }
        },
        genTimelineLabel: function () {
            var i = 0;
            this.config.translation.timeline = [];
            for (; i < 24; i++) {
                if (this.config.use24h) {
                    this.config.translation.timeline.push({
                        hour: i,
                        label: i
                    });
                    continue;
                }
                if (i < 13) {
                    this.config.translation.timeline.push({
                        hour: i,
                        label: i + '<span class="unit">AM</span>'
                    });
                } else {
                    this.config.translation.timeline.push({
                        hour: i,
                        label: i % 12 + '<span class="unit">PM</span>'
                    });
                }
            }
        },
        getDayLabel: function () {
            var now = new Date(),
                year = now.getFullYear(),
                month = now.getMonth(),
                date = now.getDate(),
                today = now.getDay(), day;
            this.config.translation.days = [];
            for (var i = 0; i < this.config.forecastDays; i++) {
                day = (today + i) % 7;
                if (day === 0) {
                    day = 7;
                }
                this.config.days.push({
                    day: day,
                    date: [year, helper.leftPad(month + 1, 2, '0'), date + i].join(''),
                    label: i === 0 ? this.config.translation.today : this.config.translation.dayLabel[day - 1],
                    active: i === 0
                });
            }
        },
        render: function (node) {
            var self = this;
            if (!this.config.initialized) {
                return this.once('initialized', function () {
                    self.render(node);
                });
            }
            if (!this.config.node) {
                this.config.node = node;
            }
            if (typeof(this.config.node) === 'string') {
                this.config.node = document.querySelector(this.config.node);
            }
            this.config.oldNode = this.config.node;

            var epgNode = document.createElement('div');

            epgNode.innerHTML = this.config.struTpl.render(this.config);
            epgNode.className = this.config.oldNode.className;
            epgNode.id = this.config.oldNode.getAttribute('id');
            epgNode.classList.add(this.config.baseCls);
            this.config.oldNode.parentNode.replaceChild(epgNode, this.config.oldNode);
            this.config.node = epgNode;

            if (this.config.useIScroll) {
                this.config.node.classList.add('iscroll');
            }

            this.initStyle();

            this.showChannels();
            this.attachEvents();
            this.config.rendered = true;
            this.emit('rendered');

            //on pc and not mac, or support remote controller
            if ((!has('touch') && !has('mac')) || this.config.supportRemoteController) {
                this.config.node.classList.add('noScrollbar');
            }

            //this.startTimeIndicator();
        },
        startTimeIndicator: function () {
            var indicator = this.config.node.getElementsByClassName('timeIndicator')[0];
            var w = this.config.node;
            this.config.timeIndicatorTimer = setInterval(function () {
                var now = new Date(), h = now.getHours(), m = now.getMinutes();
                console.log(h, m);
                indicator.style.left = Math.round((h * 60 + m) / (24 * 60) * 100) + "%";
            }, 1000);
        },
        initStyle: function () {
            var channelsNode,
                self = this,
                totalSize = this.config.totalLayoutSize,
                channelLogoListBar = this.config.node.getElementsByClassName('channelLogoListBar')[0],
                html = document.documentElement, resize;

            this.config.timelineNode = this.config.node.getElementsByClassName('timelineContainer')[0];
            this.config.timelineNode.firstElementChild.style.width =
                totalSize + 'px';

            channelsNode = this.config.channelsNode = this.config.node.getElementsByClassName('channels')[0];

            channelsNode.firstElementChild.style.width = totalSize - 10 + 'px';

            resize = function () {
                var rect = channelsNode.getBoundingClientRect(),
                    height = html.clientHeight - rect.top -
                        self.config.borderSize + 'px';
                channelsNode.style.height = height;

                if (channelLogoListBar) {

                    channelLogoListBar.style.top = rect.top + 'px';
                    //channelLogoListBar.style.left = rect.left + 'px';
                    channelLogoListBar.style.height = height;
                }

            };
            if (channelLogoListBar) {
                this.config.channelLogoListBar = channelLogoListBar;
                this.config.channelLogoListInner = channelLogoListBar.firstElementChild;
            }

            this.connect.push(domEvent.on(window, 'resize', resize));
            resize();

        },
        switchDay: function (opt) {
            this.config.node.querySelector('header .button.active').classList.remove('active');
            (opt.selectedChild || opt.node).classList.add('active');
            this.showChannels();
        },
        attachEvents: function () {
            var self = this,
                timeline = this.config.timelineNode,
                channelsNode = this.config.channelsNode;
            domEvent.delegate(this.config.node, 'header .button', 'click', function (evt) {
                var classList = this.classList;
                if (classList.contains('now')) {
                    return self.positionAtCurrentTime();
                }
                if (!classList.contains('day')) {
                    return;
                }
                if (classList.contains('active')) {
                    return;
                }
                self.switchDay({
                    node: this
                });
                /*this.parentNode.getElementsByClassName('active')[0].classList.remove('active');
                 classList.add('active');
                 self.showChannels();*/
            });

            var timer;

            domEvent.on(channelsNode, 'scroll', function (evt) {

                if (!self.config.scrollOn) {
                    self.config.scrollOn = 'channelList';
                }
                if (self.config.scrollOn !== 'channelList') {
                    return;
                }
                clearTimeout(timer);
                timer = setTimeout(function () {
                    delete self.config.scrollOn;
                }, 200);
                self.positionChannelLogos(evt);
                self.positionTimeline(evt);
            });

            this.config.channelLogoListBar && domEvent.on(this.config.channelLogoListBar, 'scroll', function (evt) {

                if (!self.config.scrollOn) {
                    self.config.scrollOn = 'logoList';
                }
                if (self.config.scrollOn !== 'logoList') {
                    return;
                }
                clearTimeout(timer);
                timer = setTimeout(function () {
                    delete self.config.scrollOn;
                }, 200);
                channelsNode.scrollTop = evt.target.scrollTop;
            });

            domEvent.delegate(channelsNode, '.channel .item', 'tap', function (evt) {
                console.log('tapped', evt, this);
                self.showProgramme(this);
            });

            if (has('touch')) {
                //this.buildScrollEvent(channelsNode);
                return;
            }
            this.channelsMover();
            this.channelLogoMover();
            this.keyboardControl();
        },
        keyboardControl: function () {
            var self = this, keyboardNavDistance = this.config.keyboardNavDistance;
            if (!this.config.keyboard) {
                return;
            }
            this.connect.push(domEvent.on(document, 'keydown', function (evt) {
                var keyCode = keyboard.getIdentifier(evt.keyCode);
                if (keyCode === 'UP_ARROW') {
                    self.config.channelsNode.scrollTop -= keyboardNavDistance;
                }
                if (keyCode === 'DOWN_ARROW') {
                    self.config.channelsNode.scrollTop += keyboardNavDistance;
                }
                if (keyCode === 'LEFT_ARROW') {
                    self.config.channelsNode.scrollLeft -= keyboardNavDistance;
                }
                if (keyCode === 'RIGHT_ARROW') {
                    self.config.channelsNode.scrollLeft += keyboardNavDistance;
                }
            }));
        },
        channelLogoMover: function () {
            var channelLogoListBar = this.config.channelLogoListBar;
            domEvent.on(channelLogoListBar, 'mousedown', function (evt) {
                //evt.preventDefault();
                var mClassList = this.classList, isDragging = false;
                var lastPy = evt.pageY, gapY;
                var move = domEvent.on(document, 'mousemove', function (evtMove) {
                    if (!isDragging) {
                        mClassList.add('grabbing');
                        isDragging = true;
                    }

                    gapY = evtMove.pageY - lastPy;
                    lastPy = evtMove.pageY;
                    channelLogoListBar.scrollTop = channelLogoListBar.scrollTop - gapY;

                });
                var upEvent = function upEvent(evtUp) {
                    console.log('mouseup');
                    isDragging = false;
                    move.remove();
                    up.remove();
                    leave.remove();
                    move = up = leave = null;
                    mClassList.remove('grabbing');
                };
                var up = domEvent.once(document, 'mouseup', upEvent);
                var leave = domEvent.once(document, 'mouseleave', upEvent);
            });
        },
        channelsMover: function () {
            var self = this,
                timeline = this.config.timelineNode,
                channelsNode = this.config.channelsNode;
            domEvent.on(channelsNode, 'mousedown', function (evt) {
                //evt.preventDefault();
                var mClassList = this.classList, isDragging = false;
                var lastPx = evt.pageX, lastPy = evt.pageY, gapX, gapY;
                var move = domEvent.on(document, 'mousemove', function (evtMove) {
                    if (!isDragging) {
                        mClassList.add('grabbing');
                        isDragging = true;
                    }

                    gapX = evtMove.pageX - lastPx;
                    lastPx = evtMove.pageX;
                    //timeline.scrollLeft = timeline.scrollLeft - gapX;
                    channelsNode.scrollLeft = channelsNode.scrollLeft - gapX;

                    gapY = evtMove.pageY - lastPy;
                    lastPy = evtMove.pageY;
                    channelsNode.scrollTop = channelsNode.scrollTop - gapY;

                });
                var upEvent = function upEvent(evtUp) {
                    console.log('mouseup');
                    isDragging = false;
                    move.remove();
                    up.remove();
                    leave.remove();
                    move = up = leave = null;
                    mClassList.remove('grabbing');
                };
                var up = domEvent.once(document, 'mouseup', upEvent);
                var leave = domEvent.once(document, 'mouseleave', upEvent);
            });
        },
        buildScrollEvent: function (node) {
            domEvent.on(node, 'touchstart', function () {
                console.log('touchstart');
                var timer, moved = false;
                var move = domEvent.once(node, 'touchmove', function () {
                    console.log('touchmove');
                    moved = true;
                    timer = setInterval(function () {
                        console.log('scrolling');
                        domEvent.emit('scroll', {
                            el: node,
                            fake: true
                        });
                    }, 100);
                });
                var onStop = function () {
                    //clearInterval(timer);
                    console.log('touchend');
                    end.remove();
                    move.remove();
                    leave.remove();
                    if (!moved) {
                        return;
                    }
                    var scroll = domEvent.on(node, 'scroll', function (evt) {
                        console.log('fake', evt.fake,
                            evt.target.firstElementChild.scrollLeft, evt.target.firstElementChild.scrollTop,
                            evt.target.firstElementChild.getBoundingClientRect().left);
                        console.dir(evt.target);
                        if (!evt.fake) {
                            clearInterval(timer);
                            scroll.remove();
                        }
                    });

                };
                var end = domEvent.on(node, 'touchend', onStop);

                var leave = domEvent.on(node, 'touchcancel', onStop);

            });
        },
        positionTimeline: function (evt) {
            var scrollLeft = evt.target.scrollLeft;
            clearTimeout(this.config.timelineTimer);
            /*if (has('touch')) {
             this.config.timelineTimer = this.scrollEndAnim(this.config.timelineNode.firstElementChild, {
             value: scrollLeft,
             propTpl: 'translate3d(-{{value}}px,0,0)',
             speed: 500
             });
             return;
             }*/
            this.config.timelineNode.firstElementChild.style[this.config.cssTag.transform.js] = 'translate3d(-' + scrollLeft + 'px,0,0)';
            //this.config.timelineNode.scrollLeft = scrollLeft;
        },
        positionChannelLogos: function (evt) {
            var scrollTop = evt.target.scrollTop,
                self = this;
            if (!this.config.channelLogoListBar) {
                return;
            }
            /* clearTimeout(this.config.channelLogoTimer);

             if (has('touch')) {
             this.config.channelLogoTimer = this.scrollEndAnim(self.config.channelLogoListInner, {
             value: scrollTop,
             propTpl: 'translate3d(0,-{{value}}px,0)',
             speed: 500
             });
             return;
             }*/
            //self.config.channelLogoListInner.style[self.config.cssTag.transform.js] = 'translate3d(0,-' + scrollTop + 'px,0)';
            self.config.channelLogoListBar.scrollTop = scrollTop;

        },
        scrollEndAnim: function (node, opt) {
            var self = this, tpl = Hogan.compile(opt.propTpl || 'translate3d(0,-{{value}}px,0)');
            node.style[self.config.cssTag.transition.js] = '';
            return setTimeout(function () {
                node.style[self.config.cssTag.transition.js] = 'all ' + opt.speed + 'ms ease-in';
                domEvent.once(self.config.channelLogoListInner, self.config.cssTag.transitionEnd.js, function () {
                    node.style[self.config.cssTag.transition.js] = '';
                });
                window.requestAnimationFrame(function () {
                    node.style[self.config.cssTag.transform.js] = tpl.render(opt);
                });
                //self.config.channelLogoListBar.scrollTop = scrollTop;
            }, 200);
        },
        /**
         * load data:
         *
         *      load({query:{useJsonP:true}},function(data,loadIt){
         *          loadIt(data.content);
         *      });
         *
         * @method load
         * @param {Object} opt
         * @param {Object} [opt.data]
         * @param {*} [opt.query]
         * @param {function(data:Object,loadIt:function(Object))} [callback]
         */
        load: function (opt, callback) {
            opt = opt || {};
            var self = this,
                loadIt = function (data) {
                    self.setConfig('data', self.provider.parseData(data));
                    self.showChannels();
                    self.emit('loaded');
                };
            if (!this.config.rendered) {
                return this.once('rendered', function () {
                    self.load(opt, callback);
                });
            }
            if (opt.data) {
                if (callback) {
                    callback(opt.data, loadIt);
                } else {
                    loadIt(opt.data);
                }
            } else {
                this.provider.loadData(opt.query, function (data) {
                    if (callback) {
                        callback(data, loadIt);
                    } else {
                        loadIt(data);
                    }
                });
            }
        },
        getMinutes: function (str) {
            var m = str.match(/[\d]{8}([\d]{2})([\d]{2}).*/);
            return m[1] * 60 + (+m[2]);
        },
        hideLoading: function () {
            var node = this.config.node.getElementsByClassName('spinner')[0];
            node && node.parentNode.removeChild(node);
        },
        /**
         * replace channel view with new channels info
         * @method showChannels
         *
         */
        showChannels: function () {
            if (!this.config.data) {
                return;
            }
            this.hideLoading();
            var activeDate = this.getActiveDate();
            if (!this.config.data[activeDate]) {
                return;
            }

            if (this.config.useIScroll) {
                return this.initIScroll();
            }

            this.initLazyLoader();
        },
        showProgrammeOnEnter: function (opt) {
            this.showProgramme(opt.selectedChild);
        },
        showProgramme: function (itemNode) {
            var channelId = itemNode.getAttribute('data-channelId'),
                self = this,
                activeDate = this.getActiveDate(),
                detailNode = this.config.node.getElementsByClassName('detailInfo')[0],
                prog;
            if (this.config.getProgrammeData) {
                prog = this.config.getProgrammeData(itemNode, this);
            } else {
                prog = this.config.data[activeDate][channelId].programmes[+itemNode.getAttribute('data-index')];
            }
            console.log(prog);

            detailNode.innerHTML = this.config.detailTpl.render({
                channelIcon: this.config.data[activeDate][channelId].icon,
                displayName: this.config.data[activeDate][channelId].displayName,
                programme: prog
            });
            detailNode.classList.add('show');
            var inner = detailNode.getElementsByClassName('detailInner')[0];
            var h = domEvent.on(detailNode, 'click', function (evt) {
                if (!inner.contains(evt.target)) {
                    this.classList.remove('show');
                    h.remove();
                }
            });
            if (this.config.navigator) {
                this.config.navigator.setConfig('disabled', true);
                var kdown = domEvent.on(document, 'keydown', function (evt) {
                    if (keyboard.getIdentifier(evt.keyCode) === 'ESCAPE') {
                        kdown.remove();
                        self.config.navigator.setConfig('disabled', false);
                        detailNode.classList.remove('show');
                    }
                });
            }

        },
        initLazyLoader: function () {
            var self = this;
            var channelsNode = this.config.node.getElementsByClassName('channels')[0];
            var totalChannels = this.provider.config.channelOrder.length;
            if (this.config.lazyLoader) {
                //self.config.channelLogoListInner.innerHTML = '';
                return this.config.lazyLoader.reload();
            }

            this.config.lazyLoader = new LazyLoadData({
                totalResults: totalChannels,
                itemTemplate: channelTplStr,
                itemsPerUpdate: this.config.prefillChannelNumber,
                initTwice: false,
                autoStart: true,
                replaceTargetNode: false,
                scrollAdapter: {
                    adapter: 'browser',
                    //scrollbar: "createTouch" in document && !isSTB && !has('androidTV'),
                    useTranslate: true
                },
                fetchItems: function (range, callback) {
                    console.log('range', range);
                    return self.requestData(range.start, range.total, callback);
                },
                prepareItemHTML: this.prepareItemHTML.bind(this),
                dataFiller: this.updateContent.bind(this)
            }, channelsNode);
            this.config.lazyLoader.render();
            this.config.lazyLoader.once('initialized', function () {
                if (self.config.supportRemoteController) {
                    self.enableRemoteControl();
                    self.config.navigator.emit('selected');
                }
            });
            setTimeout(function () {
                this.positionAtCurrentTime();
            }.bind(this), 500);
        },
        initIScroll: function () {
            if (this.config.channelScroller) {
                this.config.channelScroller.destroy();
            }
            var channelsNode = this.config.node.getElementsByClassName('channels')[0],
                self = this,
                str = '',
                totalChannels = this.provider.config.channelOrder.length,
                activeDate = this.getActiveDate(),
                data = this.config.data[activeDate];
            if (!channelsNode.firstElementChild.children.length) {
                for (var i = 0; i < this.config.prefillChannelNumber; i++) {
                    str += this.config.channelTpl.render({
                        item: {
                            id: data.id,
                            date: activeDate,
                            leadingSize: self.config.leadingSize,
                            channelSize: self.config.totalLayoutSize - self.config.leadingSize - 10,
                            channel: data
                        }
                    });
                }
                channelsNode.firstElementChild.insertAdjacentHTML('beforeend', str);
            }

            this.config.channelScroller = new IScroll(channelsNode, {
                mouseWheel: true,
                infiniteElements: channelsNode.firstElementChild.children,
                //infiniteElements:'.scroll .channel',
                infiniteLimit: totalChannels - 1,
                dataset: this.requestDataForIScroll.bind(this),
                dataFiller: this.updateContent.bind(this),
                cacheSize: this.config.prefillChannelNumber * 2
            });
            this.config.channelScroller.on('scrollEnd', function (evt) {
                //positionChannelLogos
                console.log(evt, this);
                self.positionChannelLogos({
                    target: {
                        scrollTop: -this.y,
                        scrollLeft: this.x
                    }
                });
            });

        },
        positionAtCurrentTime: function () {
            var now = new Date(),
                h = now.getHours(),
                m = now.getMinutes(),
                pos = ((h * 60 + m) / (24 * 60)) * this.config.timelineNode.scrollWidth - this.config.leadingSize;

            //this.config.timelineNode.scrollLeft = pos;


            this.config.channelsNode.scrollLeft = pos;

            console.log("pos", pos);

            /*timeline.style.webkitTransform = 'translateX(' + pos + 'px)';
             grid.style.webkitTransform = 'translateX(' + pos + 'px)';

             timeline.style.webkitTransition = "all 0.5s ease-in";
             grid.style.webkitTransition = "all 0.5s ease-in";


             window.requestAnimationFrame(function () {
             timeline.style.webkitTransform = '';
             grid.style.webkitTransform = '';
             domEvent.once(timelineParent, 'webkitTransitionEnd', function () {
             timeline.style.webkitTransition = '';
             grid.style.webkitTransition = '';
             });
             });*/

        },
        getActiveDate: function () {
            var now = new Date(),
                currentDay = now.getDay(),
                currentDate = now.getDate(),
                activeDay = this.config.node.querySelector('.day.active').getAttribute('data-day'),
                activeDate = [now.getFullYear(),
                    helper.leftPad(now.getMonth() + 1, 2, "0"),
                    helper.leftPad(currentDate + (activeDay - currentDay), 2, "0")].join("");
            return activeDate;
        },
        requestDataForIScroll: function (start, count) {
            var self = this;
            this.requestData(start, count, function (res) {
                if (self.config.channelScroller) {
                    self.config.channelScroller.updateCache(start, res.items);
                } else {
                    setTimeout(function () {
                        self.config.channelScroller.updateCache(start, res.items);
                    });
                }
            });
        },
        requestData: function (start, count, callback) {
            console.log('requestData', start, count);
            if (this.config.requestData) {
                return this.config.requestData.call(this, start, count, callback);
            }
            var activeDate = this.getActiveDate(),
                rawData = this.config.data[activeDate],
                rawDataKeys, data = [];
            if (rawData) {
                rawDataKeys = Object.keys(rawData);
                rawDataKeys = rawDataKeys.splice(start, count);
                data = rawDataKeys.map(function (channelName) {
                    return rawData[channelName];
                });
                callback && callback(null, {
                    items: data
                });

            } else {
                callback && callback(new Error("failed to get data"));

            }

        },
        updateContent: function (el, data, scope) {
            if (!data) {
                return;
            }

            //console.log("updatedContent", data);
            if (this.config.updateContent) {
                return this.config.updateContent.call(this, el, data, scope);
            }

            if (el.getAttribute('data-channel') === data.id) {
                return;
            }
            var activeDate = this.getActiveDate(),
                programmes = [],
                self = this;
            el.setAttribute('data-channel', data.id);
            el.setAttribute('data-date', activeDate);

            var progNode = el.getElementsByClassName('programmes')[0];

            console.time("genTpl");

            var itemStr = this.config.programmesTpl.render({
                unit: self.config.programmeUnit,
                programmes: data.programmes
            });

            console.timeEnd("genTpl");
            console.time("injectHTML");
            //progNode.innerHTML = itemStr;
            progNode.insertAdjacentHTML('beforeend', itemStr);
            console.timeEnd("injectHTML");

            if (!this.config.channelLogoListBar) {
                return;
            }
            if (this.config.channelLogoListInner.querySelector('[data-channel="' + data.id + '"]')) {
                return;
            }
            if (!this.config.itemOffsetHeight) {
                this.config.itemOffsetHeight = el.offsetHeight;
            }
            console.time("updateLogo");
            this.config.channelLogoListInner.insertAdjacentHTML('beforeend', this.config.channelIconTpl.render({
                date: activeDate,
                channel: data,
                height: this.config.itemOffsetHeight
            }));
            console.timeEnd("updateLogo");
            //logoListInner.style.height = logoListInner.offsetHeight + el.offsetHeight+'px';
        },
        prepareItemHTML: function (index, lazyLoader) {
            return lazyLoader.genItemHTML(index, {
                leadingSize: this.config.leadingSize,
                channelSize: this.config.totalLayoutSize - this.config.leadingSize - 10
            });
        },
        /**
         * str format: "20140213111700 +0100"
         * get the real date depending on timezone
         * @method getDate
         * @param {String} str
         * @param {Boolean} [noTimezone]
         * @returns {*}
         */
        getDate: function (str, noTimezone) {
            var d = null, parts, timezone, timeStr;
            if (noTimezone) {
                timeStr = str;
            } else {
                parts = str.split(/\s/);
                timezone = +parts.pop() / 100;
                timeStr = parts[0];
            }
            //20140213103500
            timeStr.trim().replace(this.config.dateRegxp, function (ignore, year, month, date, hour, minute, second) {
                d = new Date(year, month - 1, date, hour, minute, second);
            });
            return typeof(timezone) !== 'undefined' ? dateHelper.calcTime(d, timezone) : d;
        }

    });
    return EPG;
});