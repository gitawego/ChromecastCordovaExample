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
        addScript([
            'bower_components/requirejs/require.js',
            'js/app/config.js',
            'js/app/main.js'
        ]);
        navigator.screenOrientation.set('landscape');
    }, false);
})();

