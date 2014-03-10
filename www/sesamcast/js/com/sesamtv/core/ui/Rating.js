define([
    '../util/Class',
    '../util/DomEvent',
    '../util/keyboard',
    './BaseView',
    'text!assets/common/template/Rating.html'
], function (Class, DomEvent, keyboard, BaseView, ratingTpl) {
    'use strict';
    var slice = Array.prototype.slice;
    /**
     * @class com.sesamtv.core.ui.Rating
     * @extends com.sesamtv.core.ui.BaseView
     * @param {Object} args
     * @param {String|HTMLElement} node
     */
    var Rating = Class({
        extend: BaseView,
        constructor: function Rating(args, node) {
            var self = this;
            args.hasChild = true;
            args.applyOnly = false;
            args.templateStr = ratingTpl;
            Class.applyIf(args, {
                storeRate: true,
                /**
                 * @cfg {Number} rate
                 */
                rate:0,
                keyMapping: {
                    "RIGHT_ARROW": "focusNext",
                    "LEFT_ARROW": "focusPrev",
                    "UP_ARROW": "unselectNode",
                    "DOWN_ARROW": "unselectNode",
                    "ENTER": "rate"
                }
            });
            if(args.storeRate && !args.storage){
                args.storage = typeof(localStorage) !== 'undefined' ? function (v) {
                    var k = 'rate_'+this.node.getAttribute('data-id');
                    if(arguments.length === 1){
                        return localStorage.setItem(k,v);
                    }
                    return +localStorage.getItem(k);
                } : null;
            }
            BaseView.call(this, args, node);
            this.config.stars = slice.call(this.config.node.children);
            this.attachEvents();
            if(this.config.rate){
                this.rate(this.config.rate);
            }else{
                this.loadPrevRating();
            }

        },
        loadPrevRating:function(){
            this.unrate();
            if(this.config.storeRate){
                this.rate(this.config.storage());
            }
        },
        attachEvents: function () {
            var self = this,connect, click;
            this.on('selected', function () {
                self.config.node.classList.add('selected');
                connect = DomEvent.on(document, 'keydown', function (evt) {
                    var keyName = keyboard.getIdentifier(evt.keyCode);
                    if (keyName in self.config.keyMapping) {
                        self[self.config.keyMapping[keyName]]()
                    }
                });
                click = DomEvent(self.config.node).on('span','click',function(evt){
                    self.rate(+this.getAttribute('data-rating'));
                });
            });
            this.on('unselected', function () {
                connect && connect.remove();
                click && click.remove();
                connect = click = null;
                self.loadPrevRating();
            });
        },
        unselectNode: function () {
            this.config.node.classList.remove('selected');
            this.emit('unselected');
        },
        focusOnRate: function (rate) {
            var target, focusedNode;
            if (target = this.config.stars[rate - 1]) {
                if (focusedNode = this.config.node.getElementsByClassName('rated')[0]) {
                    focusedNode.classList.remove('rated');
                }
                target.classList.add('rated');
                this.emit('focusOnRate', +target.getAttribute('data-rating'));
            }
        },
        focusNext: function () {
            var focusedNode = this.config.node.getElementsByClassName('rated')[0], target;
            if (!focusedNode) {
                this.config.node.firstElementChild.classList.add('rated');
                this.emit('focusOnRate', 1);
                return true;
            }
            if (target = focusedNode.nextElementSibling) {
                focusedNode.classList.remove('rated');
                target.classList.add('rated');
                this.emit('focusOnRate', +target.getAttribute('data-rating'));
                return true;
            }
            return false;
        },
        focusPrev: function () {
            var focusedNode = this.config.node.getElementsByClassName('rated')[0], target;
            if (!focusedNode || !(target = focusedNode.previousElementSibling)) {
                return false;
            }
            focusedNode.classList.remove('rated');
            target.classList.add('rated');
            this.emit('focusOnRate', +target.getAttribute('data-rating'));
            return true;
        },
        /**
         * @method rate
         * @param {Number} [star]
         * @returns {*}
         */
        rate: function (star) {
            var targetNode, ratedNode, currentRate = this.getConfig('rate');
            if (typeof(star) !== 'number') {
                targetNode = this.config.node.getElementsByClassName('rated')[0];
                star = +targetNode.getAttribute('data-rating');
                if (!targetNode) {
                    return true;
                }
            } else {
                if (!(targetNode = this.config.stars[star - 1])) {
                    return true;
                }
            }

            this.config.node.classList.add('rated');
            if (ratedNode = this.config.node.getElementsByClassName('rated')[0]) {
                ratedNode.classList.remove('rated');
            }

            targetNode.classList.add('rated');
            if (currentRate && currentRate === +targetNode.getAttribute('data-rating')) {
                return true;
            }
            this.setConfig('rate', star);
            this.config.storage && this.config.storage(star);
            this.emit('rate', star);
            return true;
        },
        unrate: function () {
            var ratedNode,focusedNode;
            this.config.node.classList.remove('rated');
            if(ratedNode = this.config.node.getElementsByClassName('rated')[0]){
                ratedNode.classList.remove('rated');
            }
            if(focusedNode = this.config.node.getElementsByClassName('focused')[0]){
                focusedNode.classList.remove('focused');
            }


        },
        destroy: function () {
            delete this.config.starts;
            BaseView.prototype.destroy.call(this);
        }
    });
    return Rating;
});