(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.WeakMap = factory();
    }
}(this, function () {
    /*
     * Copyright 2012 The Polymer Authors. All rights reserved.
     * Use of this source code is governed by a BSD-style
     * license that can be found in the LICENSE file.
     */
    /**
     * WeakMap implementation, see [WeakMap Spec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
     * 
     * modified by Hongbo LU
     * 
     * notice: If key is GC-ed, value will be GC-ed as well unless there is some other references to it
     * @class WeakMap
     */
    var glb = typeof(window) === "undefined" ? global : window,
        defineProperty = Object.defineProperty,
        undef = ({}).__undef,
        counter = (new Date()) % 1e9;
    if ('WeakMap' in glb) {
        return glb.WeakMap;
    }
    function guard(key) {
        /**
         Utility function to guard WeakMap methods from keys that are not
         a non-null objects.
         **/
        if (key !== Object(key)) {
            throw TypeError("value is not a non-null object");
        }
        return key;
    }

    function WeakMap() {
        this.name = '__wm' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    }

    WeakMap.prototype = {
        set: function (key, value) {
            var entry = guard(key)[this.name];
            if (entry && entry[0] === key) {
                entry[1] = value;
            } else {
                defineProperty ? defineProperty(key, this.name, {
                    value: [key, value],
                    writable: true,
                    configurable:true
                }) : (key[this.name] = [key, value]);
            }
        },
        has: function (key) {
            return this.get(key) !== undef;
        },
        get: function (key, defaultValue) {
            var entry;
            return (entry = guard(key)[this.name]) && entry[0] === key ?
                (entry[1] === undef ? defaultValue : entry[1]) :
                defaultValue;
        },
        "delete": function (key) {
            return delete guard(key)[this.name];
        }
    };

    return glb.WeakMap = WeakMap;
}));
