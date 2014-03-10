define(function () {
    "use strict";
    var glb = typeof(window) === 'undefined'?global:window;
    if (typeof(XMLHttpRequest) !== 'undefined'
        && !XMLHttpRequest.prototype.sendAsBinary && 'Uint8Array' in glb) {
        XMLHttpRequest.prototype.sendAsBinary = function (sData) {
            var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
            for (var nIdx = 0; nIdx < nBytes; nIdx++) {
                ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
            }
            /* send as ArrayBufferView...: */
            return this.send(ui8Data);
            /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
        };
    }
});