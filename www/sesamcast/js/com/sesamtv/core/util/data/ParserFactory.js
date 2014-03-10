define([
    'module',
    '../Class',
    '../BaseEvented',
    './BaseParser',
    '../Array'
], function (module, Class, BaseEvented, BaseParser, arrayHelper) {
    var DataParsers = {
        'common':BaseParser
    };
    /**
     * @class com.sesamtv.core.util.data.ParserFactory
     * @singleton
     * @extends com.sesamtv.core.util.BaseEvented
     */
    var ParserFactory = Class({
        singleton: true,
        extend: BaseEvented,
        constructor: function ParserFactory(args) {
            this.config = {
            };
            this.parsers = {};
            BaseEvented.call(this, args);
        },
        /**
         * @method addParser
         * @param {String} id
         * @param {Function} Parser
         */
        addParser:function(id,Parser){
            if(id in DataParsers){
                return;
            }
            DataParsers[id] = Parser;
        },
        /**
         * @method removeParser
         * @param {String} id
         * @returns {boolean}
         */
        removeParser:function(id){
            if(id !== 'common'){
                return delete DataParsers[id];
            }
            return false
        },
        /**
         * @method hasParser
         * @param {String} id
         * @returns {boolean}
         */
        hasParser:function(id){
            return id in DataParsers;
        },
        /**
         * @method getInstance
         * @param {Object} policy
         * @returns {com.sesamtv.core.util.data.BaseParser}
         */
        getInstance: function (policy) {
            //console.log(policy.parser.name);
            var key = policy.parser.name || 'common', self = this,  parser, idx;
            if(!(key in DataParsers)){
                throw new Error('parser '+key+' is not defined')
            }
            parser =  new DataParsers[key](policy);
            this.parsers[parser.id] = parser;
            parser.on('complete',function(){
                delete self.parsers[parser.id];
            });
            return parser;
        },
        abort:function(){
            arrayHelper.forEach(this.parsers,function(parser){
                parser.abort();
            });
            this.parsers = {};
        }
    });

    return new ParserFactory(module.config());
});