define([
    'module',
    '../Class',
    '../BaseEvented',
    '../Encoding',
    './Structure',
    '../XML',
    '../CustomError'
], function (module, Class, BaseEvented, encoding, getDataByStructure, xml, CustomError) {
    var Invalid = CustomError({
       name:'BaseParser',
        errors: {
            ERROR_INVALID_XML: 'XML Invalid'
        }
    });
    /**
     * @class com.sesamtv.core.util.data.BaseParser
     * @extends com.sesamtv.core.util.BaseEvented
     */
    /**
     * @event data
     */
    /**
     * @event abort
     */
    /**
     * @event complete
     */
    /**
     * @event error
     */
    var BaseParser = Class({
        extend: BaseEvented,
        constructor: function BaseParser(policy) {
            this.policy = policy;
            BaseEvented.call(this);
            this.id = encoding.uuid();
        },
        /**
         * format xml or json depending on config.
         * for xml, if no root is defined, add <root> as root tag, otherwise, it's a malformed xml string.
         * @method formatter
         * @param {*} rawData
         * @param {String} type input or output
         * @returns {*}
         */
        formatter: function (rawData, type) {
            var format = this.policy.parser.format ? this.policy.parser.format[type] || 'json' : 'json';
            if(typeof(format) === 'object'){
                return formatter[type][format.type] && formatter[type][format.type](rawData,format);
            }
            return formatter[type][format] && formatter[type][format](rawData);
        },
        /**
         * @method parse
         * @param {*} rawData
         * @fires data
         * @fires complete
         * @return {Object} parsed data
         */
        parse: function (rawData) {
            var res;
            rawData = this.formatter(rawData, 'input');
            res = getDataByStructure(rawData, this.policy.parser.structure);
            res = this.formatter(res, 'output');
            this.emit('data', res);
            this.emit('complete');
            return res;
        },
        /**
         * @method abort
         * @abstract
         * @fires abort
         * @fires complete
         */
        abort: function () {
            //todo
            this.emit('abort');
            this.emit('complete');
        }
    });
    /**
     * @property formatter
     * @private
     */
    var formatter = {
        "output": {
            xml: function (rawData,config) {
                config = config || {};
                //return xml
                var keys = Object.keys(rawData), res;

                if((keys.length === 1 && rawData[keys[0]] instanceof Array) || keys.length > 1){
                    rawData = {
                        root:rawData
                    }
                }

                res = xml.fromString(xml.fromJson(rawData,config.isCDATA).trim());
                if(!xml.validateXMLFormat(res)){
                    (new Invalid('ERROR_INVALID_XML')).raise();
                }
                return res;
            },
            json: function (rawData) {
                //return json object
                return rawData;
            }
        },
        "input": {
            xml: function (rawData) {
                if (typeof(rawData) === 'string') {
                    rawData = xml.fromString(rawData);
                }
                return xml.toJson(rawData);
            },
            json: function (rawData) {
                if (typeof(rawData) === 'string') {
                    rawData = JSON.parse(rawData);
                }
                return rawData;
            }
        }
    };
    return BaseParser;
});