define(function () {
    "use strict";
    /**
     * usage:
     *
     *      var Invalid = CustomError({
     *          name:'my custom error',
     *          errors:{
     *             ERROR_MSG:'standard error message',
      *            ERROR_MSG_WITH_TOKENS:'error message %o and %o'
     *          }
     *      });
     *      //error message with tokens
     *      new Invalid('ERROR_MSG_WITH_TOKENS','msg 1','msg 2').raise();
     *      //error message with additional data
     *      throw new Invalid('error occured').moreDetail({data:'myData'});
     *
     * @class com.sesamtv.core.util.CustomError
     * @static
     * @cfg {Object} [opt]
     * @cfg {String} [opt.name='CustomError']
     * @cfg {String} [opt.logType='memory'] it supports only memory and storage for now.
     * @cfg {Boolean} [opt.log] if log the errors when raise it. even this variable is set to false, we can still log the message by calling directly this.log
     * @cfg {Boolean} [opt.debug] if debug the error
     * @cfg {Array.<String>} [opt.errors] define error codes
     * @returns com.sesamtv.core.util.CustomError.CustomErrorBase
     */
    var glb = typeof(global) !== 'undefined' ? global : window;
    var slice = Array.prototype.slice;
    var FORMAT_REGEXP = /([^%]|%([\-+0]*)(\d+)?(\.\d+)?([%sdilfox]))/g,
        has = {
            "storage": 'localStorage' in glb
        },
        _props = ['disabled', 'debug', 'log', 'logType', 'namespace', 'forceLog'],
        _config = {
            namespace: 'CustomError',
            logType: has.storage ? 'storage' : 'memory'
        },
        _log = [];

    function mixin(dest, source) {
        var keys = Object.keys(source), name;
        while ((name = keys.shift())) {
            dest[name] = source[name];
        }
        return dest;
    }

    function trunc(n) {
        return n < 0 ? Math.ceil(n) : Math.floor(n);
    }

    /**
     * @class com.sesamtv.core.util.CustomError.ErrorBase
     * @extends Error
     * @private
     * @constructor
     */
    function ErrorBase() {

    }

    ErrorBase.prototype = Object.create(Error.prototype);
    ErrorBase.prototype.constructor = ErrorBase;

    /**
     * @method moreDetail
     * @param {Object} params
     * @return {*}
     */
    ErrorBase.prototype.moreDetail = function (params) {
        params && mixin(this, params);
        return this;
    };
    /**
     * bring up a confirm box to add break point for debug,
     * to inspect the real break point, use "step out of current function (SHIFT + F11)" in webkit's developer tool
     * @method debug
     * @param code
     * @return {boolean}
     */
    ErrorBase.prototype.debug = function (code) {
        //prompt user for debugger hook
        code = code || "[no code provided]";
        //
        if (confirm("An error has occurred:\n\n" + this.toString() + "\n\n" + code + "\n\nWould you like to debug?")) {
            //if the user clicks yes - hit debug statement
            debugger;
            return true;
        }
        return false;
    };
    /**
     * log error into storage
     * todo: add more log supports
     * @method log
     * @param msg
     */
    ErrorBase.prototype.log = function (msg) {
        var str = "[" + this.name + "]" +
            "\nERROR: " + this.message +
            "\nSTACK: " + this.stack;
        if (this.url) {
            str += "\nURL: " + this.url;
        }
        if (this.lineNumber) {
            str += "\nLineNumber: " + this.lineNumber;
        }
        if (msg) {
            str += "\nDESC: " + msg;
        }
        str += "\n";
        CustomError.log(str);
        return this;
    };
    /**
     * @method raise
     */
    ErrorBase.prototype.raise = function (params) {
        params = params || {};
        if (this.config.disabled || _config.disabled) {
            return this;
        }
        if (this.config.debug && _config.debug !== false) {
            this.debug(params.code);
        }
        if (_config.forceLog || (this.config.log && _config.log !== false)) {
            this.log(params.msg);
        }
        if (this.config.raise === false || _config.raise === false) {
            return;
        }
        throw this;
    };
    /**
     * @method captureStackTrace
     */
    ErrorBase.prototype.captureStackTrace = function () {
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        else {
            this.stack = (new Error()).stack;
        }
    };
    /**
     * specifier could be:
     *
     * *   %o : Outputs a JavaScript object
     * *   %s : Outputs a string.
     * *   %d,%i : Outputs a rounded integer number
     * *   %f : Outputs a floating-point value
     *
     * see [string substitution and formatting](https://developers.google.com/chrome-developer-tools/docs/console#string_substitution_and_formatting)
     * @method repl
     * @member com.sesamtv.core.util.CustomError
     * @private
     * @param {String} [str]
     * @param {String} unit
     * @param {String} [flags]
     * @param {String} [width]
     * @param {String} [precision]
     * @param {String} specifier
     * @return {String}
     */
    function repl(args, str, unit, flags, width, precision, specifier) {
        if (unit.charAt(0) != '%' || !args.length) {
            return unit;
        } else if (specifier === '%') {
            return '%';
        }
        var arg = args.shift(),
            spec = {
                's': function (arg) {
                    return arg + '';
                },
                'o': function (arg) {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return arg + '';
                    }
                }
            };
        spec.i = spec.d = function (arg) {
            return trunc(Number(arg)) + '';
        };
        return spec[specifier] ? spec[specifier](arg) : spec.s(arg);
    }

    function CustomError(opt) {
        opt = opt || {};
        /**
         * @class com.sesamtv.core.util.CustomError.CustomErrorBase
         * @extends com.sesamtv.core.util.CustomError.ErrorBase
         * @cfg {String} message
         * @constructor
         */
        function CustomErrorBase(message) {
            var args = slice.call(arguments, 1);
            //repl.args = args;
            this.config = opt;
            //this.message = ((this[message] || message) + '').replace(FORMAT_REGEXP, repl);
            this.message = ((this[message] || message) + '').replace(FORMAT_REGEXP, function () {
                return repl.apply(null, [args].concat(slice.call(arguments)))
            });
            this.name = opt.name || _config.namespace;
            //delete repl.args;
            if (!this.fileName && opt.fileName) {
                this.fileName = opt.fileName;
            }
            this.captureStackTrace();
        }

        CustomErrorBase.prototype = Object.create(ErrorBase.prototype);
        CustomErrorBase.prototype.constructor = CustomErrorBase;
        /**
         * @method setDisabled
         * @deprecated use this.set
         * @param {Boolean} [disabled]
         */
        CustomErrorBase.setDisabled = function (disabled) {
            opt.disabled = disabled;
        };
        /**
         * set config value
         * @method set
         * @param {String} k key (disabled,debug,log)
         * @param {*} v value
         */
        CustomErrorBase.set = function (k, v) {
            if (_props.indexOf(k) === -1) {
                return;
            }
            opt[k] = v;
        };
        /**
         * @method get
         * @param {String} k
         * @returns {*}
         */
        CustomErrorBase.get = function (k) {
            return opt[k];
        };
        opt.errors && Object.keys(opt.errors).forEach(function (k) {
            Object.defineProperty ? Object.defineProperty(CustomErrorBase.prototype, k, {
                value: opt.errors[k],
                //can be inspected
                enumerable: true,
                //can not be deleted
                configurable: false
            }) : (CustomErrorBase.prototype[k] = opt.errors[k]);
        });
        //delete opt.errors;
        return CustomErrorBase;
    }

    /**
     * @method set
     * @member com.sesamtv.core.util.CustomError
     * @param {String} k
     * @param {*} v
     */
    CustomError.set = function (k, v) {
        if (_props.indexOf(k) === -1) {
            return;
        }
        if (k === 'namespace') {
            k = k + "Error";
        }
        _config[k] = v;
    };
    /**
     * @method get
     * @member com.sesamtv.core.util.CustomError
     * @param {String} k
     */
    CustomError.get = function (k) {
        return _config[k];
    };
    /**
     * @method log
     * @member com.sesamtv.core.util.CustomError
     * @param {String} str
     */
    CustomError.log = function (str) {
        if (_config.log === false || _config.disabled) {
            return;
        }
        str = "[" + (new Date()).toTimeString() + "]" + str;
        if (_config.logType === 'storage') {
            if (!has.storage) {
                _config.logType = 'memory';
            } else {
                var log = localStorage.getItem(_config.namespace) || "";
                log += str;
                localStorage.setItem(_config.namespace, log);
            }
        }
        if (_config.logType === 'memory') {
            _log.push(str);
        }
    };
    /**
     * @method showLog
     * @member com.sesamtv.core.util.CustomError
     */
    CustomError.showLog = function () {
        if (_config.logType === "memory") {
            return _log.join("");
        }
        if (_config.logType === "storage") {
            return localStorage.getItem(_config.namespace);
        }
    };
    /**
     * @method purgeLog
     * @member com.sesamtv.core.util.CustomError
     */
    CustomError.purgeLog = function () {
        _log.length = 0;
        localStorage && localStorage.removeItem(_config.namespace);
    };
    return CustomError;
});