define([
    '../util/CustomEvent',
    '../util/Class'
], function (CustomEvent, klass) {
    'use strict';
    var evt = new CustomEvent();
    /**
     * topic system (publish/subscribe)
     * @class com.sesamtv.core.engine.Topic
     * @singleton
     * @requires com.sesamtv.core.util.CustomEvent
     * @extends com.sesamtv.core.util.CustomEvent
     *
     */
    var Topic = klass({
        extend: CustomEvent,
        constructor: function () {
            CustomEvent.call(this);
        },
        singleton: true,
        /**
         * publish a topic
         * @method pub
         * @param {String} topic
         * @returns {*}
         */
        pub: function (topic) {
            //>>excludeStart("production", pragmas.production);
            if (!this.hasTopic(topic)) {
                console.warn('%c topic ' + topic + ' dosen\'t have subscriber yet','background:yellow');
            }
            //>>excludeEnd("production");
            return evt.broadcast.apply(evt, arguments);
        },
        /**
         * subscribe to a topic
         * @method sub
         * @param {String} topic
         * @param {Function} fnc
         * @param {Boolean} [once]
         * @returns {{id:String,remove:Function}}
         */
        sub: function (topic, fnc, once) {
            var handler = evt[once ? 'once' : 'on'](topic, fnc);
            this.emit('subscribed', topic, handler);
            return handler;
        },
        /**
         * unsubscribe a topic
         * @method unsub
         * @param {String} topic
         * @param {Function|String} id
         * @returns {*}
         */
        unsub: function (topic, id) {
            return evt.off(topic, id);
        },
        hasTopic: function (topic) {
            return evt.hasListeners(topic);
        },
        getTopics: function () {
            return Object.keys(evt._listeners);
        }
    });
    return new Topic();
});