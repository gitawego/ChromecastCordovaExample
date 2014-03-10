/* global define,console */
/*jslint plusplus: true */
/*jslint expr:true */
define([
    './polyfill'
], function () {
    "use strict";
    /**
     * @class com.sesamtv.core.util.Helper
     */
    var Helper = {
        /**
         * create a sandboxed function
         *
         *      var fnc = sandbox(['id','name'],'alert("id");');
         *      //it will throw an error "undefined is not a function", because alert is disabled
         *      fnc(10,'my name');
         *
         *      var fnc = sandbox(['id'], 'document.querySelector("#"+id)');
         *      //it will throw an error because document is disabled
         *      fnc('container');
         *
         *      //to give the access of document to the function
         *      var fnc = sandbox(['id'],'return document.querySelector("#"+id);',{
         *          shim:{
         *              'document':document
         *          }
         *      });
         *      //or only partially
         *      var fnc = sandbox(['id'],'return document.querySelector("#"+id);',{
         *          shim:{
         *              'document':{
         *                  "querySelector":document.querySelector
         *              }
         *          }
         *      });
         *      fnc('menu');
         *
         *
         * @method sandbox
         * @param {Array.<String>} param
         * @param {String} context
         * @param {Object} opt
         * @param {Array.<String>} [opt.restrictedVars] restricted variables
         * @param {Object} [opt.shim] shim the restricted variables
         * @param {Object} [opt.scope]
         * @returns {Function}
         */
        sandbox: function sandbox(param, context, opt) {
            opt = opt || {};
            var restrictedVars = ['window', 'document', 'alert', 'location', 'openDatabase', 'indexedDB',
                    'console', 'close', 'setTimeout', 'setInterval', 'open', 'localStorage', 'sessionStorage',
                    'parent', 'self', 'addEventListener', 'dispatchEvent', 'postMessage', 'WebSocket', 'Blob',
                    'require', 'define', '$'].concat(opt.restrictedVars || []),
                paramLen = param.length, fnc, argLen = 0, args, shimIndex = 0, foundShim, totalShim,
                emptyVars = new Array(restrictedVars.length), shimKeys, shimKey,
                splice = Array.prototype.splice;

            if (opt.shim) {
                shimKeys = Object.keys(opt.shim);
                for (totalShim = shimKeys.length; shimIndex < totalShim; shimIndex++) {
                    shimKey = shimKeys[shimIndex];
                    foundShim = restrictedVars.indexOf(shimKey);
                    if (foundShim === -1) {
                        continue;
                    }
                    emptyVars.splice(foundShim, 1, opt.shim[shimKey]);
                }
            }

            param = param.concat(restrictedVars);
            fnc = new Function(param.join(','), context);
            return function () {
                args = splice.call(arguments, 0, paramLen);
                args = args.concat(emptyVars);
                return fnc.apply(opt.scope || {}, args);
            };
        },
        throttle: function throttle(fn, minDelay) {
            var lastCall = 0;
            return function () {
                var now = +new Date();
                if (now - lastCall < minDelay) {
                    return;
                }
                lastCall = now;
                return fn.apply(this, arguments);
            };
        },
        /**
         * @method leftPad
         * @param {String|Number} result
         * @param {Number} size
         * @param {String} ch
         * @returns {string}
         */
        leftPad: function (result, size, ch) {
            result = result + '';
            if (!ch) {
                ch = " ";
            }
            while (result.length < size) {
                result = ch + result;
            }
            return result;
        },
        /**
         * async array processing without blocking the UI (useful when web worker is not available)
         * @method chunk
         * @param {Array} items
         * @param {Function} process
         * @param {Object} [context]
         * @param {Function} [callback]
         */
        chunk: function timedChunk(items, process, context, callback) {
            var todo = items.slice(0), i = 0;
            setTimeout(function worker() {
                var start = +new Date();
                do {
                    process.call(context, todo.shift(), i++);
                } while (todo.length > 0 && (+new Date() - start < 50));
                if (todo.length > 0) {
                    setTimeout(worker, 25);
                } else {
                    callback(items);
                }
            }, 25);
        },
        /**
         * uppercase the first character
         * @method ucFirst
         * @param {String} str
         * @returns {String}
         */
        ucFirst: function (str) {
            str += '';
            var f = str.charAt(0).toUpperCase();
            return f + str.substr(1);
        },
        /**
         * @method substitute
         * @param {String} template
         * @param {Object|Array} [map] if map is not defined, return a function with predefined template
         * @param {Function} [transform]
         * @param {Object} [thisObject] scope
         * @returns {String|Function}
         */
        substitute: function (template, map, transform, thisObject) {
            var self = this, run = function (data) {
                return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
                    function (match, key, format) {
                        var value = self.getObject(key, false, data);
                        if (format) {
                            value = self.getObject(format, false, thisObject).call(thisObject, value, key);
                        }
                        return transform(value, key).toString();
                    });
            };
            thisObject = thisObject || typeof(window) === 'undefined' ? global : window;
            transform = transform ?
                transform.bind(thisObject) : function (v) {
                return v;
            };
            return map ? run(map) : function (map) {
                return run(map);
            };
        },
        taskBufferAsync: function (tasks, finished, options) {
            options = options || {};
            var total = tasks.length, task;
            var done = function () {
                total--;
                if (!total) {
                    finished && finished();
                }
            };
            var run = function () {
                if (!tasks.length) {
                    return console.log("taskBufferAsync - no task appending");
                }
                while (task = tasks.shift()) {
                    if ('then' in task) {
                        task.then(done);
                    } else {
                        task(done);
                    }
                }
            };
            if (options.standby) {
                return {
                    run: function () {
                        return run();
                    }
                };
            }
            return run();
        },
        /**
         * @method shallowMixin
         * @param {Object} dest
         * @param {Object} source
         * @returns {Object}
         */
        shallowMixin: function (dest, source) {
            var keys = Object.keys(source), name;
            while ((name = keys.shift())) {
                dest[name] = source[name];
            }
            return dest;
        },
        /**
         * @method mixin
         * @param {Object} dest
         * @param {Object} source
         * @param {Function} [cpFunc]
         * @returns {Object}
         */
        mixin: function (dest, source, cpFunc) {
            var name, s, empty = {};
            for (name in source) {
                s = source[name];
                if (!(name in dest) ||
                    (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
                    dest[name] = cpFunc ? cpFunc(s) : s;
                }
            }
            return dest;
        },
        /**
         * @method merge
         * @param {Object} target
         * @param {Object} source
         * @param {Boolean} [nonStrict]
         * @returns {*}
         */
        merge: function merge(target, source, nonStrict) {
            var tval, sval, name;
            for (name in source) {
                if (!nonStrict && !source.hasOwnProperty(name)) {
                    continue;
                }
                tval = target[name];
                sval = source[name];
                if (tval !== sval) {
                    if (tval && typeof tval === 'object' && sval && typeof sval === 'object') {
                        merge(tval, sval, nonStrict);
                    } else {
                        target[name] = sval;
                    }
                }
            }
            return target;
        },
        /**
         * according to [The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/Guide/DOM/The_structured_clone_algorithm)
         * @method deepClone
         * @param {Object} oToBeCloned
         * @returns {Object}
         */
        deepClone: function deepClone(oToBeCloned) {
            if (!oToBeCloned || typeof oToBeCloned !== "object" || typeof(oToBeCloned) === 'function') {
                // null, undefined, any non-object, or function
                return oToBeCloned;	// anything
            }
            var oClone, FConstr = oToBeCloned.constructor;

            if (typeof(HTMLElement) !== 'undefined' && oToBeCloned instanceof HTMLElement) {
                oClone = oToBeCloned.cloneNode(true);
            } else if (oToBeCloned instanceof RegExp) {
                oClone = new RegExp(oToBeCloned.source,
                        "g".substr(0, Number(oToBeCloned.global)) +
                        "i".substr(0, Number(oToBeCloned.ignoreCase)) +
                        "m".substr(0, Number(oToBeCloned.multiline)));
            } else if (oToBeCloned instanceof Date) {
                oClone = new Date(oToBeCloned.getTime());
            } else {
                oClone = FConstr ? new FConstr() : {};
                for (var sProp in oToBeCloned) {
                    if (!oToBeCloned.hasOwnProperty(sProp)) {
                        continue;
                    }
                    oClone[sProp] = deepClone(oToBeCloned[sProp]);
                }
            }
            return oClone;
        },
        /**
         * example:
         *
         *      isType('Object')({toto:1});
         *
         * @method isType
         * @param {String} compare Object,String,Array,Function, etc.
         * @returns {Function}
         */
        isType: function isType(compare) {
            if (typeof compare === 'string' && /^\w+$/.test(compare)) {
                compare = '[object ' + compare + ']';
            } else {
                compare = Object.prototype.toString.call(compare);
            }
            return isType[compare] || (isType[compare] = function (o) {
                return Object.prototype.toString.call(o) === compare;
            });
        },
        /**
         * guess real type
         * @method realType
         * @param str
         * @returns {*}
         */
        realType: function (str) {
            var xml;
            if (typeof(str) !== 'string') {
                return str;
            }
            str = str.trim();
            if (str.trim() === "") {
                return str;
            }
            var mapping = ['true', 'false', 'null', 'undefined'];
            if (+str === 0 || +str) {
                return +str;
            }
            if (!!~mapping.indexOf(str.toLowerCase())) {
                return eval(str.toLowerCase());
            }
            try {
                return JSON.parse(str);
            } catch (e) {
            }
            xml = new DOMParser().parseFromString(str, 'text/xml');
            if (!xml.getElementsByTagName('parsererror').length) {
                return xml;
            }
            return str;
        },
        /**
         * @method castType
         * @param {*} value
         * @param {String} type
         * @returns {*}
         */
        castType: function (value, type) {
            var typeMapping = {
                "string": function (s) {
                    return s + "";
                },
                "number": function (n) {
                    return +n;
                },
                "boolean": function (b) {
                    var idx, mapping = ["false", "true"];
                    //true or false
                    if ((idx = mapping.indexOf(("" + b).trim().toLowerCase())) !== -1) {
                        return eval(mapping[idx]);
                    }
                    //0 or 1
                    if (!isNaN(+b)) {
                        return !!+b;
                    } else {
                        //simple string, always return true
                        return true;
                    }
                },
                "object": function (o) {
                    try {
                        return JSON.parse(o);
                    } catch (e) {
                        return null;
                    }
                },
                "xml": function (str) {
                    return new DOMParser().parseFromString(str, 'text/xml');
                }
            };
            return typeMapping[type] && typeMapping[type](value);
        },
        /**
         * @method getProp
         * @param {Array} parts
         * @param {Boolean} create
         * @param {Object} context
         * @return Object
         */
        getProp: function (parts, create, context) {
            var obj = context || window;
            for (var i = 0, p; obj && (p = parts[i]); i++) {
                obj = (p in obj ? obj[p] : (create ? obj[p] = {} : undefined));
            }
            return obj; // mixed
        },
        /**
         * @method getObject
         * @param {String} name
         * @param {Boolean} create
         * @param {Object} context
         * @return Object
         */
        getObject: function (name, create, context) {
            return this.getProp(name.split("."), create, context); // Object
        },

        /**
         * create a function with partial params
         *
         *      var fnc1 = function(a,b,c){return a+b+c;}, undef = {}.undef;
         *      var fnc2 = partial(fnc1,null,undef,2,undef);
         *      fnc2(1,3); //returns 6
         *      fnc2(1,1); //returns 4
         *
         * @method partial
         * @param {Function} fn
         * @param {Object} [scope]
         * @returns {Function}
         */
        partial: function partial(fn, scope) {
            var args = slice.call(arguments, 2);
            return function () {
                var arg = 0, i = 0, l = args.length;
                for (; i < l && arg < arguments.length; i++)
                    if (args[i] === undefined)
                        args[i] = arguments[arg++];
                return fn.apply(scope, args);
            };
        }
    };
    return Helper;
});