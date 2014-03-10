define([
    '../has'
], function (has) {
    if (has('dom')) {
        var inputEl = document.createElement("input"),
            isNativeFunc = function isNativeFunc(f) {
                return !!f && (typeof f).toLowerCase() == 'function'
                    && (f === Function.prototype
                    || /^\s*function\s*(\b[a-z$_][a-z0-9$_]*\b)*\s*\((|([a-z$_][a-z0-9$_]*)(\s*,[a-z$_][a-z0-9$_]*)*)\)\s*{\s*\[native code\]\s*}\s*$/i.test(String(f)));
            },
            inputTypes = ["color", "date", "datetime", "datetime-local", "email", "month",
                "number", "range", "search", "tel", "time", "url", "week"],
            inputAttrs = ['autocomplete','autofocus','form','formaction','formenctype','formmethod',
            'formnovalidate','formtarget','list','max','maxlength','min','multiple','pattern',
            'placeholder','required','step'],i= 0,l;
        for(l=inputAttrs.length;i<l;i++){
            has.add('input-'+inputAttrs[i],inputAttrs[i] in inputEl);
        }
        has.add('touch','ontouchstart' in window || 'onmsgesturechange' in window);
        has.add('microdata', !!document.getItems);
        has.add('history', !!(window.history && history.pushState));
        has.add('geolocation', 'geolocation' in navigator);
        has.add('webworker', 'Worker' in window && isNativeFunc(window.Worker));
        has.add('audio',(function(){
            var a = document.createElement('audio');
            return !!(a.canPlayType && !!a.canPlayType('audio/ogg; codecs=vorbis'));
        })());
        inputTypes.forEach(function (type) {
            inputEl.setAttribute("type", type);
            has.add('input-type-' + type, inputEl.type === type);
        });
        inputEl = null;
    }
    return has;
});