/*global require*/
require.config({
    baseUrl: './js',
    paths: {
        "text": '../bower_components/requirejs-text/text',
        "domReady": '../bower_components/requirejs-domready/domReady',
        'assets':'../assets',
        "bower_components":"../bower_components",
        "app":"./sesamcast",
        "IScroll":"bower_components/iscroll/build/iscroll-infinite"
    },
    shim:{
        "IScroll":{
            exports:"IScroll"
        }
    }
});