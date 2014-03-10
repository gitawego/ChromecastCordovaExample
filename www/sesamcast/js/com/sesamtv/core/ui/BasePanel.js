define([
    '../util/Class',
    './BaseView'
], function (Class, BaseView) {
    "use strict";
    var BasePanel = Class({
        extend: BaseView,
        constructor: function (args, node) {
            //this._super(args,node);
            BaseView.call(this, args, node);

        },
        goToNextItem: function () {

        }
    });
    return BasePanel;
});
