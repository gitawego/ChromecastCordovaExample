/*global require,define,console*/
/*jslint plusplus: true */
/*jslint expr:true */
define([
    './XHR',
    './Class'
], function (xhr) {
    'use strict';
    var defaultProxy = {
        url: 'http://anyorigin.com/get/',
        content: {
            callback: "?"
        },
        parse: function (url) {
            var str = '';
            this.content && Object.keys(this.content, function (k) {
                str += '&' + k + '=' + this.content[k];
            }, this);
            return this.url + '?url=' + (url) + str;
        },
        load:function(url,callback){
            xhr.JSONP.get(this.parse(url), function (data) {
                callback(data.contents);
            });
        }
    };

    /**
     * @method youtubeVideo
     * @param {String} [id]
     * @param {Object} opt
     * @param {String} [opt.data]
     * @param {Object} [opt.proxy]
     * @param {Function} opt.callback
     * @returns {*}
     */
    function youtubeVideo(id, opt) {
        opt = opt || {};
        if (opt.data) {
            return postRequest(opt.data, opt);
        }
        var proxy = opt.proxy || defaultProxy;
        var url = youtubeVideo.buildInfoUrl(id);
        return proxy.load(url,function(data){
            postRequest(data, opt);
        });
    }

    /**
     * @method postRequest
     * @private
     * @param {String} video_info
     * @param {Object} opt
     * @param {Function} opt.callback
     * @returns {*}
     */
    function postRequest(video_info, opt) {
        var video;
        video = youtubeVideo.decodeQueryString(video_info);
        if (video.status === "fail") {
            return opt.callback(video);
        }
        video.sources = youtubeVideo.decodeStreamMap(video.url_encoded_fmt_stream_map);
        video.getSource = function (type, quality) {
            var exact, key, lowest, source, _ref;
            lowest = null;
            exact = null;
            _ref = this.sources;
            for (key in _ref) {
                if (!_ref.hasOwnProperty(key)) {
                    continue;
                }
                source = _ref[key];
                if (source.type.match(type)) {
                    if (source.quality.match(quality)) {
                        exact = source;
                    } else {
                        lowest = source;
                    }
                }
            }
            return exact || lowest;
        };
        return opt.callback(video);
    }

    youtubeVideo.buildInfoUrl = function (id) {
        return "http://www.youtube.com/get_video_info?video_id=" + id;
    };
    youtubeVideo.decodeQueryString = function (queryString) {
        var key, keyValPair, keyValPairs, r, val, _i, _len;
        r = {};
        keyValPairs = queryString.split("&");
        for (_i = 0, _len = keyValPairs.length; _i < _len; _i++) {
            keyValPair = keyValPairs[_i];
            key = decodeURIComponent(keyValPair.split("=")[0]);
            val = decodeURIComponent(keyValPair.split("=")[1] || "");
            r[key] = val;
        }
        return r;
    };
    youtubeVideo.decodeStreamMap = function (url_encoded_fmt_stream_map) {
        var quality, sources, stream, type, urlEncodedStream, _i, _len, _ref;
        sources = {};
        _ref = url_encoded_fmt_stream_map.split(",");
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            urlEncodedStream = _ref[_i];
            stream = youtubeVideo.decodeQueryString(urlEncodedStream);
            type = stream.type.split(";")[0];
            quality = stream.quality.split(",")[0];
            stream.original_url = stream.url;
            stream.url = "" + stream.url + "&signature=" + stream.sig;
            sources["" + type + " " + quality] = stream;
        }
        return sources;
    };
    return youtubeVideo;
});