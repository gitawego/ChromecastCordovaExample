define([
    '../../../util/Class',
    '../../../util/Promise',
    '../../../util/XHR',
    '../../../abstract/plugin/BaseModel'
],function(Class,Promise,xhr, BaseModel){
    'use strict';
    var VodMenu = Class({
        extend:BaseModel,
        constructor:function VodMenu(binder, plugin){
            BaseModel.call(this,binder, plugin);
        },
        init:function(){

        },
        trailers:function(keyword){
            if(!keyword){
                return [];
            }
            var deferred = Promise();
            xhr('http://gdata.youtube.com/feeds/api/videos',{
                method:'get',
                handleAs:'json',
                content:{
                   v:2,
                    alt:'json',
                    'max-results':24,
                    format:5,
                    time:'all_time',
                    q:keyword
                },
                onload:function(data){
                    deferred.resolve(data.feed.entry.map(function(entry){
                        return {
                            thumbnail:entry['media$group']['media$thumbnail'][1].url,
                            title:entry.title['$t']
                        }
                    }));
                }
            });
            return deferred;
        }
    });
    return VodMenu;
});