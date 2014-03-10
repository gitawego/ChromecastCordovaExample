/**
 * @class com.sesamtv.core.util.RegEx
 * @singleton
 */
define({
    "cssUrl": /url\(['"](.*?)['"]\)|url\((.*?)\)/gi,
    "cssPaths": /(?:(?:@import\s*(['"])(?![a-z]+:|\/)([^\r\n;{]+?)\1)|url\(\s*(['"]?)(?![a-z]+:|\/)([^\r\n;]+?)\3\s*\))([a-z, \s]*[;}]?)/g,
    "styleTag": /(?:<style([^>]*)>([\s\S]*?)<\/style>)/gi,
    "linkTag": /(?:<link\b[^<>]*?)(href\s*=\s*(['"])(?:(?!\2).)+\2)+[^>]*>/gi,
    "scriptTag": /<script\s*(?![^>]*type=['"]?(?:dojo\/|text\/html\b))(?:[^>]*?(?:src=(['"]?)([^>]*?)\1[^>]*)?)*>([\s\S]*?)<\/script>/gi,
    "bodyTag": /<body\s*[^>]*>([\S\s]*?)<\/body>/i,
    "htmlLink": /(<[a-z][a-z0-9]*\s[^>]*)(?:(href|src)=(['"]?)([^>]*?)\3)([^>]*>)/gi,
    "htmlComment": /<!--([\S\s]*?)-->/gi,
    "blockComment": /\/\*([\S\s]*?)\*\//gi,
    "inlineComment": /\/\/.*/g,
    "removeAmdefine": /(if[\s\S]\(([\S\s]*)require\(['"]amdefine['"]([\s\S]*?)(\}))|(if\(([\S\s]*)require\(['"]amdefine['"]([\s\S]*?);)/i,
    //match for http://, https:// or /
    "fullUrl": /(^http(s:|:)\/\/)|(^\/)/i,
    //match a datauri in html tags like img,link
    "dataUri": /(data:([a-z]*)\/([a-z]*)[;,])/gi,
    //match special url "about:", "opera:"
    "aboutPage": /^[a-z].*?:[^\s]([a-z]*)/i,
    "cssImport": /@import\s+url\(['"](.*?)['"]\);/gi,
    "normalChars": /([^\x00-\xff]|[A-Za-z0-9_.-])/gi,
    "ip": /((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)(:\d{1,6}|)$/,
    "email":/^[-\w\._\+%]+@(?:[\w-]+\.)+[\w]{2,6}$/,
    "number":/^[\d]{1,}$/,
    'anyNumber':/^\d+\.?\d*$/
});