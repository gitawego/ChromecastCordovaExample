/*global require,define,console,alert*/
/*jslint plusplus: true */
/*jslint expr:true */
define(['./XML',
    './Promise',
    './CustomError'/*,
     './polyfill/XMLHttpRequest'*/
], function (xml, promise, customError) {
    'use strict';
    var Invalid = customError({
        name: 'XHR ERROR',
        errors: {
            'ERROR_TIMEOUT': 'Request is timeout',
            'ERROR_KO': 'Request is not OK',
            'ERROR_INVALID_JSON': 'Invalid JSON',
            'ERROR_INVALID_XML': 'Invalid XML',
            'ERROR': 'An error has occurred'
        }
    }), slice = Array.prototype.slice;

    /**
     * httpRequest level 2 wrapper
     *
     *      xhr('index.php',{
     *          multipart:[{name:'fieldName',value:'value'}],
     *          onload:function(data,evt){}
     *      });
     *      xhr({
     *          form:'myFormID'
     *      });
     *      xhr('index.php',{
     *          rawData:'test data'
     *      });
     *      var x = xhr('index.php');
     *      x.abort();
     *      //or use promise
     *      xhr.post('./index.php',{content:{id:1}}).then(function(args){
     *          var data = args.data,
     *          resHelper = args.response;
     *      },errback);
     *
     * @class com.sesamtv.core.util.XHR
     * @cfg {String|Object} [url]
     * @cfg {Object} [args]
     * @cfg {function(Object|HTMLDocument|String,com.sesamtv.core.util.XHR.ResponseHelper)} [args.onload]
     * @cfg {function(Event)} [args.onerror]
     * @cfg {function(Event)} [args.onabort]
     * @cfg {function(Event)} [args.onprogress] if onprogress is defined, this request is automatically set to async mode
     * @cfg {function(Event)} [args.ontimeout]
     * @cfg {function(Event)} [args.oncomplete]
     * @cfg {String} [args.method='get']
     * @cfg {String} [args.handleAs] json,xml, etc.
     * @cfg {Object} [args.headers]
     * @cfg {Object} [args.content]
     * @cfg {String} [args.rawData]
     * @cfg {Array.<Object>} [args.multipart]
     * @cfg {HTMLElement|String} [args.form]
     * @cfg {Boolean} [args.async=true]
     * @cfg {String} [args.mimeType]
     * @cfg {Number} [args.timeout] abort request when no response in given time
     * @cfg {Boolean} [args.preventCache] only available for method GET
     * @cfg {Boolean} [args.toRealType] try to convert the data depending on the content type
     * @returns {com.sesamtv.core.util.Promise}
     */
    function XHR(url, args) {
        var deferred = promise(), req = new XMLHttpRequest(), data = null, e;
        if (arguments.length === 1) {
            if (typeof(url) !== 'string') {
                args = url;
                url = null;
            } else {
                args = {};
            }
        }

        //if onprogress is defined, it must be an async call
        if (!('async' in args) || 'onprogress' in args) {
            args.async = true;
        }

        req.addEventListener('load', function (evt) {
            var resHelper = new ResponseHelper(evt);
            if (!resHelper.checkStatus()) {
                e = new Invalid('ERROR_KO').moreDetail({
                    response: resHelper,
                    reason: 'statusCode'
                });
                args.onerror && args.onerror.call(this, e);
                args.oncomplete && args.oncomplete.call(this, e);
                return deferred(e);
            }
            var data = evt.currentTarget.responseText;
            var handleAs = XHR.handleAs(data, args.handleAs);
            if (handleAs.error) {
                e = new Invalid(handleAs.error).moreDetail({
                    response: resHelper,
                    reason: 'malformed'
                });
                args.onerror && args.onerror.call(this, e);
                args.oncomplete && args.oncomplete.call(this, e);
                return deferred(e);
            } else {
                data = handleAs.data;
            }
            if (args.toRealType) {
                data = resHelper.getData(true);
            }
            args.onload && args.onload.call(this, data, resHelper);
            args.oncomplete && args.oncomplete.call(this, data, resHelper);
            deferred(null, {
                data: data,
                response: resHelper
            });
        }, false);

        req.addEventListener('error', function (evt) {
            var resHelper = new ResponseHelper(evt);
            e = new Invalid('ERROR').moreDetail({
                response: resHelper,
                reason: 'error'
            });
            args.onerror && args.onerror.call(this, e);
            args.oncomplete && args.oncomplete.call(this, e);
            deferred(e);
        }, false);


        req.addEventListener('abort', function (evt) {
            var resHelper = new ResponseHelper(evt);
            e = new Invalid('ERROR').moreDetail({
                response: resHelper,
                reason: 'abort'
            });
            args.onabort && args.onabort.call(this, e);
            args.oncomplete && args.oncomplete.call(this, e);
            return deferred(e);
        }, false);


        if (typeof(args.timeout) === 'number') {
            req.timeout = args.timeout;
            req.addEventListener('timeout', function (evt) {
                var resHelper = new ResponseHelper(evt);
                e = new Invalid('ERROR').moreDetail({
                    response: resHelper,
                    reason: 'timeout'
                });
                args.ontimeout && args.ontimeout.call(this, e);
                args.oncomplete && args.oncomplete.call(this, e);
                return deferred(e);
            });
        }

        args.onprogress && req.addEventListener('progress', args.onprogress, false);

        if (args.form || args.multipart) {
            var boundary = XHR.generateBoundary(), form, elements;
            //not multipart
            if (!url) {
                form = typeof(args.form) === 'string' ? document.getElementById(args.form) : args.form;
                url = form.action;
                elements = XHR.getElements(form);
            } else {
                elements = args.multipart;
            }
            req.open("POST", url, args.async);
            req.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
            data = XHR.buildMessage(elements, boundary);
        } else {
            args.method = args.method || 'get';
            if (args.rawData) {
                data = args.rawData;
                if (typeof(data) === 'object') {
                    data = JSON.stringify(data);
                }
            } else {
                if (args.content) {
                    data = [];
                    Object.keys(args.content).forEach(function (k) {
                        data.push(k + '=' + args.content[k]);
                    });
                    data = data.join('&');
                }
                if (args.method === 'get') {
                    data && (url += '?' + data);
                    data = null;
                    if (args.preventCache) {
                        url += "&_t=" + (+new Date());
                    }
                }
            }
            req.open(args.method, url, args.async);

            (!args.headers || !args.headers['Content-Type']) &&
                args.method === 'post' &&
            req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        args.headers && Object.keys(args.headers).forEach(function (header) {
            req.setRequestHeader(header, args.headers[header]);
        });
        args.mimeType && req.overrideMimeType(args.mimeType);

        req[args.form ? 'sendAsBinary' : 'send'](data);
        deferred.abort = function () {
            return req.abort();
        };
        return deferred;
    }

    /**
     * event based xhr request builder:
     *
     *      var handler = XHR.request('my_url',myConfig).on('load',fnc1).
     *              on('error',fnc2).on('abort',fnc3).on('complete',fnc4).send();
     *      //you can then abort it:
     *      handler.abort();
     *
     * @method request
     * @static
     * @param url
     * @param config
     * @returns {{on: Function, send: function():com.sesamtv.core.util.Promise}}
     */
    XHR.request = function (url, config) {
        config = config || {};
        return {
            on: function (evtName, fnc) {
                config['on' + evtName] = fnc;
                return this;
            },
            send: function () {
                return XHR(url, config);
            }
        };
    };
    if (typeof(document) !== 'undefined') {
        XHR.JSONP = (function (document) {
            var requests = 0,
                callbacks = {};
            return {
                /**
                 * makes a JSONP request
                 *
                 * @param {String} src
                 * @param {Object} data
                 * @param {Function} callback
                 */
                get: function (src, data, callback) {
                    // check if data was passed
                    if (!arguments[2]) {
                        callback = arguments[1];
                        data = {};
                    } else {
                        data = data || {};
                    }

                    // determine if there already are params
                    src += (src.indexOf('?') + 1 ? '&' : '?');

                    var head = document.getElementsByTagName('head')[0],
                        script = document.createElement('script'),
                        params = [],
                        requestId = requests,
                        param, globalId;

                    // increment the requests
                    requests++;

                    // create external callback name
                    globalId = 'request_' + requestId;
                    data.callback = '_jsonp_' + globalId;

                    // set callback function
                    window[data.callback] = callbacks[globalId] = function (response) {
                        // clean up
                        head.removeChild(script);
                        delete callbacks[globalId];
                        delete window[data.callback];
                        // fire callback
                        callback(response);
                    };

                    // traverse data
                    for (param in data) {
                        if (data.hasOwnProperty(param)) {
                            params.push(param + '=' + encodeURIComponent(data[param]));
                        }
                    }

                    // generate params
                    src += params.join('&');

                    // set script attributes
                    script.type = 'text/javascript';
                    script.src = src;

                    // add to the DOM
                    head.appendChild(script);
                },

                /**
                 * keeps a public reference of the callbacks object
                 */
                callbacks: callbacks
            };
        })(document);
    }

    XHR.handleAs = function (data, handleAs) {
        var e;
        switch (handleAs) {
            case 'json':
                try {
                    data = JSON.parse(data);
                } catch (error) {
                    e = 'ERROR_INVALID_JSON';
                    break;
                }
                break;
            case 'xml':
                data = xml.fromString(data.trim());
                if (!xml.validateXMLFormat(data)) {
                    e = 'ERROR_INVALID_XML';
                    break;
                }
                break;
        }
        return {
            data: data,
            error: e
        };
    };
    /**
     * @method getElements
     * @static
     * @param {HTMLElement|String} form
     * @returns {Array}
     */
    XHR.getElements = function (form) {
        if (typeof(form) === 'string') {
            form = document.getElementById(form);
        }
        return slice.call(form.elements);
    };
    /**
     * build form-data message for multipart
     * @method buildMessage
     * @static
     * @param {Array.<Object|HTMLElement>} elements
     * @param {String} boundary
     * @returns {String}
     */
    XHR.buildMessage = function (elements, boundary) {
        var CRLF = "\r\n";
        var parts = [];
        elements.forEach(function (element, index, all) {
            var part = "";
            var type = "TEXT";
            if (element instanceof HTMLElement && element.nodeName.toUpperCase() === "INPUT") {
                type = element.getAttribute("type").toUpperCase();
            }
            if (type === "FILE" && element.files.length > 0) {
                var fieldName = element.name;
                slice.call(element.files, 0).forEach(function (file) {
                    /*
                     * Content-Disposition header contains name of the field used
                     * to upload the file and also the name of the file as it was
                     * on the user's computer.
                     */
                    part += 'Content-Disposition: form-data; ';
                    part += 'name="' + fieldName + '"; ';
                    part += 'filename="' + file.fileName + '"' + CRLF;

                    /*
                     * Content-Type header contains the mime-type of the file to
                     * send. Although we could build a map of mime-types that match
                     * certain file extensions, we'll take the easy approach and
                     * send a general binary header: application/octet-stream.
                     */
                    part += "Content-Type: application/octet-stream" + CRLF + CRLF;

                    /*
                     * File contents read as binary data, obviously
                     */
                    part += file.getAsBinary() + CRLF;
                });
            } else {
                /*
                 * In case of non-files fields, Content-Disposition contains
                 * only the name of the field holding the data.
                 */
                part += 'Content-Disposition: form-data; ';
                part += 'name="' + element.name + '"' + CRLF + CRLF;

                /*
                 * Field value
                 */
                part += element.value + CRLF;
            }

            parts.push(part);
        });

        var request = "--" + boundary + CRLF;
        request += parts.join("--" + boundary + CRLF);
        request += "--" + boundary + "--" + CRLF;

        return request;
    };
    /**
     * @method generateBoundary
     * @static
     * @returns {String}
     */
    XHR.generateBoundary = function () {
        return "---------------------------" + (+new Date());
    };
    function mixin(dest, source) {
        var keys = Object.keys(source), name;
        while ((name = keys.shift())) {
            dest[name] = source[name];
        }
        return dest;
    }

    /**
     * @method get
     * @static
     * @param {String} url
     * @param {Object} [cfg]
     * @return {com.sesamtv.core.util.Promise}
     */
    /**
     * @method post
     * @static
     * @param {String} url
     * @param {Object} [cfg]
     * @return {com.sesamtv.core.util.Promise}
     */
    /**
     * @method put
     * @static
     * @param {String} url
     * @param {Object} [cfg]
     * @return {com.sesamtv.core.util.Promise}
     */
    /**
     * @method delete
     * @static
     * @param {String} url
     * @param {Object} [cfg]
     * @return {com.sesamtv.core.util.Promise}
     */
    /**
     * @method form
     * @static
     * @param {String|HTMLElement} form form id or form element
     * @param {Object} [cfg]
     * @return {com.sesamtv.core.util.Promise}
     */
    ['get', 'post', 'put', 'delete', 'form'].forEach(function (method) {
        if (method === 'form') {
            XHR[method] = function (form, cfg) {
                var config = {
                    form: form
                };
                mixin(config, cfg || {});
                config.method = 'post';
                return XHR(config);
            };
            return;
        }
        XHR[method] = function (url, cfg) {
            var config = {};
            mixin(config, cfg || {});
            config.method = method;
            return XHR(url, config);
        };
    });
    /**
     * @class com.sesamtv.core.util.XHR.ResponseHelper
     * @cfg {Event} evt
     * @constructor
     */
    function ResponseHelper(evt) {
        this.evt = evt;
        this.currentTarget = evt.currentTarget;
        this.REGEXP_HEADERS = /([a-z-].*?):(.*)[\s]/gi;
        this.REGEXP_CONTENTTYPE = /[a-z-].*?\/([a-z]*)(;|)/i;
    }

    /**
     * @method getHeaders
     * @param {String|Array} [keys]
     * @returns {Object|String}
     */
    ResponseHelper.prototype.getHeaders = function (keys) {
        keys = keys || [];
        if (typeof(keys) === 'string') {
            return this.currentTarget.getResponseHeader(keys);
        }
        var headers = {}, hasKeys = !!keys.length;
        this.currentTarget.getAllResponseHeaders().replace(this.REGEXP_HEADERS, function (str, key, value, pos, fullStr) {
            key = key.trim();
            if (hasKeys && hasKeys.indexOf(key) !== -1) {
                headers[key] = value.trim();
                return headers[key];
            }
            headers[key] = value.trim();
        });
        return headers;
    };
    /**
     * @method getStatus
     * @returns {{status: Number, statusText: String}}
     */
    ResponseHelper.prototype.getStatus = function () {
        return {
            status: this.currentTarget.status,
            statusText: this.currentTarget.statusText
        };
    };
    ResponseHelper.prototype.checkStatus = function (stat) {
        if (typeof(stat) === 'undefined') {
            stat = this.currentTarget.status;
        }
        stat = stat || 0;
        return (stat >= 200 && stat < 300) || // allow any 2XX response code
            stat === 304 ||                 // or, get it out of the cache
            stat === 1223 ||                // or, Internet Explorer mangled the status code
            !stat;                         // or, we're Titanium/browser chrome/chrome extension requesting a local file
    };
    /**
     * @method withCredentials
     * @returns {Boolean}
     */
    ResponseHelper.prototype.withCredentials = function () {
        return this.currentTarget.withCredentials;
    };
    /**
     * @method getData
     * @param {Boolean} [toRealType] convert data to the real type depending on content-type
     * @returns {*}
     */
    ResponseHelper.prototype.getData = function (toRealType) {
        var data = this.currentTarget.responseText, contentType, type, handleAs;
        if (!toRealType) {
            return data;
        }
        contentType = this.getHeaders('Content-Type');
        type = contentType.match(this.REGEXP_CONTENTTYPE)[1];
        handleAs = XHR.handleAs(data, type.trim().toLocaleLowerCase());
        return handleAs.error ? data : handleAs.data;
    };
    return XHR;
});