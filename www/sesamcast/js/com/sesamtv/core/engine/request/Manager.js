define([
    'module',
    '../../util/Class',
    '../../util/BaseEvented',
    '../../util/Array',
    './handlers/XHR'
], function (module, Class, BaseEvented, arrayHelper, XHR) {
    'use strict';
    var RequestHandlers = {
        xhr: XHR
    };
    /**
     *
     * @class com.sesamtv.core.engine.request.Manager
     * @extends com.sesamtv.core.util.BaseEvented
     * @singleton
     */
    var RequestManager = Class({
        extend: BaseEvented,
        singleton: true,
        constructor: function RequestManager(args) {
            this.requests = {};
            BaseEvented.call(this, args);
        },
        addRequestType: function (id, RequestHelper) {
            if (id !== 'xhr') {
                RequestHandlers[id] = RequestHelper;
            }
        },
        hasRequestType: function (id) {
            return id in RequestHandlers;
        },
        removeRequestType: function (id) {
            if (id === 'xhr') {
                return false;
            }
            return delete RequestHandlers[id];
        },
        /**
         * abort all the requests
         * @method abort
         */
        abort: function () {
            //can abort all the running requests
            arrayHelper.forEach(this.requests,function(request){
                request.abort();
            });
            this.requests = {};
            this.emit('abort');
        },
        /**
         * @method fetch
         * @param {Object} config
         * @param {String} config.type xhr,binding, etc.
         * @param {Object} config.queryMap
         * @param {String} [config.inputType='content'] rawData or content
         * @param {Object} config.config
         * @param {Object} config.query
         * @param {String} [config.url]
         * @param {Function} [config.updater]
         */
        fetch: function (config) {
            var self = this, Handler, h;
            if (!(Handler = RequestHandlers[config.type])) {
                throw new Error('request Handler ' + config.type + ' is not found');
            }
            h = new Handler(config);
            this.requests[h.id] = h;
            h.once('complete', function () {
                delete self.requests[h.id];
            });
            return h;
        }
    });
    return new RequestManager(module.config());
});