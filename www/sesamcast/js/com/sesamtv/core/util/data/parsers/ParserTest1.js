define([
    'module',
    '../../Class',
    '../BaseParser',
    '../Structure',
    '../ParserFactory'
], function (module, Class, BaseParser, getDataByStructure, parserFactory) {
    /**
     * @class com.sesamtv.core.util.data.parsers.ParserTest1
     * @extends com.sesamtv.core.util.data.BaseParser
     */
    var ParserTest1 = Class({
        extend: BaseParser,
        constructor: function ParserTest1(policy) {
            BaseParser.call(this, policy);
        }
    });
    parserFactory.addParser('parserTest1',ParserTest1);
    return ParserTest1;
});