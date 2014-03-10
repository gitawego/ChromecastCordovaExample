define([
    'module',
    './Topic',
    '../util/Class',
    '../abstract/BaseSystem',
    '../util/DataTable',
    '../util/Array',
    '../util/keyboard'
], function (module, topic, Class, BaseSystem, DataTable, arrayHelper, keyboard) {
    'use strict';
    /**
     * @class com.sesamtv.core.engine.FocusManager
     * @extends com.sesamtv.core.abstract.BaseSystem
     * @requires com.sesamtv.core.util.DataTable
     * @singleton
     */
    var FocusManager = Class({
        extend: BaseSystem,
        singleton: true,
        constructor: function (args) {
            this.config = {
                delegatedTo: null,
                groups: {}
            };
            BaseSystem.call(this, args);
        },
        initEvents: function () {
            var self = this;
            this.connect.push(this.on('config', function (opt) {
                if (opt.key === 'currentGroup') {
                    //first time
                    self.config.prevGroup = opt.oldValue;
                    self.focus();
                }
            }));
        },
        /**
         * @method attachInput
         * @param {Object} [mapping]
         */
        attachInput: function (mapping) {
            mapping = mapping || this.config.inputEvents;
            var self = this, handlerName;
            mapping && arrayHelper.forEach(mapping, function (map, i, deviceName) {
                handlerName = deviceName + 'Input';
                self[handlerName] && self[handlerName](map);
            }, this);
        },
        /**
         * @method keyboardInput
         * @param {Object} map
         */
        keyboardInput: function (map) {
            var self = this, channel;
            arrayHelper.forEach(map, function (setting, j, evtName) {
                channel = 'focusManager/'+evtName;
                if (this.evts[channel]) {
                    return;
                }
                topic.pub('inputManager/getDevice', 'keyboard', function (device) {
                    self.evts[channel] = device.on(channel, function (evt) {
                        self.handleKeyCode(evt,setting);
                    });
                });
            }, this);
        },
        handleKeyCode:function(evt,setting){
            var keyName = keyboard.getIdentifier(evt.keyCode);
            if (keyName in setting) {
                this[setting[keyName].method](setting[keyName].params);
            }
        },
        /**
         * @method switchGroup
         * @param {String} groupName
         * @topic fousManager/unselect
         * retrieve the focus from delegate
         */
        switchGroup: function (groupName) {
            if (!this.config.groups[groupName]) {
                return this;
            }
            if (this.config.delegatedTo) {
                topic.pub('fousManager/unselect', this.config.delegatedTo);
            }
            this.setConfig('currentGroup', groupName);
            return this;
        },
        /**
         * @method addFocusGroup
         * @param {String} stateName group name, it's the state name of application
         * @param {Object} group
         * @param {String} group.focus default focus map
         * @param {Object.<String,Array>} group.map
         * @param {Boolean} [replace]
         */
        addFocusGroup: function (stateName, group, replace) {
            var tbl;
            if (stateName in this.config.groups && !replace) {
                return this;
            }
            tbl = this.config.groups[stateName] = {
                data: new DataTable(),
                defaultFocus: group.focus,
                defaultMap: group.map[group.focus]
            };
            arrayHelper.forEach(group.map, function (map, i, key) {
                tbl.data.set(map[0], map[1], key);
            });
            return this;
        },
        removeFocusGroup: function (stateName) {
            return delete this.config.groups[stateName];
        },
        hasFocusGroup:function(stateName){
            return stateName in this.config.groups;
        },
        /**
         * @method delegateFocus
         * @param {com.sesamtv.core.abstract.plugin.BasePlugin} plug
         * @fires inputManager/setCurrentChannel
         */
        delegateFocus: function (plug) {
            var self = this, plugId = plug.getConfig('id'), inputEvents;
            if (this.evts['delegateFocus']) {
                throw new Error('focus is already delegated');
            }
            this.setConfig('delegatedTo', plugId);
            topic.pub('inputManager/setCurrentChannel', plugId);
            this.evts['delegateFocus'] = plug.once('unselected', function (evt) {
                self.setConfig('delegatedTo', null);
                delete self.evts['delegateFocus'];
                topic.pub('inputManager/setCurrentChannel', 'focusManager');
                inputEvents = self.getConfig('inputEvents');
                if(evt && evt.keyCode && inputEvents && inputEvents.keyboard && inputEvents.keyboard[evt.type]){
                    self.handleKeyCode(evt,inputEvents.keyboard[evt.type]);
                }
            });
        },
        /**
         * @method selectMap
         * @param {Array.<Number>} [map]
         * @topic focusManager/select
         */
        selectMap: function (map) {
            map = map || this.getGroup().currentMap;
            //topic.pub('focusManager/select', this.getGroup().data.get(map.map[0], map.map[1]));
            topic.pub('focusManager/select', map.key);
        },
        /**
         * @method getGroup
         * @param {String} [groupId]
         * @returns {Object}
         */
        getGroup: function (groupId) {
            return this.config.groups[groupId || this.config.currentGroup];
        },
        /**
         * revert one step
         * @method revert
         * @param {function(Boolean)} [callback]
         * @param {Boolean} [preventAction] do not trigger topics for blur and focus
         * @returns {Boolean}
         * @topic focusManager/onRevert
         * @topic focusManager/blur
         * @topic focusManager/focus
         */
        revert: function (callback, preventAction) {
            var reverted = false,
                prevGroupName = this.getConfig('prevGroup'),
                currentGroupName = this.getConfig('currentGroup'),
                currentGroup = this.getGroup(),
                currentMap = currentGroup.currentMap,
                prevMap = currentGroup.prevMap;
            //no prevMap but has prevGroup, it means focusManager has just changed group
            //we must revert to the last step of previous group
            if (!prevMap) {
                if (prevGroupName) {
                    this.config.currentGroup = prevGroupName;
                    this.config.prevGroup = null;
                    topic.pub('focusManager/onRevert', {
                        "type": "group",
                        prev: currentGroupName,
                        current: prevGroupName
                    });
                    if (!preventAction) {
                        topic.pub('focusManager/blur', currentGroup.currentMap.key);
                        topic.pub('focusManager/focus', this.getGroup(prevGroupName).currentMap.key);
                    }
                    reverted = true;
                }
            } else {
                currentGroup.data.set(prevMap.map[0], prevMap.map[1], prevMap.key);
                currentGroup.currentMap = prevMap;
                currentGroup.prevMap = null;
                topic.pub('focusManager/onRevert', {
                    "type": "map",
                    prev: currentMap,
                    current: prevMap
                });

                if (!preventAction) {
                    topic.pub('focusManager/blur', currentMap.key);
                    topic.pub('focusManager/focus', prevMap.key);
                }

                reverted = true;
            }
            callback && callback(reverted);
            return reverted;
        },
        /**
         * @method focus
         * @param {Object} [opt]
         * @param {String} [opt.direction] next or prev
         * @param {String} [opt.axis] x or y
         * @param {Array} [opt.map] if map is defined, direction and axis will be ignored.
         * @topic focusManager/focus
         * @topic focusManager/blur
         */
        focus: function (opt) {
            if (this.config.delegatedTo) {
                return;
            }
            if(!this.getConfig('currentGroup')){
                throw new Error('focus group is not defined');
            }
            var currentGroup = this.getGroup(),
                jumpToMap = opt && opt.map,
                currentMap = ((currentGroup.currentMap && currentGroup.currentMap.map) || currentGroup.defaultMap).slice(0),
                origCurrentMap = currentMap.slice(0),
                size = currentGroup.data.size(),
                goToNext = function () {
                    if (opt.axis === 'y') {
                        currentMap[0] = toNext ? currentMap[0] + 1 : currentMap[0] - 1;
                        if (currentMap[0] > size.y - 1 || currentMap[0] < 0) {
                            return;
                        }
                    } else {
                        currentMap[1] = toNext ? currentMap[1] + 1 : currentMap[1] - 1;
                        if (currentMap[1] > size.x - 1 || currentMap[1] < 0) {
                            return;
                        }
                    }
                    return currentMap;
                },
                toNext, key, oldKey;

            if (opt) {
                if (jumpToMap) {
                    currentMap = jumpToMap;
                } else {
                    toNext = opt.direction === 'next';
                    if(!goToNext()){
                        return;
                    }
                }
            }

            /*if (!currentGroup.data.inRange(currentMap[0], currentMap[1])) {
                return;
            }*/
            key = currentGroup.data.get(currentMap[0], currentMap[1], true);

            if (!jumpToMap) {
                while (currentGroup.currentMap && key === currentGroup.currentMap.key && goToNext()) {
                    key = currentGroup.data.get(currentMap[0], currentMap[1], true);
                }
            }


            if (currentGroup.currentMap && key === currentGroup.currentMap.key) {
                return;
            }

            currentGroup.currentMap = {
                map: currentGroup.data.map[key],
                key: key
            };

            oldKey = currentGroup.data.get(origCurrentMap[0], origCurrentMap[1], true);

            if (opt) {
                if (oldKey && oldKey !== key) {
                    currentGroup.prevMap = {
                        key: oldKey,
                        map: origCurrentMap
                    };

                    topic.pub('focusManager/blur', oldKey);
                    topic.pub('focusManager/focus', key);
                }
                return;
            }
            topic.pub('focusManager/focus', key);

        }
    });
    return new FocusManager(module.config());
});