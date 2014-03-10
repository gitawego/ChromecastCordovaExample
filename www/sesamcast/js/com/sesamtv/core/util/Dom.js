/*global require,define,console,alert*/
define([
    './has',
    './hasFeature/html5'
], function (has) {
    'use strict';
    /**
     * @class com.sesamtv.core.util.Dom
     * @singleton
     */
    var Dom = {
        toDOMFrag: function toDOMFrag(str) {
            var d = document, i,
                a = d.createElement("div"),
                b = d.createDocumentFragment();
            a.innerHTML = str;
            while ((i = a.firstChild)) {
                b.appendChild(i);
            }
            return b;
        },
        toDOM: function toDOM(str) {
            var d = document,
                c = d.createElement('div');
            c.innerHTML = str;
            return c.firstElementChild;
        },
        whichTransitionEvent: function whichTransitionEvent() {
            if (whichTransitionEvent.cache) {
                return whichTransitionEvent.cache;
            }
            var t,
                el = document.createElement('fakeelement'),
                transitions = {
                    'transition': 'transitionend',
                    'OTransition': 'oTransitionEnd',
                    'MozTransition': 'transitionend',
                    'WebkitTransition': 'webkitTransitionEnd',
                    'MsTransition': 'msTransitionEnd'
                };

            for (t in transitions) {
                if (el.style[t] !== undefined) {
                    whichTransitionEvent.cache = transitions[t];
                    return whichTransitionEvent.cache;
                }
            }
        },
        /**
         * @method findKeyframesRule
         * @param {String} rule animation keyframe name
         * @returns {*}
         */
        findKeyframesRule: function findKeyframesRule(rule) {
            // gather all stylesheets into an array
            var ss = document.styleSheets,
                ssL = ss.length,
                cssRL, KFR;


            // loop through the stylesheets
            for (var i = 0; i < ssL; ++i) {
                // loop through all the rules
                cssRL = ss[i].cssRules.length;
                for (var j = 0; j < cssRL; ++j) {
                    // find the -webkit-keyframe rule whose name matches our passed over parameter and return that rule
                    if ('WEBKIT_KEYFRAMES_RULE' in window.CSSRule) {
                        KFR = window.CSSRule.WEBKIT_KEYFRAMES_RULE;
                    } else if ('KEYFRAMES_RULE' in window.CSSRule) {
                        KFR = window.CSSRule.KEYFRAMES_RULE;
                    }
                    if (ss[i].cssRules[j].type === KFR && ss[i].cssRules[j].name === rule) {
                        return ss[i].cssRules[j];
                    }
                }
            }
            // rule not found
            return null;
        },
        replace: function (target, by) {
            target.parentNode.replaceChild(by, target);
            return by;
        },
        byId: function (node) {
            return typeof(node) !== 'string' ? node : document.getElementById(node);
        },
        insertAfter: function insertAfter(referenceNode, newNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        },
        /**
         * detect if an element is in viewport
         * @method inViewport
         * @param el
         * @returns {boolean}
         */
        inViewport: function (el) {
            var r, html;
            if (!el || 1 !== el.nodeType) {
                return false;
            }
            html = document.documentElement;
            r = el.getBoundingClientRect();
            return ( !!r
                && r.bottom >= 0
                && r.right >= 0
                && r.top <= html.clientHeight
                && r.left <= html.clientWidth
                );
        },
        /**
         * detect if an element is visible (at least 50%)
         * @method isElementVisible
         * @param el
         * @returns {boolean}
         */
        isElementVisible: function (el) {
            var eap,
                rect = el.getBoundingClientRect(),
                docEl = document.documentElement,
                vWidth = window.innerWidth || docEl.clientWidth,
                vHeight = window.innerHeight || docEl.clientHeight,
                efp = function (x, y) {
                    return document.elementFromPoint(x, y);
                },
                contains = "contains" in el ? "contains" : "compareDocumentPosition",
                has = contains === "contains" ? 1 : 0x10;

            // Return false if it's not in the viewport
            if (rect.right < 0 || rect.bottom < 0
                || rect.left > vWidth || rect.top > vHeight) {
                return false;
            }

            // Return true if any of its four corners are visible
            return (
                (eap = efp(rect.left, rect.top)) == el || el[contains](eap) == has
                || (eap = efp(rect.right, rect.top)) == el || el[contains](eap) == has
                || (eap = efp(rect.right, rect.bottom)) == el || el[contains](eap) == has
                || (eap = efp(rect.left, rect.bottom)) == el || el[contains](eap) == has
                || (eap = efp(rect.left + rect.width / 2, rect.top + rect.height / 2)) == el || el[contains](eap) == has
                );
        },
        ucFirst: function (str) {
            str += '';
            var f = str.charAt(0).toUpperCase();
            return f + str.substr(1);
        },
        /**
         * @method getPrefixedCssProp
         * @param {String} prop a css property string
         * @returns {{js: String, css: String}}
         */
        getPrefixedCssProp: function (prop) {
            var camelCase, prefix, transitionEnd;
            if (prop === 'transitionEnd') {
                transitionEnd = this.whichTransitionEvent();
                return {
                    js: transitionEnd,
                    css: transitionEnd
                };
            }
            camelCase = prop.split('-').map(function (k, i) {
                return i === 0 ? k : this.ucFirst(k);
            }, this).join('');
            prefix = this.getVendorPrefix();
            return prefix ? {
                js: prefix.js + this.ucFirst(camelCase),
                css: prefix.css + prop
            } : {
                js: camelCase,
                css: prop
            };
        },
        /**
         * get vendor prefix, the result is cached
         * @method getVendorPrefix
         * @returns {{js:String,css:String}}
         */
        getVendorPrefix: function getVendorPrefix() {
            if ('res' in getVendorPrefix) {
                return getVendorPrefix.res;
            }
            var regex = /^(moz|webkit|khtml|o|ms|icab)(?=[A-Z])/i,
                someNode = document.documentElement,
                res = {
                    js: null,
                    css: null
                };
            for (var prop in someNode.style) {
                if (regex.test(prop)) {
                    // test is faster than match, so it's better to perform
                    // that on the lot and match only when necessary
                    res.js = prop.match(regex)[0];
                    break;
                }
            }
            // Nothing found so far? Webkit does not enumerate over the CSS properties of the style object.
            // However (prop in style) returns the correct value, so we'll have to test for
            // the precence of a specific property
            if ('WebkitOpacity' in someNode.style) {
                res.js = 'webkit';
            }
            if ('KhtmlOpacity' in someNode.style) {
                res.js = 'khtml';
            }
            someNode = null;
            if (res.js) {
                res.css = '-' + res.js.toLowerCase() + '-';
                getVendorPrefix.res = res;
                return res;
            }
            getVendorPrefix.res = null;
            return null;
        },
        /**
         * set or get transformation in css3
         * @method cssTransform
         * @param {HTMLElement} node
         * @param {String} [key='translate']
         * @param {Array} [pos]
         * @returns {undefined|Object}
         */
        cssTransform: function (node, key, pos) {
            var transformKey = this.getPrefixedCssProp('transform').js;
            key = key || 'translate';
            var reg = new RegExp(key + '\\((.*?)\\)'),
                units = [];
            //var reg = /translate\((.*?)\)/;
            //var key = is3d?"translate3d":"translate";
            if (!pos) {
                var trans = node.style[transformKey].match(reg);
                if (!trans) {
                    return null;
                }
                pos = trans.pop().split(",").map(function (p) {
                    var m = p.trim().match(/(-[\d.]*|[\d.]*)([a-z]*)/i);
                    if (!m) {
                        units.push('px');
                        return 0;
                    }
                    units.push(m.pop());
                    return +m.pop();
                });
                return {
                    x: pos[0],
                    y: pos[1],
                    z: pos[2] || 0,
                    units: units
                };
            }
            var str = key + '(';
            pos.forEach(function (p, i) {
                str += !i ? p : ',' + p;
            });
            str += ')';
            node.style[transformKey] = str;
        },
        /**
         * get coordination from matrix, example:
         *
         *      var style = getComputedStyle(node);
         *      var coord = getCoordFromMatrix(style.webkitTransform);
         *
         * @method getCoordFromMatrix
         * @param {String|HTMLElement} matrix
         * @param {Boolean} [is3d]
         * @returns {*}
         */
        getCoordFromMatrix: function (matrix, is3d) {
            if (typeof(matrix) !== 'string') {
                matrix = getComputedStyle(matrix)[this.cssPropPrefix + 'Transform'];
                if (matrix.match(/matrix3d/)) {
                    is3d = true;
                }
            }
            //matrix(1, 0, 0, 1, 210, 0)
            //matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, -76, 5, 1)
            var m = matrix.match(!is3d ? /matrix\(([\d].*?)\)/ : /matrix3d\(([\d].*?)\)/);
            if (!m) {
                return null;
            }
            matrix = m.pop().split(',');
            if (is3d) {
                matrix.pop();
                return {
                    z: +matrix.pop().trim(),
                    y: +matrix.pop().trim(),
                    x: +matrix.pop().trim()
                };
            }
            return {
                y: +matrix.pop().trim(),
                x: +matrix.pop().trim()
            };
        },
        /**
         * convert css rule object to string
         * @method parseCssRules
         * @param {Object} rules
         * @param {Boolean} [toString]
         * @returns {String|Array}
         */
        parseCssRules: function (rules, toString) {
            var parsedRules = [], rule;
            Object.keys(rules).forEach(function (name, i) {
                rule = rules[name];
                if (typeof(rule) !== 'string') {
                    if (Array.isArray(rule)) {
                        rule = rule.join(';');
                    } else {
                        rule = Object.keys(rule).map(function (name) {
                            return name + ':' + rule[name];
                        }).join(';');
                    }
                }
                parsedRules.push(name + '{' + rule + ';}');
            });
            return toString ? parsedRules.join('\n') : parsedRules;
        },
        /**
         * example:
         *
         *      var rules = {
         *          '.viewPanel':'background:blue',
         *          'div':'outline:none;border:1px red solid',
         *          '.title':['border:1px red solid','outline:1px'],
         *          '.test':{
         *              'border':'1px red',
         *              'outline':'2px'
         *          }
         *      }
         *      appendCssRules(rules,2);
         *
         * see [manipulating css with Javascript][1]
         * [1]:http://www.w3.org/wiki/Dynamic_style_-_manipulating_CSS_with_JavaScript
         * @method appendCssRules
         * @param {Object} rules
         * @param {Number|CSSStyleSheet} stylesheet
         * @return {Object}
         * @return {Function} return.remove remove one or all inserted rules
         * @return {CSSStyleSheet} return.stylesheet stylesheet which is been working on
         * @return {Object} return.ruleIndexes
         */
        appendCssRules: function (rules, stylesheet) {
            if (typeof(stylesheet) === 'number') {
                stylesheet = document.styleSheets[stylesheet];
                if (!stylesheet) {
                    throw new Error('stylesheet is not found with index ' + stylesheet);
                }
            }
            var totalRules = stylesheet.cssRules.length, idx = [], _idx,
                insertMethod = has('ie') ? 'addRule' : 'insertRule', deleteMethod = has('ie') ? 'removeRule' : 'deleteRule';
            this.parseCssRules(rules).forEach(function (rule, i) {
                _idx = i + totalRules;
                idx.push(_idx);
                has('ie') ? stylesheet[insertMethod](stylesheet, rule, _idx) :
                    stylesheet[insertMethod](rule, _idx);
            });
            return {
                stylesheet: stylesheet,
                ruleIndexes: idx,
                remove: function (i) {
                    if (typeof(i) !== 'number') {
                        var startIdx = idx[0];
                        idx.forEach(function () {
                            stylesheet[deleteMethod](startIdx);
                        });
                        return;
                    }
                    return stylesheet[deleteMethod](i);
                }
            };
        },
        /**
         * @method classList
         * @param {HTMLElement} node
         * @returns {{add: add, remove: remove, toggle: toggle}}
         */
        classList: function (node) {
            var classList = node.classList,
                parse = function (str, action) {
                    str.split(' ').forEach(function (cls) {
                        classList[action](cls.trim());
                    });
                };
            return {
                add: function (str) {
                    parse(str, 'add');
                    return this;
                },
                remove: function (str) {
                    parse(str, 'remove');
                    return this;
                },
                toggle: function (str) {
                    parse(str, 'toggle');
                    return this;
                }
            };
        },
        /**
         * add css style node at head section
         * @method addCss
         * @param {String|Object} newStyleString css text or css url
         * @param {String} cssID
         * @param {Object} [params]
         * @param {String} [params.action='append'] append or replace, this is only available if we add css text
         * @param {HTMLElement} [params.node] default is head tag
         * @param {String} [params.tag='link'] style or link
         * @param {String} params.type href or cssText
         */
        addCss: function (newStyleString, cssID, params) {
            var doc = document, action;
            params = params || {};
            action = params.action || 'append';
            cssID = cssID || "generated_css";
            if (typeof(newStyleString) === 'object') {
                newStyleString = this.parseCssRules(newStyleString, true);
                params.type = 'href';
            }
            var tag = params.tag || "link",
                head = params.node ? doc.getElementById(params.node) : doc.getElementsByTagName("head")[0],
                newCssTxt = "",
                dataHead = "data:text/css,",
                fHead = head.querySelector(tag + "#" + cssID),
                oldCssTxt = fHead ? (tag === "link" ? fHead.href.replace(dataHead, "") : fHead.innerHTML) : '',
                attached = false;
            fHead && fHead.parentNode.removeChild(fHead);
            var ns = doc.createElement(tag);
            ns.type = 'text/css';
            ns.rel = 'stylesheet';
            ns.id = cssID;
            if (params.type === 'href') {
                dataHead = null;
            } else {
                switch (action) {
                    case "append":
                        newCssTxt = oldCssTxt + "\n" + newStyleString;
                        break;
                    case "replace":
                        newCssTxt = newStyleString;
                        break;
                }
            }
            if (tag === "link") {
                if (ns.addEventListener) {
                    params.callback && ns.addEventListener('load', params.callback);
                    params.errback && ns.addEventListener('error', params.errback);
                    attached = true;
                } else if (ns.onload) {
                    params.callback && (ns.onload = params.callback);
                    params.errback && (ns.onerror = params.errback);
                    attached = true;
                }
                ns.href = dataHead ? dataHead + newCssTxt : newStyleString;
                head.appendChild(ns);
                if (attached || !params.callback) {
                    return;
                }
                //hack for old browser
                var img = new Image();
                img.onerror = function () {
                    params.callback();
                };
                img.src = ns.href;
            } else {
                ns.innerHTML = newCssTxt;
                head.appendChild(ns);
                params.callback && params.callback();
            }
        }
    };
    Dom.cssKeyPrefix = '';
    Dom.cssPropPrefix = '';
    Dom.supportTouch = has('touch');
    if (has('moz')) {
        /**
         * @property cssKeyPrefix
         * @type {String}
         */
        Dom.cssKeyPrefix = "-moz-";
        /**
         * @property cssPropPrefix
         * @type {String}
         */
        Dom.cssPropPrefix = "moz";
    }
    if (has('webkit')) {
        Dom.cssKeyPrefix = "-webkit-";
        Dom.cssPropPrefix = "webkit";
    }
    if (has('opera')) {
        Dom.cssKeyPrefix = "-o-";
        Dom.cssPropPrefix = "o";
    }
    if (has('ie')) {
        Dom.cssKeyPrefix = "-ms-";
        Dom.cssPropPrefix = "ms";
    }
    return Dom;
});