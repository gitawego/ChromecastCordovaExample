/*global define,require,console*/
define([
    '../../../util/Class',
    '../../../util/Promise',
    '../../../util/XHR',
    '../../../engine/Topic',
    '../../../abstract/plugin/BaseModel',
    '../../../util/Helper'
],function(klass,promise,xhr, topic, BaseModel, helper){
    'use strict';
    var VodMenu = klass({
        extend:BaseModel,
        constructor:function VodMenu(binder, plugin){
            BaseModel.call(this,binder, plugin);

            this.fetchParams = {
                v:2,
                alt:'json',
                'max-results':24,
                format:5,
                time:'all_time',
                //lr:'fr',
                //orderby:'published',
                hd:true
            };
            this.defaultUrl = 'http://gdata.youtube.com/feeds/api/videos';
            this.defaultTime = 'all_time';
            this.url = null;
            this.mosaicParams = plugin.config.mosaicParams;
        },
        init:function(){

        },
        title:"",
        pagination:"",
        updateQueryParams:function(itemData){
            if(typeof(itemData) === 'string'){
                itemData = {
                    keyword:itemData
                };
            }
            if(itemData.keyword){
                this.fetchParams.q = itemData.keyword;
            }else{
                delete this.fetchParams.q;
            }
            if('category' in itemData){
                this.fetchParams.category = itemData.category;
            }

            if('standardfeeds' in itemData){
                itemData.url = 'https://gdata.youtube.com/feeds/api/standardfeeds/FR/'+itemData.standardfeeds;
            }
            //author
            if(itemData.author){
                this.fetchParams.author = itemData.author;
            }else{
                delete this.fetchParams.author;
            }

            if(itemData.time){
                this.fetchParams.time = itemData.time;
            }else{
                this.fetchParams.time = this.defaultTime;
            }

            if('url' in itemData){
                this.url = itemData.url;
            }else{
                delete this.url;
            }
            this.binder.getModel('title').set('title for '+itemData.name);
        },
        backToMenu:function(){
            this.plugin.emit('unselected');
            topic.pub('focusManager/focusMap',{
                map:[0,0]
            });
        },
        videos:function(args){
            var self = this,grid;
            if(!args){
                return [];
            }

            var deferred = promise(), contentConf = helper.mixin({},this.fetchParams);

            if('start-index' in args){
                contentConf['start-index'] = args['start-index'];
            }
            if('max-results' in args){
                contentConf['max-results'] = args['max-results'];
            }

            //http://gdata.youtube.com/feeds/api/videos?&v=2&alt=json&max-results=24&format=5&lr=fr&time=all_time&category=Comedy
            //http://gdata.youtube.com/feeds/api/videos?&v=2&alt=json&max-results=4&format=5&lr=fr&time=all_time&category=Sports&start-index=25
            xhr(this.url || this.defaultUrl,{
                method:'get',
                handleAs:'json',
                content:contentConf,
                onload:function(data){

                    deferred.resolve({
                        items:data.feed.entry.map(function(entry){
                            return {
                                thumbnail:entry.media$group.media$thumbnail[1].url,
                                title:entry.title.$t,
                                id:entry.id.$t,
                                videoId:entry.media$group.yt$videoid.$t,
                                entry:entry
                            };
                        }),
                        totalResults:data.feed.openSearch$totalResults.$t
                    });
                }
            });
            return deferred;
        }
    });
    return VodMenu;
});