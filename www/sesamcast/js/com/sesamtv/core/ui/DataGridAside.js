define([
    '../util/Class',
    './Panel',
    '../util/Helper',
    '../util/Dom',
    '../util/DomEvent'
], function (Class, Panel, helper, domHelper, DomEvent) {
    "use strict";
    /**
     * @class com.sesamtv.core.ui.DataGridAside
     * @extends com.sesamtv.core.ui.Panel
     * @requires com.sesamtv.core.util.DomEvent
     * @requires com.sesamtv.core.util.Helper
     * @cfg {Object} args
     * @cfg {String|function(Object):String} args.tpl template
     * @cfg {Number} args.size aside size, depending on orientation, the size is for either width, or height
     * @cfg {String} args.openDirection before or after cell.
     * @cfg {String} args.defaultCloseAction remove or hide, if it's remove, when method close is called, the aside will be removed from DOM
     * @cfg {HTMLElement|String} node
     */
    var DataGridAside = Class({
        extend: Panel,
        constructor: function (args) {
            Panel.call(this, args);
            this.type = 'aside';
            this.animAttribute = this.useCssTransform ? 'webkitTransform' : (this.grid.gridLayoutType == 'x' ? 'top' : 'left');

            /**
             * aside's position
             * @property _position
             * @type {?number}
             * @private
             */
            this._position = null;
            Object.defineProperties(this, {
                openDirectionMapping: {
                    get: function () {
                        return this.grid.gridLayoutType == 'x' ? {
                            before: 'top',
                            after: 'bottom'
                        } : {
                            before: 'left',
                            after: 'right'
                        };
                    }
                }
            });
            //this.getVisibleItemList();
        },
        transformElement: function (pos, node) {
            node = node || this.node;
            if (this.animAttribute == 'webkitTransform') {
                node.style.webkitTransform = 'translate3d(' + (this.grid.gridLayoutType == 'x' ? '0,' + pos + 'px,0' : pos + 'px,0,0') + ')';
            } else {
                node.style[this.animAttribute] = pos + 'px';
            }

        },
        _reset: function () {
            if (!this.node) {
                return;
            }
            this.grid.node.classList.remove('showAside');
            this.node.className = 'noTransition';
            this.node.style.width = '0px';
            this.node.style.height = '0px';
        },
        /**
         * open the aside beside the selected item
         * @method open
         * @param {Object} cell datagrid cell object
         * @returns {*}
         */
        open: function (cell) {
            return this.create(cell);
        },
        /**
         * create aside node
         * @method create
         * @param {Object} cell datagrid cell object
         * @param {Object} [config]
         * @returns {boolean}
         */
        create: function (cell, config) {
            config = config || this;
            var self = this,
                currentGroup = this.grid.currentVisibleGroup(),
                groupMatrix = domHelper.getCoordFromMatrix(currentGroup.node),
            //groupIdx = this.grid.currentVisibleItem().visibleItemList.indexOf(currentGroup),
            //viewPanel = currentGroup.parent,
                timeoutAnim = false,
                htmlTpl, pos, openDirection, oldGroupCoord;

            var aside = this.node || (this.node = document.createElement('aside'));
            this.attachTo(this.node);

            aside.classList.add('closed');
            //prepare aside's size
            if (this.grid.gridLayoutType == 'x') {
                aside.style.width = this.grid.node.offsetWidth + 'px';
                aside.style.height = config.size + 'px';
            } else {
                aside.style.height = this.grid.node.offsetHeight + 'px';
                aside.style.width = config.size + 'px';
            }
            aside.style.position = 'absolute';
            //generate inner html based on template
            if (config.tpl) {
                if (typeof(config.tpl) == 'string') {
                    htmlTpl = helper.substitute(config.tpl, cell.data);
                } else {
                    htmlTpl = config.tpl(cell.data);
                }
                aside.innerHTML = '<div class="innerAside">' + htmlTpl + '</div>';
            }
            openDirection = this.openDirectionMapping[config.openDirection || 'after'];

            switch (openDirection) {
                case 'right':
                    pos = groupMatrix.x + currentGroup.node.offsetWidth;
                    break;
                case 'left':
                    pos = groupMatrix.x - config.size;
                    break;
                //todo finish bottom and top
                case 'bottom':
                    pos = groupMatrix.y + currentGroup.node.offsetHeight;
                    break;
                case 'top':
                    pos = groupMatrix.y;
                    break;
            }
            this._position = pos;

            this.transformElement(pos);
            if (pos + config.size > this.grid.node.offsetWidth) {
                aside.style.width = '1px';
            }

            aside.classList.add(openDirection);

            if (!aside.parentElement) {
                this.grid.node.appendChild(aside);
            } else {
                //if aside has already been added to the DOM, we have to wait for initial style has been applied.
                timeoutAnim = true;
            }

            aside.style.visibility = '';
            this.grid.node.classList.add('showAside');

            !timeoutAnim ? this.openAside(config) : setTimeout(function () {
                self.node.classList.remove('noTransition');
                self.openAside(config);
            }, 0);
            return true;
        },
        /**
         * open aside with animation
         * @method openAside
         * @param {Object} [config]
         */
        openAside: function (config) {
            var openDirection = this.openDirectionMapping[config.openDirection || 'after'],
                config = config || this,
                currentGroup = this.grid.currentVisibleGroup(),
                groupIdx = this.grid.currentVisibleItem().visibleItemList.indexOf(currentGroup),
                isCloseToEdge = this.isCloseToEdge(),
                oldGroupCoord;
            this.grid.visibleItemList.forEach(function (viewPanel) {
                viewPanel.visibleItemList.some(function (group, i) {
                    oldGroupCoord = domHelper.getCoordFromMatrix(group.node);
                    if (openDirection == 'right') {
                        if (isCloseToEdge) {
                            //group.node.style.webkitTransform = 'translate3d(' + (oldGroupCoord.x - config.size) + 'px,0,0)';
                            this.transformElement(this.animAttribute != 'webkitTransform' ? -config.size : oldGroupCoord.x - config.size, group.node);
                            return;
                        }
                        if (i <= groupIdx) {
                            return;
                        }
                        //group.node.style.webkitTransform = 'translate3d(' + (oldGroupCoord.x + config.size) + 'px,0,0)';

                        this.transformElement(this.animAttribute != 'webkitTransform' ? config.size : oldGroupCoord.x + config.size, group.node);
                        return;
                    }
                    if (openDirection == 'left') {
                        if (isCloseToEdge) {
                            //group.node.style.webkitTransform = 'translate3d(' + (oldGroupCoord.x + config.size) + 'px,0,0)';
                            this.transformElement(this.animAttribute != 'webkitTransform' ? config.size : oldGroupCoord.x + config.size, group.node);
                            return;
                        }
                        if (i >= groupIdx) {
                            return;
                        }
                        //group.node.style.webkitTransform = 'translate3d(' + (oldGroupCoord.x - config.size) + 'px,0,0)';
                        this.transformElement(this.animAttribute != 'webkitTransform' ? -config.size : oldGroupCoord.x - config.size, group.node);
                        return;
                    }
                    //todo finish bottom and top
                }, this);
            }, this);
            this.detectEdge('open');
            this.node.classList.remove('closed');
            this.emit('created');
        },
        /**
         * detect if the selected cell is close to datagrid's edge
         * @method isCloseToEdge
         * @returns {boolean}
         */
        isCloseToEdge: function () {
            var openDirection = this.openDirectionMapping[this.openDirection || 'after'],
                closeToEdge = false;
            switch (openDirection) {
                case 'left':
                    closeToEdge = this._position - this.size < 0;
                    break;
                case 'right':
                    closeToEdge = this._position + this.size > this.grid.node.offsetWidth;
                    break;
                case 'top':
                    //todo
                    break;
                case 'bottom':
                    //todo
                    break;
            }
            return closeToEdge;
        },
        detectEdge: function (action) {
            action = action || 'open';
            var openDirection = this.openDirectionMapping[this.openDirection || 'after'],
                closeToEdge = this.isCloseToEdge();
            if (!closeToEdge) {
                return false;
            }
            switch (openDirection) {
                case 'left':
                    if (action == 'open') {
                        this.transformElement(this._position + this.size);
                        this.node.style.width = this.size + 'px';
                    } else {
                        this.transformElement(this._position);
                        this.node.style.width = '1px';

                    }
                    break;
                case 'right':
                    if (action == 'open') {
                        this.transformElement(this._position - this.size);
                        this.node.style.width = this.size + 'px';

                    } else {
                        this.transformElement(this._position);
                        this.node.style.width = '1px';
                    }
                    break;
                case 'top':
                    //todo
                    break;
                case 'bottom':
                    //todo
                    break;
            }
        },
        /**
         * @method close
         * @param {Function} [cb] callback
         * @param {Boolean} [remove]
         * @returns {*}
         */
        close: function (cb, remove) {
            return this[this.defaultCloseAction || 'hide'](cb, remove);
        },
        remove: function (cb) {
            return this.hide(cb, true);
        },
        /**
         * @method hide
         * @param {Function} [cb] callback
         * @param {Boolean} [remove] if remove the HTML node
         */
        hide: function (cb, remove) {
            var self = this;
            this.grid.visibleItemList.forEach(function (viewPanel) {
                viewPanel.visibleItemList.forEach(function (group, i) {
                    group.node.style[this.animAttribute] = '';
                }, this);
            }, this);
            this.detectEdge('close');
            this.node.classList.add('closed');
            DomEvent.once(this.node, 'webkitTransitionEnd', function () {
                if (!remove) {
                    self._reset();
                    this.style.visibility = 'hidden';
                }
                remove && self.destroy();
                self.emit(remove ? 'removed' : 'hidden');
                cb && cb();
            });
        },
        /**
         * destroy aside node and its instance
         * @method destroy
         */
        destroy: function () {
            Panel.prototype.destroy.call(this);
            this.node && this.node.parentNode.removeChild(this.node);
            //break reference for GC
            this.node = null;
            this.grid.node.classList.remove('showAside');
        }
    });
    return DataGridAside;
});