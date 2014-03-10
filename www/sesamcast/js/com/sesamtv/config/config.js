define([
    'com/sesamtv/core/util/XHR'
], function (xhr) {
    var isNodeJs = typeof(window) === 'undefined' && [typeof(global), typeof(process)].indexOf('undefined') === -1,
        regExp = /text!(.*)/;

    function getConfig(url) {
        var appConf;
        if (isNodeJs) {
            appConf = JSON.parse(require('fs').readFileSync(url, {
                encoding: 'utf8'
            }));
        } else {
            xhr.get(url, {
                handleAs: 'json',
                async:false,
                onload: function (data) {
                    appConf = data;
                }
            });
        }
        return appConf;
    }

    function loadConf(renew) {
        if (renew) {
            delete loadConf.config;
        }
        if (loadConf.config) {
            return loadConf.config;
        }
        var appConf = getConfig(require.toUrl('app/config/core.json'));
        Object.keys(appConf).forEach(function (k) {
            var _conf = appConf[k], m;
            if (_conf && typeof(_conf) === 'string' && (m = _conf.match(regExp))) {
                appConf[k] = getConfig(require.toUrl(m.pop()));
            }
        });
        return loadConf.config = appConf;
    }

    return loadConf;
});