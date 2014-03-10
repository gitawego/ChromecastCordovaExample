define(function () {
    if (!Object.getPrototypeOf) {
        Object.getPrototypeOf = function (object) {
            if (o !== Object(o)) {
                throw new TypeError("Object.getPrototypeOf called on non-object");
            }
            return object.__proto__ || object.constructor.prototype;
        };
    }
    if (typeof Object.create !== "function") {
        Object.create = function (prototype, properties) {
            "use strict";
            if (typeof prototype !== "object") {
                throw new TypeError();
            }
            function Ctor() {
            }

            Ctor.prototype = prototype;
            var o = new Ctor();
            if (prototype) {
                o.constructor = Ctor;
            }
            if (arguments.length > 1) {
                if (properties !== Object(properties)) {
                    throw new TypeError();
                }
                Object.defineProperties(o, properties);
            }
            return o;
        };
    }

    if (typeof Object.getOwnPropertyNames !== "function") {
        Object.getOwnPropertyNames = function (o) {
            if (o !== Object(o)) {
                throw new TypeError("Object.getOwnPropertyNames called on non-object");
            }
            var props = [], p;
            for (p in o) {
                if (Object.prototype.hasOwnProperty.call(o, p)) {
                    props.push(p);
                }
            }
            return props;
        };
    }
    // ES 15.2.3.6 Object.defineProperty ( O, P, Attributes )
// Partial support for most common case - getters, setters, and values
    (function () {
        if (!Object.defineProperty || !(function () {
            try {
                Object.defineProperty({}, 'x', {});
                return true;
            } catch (e) {
                return false;
            }
        }())) {
            var orig = Object.defineProperty;
            Object.defineProperty = function (o, prop, desc) {
                "use strict";

                // In IE8 try built-in implementation for defining properties on DOM prototypes.
                if (orig) {
                    try {
                        return orig(o, prop, desc);
                    } catch (e) {
                    }
                }

                if (o !== Object(o)) {
                    throw new TypeError("Object.defineProperty called on non-object");
                }
                if (Object.prototype.__defineGetter__ && ('get' in desc)) {
                    Object.prototype.__defineGetter__.call(o, prop, desc.get);
                }
                if (Object.prototype.__defineSetter__ && ('set' in desc)) {
                    Object.prototype.__defineSetter__.call(o, prop, desc.set);
                }
                if ('value' in desc) {
                    o[prop] = desc.value;
                }
                return o;
            };
        }
    }());

// ES 15.2.3.7 Object.defineProperties ( O, Properties )
    if (typeof Object.defineProperties !== "function") {
        Object.defineProperties = function (o, properties) {
            "use strict";
            if (o !== Object(o)) {
                throw new TypeError("Object.defineProperties called on non-object");
            }
            var name;
            for (name in properties) {
                if (Object.prototype.hasOwnProperty.call(properties, name)) {
                    Object.defineProperty(o, name, properties[name]);
                }
            }
            return o;
        };
    }


    // ES5 15.2.3.14 Object.keys ( O )
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys
    if (!Object.keys) {
        Object.keys = function (o) {
            if (o !== Object(o)) {
                throw new TypeError('Object.keys called on non-object');
            }
            var ret = [], p;
            for (p in o) {
                if (Object.prototype.hasOwnProperty.call(o, p)) {
                    ret.push(p);
                }
            }
            return ret;
        };
    }
});