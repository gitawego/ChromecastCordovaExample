define(function () {
    function applyIf(dest, obj, override) {
        var keys = Object.keys(obj);
        for (var k in keys) {
            if (keys.hasOwnProperty(k) && (!(k in dest) || override)) {
                dest[k] = obj[k];
            }
        }
    }

    applyIf(Array.prototype, {
        forEach: function (a, scope) {
            var l = this.length;
            for (var i = 0; i < l; i++) {
                scope ? a.call(scope, this[i], i) : a(this[i], i);
            }
        },
        map: function (a,scope) {
            var l = this.length;
            var array = new Array(l), i = 0;
            for (; i < l; i++) {
                array[i] = scope? a.call(scope,this[i],i):a(this[i], i);
            }
            return array;
        }
    }, true);
});