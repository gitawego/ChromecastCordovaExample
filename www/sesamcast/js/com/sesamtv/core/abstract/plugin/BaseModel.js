define([
    '../../util/Class',
    '../../util/BaseEvented'
], function (Class, BaseEvented) {
    /**
     *
     * @class com.sesamtv.core.abstract.plugin.BaseModel
     * @copyright Copyright (c) 2013, SesamTV. All rights reserved.
     * > Important notice: This software is the sole property of SesamTV
     * > and can not be distributed and/or copied without the written permission of SesamTV.
     * @extends com.sesamtv.core.util.BaseEvented                           top
     *
     */
    var BaseModel = Class({
        extend: BaseEvented,
        constructor: function BaseViewModel(binder, plugin) {
            this.binder = binder;
            this.plugin = plugin;
            this.models = {};
            BaseEvented.call(this);
            this.init && this.init();
        },
        init: function () {

        }
    });
    return BaseModel;
});