define([
    '../XML',
    '../Encoding',
    '../Array',
    '../polyfill'
], function (xml, encoding, arrayHelper) {
    var cache, enableCache = false;
    "use strict";
    function getDataByPath(obj, path) {
        return (new Function('obj', 'return obj.' + path.replace(/\//g, '.')))(obj);
    }

    /**
     * data structure format
     *
     *    var structure = {
     *       "info":{
     *            "properties":{
     *                "author":"feed/author[0]/name/$t"
     *            }
     *       },
     *       "items":{
     *           "path":"feed/entry",
     *           "filter":"return $i > 5;",
     *           "itemProperties":{
     *               "id":"id/$t",
     *               "thumbnail":{
     *                   "path":"media$group/media$thumbnail[0]/url"
     *               },
     *               "title":{
     *                   "path":"title/$t"
     *               }
     *           }
     *       }
     *   }
     *
     * see {@link com.sesamtv.core.util.XML} for json object format based on xml
     *
     * @method getDataByStructure
     * @param {Object} obj
     * @param {Object} structure
     * @param {Boolean} [isXML]
     * @returns {Object}
     */
    function getDataByStructure(obj, structure, isXML) {
        var result, hash;
        if (enableCache && cache.get(obj)) {
            hash = encoding.hashCode(JSON.stringify(structure));
            if (result = cache.get(obj)[hash]) {
                return result;
            }
        }
        if (isXML) {
            obj = xml.toJson(obj);
        }
        result = parser(obj, structure);

        if (enableCache) {
            if (!cache.get(obj)) {
                cache.set(obj, {});
            }
            cache.get(obj)[hash] = result;
        }

        return isXML ? xml.fromJson(result) : result;
    }

    function parser(obj, structure, root) {
        root = root || obj;
        var data = {}, stru, isArray, keys = Object.keys(structure),
            i = 0, l = keys.length,
            mainKey, hasFilter, filterFnc, items;
        for (; i < l; i++) {
            mainKey = keys[i];
            stru = structure[mainKey];
            if (typeof(stru) === 'string') {
                data[mainKey] = getDataByPath(obj, stru);
                continue;
            }
            if (stru.path) {
                //object or array
                data[mainKey] = getDataByPath(obj, stru.path);
            }
            isArray = data[mainKey] instanceof Array;
            if (stru.properties && !isArray) {
                //object
                data[mainKey] = data[mainKey] || {};
                arrayHelper.forEach(stru.properties, function (item, i, key) {
                    data[mainKey][key] = typeof(item) === 'string' ?
                        getDataByPath(obj, item) :
                        parser(obj, item, root);
                });
            }
            //array
            if (isArray && stru.itemProperties) {
                items = [];
                hasFilter = 'filter' in stru;
                if (hasFilter) {
                    filterFnc = new Function('$item,$i', stru.filter);
                }
                arrayHelper.forEach(data[mainKey], function (item, index) {
                    item['$$parent'] = data[mainKey];
                    item['$$root'] = root;
                    if (hasFilter) {
                        if (filterFnc(item, index)) {
                            items.push(parser(item, stru.itemProperties, root));
                        }
                    } else {
                        items.push(parser(item, stru.itemProperties, root));
                    }
                });
                data[mainKey] = items;
            }
        }
        return data;
    }

    getDataByStructure.getDataByPath = getDataByPath;
    getDataByStructure.clearCache = function (obj) {
        cache.delete(obj);
    };
    getDataByStructure.enableCache = function (enable) {
        enableCache = enable;
        if (!cache) {
            cache = new WeakMap();
        }
    };
    return getDataByStructure;
});