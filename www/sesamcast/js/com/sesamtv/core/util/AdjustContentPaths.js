define([
    './RegEx'
], function (regexps) {
    'use strict';
    /**
     * @class com.sesamtv.core.util.AdjustContentPaths
     * @requires com.sesamtv.core.util.RegEx
     * @singleton
     */
    var AdjustContentPaths = {
        /**
         *
         * @param content
         * @param baseUrl
         * @returns {String}
         */
        css: function (content, baseUrl) {
            var self = this,
                callback = function (url, end, tag) {
                    var mapping = {
                        "import": "@import '{content}'" + end,
                        "url": "url({content})" + end
                    };
                    return mapping[tag.toLowerCase()].replace(/\{content\}/g, self.absPath(url, baseUrl));
                };
            return content.replace(regexps.cssPaths,
                function (ignore, delimStr, strUrl, delimUrl, urlUrl, end) {
                    if (strUrl) {
                        return callback(strUrl, end, "import");
                    } else {
                        return callback(urlUrl, end, "url");
                    }
                });
        },
        /**
         * @method html
         * @param {String} content
         * @param {String} [baseUrl]
         * @returns {string}
         */
        html: function (content, baseUrl) {
            var htmlAttrPaths = regexps.htmlLink,
                fullUrl = regexps.fullUrl,
                self = this;
            content = content.replace(htmlAttrPaths,
                function (ignore, start, name, delim, relUrl, end) {
                    if (relUrl) {
                        return (relUrl != "#" && !relUrl.match(fullUrl)) ?
                            start + name + '=' + delim + self.absPath(relUrl, baseUrl) + delim + end :
                            ignore;
                    }
                    return ignore;
                });
            return content;
        },
        /**
         * @method absPath
         * @param {String} url
         * @param {String} [base=window.location.href]
         * @returns {*}
         */
        absPath: function (url, base) {
            url = url.trim();
            if (url.match(regexps.aboutPage) || url.match(regexps.dataUri) ||
                url.match(regexps.fullUrl) || url.match(/^\//)) {
                return url;
            }

            if(typeof(base) === 'undefined'){
                base = window.location.href;
            }

            base = base.substring(0, base.lastIndexOf('/'));
            while (/^\.\./.test(url)) {
                base = base.substring(0, base.lastIndexOf('/'));
                url = url.substring(3);
            }
            return base + '/' + url;
        },
        /**
         * @method adjust
         * @param {String} content
         * @param {String} [baseUrl=window.location.href]
         * @returns {string}
         */
        adjust: function (content, baseUrl) {
            content = this.css(content, baseUrl);
            return this.html(content, baseUrl);
        }
    };
    return AdjustContentPaths;
});