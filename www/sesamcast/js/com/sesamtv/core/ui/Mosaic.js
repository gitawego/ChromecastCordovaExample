define([
    './BaseView',
    '../util/Class',
    'bower_components/blueimp-tmpl/js/tmpl',
    'text!assets/common/template/Mosaic.html'
], function (BaseView, Class, tmpl, mosaicTpl) {
    'use strict';
    var Mosaic = Class({
        extend: BaseView,
        constructor: function (args,node) {
            var self = this;
            args.applyOnly = false;
            Class.applyIf(args, {
                templateStr: mosaicTpl,
                itemTemplate:'<figure class="{%=(item.size || \'\')%}"></figure>',
                pageTemplate:'<div class="page">{%#items%}</div>',
                itemsPerPage:6,
                linesPerPage:2,
                tmplHelper: {
                    buildLayout:function(mode){
                        return self[mode+'Layout']();
                    }
                },
                /**
                 * @cfg {String} [theme='default']
                 */
                theme: 'default',
                itemSelector:'figure'
            });
            BaseView.call(this, args, node);
            this.itemList.importItems();
        },
        horizontalLayout:function(){
            var str = '',items = this.getConfig('items'),i= 0,l=items.length, total = 0, item;
            for(;i<l;i++){
                item = items[i];
                total++;
                if(item.size == '2x'){
                    total++;
                }

            }


        }
    });
    return Mosaic;
});