define([
    './date/DateFormat'
],function (DateFormat) {
    'use strict';
    var dateHelper = {
        /**
         * @method getCurrentTimeZone
         */
        getCurrentTimeZone: function () {
            return -(new Date()).getTimezoneOffset() / 60;
        },
        /**
         * @method calcTime
         * @param {String|Date} time
         * @param {Number} offset timezone offset
         * @return Date
         */
        calcTime: function (time, offset) {
            // create Date object for current location
            var d = time || new Date();
            d = d instanceof Date ? d : (new Date(+d));
            // convert to msec
            // add local time zone offset
            // get UTC time in msec
            var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
            // create new Date object for different city
            // using supplied offset
            return new Date(utc + (3600000 * offset));
        },
        /**
         * conver given time (with timezone)
         * input format: 1392040072119+1
         * @method convertTime
         * @param {String} time
         * @return Date
         */
        convertTime: function (time) {
            if (!time) {
                return 0;
            }
            var timezone = time.match(/[\+\-]([0-9]*)/g);
            if (!timezone) {
                return new Date(+time);
            }
            timezone = timezone[0];
            time = time.split(timezone).shift();
            return this.calcTime(time, timezone);
        },
        /**
         * @method isValidTime
         * @param {String} value
         * @return Boolean
         */
        isValidTime: function (value) {
            var hasMeridian = false;
            var re = /^\d{1,2}[:]\d{2}([:]\d{2})?( [aApP][mM]?)?$/;
            if (!re.test(value)) {
                return false;
            }
            if (value.toLowerCase().indexOf("p") !== -1) {
                hasMeridian = true;
            }
            if (value.toLowerCase().indexOf("a") !== -1) {
                hasMeridian = true;
            }
            var values = value.split(":");
            if ((parseFloat(values[0]) < 0) || (parseFloat(values[0]) > 23)) {
                return false;
            }
            if (hasMeridian) {
                if ((parseFloat(values[0]) < 1) || (parseFloat(values[0]) > 12)) {
                    return false;
                }
            }
            if ((parseFloat(values[1]) < 0) || (parseFloat(values[1]) > 59)) {
                return false;
            }
            if (values.length > 2) {
                if ((parseFloat(values[2]) < 0) || (parseFloat(values[2]) > 59)) {
                    return false;
                }
            }
            return true;
        },
        formatter:function(){
            return new DateFormat();
        }
    };
    return dateHelper;
});