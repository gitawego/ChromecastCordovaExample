define([
    '../../../util/Class',
    '../../../util/CustomEvent',
    '../../../util/XHR',
    '../../../util/Helper',
    '../../../util/Encoding',
    'bower_components/blueimp-tmpl/js/tmpl',
], function (Class, CustomEvent, xhr, helper,encoding, tmpl) {
    "use strict";
    /**
     * @class com.sesamtv.core.engine.request.handlers.XHR
     * @cfg {Object} config
     */
    /**
     * @event complete
     */
    var XHRHandler = Class({
        extend: CustomEvent,
        constructor: function XHRHandler(config) {
            CustomEvent.call(this);
            this.id = encoding.uuid();
            this.handler = this.fetch(config);
        },
        /**
         * @method fetch
         * @param config
         * @returns {com.sesamtv.core.util.Promise}
         */
        fetch: function (config) {
            //void overwriting the original configuration object
            var content,
                requestSetting = helper.deepClone(config),
                requestConfig = requestSetting.config,
                requestInputType = 'inputType' in requestSetting ? requestSetting.inputType : 'content',
                self = this, requestData;
            if (requestSetting.queryMap) {
                content = tmpl(JSON.stringify(requestSetting.queryMap), config.query);
                content = JSON.parse(content);
            } else {
                content = config.query;
            }
            requestData = requestConfig[requestInputType];
            if(requestData && typeof(requestData) === 'object' && typeof(content) === 'object'){
                requestData = helper.merge(requestData,content);
            }
            requestConfig[requestInputType] = requestData;

            return xhr.request(config.url, requestConfig).
                on('load',function (data, resHelper) {
                    self.emit('load', data, resHelper);
                    config.updater && config.updater(resHelper.getData(true), resHelper);
                }).on('error',function (error) {
                    self.emit('error', error);
                }).on('abort',function (error) {
                    self.emit('abort', error);
                }).on('complete',function(data){
                    self.emit('complete',data);
                }).send();
        },
        /**
         * abort a request
         * @method abort
         */
        abort: function () {
            this.handler.abort();
        }
    });
    return XHRHandler;

});