define([
    'com/sesamtv/config/config',
    'com/sesamtv/core/util/Helper'
], function (loadConf, helper) {
    function getDataByPath(obj, path,keyName) {
        return (new Function(keyName, 'return '+path+';'))(obj);
    }
    function bootstrap(){
        var config = bootstrap.mergeConfig();
        require({
            config: config.requireConfig
        }, ['com/sesamtv/core/engine/BootManager'], function (bootManager) {
            bootManager.boot(config.appConfig);
        });
    }

    bootstrap.mergeConfig = function(){

        var coreConfig = loadConf(true), mergedConfig = {};
        coreConfig.mergeRequireConfig.forEach(function(key){
            mergedConfig = helper.shallowMixin(mergedConfig,coreConfig[key]);
        });
        coreConfig.mergeSubConfig.forEach(function (k) {
            var alias = k.match(/(.*?) as (.*)/i), name, key,fullKey;
            fullKey = (alias ? alias[1] : k).trim();
            key = fullKey.split(".")[0];
            name = (alias ? alias[2] : k).trim();
            if (coreConfig[key] && coreConfig[key].manager in mergedConfig) {
                mergedConfig[coreConfig[key].manager][name] = getDataByPath(coreConfig[key],fullKey,key);
            }
        });
        return {
            requireConfig:mergedConfig,
            appConfig:coreConfig
        };
    };
    return bootstrap;
});