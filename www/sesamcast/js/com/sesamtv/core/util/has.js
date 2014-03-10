define(function () {
    'use strict';
    var glb = typeof(window) === 'undefined' ? global : window, sniffer = {};

    /**
     * feature detection of browser
     * @class com.sesamtv.core.util.has
     * @singleton
     */
    function has(key) {
        var res = sniffer[key];
        return typeof(res) === 'function' ? res(glb) : res;
    }

    has.add = function (key, value) {
        sniffer[key] = value;
    };
    has.remove = function (key) {
        delete sniffer[key];
    };
    has.close = function () {
        delete has.add;
        delete has.remove;
        delete has.close;
        delete has.all;
    };

    //>>excludeStart("production", pragmas.production);
    has.all = function all() {
        // summary: For debugging or logging, can be removed in production. Run all known tests
        //  at some point in time for the current environment.
        var name, ret = {};
        for (name in sniffer) {
            try {
                ret[name] = has(name);
            } catch (e) {
                ret[name] = "error";
                ret[name].ERROR_MSG = e.toString();
            }
        }
        return ret;
    };
    //>>excludeEnd("production");

    has.add('dom', typeof(window) !== 'undefined' && 'document' in window && 'createElement' in window.document);

    has.add('nodejs', typeof(window) === 'undefined' && [typeof(global), typeof(process)].indexOf('undefined') === -1);

    if (has('dom')) {
        var dua = navigator.userAgent, dav = navigator.appVersion, dp = navigator.platform;
        var tv = parseFloat(dav);

        has.add('khtml', (dav.indexOf("Konqueror") >= 0) ? tv : 0);

        has.add('webkit', parseFloat(dua.split("WebKit/")[1]) || undefined);
        if (dua.indexOf("Gecko") >= 0 && !has('khtml') && !has('webkit')) {
            has.add('mozilla', tv);
            has.add('moz', tv);
        }

        if (has('moz')) {
            //We really need to get away from this. Consider a sane isGecko approach for the future.
            has.add('firefox', parseFloat(dua.split("Firefox/")[1] || dua.split("Minefield/")[1]) || undefined);
        }
        has.add('safari', parseFloat(dua.split("Safari/")[1]) || undefined);

        has.add('chrome', parseFloat(dua.split("Chrome/")[1]) || undefined);
        if (has('chrome')) {
            has.remove('safari');
        }
        has.add('air', parseFloat(dua.split("AdobeAIR/")[1]) || undefined);

        has.add('mac', dav.indexOf("Macintosh") >= 0);

        has.add('ios', /iPhone|iPod|iPad/.test(dua) ? (function () {
            var v = dua.match(/OS(.*?)like/).pop().trim().split("_");
            return {
                major: Number(v.shift()),
                minor: Number(v.shift()),
                patch: (function () {
                    var p = v.shift();
                    return Number(p) === undefined ? 0 : Number(p);
                })()
            };
        })() : undefined);

        has.add('cordova', !!(window.cordova && window.cordova.require));
        has.add('phonegap', !!(window.cordova && window.cordova.require));

        has.add('kaiboer', dav.match('KIUI'));

        if (has('kaiboer')) {
            has.add('androidTV');
        }

        has.add('android', parseFloat(dua.split("Android ")[1]) || undefined);
        has.add('opera', Object.prototype.toString.call(window.opera) === '[object Opera]');

        has.add('wii', typeof opera !== "undefined" && opera.wiiremote);
        if (document.all && !has('opera')) {

            has.add('ie', parseFloat(dav.split("MSIE ")[1]) || undefined);
            //In cases where the page has an HTTP header or META tag with
            //X-UA-Compatible, then it is in emulation mode.
            //Make sure isIE reflects the desired version.
            //document.documentMode of 5 means quirks mode.
            //Only switch the value if documentMode's major version
            //is different from isIE's major version.
            var mode = document.documentMode;
            if (mode && mode !== 5 && Math.floor(has('ie')) !== mode) {
                has.add('ie', mode);
            }
        }
        has.add('chromecast', !!(dua.match(/(CrKey).*?(arm).*?Chrome/) && dp.match(/Linux.*?arm/i)));
    }
    return has;
});