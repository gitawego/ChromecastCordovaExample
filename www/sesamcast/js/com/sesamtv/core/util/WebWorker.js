define([
    './Class'
], function (klass) {
    'use strict';
    var hasFeature = 'Worker' in window;
    /**
     * web worker wrapper, see (WebWorker in MDN)[https://developer.mozilla.org/en-US/docs/Web/Guide/Performance/Using_web_workers]
     *
     * usage:
     *
     *      var worker = webWorker.initWorker('_worker.js',true);
     *      //or use buildWorkerUrl
     *      worker = webWorker.initWorker(webWorker.buildWorkerUrl('your code string'));
     *      worker.on('message',function(evt){
     *          console.log(evt.data);
     *      });
     *      worker.postMessage(data);
     *
     * @class com.sesamtv.core.util.WebWorker
     * @cfg {Boolean} multiInstances if a worker url can be instantiated more than once
     * @constructor
     */
    var WebWorker = klass({
        statics: {
            /**
             * @method hasFeature
             * @static
             * @returns {boolean}
             */
            hasFeature: function () {
                return hasFeature;
            }
        },
        constructor: function WebWorker(multiInstances) {
            this.config = {
                multiInstances: multiInstances
            };
            this.workers = {};
        },
        /**
         * @method removeWorker
         * @param id
         */
        removeWorker: function (id) {
            if (!hasFeature) {
                console.warn('Worker is not available');
                return this;
            }
            if (this.config.multiInstances) {
                return this;
            }
            var worker = this.workers[id];
            if (worker) {
                worker.terminate();
            }
            delete this.workers[id];
            return this;
        },
        /**
         * @method initWorker
         * @param {String} url
         * @param {Boolean} [preSelect]
         */
        initWorker: function webWorker_initWorker(url, preSelect) {
            if (!hasFeature) {
                console.warn('Worker is not available');
                return this;
            }
            /*if(this.workers[url]){
             throw new Error('worker '+url+' has already existed');
             }*/
            if (this.config.multiInstances) {
                return this.select(new window.Worker(url));
            }
            this.workers[url] = this.workers[url] || new window.Worker(url);
            return preSelect ? this.select(this.workers[url]) : this;
        },
        /**
         * @method select
         * @param {String|Object} id
         * @return {{postMessage: Function, on: Function, once: Function, off: Function, terminate: Function}|undefined}
         */
        select: function webWorker_select(id) {
            if (!hasFeature) {
                console.warn('Worker is not available');
                return;
            }
            var selectedWorker = typeof(id) === 'object' ? id : this.workers[id],
                self = this;
            if (!selectedWorker) {
                throw new Error("no such worker id " + id);
            }
            return {
                postMessage: function webWorker_select_postMessage(msg) {
                    selectedWorker.postMessage(msg);
                    return this;
                },
                on: function webWorker_select_on(evtName, cb) {
                    selectedWorker.addEventListener(evtName, cb, false);
                    return {
                        remove: this.off.bind(this, evtName, cb)
                    };
                },
                once: function (evtName, cb) {
                    var _cb = function _cb(evt) {
                        cb(evt);
                        selectedWorker.removeEventListener(evtName, _cb);
                    };
                    selectedWorker.addEventListener(evtName, _cb, false);
                    return {
                        remove: this.off.bind(this, evtName, _cb)
                    };
                },
                off: function webWorker_select_off(evtName, cb) {
                    selectedWorker.removeEventListener(evtName, cb);
                    return this;
                },
                terminate: function () {
                    selectedWorker.terminate();
                    delete self.workers[id];
                    return self;
                }
            };
        },
        /**
         * @method buildWorkerUrl
         * @param {Array|String} src
         * @return {String} a data url
         */
        buildWorkerUrl: function webWorker_getUrl(src) {
            src = Array.isArray(src) ? src : [src];
            return window.URL.createObjectURL(new Blob(src, {
                type: "text/javascript"
            }));
        }
    });
    return WebWorker;
});