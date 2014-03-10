/*global self*/

self.onmessage = function (e) {
    'use strict';
    var param = e.data;
    self[param.method](param.params, function (data) {
        data.method = param.method;
        self.postMessage(data);
    });
};
self.httpRequest = function (params, callback) {
    'use strict';
    var xhr, content;
    try {
        xhr = new XMLHttpRequest();
        if (!('async' in params)) {
            params.async = true;
        }
        if (params.content) {
            if (params.method === 'get') {
                content = [];
                Object.keys(params.content).forEach(function (k) {
                    content.push(k + '=' + params.content[k]);
                });
                params.url = params.url + '?' + content.join('&');
                content = null;
            } else {
                content = params.content;
            }
        }
        xhr.open(params.method, params.url, params.async);
        params.headers && params.headers.forEach(function (header) {
            xhr.setRequestHeader(header[0], header[1]);
        });
        xhr.onload = function (evt) {
            var data = evt.currentTarget.responseText;
            if (params.handleAs === 'json') {
                data = JSON.parse(data);
            }
            callback({
                status: 1,
                origParams: params,
                data: data
            });
        };
        xhr.onerror = function (evt) {
            callback({
                status: 0,
                origParams: params,
                error: evt.error
            });
        };
        xhr.send(content);
    } catch (e) {
        callback({
            status: 0,
            error: e.message
        });
    }
};
