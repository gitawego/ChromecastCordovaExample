(function () {
    function addScript(urls) {
        var load = function(url){
            var script = document.createElement('script');
            script.src = url;
            script.type = "text/javascript";
            script.onload = function () {
                if(urls.length){
                    load(urls.shift());
                }
            };
            document.body.appendChild(script);
        };
        load(urls.shift());
    }

    document.addEventListener('deviceready', function () {
        console.log('deviceready');
        addScript([
            'sesamcast/bower_components/requirejs/require.js',
            './config.js',
            'sesamcast/js/sesamcast/main.js'
        ]);
        //navigator.screenOrientation.set('landscape');
    }, false);
})();

