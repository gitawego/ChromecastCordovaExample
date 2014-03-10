define(function () {
    "use strict";
    /**
     * @class com.sesamtv.core.util.Encoding
     * @singleton
     */
    var encoding = {
        secureRandomString: function (length) {
            var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
                i, values, result = "",
                isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
            if (window.crypto && window.crypto.getRandomValues) {
                values = new Uint32Array(length);
                window.crypto.getRandomValues(values);
                for (i = 0; i < length; i++) {
                    result += charset[values[i] % charset.length];
                }
                return result;
            }
            else if (isOpera)//Opera's Math.random is secure, see http://lists.w3.org/Archives/Public/public-webcrypto/2013Jan/0063.html
            {
                for (i = 0; i < length; i++) {
                    result += charset[Math.floor(Math.random() * charset.length)];
                }
                return result;
            } else {
                throw new Error("can't generate secure random string");
            }
        },
        /**
         * it better works with base64 encoded string
         *
         * copyright FinanceTime
         * @method compressStr
         * @param {String} s
         * @returns {String}
         */
        compressStr: function (s) {
            var i, l, out = '';
            if (s.length % 2 !== 0) {
                s += ' ';
            }
            for (i = 0, l = s.length; i < l; i += 2) {
                out += String.fromCharCode((s.charCodeAt(i) * 256) + s.charCodeAt(i + 1));
            }
            // Add a snowman prefix to mark the resulting string as encoded.
            return String.fromCharCode(9731) + out;
        },
        /**
         * copyright FinanceTime
         *
         * works with compressStr
         * @method decompressStr
         * @param {String} s
         * @returns {String}
         */
        decompressStr: function (s) {
            var i, l, n, m, out = '';
            // If not prefixed with a snowman, just return the (already uncompressed) string.
            if (s.charCodeAt(0) !== 9731) {
                return s;
            }

            for (i = 1, l = s.length; i < l; i++) {
                n = s.charCodeAt(i);
                m = Math.floor(n / 256);
                out += String.fromCharCode(m, n % 256);
            }
            return out;
        },
        uuid: function (tpl) {
            tpl = tpl || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
            var d = (new Date()).getTime();
            return tpl.replace(/[xy]/g, function(c) {
                var r = (d + Math.random()*16)%16 | 0;
                d = Math.floor(d/16);
                return (c=='x' ? r : (r&0x7|0x8)).toString(16);
            });
        },
        /**
         * @method hashCode
         * @param {*} str
         * @returns {number}
         */
        hashCode: (function(){
            function hash(string) {
                var string = string.toString(), hash = 0, i;
                for (i = 0; i < string.length; i++) {
                    hash = (((hash << 5) - hash) + string.charCodeAt(i)) & 0xFFFFFFFF;
                }
                return hash;
            }

            function objHash(obj) {
                var result = 0,prop;
                for (prop in obj) {
                    if (obj.hasOwnProperty(prop)) {
                        result += hash(prop + hashCode(obj[prop]));
                    }
                }
                return result;
            }

            // Does a type check on the passed in value and calls the appropriate hash method
            function hashCode(value) {
                if (!value) {
                    return 0;
                }
                return typeof value === 'object' ? objHash(value):hash(value);
            }
            return hashCode;
        })()
    };
    return encoding;
});