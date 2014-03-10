/*global require,define,console,alert*/
/*jslint plusplus: true */
/*jslint expr:true */
define([
    './Class',
    './CustomEvent',
    './DomEvent',
    './Dom'
], function (klass, CustomEvent, domEvent, domHelper) {
    'use strict';
    var animatingNodes = [];
    var browserAnimPropMapping = {
        x: {
            //prop: 'marginLeft',
            prop: 'left',
            translate: 'translateX(${x})'
        },
        y: {
            /*prop: 'marginTop',*/
            prop: 'top',
            translate: 'translateY(${y})'
        },
        xy: {
            translate: 'translate3d(${x},${y},0)'
        }
    };
    /**
     * a css3 animator
     * @class com.sesamtv.core.util.Animator
     *
     */
    var Animator = {
        /**
         * @method animation
         * @param {Object} opt
         * @param {Boolean} opt.useKeyframe
         * @param {String|HTMLElement} opt.node
         * @param {String} opt.className one or several class names
         * @param {Object} opt.events
         * @returns {{play: play, pause: pause, resume: resume, on: on, once: once, emit: emit}}
         */
        animation: function (opt) {
            var $evt = new CustomEvent(),
                playing = false, ended = false,
                endEvtName = domHelper.getPrefixedCssProp(opt.useKeyframe ? 'AnimationEnd' : 'TransitionEnd').js,
                durationEvtName = domHelper.getPrefixedCssProp(opt.useKeyframe ? 'AnimationDuration' : 'TransitionDuration').js,
                playStateEvtName = domHelper.getPrefixedCssProp('AnimationPlayState').js,
                jumpToEnd = function () {
                    if (animatingNodes.indexOf(opt.node) !== -1) {
                        opt.node.style[durationEvtName] = 0;
                    }
                },
                reset = function () {
                    opt.node.style[durationEvtName] = '';
                    opt.node.style[playStateEvtName] = '';
                },
                classList;
            opt.node = typeof(opt.node) === 'string' ? document.querySelector(opt.node) : opt.node;
            classList = domHelper.classList(opt.node);
            domEvent.on(opt.node, endEvtName, function (evt) {
                $evt.emit('end', evt);
                playing = false;
                ended = true;
                reset();
                var idx = animatingNodes.indexOf(opt.node);
                idx !== -1 && animatingNodes.splice(idx, 1);
            });

            var res = {
                config: opt,
                classList: classList,
                play: function () {
                    if (playing || ended) {
                        return this;
                    }
                    playing = true;
                    jumpToEnd();
                    $evt.emit('beforebegin');
                    animatingNodes.push(opt.node);
                    window.requestAnimationFrame(function () {
                        classList.add(opt.className);
                    });
                    return this;
                },
                pause: function () {
                    if (!opt.useKeyframe) {
                        console.warn('transition can not be paused');
                        return;
                    }
                    if (!playing || ended) {
                        return;
                    }
                    opt.node.style[playStateEvtName] = 'paused';
                    playing = false;
                },
                resume: function () {
                    if (!opt.useKeyframe || ended) {
                        return;
                    }
                    if (opt.node.style[playStateEvtName] === 'paused') {
                        opt.node.style[playStateEvtName] = 'running';
                        playing = true;
                    }
                },
                restart: function () {
                    playing = false;
                    ended = false;
                    classList.remove(opt.className);
                    opt.node.offsetWidth = opt.node.offsetWidth;
                    classList.add(opt.className);
                },
                on: function (evtName, fnc) {
                    return $evt.on(evtName, fnc.bind(this));
                },
                once: function (evtName, fnc) {
                    var h = this.on(evtName, function () {
                        h.remove();
                        fnc.apply(null, arguments);
                    });
                    return h;
                },
                emit: function () {
                    return $evt.emit.apply($evt, arguments);
                }
            };
            if (opt.events) {
                Object.keys(opt.events).forEach(function (evtName) {
                    var conf = opt.events[evtName];
                    if (conf.listener) {
                        $evt[conf.once ? 'once' : 'on'](evtName, conf.listener.bind(res));
                    }
                });
            }
            return res;
        },
        combine: function (anims) {
            var run = function (action) {
                anims.forEach(function (anim) {
                    anim[action]();
                });
            };
            return {
                play: function () {
                    run('play');
                },
                pause: function () {
                    run('pause');
                },
                resume: function () {
                    run('resume');
                },
                restart: function () {
                    run('restart');
                },
                on: function (evt, fnc) {
                    anims[0].on(evt, fnc);
                },
                once: function (evt, fnc) {
                    anims[0].once(evt, fnc);
                }
            };
        },
        chain: function (anims) {
            var start = function () {
                    anim = anims.shift();
                    if (anim) {
                        if (!anims.length) {
                            anim.on('end', function () {
                                $evt.emit('end');
                                playing = false;
                            });
                        } else {
                            anim.on('end', start);
                        }
                        anim.play();
                    }
                }, $evt = new CustomEvent(), playing = false,
                anim;
            return {
                play: function () {
                    if (playing) {
                        return;
                    }
                    playing = true;
                    $evt.emit('beforebegin');
                    start();
                },
                pause: function () {
                    anim.pause();
                },
                resume: function () {
                    anim.resume();
                },
                restart: function () {

                },
                on: function (evtName, fnc) {
                    return $evt.on(evtName, fnc);
                },
                once: function (evtName, fnc) {
                    var h = this.on(evtName, function () {
                        h.remove();
                        fnc.apply(null, arguments);
                    });
                    return h;
                }
            };
        },
        /**
         * @method scrollAnim
         * @param {Object} opt
         * @param {Number|Array.<Number>} opt.to
         * @param {String} [opt.attribute] if not defined, there are 2 attributes: scrollLeft and scrollTop
         * @param {Number} opt.duration
         */
        scrollAnim: function (opt, node) {

        },
        /**
         * {
         *  "cover":{
         *      "open":{
         *          "sync":true,
         *          "once":true,
         *          "animations":[{
         *              "node":".cover",
         *              "className":"animate",
         *              "useKeyframe":true
         *          }]
         *      }
         *  }
         * }
         * @method load
         * @param {Object} seqs
         * @param {Object} scope
         */
        load: function (seqs, scope) {
            var i = 0,
                $evt = new CustomEvent(),
                keys = Object.keys(seqs),
                l = keys.length,
                parseNS = function (s) {
                    var evtName = [key, s].join('/'), seq = ns[s];
                    $evt[seq.once ? 'once' : 'on'](evtName, function () {
                        var anims = [], exec;
                        seq.animations.forEach(function (a) {
                            if (a.events) {
                                Object.keys(a.events).forEach(function (eName) {
                                    if (typeof(a.events[eName].listener) === 'string' &&
                                        scope && scope[a.events[eName].listener]) {
                                        a.events[eName].listener = scope[a.events[eName].listener];
                                    }
                                });
                            }
                            anims.push(Animator.animation(a));
                        });
                        exec = Animator[seq.sync ? 'chain' : 'combine'](anims);
                        if (seq.events) {
                            Object.keys(seq.events).forEach(function (eName) {
                                var _evt = seq.events[eName];

                                if (typeof(_evt.listener) === 'string') {
                                    scope && exec[_evt.once ? 'once' : 'on'](eName, scope[_evt.listener]);
                                } else {
                                    exec[_evt.once ? 'once' : 'on'](eName, _evt.listener);
                                }
                            });
                        }
                        exec.on('end', function () {
                            $evt.emit(evtName + '/end');
                        });
                        exec.on('beforebegin', function () {
                            $evt.emit(evtName + '/beforebegin');
                        });
                        exec.play();
                    });
                },
                key, ns;
            for (; i < l; i++) {
                key = keys[i];
                ns = seqs[key];
                Object.keys(ns).forEach(parseNS);
            }
            return $evt;
        }
    };
    return Animator;
});