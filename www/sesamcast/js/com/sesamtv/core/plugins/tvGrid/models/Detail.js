define([
    '../../../util/Class',
    '../../../util/Promise',
    '../../../util/XHR',
    '../../../engine/Topic',
    '../../../abstract/plugin/BaseModel',
    '../../../util/Helper',
    '../../../util/KeyboardNavigation'
], function (Class, Promise, xhr, topic, BaseModel, helper,KeyboardNavigation) {
    'use strict';
    var VodDetail = Class({
        extend: BaseModel,
        constructor: function VodDetail(binder, plugin) {
            BaseModel.call(this, binder, plugin);
            this.kbNav = new KeyboardNavigation(Class.mixin({
                plugin:this.plugin
            },this.plugin.config.keyboardNavigation), binder.root);
        },
        init: function () {

        },
        trigger: function (videoId, binderId,itemData) {
            this.kbNav.emit('selected');
            this.kbNav.setConfig('disabled',false);
            var grid = this.plugin.binders[binderId].getModel('videos').grid,
                data = grid.config.data,
                videoIndex = this.plugin.getConfig('currentItemIndex');
            console.log(grid, videoId, binderId);
            if(!itemData){
                data.items.some(function (item,i) {
                    if (item.id === videoId) {
                        itemData = item;
                        videoIndex = i;
                        return true;
                    }
                });
            }

            if (!itemData) {
                return;
            }
            this.binder.set({
                title: itemData.title,
                desc: itemData.entry['media$group']['media$description']['$t'],
                img: itemData.entry['media$group']['media$thumbnail'][3].url,
                duration: (itemData.entry['media$group']['yt$duration'].seconds/60).toFixed(2)+' min',
                year: (new Date(itemData.entry['media$group']['yt$uploaded']['$t'])).getFullYear(),
                videoId:itemData.entry['media$group']['yt$videoid']['$t']
            });
            this.binder.getModel('suggestions').update(itemData.entry['media$group']['yt$videoid']['$t']);
            itemData.entry['gd$rating'] && this.averageRating(Math.round(itemData.entry['gd$rating'].average));
            this.updatePageNav(videoIndex,data.items);
        },
        playVideoOnClick:function(evt,opt){
            console.log('play video',arguments);
            this.plugin.playVideoOnClick({
                target:evt.target
            });
        },
        averageRating:function(rating){
            var rates = this.binder.root.querySelector('div[data-rating-for="spectateurs"]'),
            ratedNode = rates.getElementsByClassName('rated')[0];
            if(ratedNode){
                ratedNode.classList.remove('rated');
            }
            rates.classList.add('rated');
            rates.children[rating-1].classList.add('rated');

        },
        updatePageNav:function(videoIndex,items){
            var leftArrow = this.binder.root.getElementsByClassName('leftArrow')[0],
                rightArrow = this.binder.root.getElementsByClassName('rightArrow')[0],
                total = this.binder.root.querySelectorAll('.arrowInner .total'),itemsLen = items.length,
                i= 0,l;
            for(l=total.length;i<l;i++){
                total[i].innerHTML = itemsLen;
            }
            if(videoIndex === 0){
                leftArrow.style.visibility = 'hidden';
            }else{
                leftArrow.style.visibility = '';
                leftArrow.firstElementChild.firstElementChild.innerHTML = videoIndex;
            }
            if(videoIndex === itemsLen-1){
                rightArrow.style.visibility = 'hidden';
            }else{
                rightArrow.style.visibility = '';
                rightArrow.firstElementChild.firstElementChild.innerHTML = videoIndex+2;
            }

        },
        select:function(){

        },
        rating:function(){

        },
        backToHome:function(){
          this.plugin.backToMosaic();
        },
        showOption: function () {
            console.log('showOption', arguments);
        },
        rateIt: function () {
            console.log('rateIt', arguments);
        },
        showNextItemDetail:function(){
            return this.plugin.showNextItemDetail();
        },
        showPrevItemDetail:function(){
            return this.plugin.showPrevItemDetail();
        },
        title: "title",
        year: 2013,
        duration: "1h45",
        desc: "",
        age: "age10",
        img: "",
        type: "Action",
        options: [
            {
                label: "LOUER",
                id: "rend"
            },
            {
                label: "LIRE LA BANDE ANNONCE",
                id: "trailer"
            },
            {
                label: "DISPONIBLE EN PACK",
                id: "pack"
            },
            {
                label: "AJOUTER AUX FAVORIS",
                id: "favorite"
            }
        ],
        format: ["hd"],
        languages: ["vm", "vf", "ad"],
        suggestions:function(videoId){
            console.log('suggestions',videoId);
            var deferred = Promise(), self = this, conf = {
                v:2,
                alt:'json'
            };
            conf['max-results'] = 5;
            //https://gdata.youtube.com/feeds/api/videos/S16zROXa0TI/related?v=2&alt=json&max-results=5
            if(!videoId){
                return [{
                    "thumbnail":""
                }];
            }
            xhr('https://gdata.youtube.com/feeds/api/videos/'+videoId+'/related',{
                method:'get',
                handleAs:'json',
                content:conf,
                onload:function(data){
                    deferred.resolve(data.feed.entry.map(function(entry){
                        return {
                            thumbnail:entry['media$group']['media$thumbnail'][1].url,
                            title:entry.title['$t'],
                            id:entry.id['$t'],
                            videoId:entry['media$group']['yt$videoid']['$t'],
                            entry:entry
                        }
                    }));
                }
            });
            return deferred;
        }
        /*suggestions: [
            {
                "img": ""
            }
        ]*/
    });
    return VodDetail;
});