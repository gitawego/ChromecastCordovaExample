define([
    '../../util/Class',
    '../../util/Date',
    '../../util/Helper',
    '../../util/XHR'
], function (klass, dateHelper, helper, xhr) {
    'use strict';
    /**
     * a XMLTV data provider for class EPG
     * @class com.sesamtv.core.ui.epg.XMLTV
     * @param {Object} opt
     * @param {com.sesamtv.core.ui.EPG} factory
     */
    var XMLTV = klass({
        constructor: function (opt, factory) {
            this.config = {
                baseUrl: null,
                dateRegxp: /([\d]{4})([\d]{2})([\d]{2})([\d]{2})([\d]{2})([\d]{2})/g,
                useJsonP: false
            };
            this.factory = factory;
            opt && klass.mixin(this.config, opt);
        },
        loadData: function (query, callback) {
            query = query || {};
            if (this.config.useJsonP || query.useJsonP) {
                xhr.JSONP.get(this.config.baseUrl, query.query, function (res) {
                    callback && callback(res);
                });
            } else {
                xhr.request(this.config.baseUrl, query.query).on('load', function (res) {
                    callback && callback(res);
                }).send();
            }
        },
        parseData: function (data) {
            var obj = {},
                self = this,
                prog, clonedProg, startTimeObj, stopTimeObj, start, stop, timezone
            this.config.channelOrder = data.map(function (c) {
                return c.id;
            });

            data.forEach(function (channel) {
                if (!channel.programmes.length) {
                    console.warn('channel without programme', channel);
                    self.config.channelOrder.splice(self.config.channelOrder.indexOf(channel.id), 1);
                    return;
                }
                var channelName = channel.id,
                    channelObj = {
                        id: channelName,
                        icon: channel.icon,
                        displayName: channel.displayName,
                        programmes: []
                    };

                channel.programmes.forEach(function (programme, i) {
                    var isDiffDate = false;
                    prog = helper.deepClone(programme);
                    start = prog.start.substr(0, 8);
                    stop = prog.stop.substr(0, 8);

                    startTimeObj = self.parseTimeString(prog.start);
                    stopTimeObj = self.parseTimeString(prog.stop);
                    timezone = startTimeObj.timezone;

                    if (start !== stop) {
                        if (+self.getDate(prog.stop) !== +new Date(startTimeObj.year, startTimeObj.month - 1, startTimeObj.date, 24)) {
                            clonedProg = helper.deepClone(prog);
                            prog.stop = start + '235959 ' + timezone;
                            isDiffDate = true;
                        } else {
                            prog.stop = start + '235959 ' + timezone;
                        }

                    }

                    if (!obj[start]) {
                        obj[start] = {};
                    }
                    if (!obj[start][channelName]) {
                        obj[start][channelName] = helper.deepClone(channelObj);
                    }


                    prog.index = obj[start][channelName].programmes.length;
                    self.parseProgramme(prog);
                    obj[start][channelName].programmes.push(prog);

                    if (!isDiffDate) {
                        return;
                    }

                    start = clonedProg.start.substr(0, 8);
                    stop = clonedProg.stop.substr(0, 8);

                    if (!obj[stop]) {
                        obj[stop] = {};
                    }
                    if (!obj[stop][channelName]) {
                        obj[stop][channelName] = helper.deepClone(channelObj);
                    }


                    clonedProg.start = clonedProg.stop.replace(/([\d]{8})([\d]{6})(.*)/,
                        function (ignore, leading, match, end) {
                            return leading + '000000' + end;
                        });


                    clonedProg.index = obj[stop][channelName].programmes.length;
                    self.parseProgramme(clonedProg);
                    obj[stop][channelName].programmes.push(clonedProg);

                });
            }, this);
            data = null;
            return obj;
        },

        parseTime: function (values) {
            values = this.getDate(values);
            return dateHelper.formatter().format(values, this.factory.config.translation.timeFormat);
        },
        parseTag: function (key, prog) {
            var firstV;
            if (Array.isArray(prog[key])) {
                prog[key].forEach(function (t) {
                    if (!firstV) {
                        firstV = t.value;
                    }
                    if (t['@lang']) {
                        prog[key + '_' + t['@lang']] = t.value;
                    } else {
                        prog[key] = t.value;
                        //fistV = t.value;
                    }
                });

                if (typeof(prog[key]) === 'object') {
                    prog[key] = firstV;
                }

            } else if (typeof(prog[key]) === 'object') {
                prog[key] = prog[key].value;
            }
            return prog;
        },
        parseCategory: function (values) {
            if (!values) {
                return '';
            }
            var self = this, str = [];
            if (Array.isArray(values)) {
                values.forEach(function (v) {
                    v.value = v.value.trim();
                    str.push(self.factory.config.translation.categories[v.value] || v.value);
                });
            } else {
                values.value = values.value.trim();
                str.push(self.factory.config.translation.categories[values.value] || values.value);
            }
            return str.join(' ');
        },
        parseProgramme: function (prog) {

            prog.timelinePosition = this.calTimelinePosition(prog.start, prog.stop);
            prog.startTime = this.parseTime(prog.start);
            prog.stopTime = this.parseTime(prog.stop);
            prog.categoryList = this.parseCategory(prog.category);


            var keys = ['title', 'desc'];
            keys.forEach(function (k) {
                this.parseTag(k, prog);
            }, this);


            return prog;
        },
        calTimelinePosition: function (start, stop) {
            var total = 24 * 60;
            start = this.getMinutes(start);
            stop = this.getMinutes(stop);

            return {
                left: Math.round((start / total) * 100),
                right: 100 - Math.round(stop / total * 100)
            };
        },
        getMinutes: function (str) {
            var m = str.match(/[\d]{8}([\d]{2})([\d]{2}).*/);
            return m[1] * 60 + (+m[2]);
        },
        parseTimeString: function (str) {
            //20140226011000 +0100
            str = str.split(/\s/);
            var obj = {
                timeString: str[0],
                timezone: str[1]
            };
            str[0].trim().replace(this.config.dateRegxp, function (ignore, _year, _month, _date, _hour, _minute, _second) {
                obj.year = _year;
                obj.month = _month;
                obj.date = _date;
                obj.hour = _hour;
                obj.minute = _minute;
                obj.second = _second;
            });
            return obj;
        },
        /**
         * str format: "20140213111700 +0100"
         * get the real date depending on timezone
         * @method getDate
         * @param {String} str
         * @param {Boolean} [noTimezone]
         * @returns {*}
         */
        getDate: function (str, noTimezone) {
            var d = null, parts, timezone, timeStr;
            if (noTimezone) {
                timeStr = str;
            } else {
                parts = str.split(/\s/);
                timezone = +parts.pop() / 100;
                timeStr = parts[0];
            }
            //20140213103500
            timeStr.trim().replace(this.config.dateRegxp, function (ignore, year, month, date, hour, minute, second) {
                d = new Date(year, month - 1, date, hour, minute, second);
            });
            return typeof(timezone) !== 'undefined' ? dateHelper.calcTime(d, timezone) : d;
        }
    });
    return XMLTV;
});