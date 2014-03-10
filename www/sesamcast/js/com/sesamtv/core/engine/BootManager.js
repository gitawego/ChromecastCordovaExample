define([
    'module',
    '../util/Class',
    '../util/BaseEvented',
    './Topic',
    '../util/Helper'
], function (module, Class, BaseEvented, topic, helper) {
    "use strict";
    /**
     * boot different managers (stateManager, errorManager, pluginManager, etc.), and defined application.
     * @class com.sesamtv.core.engine.BootManager
     * @singleton
     * @extends com.sesamtv.core.util.BaseEvented
     */
    /**
     * when an error occurred during boot.
     * @event error
     */
    var BootManager = Class({
        extend: BaseEvented,
        constructor: function () {
            BaseEvented.call(this);
        },
        /**
         * merge configs, and initialize managers
         * @method boot
         * @param {Object} coreConfig
         */
        boot: function (coreConfig) {
            var self = this, bootConf = module.config(),
                appPath = coreConfig.appId,
                boot = function (router, params) {
                    if (!params) {

                        var defaultPrefix = router.toUrl(coreConfig.appRoutePattern, {
                            appName: appPath
                        });

                        router.setHash(defaultPrefix + '/' + winHash.substr(1), setHashConf);
                    }
                    //self.mergeConfig(coreConfig);
                    self.initDependencies();
                },
                verifyApp = function (appName) {
                    if (appName !== coreConfig.appId) {
                        //todo custom fallback
                        var error = new Error('application ' + appName + ' is not available');
                        self.emit('error', error);
                        return false;
                        //throw error;
                    }
                    return true;
                },
                param,
                routeRule = coreConfig.appRoutePattern + '/*',
                setHashConf = {
                    preventAction: true,
                    replace: true
                },
                winHash = window.location.hash;

            if (bootConf.router) {
                require([bootConf.router.handler], function (router) {
                    router.setConfigs(bootConf.router.config);
                    if (!(param = router.matchParams(winHash.substr(1), coreConfig.appRoutePattern))) {
                        param = router.matchParams(winHash.substr(1), routeRule);
                    }
                    function appRouteHelper(param, next) {
                        var _appName = param ? param.appName : coreConfig.appId;

                        if (!verifyApp(_appName)) {
                            return;
                        }
                        //console.log('routeHelper', param,boot);
                        next && next();

                        if (boot) {
                            boot(router, param);
                            boot = null;
                        }
                    }

                    router.addRoute(coreConfig.appRoutePattern, appRouteHelper);
                    router.addRoute(routeRule, appRouteHelper);
                    appRouteHelper(param);
                    router.init();

                });
                return this;
            }

            if (!verifyApp(appPath)) {
                return;
            }
            if (boot) {
                boot();
                boot = null;
            }
            //return this.mergeConfig(appPath, coreConfig);
        },
        /**
         * @method initDependencies
         */
        initDependencies: function () {
            var config = module.config();
            config.dependencies && config.dependencies.length > 0 &&
            require(config.dependencies, function () {
                topic.pub(config.trigger);
            });
        }
    });
    return new BootManager();
});