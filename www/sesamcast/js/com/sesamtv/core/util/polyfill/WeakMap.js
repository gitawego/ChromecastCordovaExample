define(function () {
    /**
     * WeakMap implementation, see [WeakMap Spec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
     *
     * notice: If key is GC-ed, value will be GC-ed as well unless there is some other references to it
     * @class com.sesamtv.core.util.polyfill.WeakMap
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
            var entry = guard(key).valueOf[this.name];
            if (entry && entry[0] === key) {
                entry[1] = value;
            } else {
                defineProperty ? defineProperty(key.valueOf, this.name, {
                    value: [key, value],
                    writable: true,
                    configurable:true
                }) : (key.valueOf[this.name] = [key, value]);
            }
        },
        has: function (key) {
            return this.get(key) !== undef;
        },
        get: function (key, defaultValue) {
            var entry;
            return (entry = guard(key).valueOf[this.name]) && entry[0] === key ?
                (entry[1] === undef ? defaultValue : entry[1]) :
                defaultValue;
        },
        "delete": function (key) {
            return delete guard(key).valueOf[this.name];
        }
    };

    return glb.WeakMap = WeakMap;

});