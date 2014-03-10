define([
    './Class',
    './BaseEvented',
    './DomEvent',
    './keyboard'
], function (Class, BaseEvented, DomEvent, keyboard) {
    'use strict';
    /**
     * @class com.sesamtv.core.util.KeyboardNavigation
     * @extends com.sesamtv.core.util.BaseEvented
     * @requires com.sesamtv.core.util.DomEvent
     * @requires com.sesamtv.core.util.Keyboard
     * @param {Object} args
     * @param {HTMLElement} node
     */
    var KeyboardNavigation = Class({
        extend: BaseEvented,
        constructor: function KeyboardNavigation(args, node) {
            this.config = {
                currentMap: null,
                /**
                 * @cfg {Object} stateTransitionTable
                 */
                stateTransitionTable: null,
                /**
                 * @cfg {String} defaultMap
                 */
                defaultMap: '',
                disabled: false,
                global: {},
                /**
                 * @cfg {String} [clsPrefix='kbn-']
                 */
                clsPrefix: 'kbn-',
                /**
                 * @cfg {Object} clsNames
                 */
                clsNames: {
                    selected: 'selected',
                    focused: 'focused',
                    focusedGroup: 'focused-group',
                    selectedChild: 'focused-child'
                },
                node: node,
                connect: null
            };
            BaseEvented.call(this);
            args && Class.mixin(this.config, args);
            Object.keys(this.config.clsNames).forEach(function (k) {
                this.config.clsNames[k] = this.config.clsPrefix + this.config.clsNames[k];
            }, this);
            this.attachEvents();
        },
        attachEvents: function () {
            this.on('config', function (v) {
                if (v.key === 'currentMap') {
                    this.goToMap(v.newValue);
                }
            });
            this.on('selected', function () {
                this.bind();
            });
            this.on('unselected', function () {
                this.unbind();
            })
        },
        /**
         * @method bind
         */
        bind: function () {
            if (!this.config.defaultMap) {
                this.config.defaultMap = Object.keys(this.config.stateTransitionTable)[0];
            }
            var self = this;
            this.setConfig('currentMap', this.config.defaultMap);
            this.config.node.classList.add(this.config.clsNames.selected);
            this.config.connect = this.config.connect || DomEvent.on(document, 'keydown', function (evt) {
                if (self.config.disabled) {
                    return;
                }
                var keyName = keyboard.getIdentifier(evt.keyCode);
                self.parseMap(keyName, evt);
            });
        },
        /**
         * @method unbind
         */
        unbind: function () {
            var cNode;
            this.config.connect && this.config.connect.remove();
            delete this.config.connect;
            this.config.node.classList.remove(this.config.clsNames.selected);
            if (this.config.currentNode) {
                this.config.currentNode.classList.remove(this.config.clsNames.focused);
                this.config.currentNode.classList.remove(this.config.clsNames.focusedGroup);
                if (cNode = this.config.currentNode.getElementsByClassName(this.config.clsNames.selectedChild)[0]) {
                    cNode.classList.remove(this.config.clsNames.selectedChild);
                }
            }
        },
        findIndexInNodes: function (node, list) {
            var i = 0, l = list.length;
            for (; i < l; i++) {
                if (list[i] === node) {
                    return i;
                }
            }
            return -1;
        },
        /**
         * @method parseMap
         * @param {String} keyName
         * @param {Event} evt
         * @returns {*}
         */
        parseMap: function (keyName, evt) {
            if (!this.getMap()) {
                return;
            }
            var map = this.getMap(), attrs = ['nextElementSibling', 'previousElementSibling', 'next', 'previous'],
                currentNode = this.config.currentNode, onTheEdge = false,
                targetChild, selectedChild, childAction, nodes,
            //find parent handler
                handler = map[keyName] || this.config.global[keyName], childHandler, childActionHandler;

            if (map.childOption) {
                selectedChild = this.getSelectedChildNode();
                if (map.childOption.selector) {
                    nodes = this.config.currentNode.querySelectorAll(map.childOption.selector);
                }
                if (keyName in map.childOption) {
                    childAction = map.childOption[keyName];
                    if (typeof(childAction) === 'object') {
                        childActionHandler = childAction.handler;
                        childAction = childAction.action;
                    }
                    //handler = childAction || handler;
                    //if not found in attrs list, it's a custom method, do not find the dom element.
                    if (attrs.indexOf(childAction) !== -1) {

                        if (selectedChild) {
                            if (childActionHandler) {
                                targetChild = this.config.plugin[childActionHandler]({
                                    node: currentNode,
                                    selectedChild: selectedChild,
                                    children: nodes,
                                    action: childAction
                                }, this);

                            } else {
                                if (nodes) {
                                    var oldIdx = this.findIndexInNodes(selectedChild, nodes);
                                    if (childAction === 'next') {
                                        targetChild = nodes[oldIdx + 1];
                                    }
                                    if (childAction === 'previous') {
                                        targetChild = nodes[oldIdx - 1];
                                    }

                                } else {
                                    targetChild = selectedChild[childAction];

                                }
                            }
                            if (!targetChild) {
                                onTheEdge = true;
                            }
                            if (!targetChild && onTheEdge) {
                                if (!map.stopOnTheEdge || map.stopOnTheEdge.indexOf(keyName) === -1) {
                                    selectedChild.classList.remove(this.config.clsNames.selectedChild);
                                }
                            } else {
                                selectedChild.classList.remove(this.config.clsNames.selectedChild);
                            }

                        } else {
                            if (childActionHandler) {
                                targetChild = this.config.plugin[childActionHandler]({
                                    node: currentNode,
                                    children: nodes,
                                    action: childAction
                                }, this);
                            } else {
                                if (nodes) {
                                    targetChild = nodes[0];
                                } else {
                                    targetChild = currentNode.firstElementChild;
                                }
                            }
                        }
                    } else {
                        childHandler = childAction;
                    }

                    if (targetChild) {
                        targetChild.classList.add(this.config.clsNames.selectedChild);
                        this.emit('childNodeSelected', targetChild, keyName);
                        return;
                    }
                    /*if (this.config.plugin && childAction in  this.config.plugin) {
                     //found method in plugin
                     return this.config.plugin[childAction] && this.config.plugin[childAction]({
                     node: currentNode,
                     selectedChild: selectedChild,
                     keyName: keyName,
                     evt: evt
                     }, this);
                     }*/
                }
            }

            var opt = {
                node: currentNode,
                children: nodes,
                selectedChild: selectedChild,
                keyName: keyName,
                evt: evt
            };
            if (childHandler) {
                if (!this.triggerHandler(childHandler, opt)) {
                    this.triggerHandler(handler, opt);
                }
            } else if (handler) {
                this.triggerHandler(handler, opt);
            }
        },
        triggerHandler: function (handler, opt) {
            if (handler in this.config.stateTransitionTable) {
                this.setConfig('currentMap', handler);
                //this.unselectCurrent();
                //return this.goToMap(handler);
                return true;
            }
            if (this.config.plugin[handler]) {
                this.config.plugin[handler](opt, this);
                return true;
            }
        },
        unselectCurrent: function () {
            var cNode, classList;
            if (this.config.currentNode) {
                classList = this.config.currentNode.classList;
                classList.remove(this.config.clsNames.focusedGroup);
                classList.remove(this.config.clsNames.focused);
                if (cNode = this.config.currentNode.getElementsByClassName(this.config.clsNames.selectedChild)[0]) {
                    cNode.classList.remove(this.config.clsNames.selectedChild);
                }
            }
        },
        unselectCurrentChild: function () {
            var cNode;
            if (!this.config.currentNode) {
                return;
            }
            if (cNode = this.config.currentNode.getElementsByClassName(this.config.clsNames.selectedChild)[0]) {
                cNode.classList.remove(this.config.clsNames.selectedChild);
            }
        },
        getSelectedChildNode: function () {
            var currentNode = this.config.currentNode;
            return currentNode.getElementsByClassName(this.config.clsNames.selectedChild)[0];
        },
        selectChildNode: function (node) {
            node.classList.add(this.config.clsNames.selectedChild);
        },
        /**
         * @method goToMap
         * @param {String} id
         */
        goToMap: function (id) {
            var map = this.getMap(id), className = this.config.clsNames[map.childOption ? 'focusedGroup' : 'focused'];
            this.unselectCurrent();
            this.config.currentNode = this.config.node.querySelector(map.selector);
            this.config.currentNode.classList.add(className);
            this.emit('nodeSelected', this.config.currentNode);
            if (map.childOption && map.defaultAction) {
                if (map.defaultAction in this.config.plugin) {
                    this.config.plugin[map.defaultAction]({
                        node: this.config.currentNode,
                        children: map.childOption.selector ? this.config.currentNode.querySelectorAll(map.childOption.selector) : null
                    });
                } else {
                    this.parseMap(map.defaultAction);
                }

            }
        },
        /**
         * @method getMap
         * @param {String} id
         * @returns {Object}
         */
        getMap: function (id) {
            id = id || this.config.currentMap;
            return this.config.stateTransitionTable[id];
        }

    });
    return KeyboardNavigation;
});