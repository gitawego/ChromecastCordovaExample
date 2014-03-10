define(function () {
    /**
     * @class com.sesamtv.core.util.Touch
     * @singleton
     */
    var hasTouch = 'ontouchstart' in window || 'onmsgesturechange' in window,
        touch = hasTouch ? {
            /**
             * @property {String} press
             */
            "press": "touchstart",
            /**
             * @property {String} move
             */
            "move": "touchmove",
            /**
             * @property {String} release
             */
            "release": "touchend",
            /**
             * @property {String} cancel
             */
            "cancel": "touchcancel",
            "mousedown": "touchstart",
            "mousemove": "touchmove",
            "mouseup": "touchend",
            "mouseleave": "touchcancel"
        } : {
            "press": "mousedown",
            "move": "mousemove",
            "release": "mouseup",
            "cancel": "mouseleave",
            "touchstart": "mousedown",
            "touchmove": "mousemove",
            "touchend": "mouseup",
            "touchcancel": "mouseleave"
        };
    touch.hasTouch = hasTouch;
    return touch;
});