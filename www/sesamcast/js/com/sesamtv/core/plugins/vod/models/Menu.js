define([
    '../../../util/Class',
    '../../../abstract/plugin/BaseModel'
],function(Class,BaseModel){
    'use strict';
    var VodMenu = Class({
        extend:BaseModel,
        constructor:function VodMenu(binder, plugin){
            BaseModel.call(this,binder, plugin);
        },
        init:function(){

        },
        grid:function(){
          return xhr();
        },
        menu:function(){
            return [{
                name:'tf1',
                logo:'http://www.goldbygold.com/images/logo-tf1.jpg',
                cls:'selected'
            },{
                name:'M6 France',
                logo:'http://www.0production.fr/include/medias/img/videos/logos/logo-m6.png',
                cls:''
            },{
                name:'凤凰卫视',
                logo:'http://img.wdjimg.com/mms/icon/v1/d/00/4a0585c2ea5853afbd032c25e30e500d_256_256.png',
                cls:''
            }];
        },
        loadGrid:function(evt,data){

            var itemInfo = data.params.item;
            console.log('itemInfo',itemInfo);
            this.binder.set('logo',itemInfo.logo);
            this.plugin.binders['vod-trailers'].getModel('trailers').update(itemInfo.name);
            this.binder.get('menu').forEach(function(m,i){
                this.binder.getModel('menu').getItemModels(i).cls.set(itemInfo.index === i?'selected':'');
            },this);

        },
        logo:'http://static.connexion-internet.com/images/logoBouygues_www.connexion-internet.com.jpg'
    });
    return VodMenu;
});