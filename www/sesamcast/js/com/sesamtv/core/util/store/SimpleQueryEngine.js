define(function(){
    "use strict";
// module:
//		dojo/store/util/SimpleQueryEngine
    /**
     * copyright dojotoolkit
     * @class com.sesamtv.core.util.store.SimpleQueryEngine
     * @singleton
     * @cfg {Object} query a query object
     * @cfg {Object} options
     * @cfg {Object|Function} options.sort
     * @cfg {Boolean} options.sort.descending
     * @cfg {String} options.sort.attribute
     * @cfg {Number} options.start
     * @cfg {Number} options.count
     *
     */
    return function(query, options){

        // create our matching query function
        switch(typeof query){
            default:
                throw new Error("Can not query with a " + typeof query);
            case "object": case "undefined":
            var queryObject = query;
            query = function(object){
                for(var key in queryObject){
                    var required = queryObject[key];
                    if(required && required.test){
                        // an object can provide a test method, which makes it work with regex
                        if(!required.test(object[key], object)){
                            return false;
                        }
                    }else if(required != object[key]){
                        return false;
                    }
                }
                return true;
            };
            break;
            case "string":
                // named query
                if(!this[query]){
                    throw new Error("No filter function " + query + " was found in store");
                }
                query = this[query];
            // fall through
            case "function":
            // fall through
        }
        function execute(array){
            // execute the whole query, first we filter
            var results = array.filter(query);
            // next we sort
            var sortSet = options && options.sort;
            if(sortSet){
                results.sort(typeof sortSet == "function" ? sortSet : function(a, b){
                    for(var sort, i=0; sort = sortSet[i]; i++){
                        var aValue = a[sort.attribute];
                        var bValue = b[sort.attribute];
                        if (aValue != bValue){
                            return !!sort.descending == (aValue == null || aValue > bValue) ? -1 : 1;
                        }
                    }
                    return 0;
                });
            }
            // now we paginate
            if(options && (options.start || options.count)){
                var total = results.length;
                results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
                results.total = total;
            }
            return results;
        }
        execute.matches = query;
        return execute;
    };
});