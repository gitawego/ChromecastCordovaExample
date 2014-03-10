/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true*/
/**
 * JavaScript port of Webkit implementation of CSS cubic-bezier(p1x.p1y,p2x,p2y) by http://mck.me
 * http://svn.webkit.org/repository/webkit/trunk/Source/WebCore/platform/graphics/UnitBezier.h
 */
define([
    './CustomEvent',
    './CubicBezier'
], function (CustomEvent, Bezier) {
    'use strict';
    /**
     * @class com.sesamtv.core.util.Animation
     */

    // http://www.w3.org/TR/css3-transitions/#transition-timing-function
    var Animation = {
        /**
         * @method animate
         * @param {Object} options
         * @param {Number} options.duration
         * @param {Number} [options.from]
         * @param {Number} options.to
         * @param {function(gap:Number,prevGap:Number)} options.onAnimate
         * @param {Function} options.onEnd
         * @param {Function} options.beforeBegin
         * @returns {{on: on, stop: stop, play: play, pause: pause}}
         */
        animate: function (options) {
            options = options || {};
            var status = 'idle',
                paused = false,
                evt = new CustomEvent(),
                duration, distance, i = 1, timer,
                isFunction = function isFunction(m) {
                    return typeof(m) === 'function';
                }, endAnim = function (self) {
                    evt.emit('end');
                    status = 'stopped';
                    delete self.prevDistance;
                    delete self.prevBezier;
                    clearInterval(timer);
                }, hasEnded = function () {
                    return ['stopped', 'jumpToEnd'].indexOf(status) !== -1 || i >= duration;
                };
            return {
                params: options,
                getValue: function getValue(type) {
                    return isFunction(this.params[type]) ? this.params[type].call(this) : this.params[type];
                },
                hasEnded: hasEnded,
                getStatus: function () {
                    return status;
                },
                prepare: function () {
                    this.params.duration = this.params.duration || 800;
                    this.params.from = this.params.from || 0;
                    this.duration = duration = this.params.duration / 4;
                    this.distance = distance = this.getValue('to') - this.getValue('from');
                },
                on: function (evtName, fnc) {
                    //this.params['on' + evtName] = fnc;
                    evt.on(evtName, fnc.bind(this));
                    return this;
                },
                stop: function () {
                    status = 'stopped';
                    clearInterval(timer);
                    evt.emit('end');
                    delete this.prevDistance;
                    delete this.prevBezier;
                },
                play: function () {
                    var self = this, params = this.params;

                    if (hasEnded()) {
                        return;
                    }
                    status === 'idle' && evt.emit('beforeBegin');
                    status = 'playing';

                    this.prepare();
                    timer = setInterval(function () {
                        if (i <= duration) {
                            var bez = Bezier[params.type || 'easeOut'](i / duration, params.duration),
                                currentDistance = distance * bez,
                                gap = self.getValue('from') + currentDistance;
                            evt.emit('animate', gap, bez, i);
                            self.prevDistance = currentDistance;
                            self.prevBezier = bez;
                            i++;
                        } else {
                            endAnim(self);
                        }
                    }, 0);
                    return this;
                },
                hasJumpedToEnd: function () {
                    return status === 'jumpToEnd';
                },
                jumpToEnd: function () {
                    if (hasEnded()) {
                        return this;
                    }
                    status = 'jumpToEnd';
                    i = duration;
                    /*console.log('jumped');
                     jumped = true;
                     clearInterval(timer);
                     evt.emit('animate',this.getValue('from')+distance);
                     endAnim(self);*/
                    return this;
                },
                resume: function () {
                    if (hasEnded()) {
                        return this;
                    }
                    status = 'resumed';
                    evt.emit('resume');
                    this.play();
                    return this;
                },
                pause: function () {
                    if (hasEnded()) {
                        return this;
                    }
                    var self = this;
                    status = 'paused';
                    evt.emit('pause');
                    clearInterval(timer);
                    return this;
                }
            };
        },
        chain: function (anims) {
            var run = function () {
                currentAnim = anims.shift();
                if (!currentAnim) {
                    return;
                }
                currentAnim.on('end', function () {
                    run();
                });
                currentAnim.play();
                jumpToEnd && currentAnim.jumpToEnd();
            }, currentAnim, jumpToEnd = false;
            return {
                on: function (evt, fnc) {
                    if (evt === 'end') {
                        anims[anims.length - 1].on(evt, fnc);
                    }
                    if (evt === 'beforeBegin') {
                        anims[0].on(evt, fnc);
                    }
                    return this;
                },
                getStatus: function () {
                    return currentAnim && currentAnim.getStatus();
                },
                hasEnded: function () {
                    return currentAnim && currentAnim.hasEnded();
                },
                play: function () {
                    run();
                    return this;
                },
                hasJumpedToEnd: function () {
                    return jumpToEnd;
                },
                jumpToEnd: function () {
                    jumpToEnd = true;
                },
                pause: function () {
                    currentAnim && currentAnim.pause();
                    return this;
                },
                resume: function () {
                    currentAnim && currentAnim.resume();
                    return this;
                },
                stop: function () {
                    currentAnim && currentAnim.stop();
                    return this;
                }
            };
        },
        combine: function (anims) {
            var run = function (action) {
                var i = 0;
                for (; i < l; i++) {
                    anims[i][action]();
                }
            }, l = anims.length, jumped = false;
            return {
                on: function (evt, fnc) {
                    anims[anims.length - 1].on(evt, fnc);
                    return this;
                },
                play: function () {
                    run('play');
                    return this;
                },
                pause: function () {
                    run('pause');
                    return this;
                },
                resume: function () {
                    run('resume');
                    return this;
                },
                getStatus: function () {
                    return anims[anims.length - 1].getStatus();
                },
                hasEnded: function () {
                    return anims[anims.length - 1].hasEnded();
                },
                hasJumpedToEnd: function () {
                    return jumped;
                },
                jumpToEnd: function () {
                    if (jumped) {
                        return;
                    }
                    jumped = true;
                    run('jumpToEnd');
                },
                stop: function () {
                    run('stop');
                    return this;
                }
            };
        },
        scrollTo: function (x, y, node, time) {

            var hasX = typeof(x) === 'number',
                hasY = typeof(y) === 'number',
                anims = [];

            if (hasX) {
                if (x < 0) {
                    x = 0;
                }
                if (x > node.scrollWidth - node.offsetWidth) {
                    x = node.scrollWidth - node.offsetWidth;
                }
            }
            if (hasY) {
                if (y < 0) {
                    y = 0;
                }
                if (y > node.scrollHeight - node.offsetHeight) {
                    y = node.scrollHeight - node.offsetHeight;
                }
            }
            if (!time) {
                hasX && (node.scrollLeft = x);
                hasY && (node.scrollTop = y);
                return;
            }
            if (hasX) {
                anims.push(this.animate({
                    from: node.scrollLeft,
                    to: x,
                    duration: time
                }).on('animate', function (gap) {
                    node.scrollLeft = gap;
                }));
            }
            if (hasY) {
                anims.push(this.animate({
                    from: node.scrollTop,
                    to: y,
                    duration: time
                }).on('animate', function (gap) {
                    node.scrollTop = gap;
                }));
            }
            return this.combine(anims);
        }
    };
    return Animation;
});