define([
    'module',
    '../../Class',
    '../BaseParser',
    '../Structure',
    '../ParserFactory'
], function (module, Class, BaseParser, getDataByStructure, parserFactory) {
    /**
     * @class com.sesamtv.core.util.data.parsers.ParserTest2
     * @extends com.sesamtv.core.util.data.BaseParser
     */
    var ParserTest2 = Class({
        extend: BaseParser,
        constructor: function ParserTest2(policy) {
            BaseParser.call(this, policy);
        }
    });
    parserFactory.addParser('parserTest2',ParserTest2);
    return ParserTest2;
});