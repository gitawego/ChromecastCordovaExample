define(function () {
    if(typeof(window) === 'undefined'){
        return;
    }
    /**
     * @class com.sesamtv.core.util.polyfill.RequestAnimationFrame
     */
    var request = {};
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
            || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame){
        window.requestAnimationFrame = function (callback, element) {
            var currTime = +new Date,
                timeToCall = Math.max(0, 16 - (currTime - lastTime)),
                id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame){
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
    /**
     * Behaves the same as setInterval except uses requestAnimationFrame() where possible for better performance.
     * handle is a reference of object to be able to get the latest value
     * @param {Function} fn The callback function
     * @param {Number} delay The delay in milliseconds
     * @return {Object}
     */
    request.requestInterval = function(fn, delay) {
        var start = +new Date,
            handle = {};

        function loop() {
            handle.value = window.requestAnimationFrame(loop);
            var current = +new Date,
                delta = current - start;

            if(delta >= delay) {
                fn.call();
                start = +new Date;
            }
        }
        handle.value = window.requestAnimationFrame(loop);
        return handle;
    };
    request.clearRequestInterval = request.clearRequestTimeout = function(handle){
       return window.cancelAnimationFrame(handle && typeof(handle) == 'object'?handle.value:handle);
    };
    /**
     * Behaves the same as setInterval except uses requestAnimationFrame() where possible for better performance
     * @param {Function} fn The callback function
     * @param {Number} delay The delay in milliseconds
     * @return {Object}
     */
    request.requestTimeout = function(fn, delay) {
        var start = +new Date,
            handle = {};
        function loop(){
            var current = +new Date,
                delta = current - start;
            delta >= delay ? fn.call() : handle.value = window.requestAnimationFrame(loop);
        }
        handle.value = window.requestAnimationFrame(loop);
        return handle;
    };
    return request;
});