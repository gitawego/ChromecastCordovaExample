define(function () {
    /**
     * @class com.sesamtv.core.util.Interface
     * @cfg {String} name
     * @cfg {Array.<String>} methods
     * @constructor
     */
    function Interface(name, methods) {
        if (arguments.length != 2) {
            throw new Error("Interface constructor called with " + arguments.length + "arguments, but expected exactly 2.");
        }
        this.name = name;
        this.methods = [];
        for (var i = 0, len = methods.length; i < len; i++) {
            if (typeof methods[i] !== 'string') {
                throw new Error("Interface constructor expects method names to be " + "passed in as a string.");
            }
            this.methods.push(methods[i]);
        }
    }

    /**
     * ensure interface
     *
     *      Interface.ensureImplements(this,myInterface);
     *
     * @method ensureImplements
     * @static
     * @param {Object} object object to be verified
     */
    Interface.ensureImplements = function (object) {
        if (arguments.length < 2) {
            throw new Error("Function Interface.ensureImplements called with " + arguments.length + "arguments, but expected at least 2.");
        }
        var i = 1, j = 0, len = arguments.length, methodsLen, method;
        for (; i < len; i++) {
            var _interface = arguments[i];
            if (_interface.constructor !== Interface) {
                throw new Error("Function Interface.ensureImplements expects arguments" + "two and above to be instances of Interface.");
            }
            methodsLen = _interface.methods.length;
            for (; j < methodsLen; j++) {
                method = _interface.methods[j];
                if (!object[method] || typeof object[method] !== 'function') {
                    throw new Error("Function Interface.ensureImplements: object " + "does not implement the " + _interface.name + " interface. Method " + method + " was not found.");
                }
            }
        }
    };
    return Interface;
});