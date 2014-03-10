define([
    './JsonSchema',
    './CustomError'
], function (jsonSchema, CustomError) {
    'use strict';
    var errors = {
        ERROR_INVALID_XML: 'XML Invalid',
        ERROR_INVALID_SCHEMA: 'JSON Schema Invalid',
        ERROR_UNHANDLED_NODE_TYPE: 'unhandled node type: %o'
    }, Invalid = CustomError({
        name: 'XML ERROR',
        errors: errors
    }), X = {
        toObj: function (xml) {
            var type = 'nodeType' + xml.nodeType;
            if (type in X) {
                return X[type](xml);
            } else {
                throw new Invalid('ERROR_UNHANDLED_NODE_TYPE', xml.nodeType);
            }
        },
        nodeType9: function (xml) {
            return X.toObj(xml.documentElement);
        },
        nodeType1: function (xml) {
            var o = {};
            if (xml.attributes.length) {
                // element with attributes  ..
                for (var i = 0; i < xml.attributes.length; i++) {
                    o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();
                }
            }
            o = X.parseChildren(xml, o);
            if (!xml.attributes.length && !xml.firstChild) {
                o = null;
            }
            return o;
        },
        parseChildren: function (xml, o) {
            if (!xml.firstChild) {
                return o;
            }
            // element has child nodes ..
            var textChild = 0, cdataChild = 0, hasElementChild = false;
            for (var n = xml.firstChild; n; n = n.nextSibling) {
                if (n.nodeType === 1) {
                    hasElementChild = true;
                }
                if (n.nodeType === 4) {
                    cdataChild++; // cdata section node
                }
                if (n.nodeType === 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
                    textChild++; // non-whitespace text
                }
            }
            if (hasElementChild) {
                if (textChild < 2 && cdataChild < 2) {
                    // structured element with evtl. a single text or/and cdata node ..
                    X.removeWhite(xml);
                    for (var n = xml.firstChild; n; n = n.nextSibling) {
                        if (n.nodeType == 3) {
                            // text node
                            o["#text"] = X.escape(n.nodeValue);
                        }
                        else if (n.nodeType == 4) {
                            // cdata node
                            o["#cdata"] = X.escape(n.nodeValue);
                        }
                        else if (o[n.nodeName]) {
                            // multiple occurence of element ..
                            if (o[n.nodeName] instanceof Array) {
                                o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
                            }
                            else {
                                o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                            }
                        }
                        else {
                            // first occurence of element..
                            o[n.nodeName] = X.toObj(n);
                        }
                    }
                }
                else { // mixed content
                    if (!xml.attributes.length) {
                        o = X.escape(X.innerXml(xml));
                    }
                    else {
                        o["#text"] = X.escape(X.innerXml(xml));
                    }
                }
            }
            else if (textChild) { // pure text
                if (!xml.attributes.length) {
                    o = X.escape(X.innerXml(xml));
                }
                else {
                    o["#text"] = X.escape(X.innerXml(xml));
                }
            }
            else if (cdataChild) { // cdata
                if (cdataChild > 1) {
                    o = X.escape(X.innerXml(xml));
                }
                else {
                    for (var n = xml.firstChild; n; n = n.nextSibling) {
                        o["#cdata"] = X.escape(n.nodeValue);
                    }
                }
            }
            return o;
        },
        innerXml: function (node) {
            var s = "", asXml;
            if ("innerHTML" in node) {
                return node.innerHTML;
            }
            asXml = function (n) {
                var s = "";
                if (n.nodeType == 1) {
                    s += "<" + n.nodeName;
                    for (var i = 0; i < n.attributes.length; i++)
                        s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                    if (n.firstChild) {
                        s += ">";
                        for (var c = n.firstChild; c; c = c.nextSibling)
                            s += asXml(c);
                        s += "</" + n.nodeName + ">";
                    }
                    else
                        s += "/>";
                }
                else if (n.nodeType == 3) {
                    s += n.nodeValue;
                }
                else if (n.nodeType == 4) {
                    s += "<![CDATA[" + n.nodeValue + "]]>";
                }
                return s;
            };
            for (var c = node.firstChild; c; c = c.nextSibling) {
                s += asXml(c);
            }
            return s;
        },
        escape: function (txt) {
            return txt.replace(/[\\]/g, "\\\\")
                .replace(/[\"]/g, '\\"')
                .replace(/[\n]/g, '\\n')
                .replace(/[\r]/g, '\\r');
        },
        removeWhite: function (e) {
            var nxt;
            e.normalize();
            for (var n = e.firstChild; n;) {
                if (n.nodeType == 3) {  // text node
                    if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) { // pure whitespace text node
                        nxt = n.nextSibling;
                        e.removeChild(n);
                        n = nxt;
                    } else {
                        n = n.nextSibling;
                    }
                }
                else if (n.nodeType == 1) {  // element node
                    X.removeWhite(n);
                    n = n.nextSibling;
                }
                else {
                    // any other node
                    n = n.nextSibling;
                }

            }
            return e;
        }
    };

    function toXml(v, name, ind, isCDATA) {
        var xml = "";
        if (v instanceof Array) {
            for (var i = 0, n = v.length; i < n; i++) {
                xml += ind + toXml(v[i], name, ind + "\t", isCDATA) + "\n";
            }
        }
        else if (typeof(v) == "object") {
            var hasChild = false;
            xml += ind + "<" + name;
            for (var m in v) {
                if (m.charAt(0) == "@") {
                    xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
                }
                else {
                    hasChild = true;
                }
            }
            xml += hasChild ? ">" : "/>";
            if (hasChild) {
                for (var m in v) {
                    if (m == "#text") {
                        xml += v[m];
                    }
                    else if (m == "#cdata") {
                        xml += "<![CDATA[" + v[m] + "]]>";
                    }
                    else if (m.charAt(0) != "@") {
                        xml += toXml(v[m], m, ind + "\t", isCDATA);
                    }
                }
                xml += (xml.charAt(xml.length - 1) == "\n" ? ind : "") + "</" + name + ">";
            }
        }
        else {
            xml += ind + "<" + name + ">";
            xml += isCDATA ? "<![CDATA[" + v.toString() + "]]>" : v.toString();
            xml += "</" + name + ">";
            //xml += ind + "<" + name + "><![CDATA[" + v.toString() + "]]></" + name + ">";
        }
        return xml;
    }

    /**
     * xml/json converter, it contains json schema validator as well
     *
     *      var tool = xml.jsonSchema(schema);//it creates a new instance
     *      tool.toJson(xml); // this will trigger validator
     *      //or you can use the converter without schema
     *      xml.toJson(xml);
     *
     * @class com.sesamtv.core.util.XML
     * @requires com.sesamtv.core.util.JsonSchema
     * @requires com.sesamtv.core.util.CustomError
     * @singleton
     */
    var XML = {
        Invalid: Invalid,
        /**
         * @method toJson
         * @param {HTMLDocument|String} xml
         * @param {Boolean} [doNotThrowError]
         * @return {Object|Boolean}
         */
        toJson: function xml2json(xml, doNotThrowError) {
            var res = {}, err;
            if (typeof(xml) == 'string') {
                xml = this.fromString(xml);
            }
            if (!this.validateXMLFormat(xml)) {
                err = new Invalid('ERROR_INVALID_XML');
                !doNotThrowError && err.raise();
                return false;
            }
            if (xml.nodeType == 9) {
                xml = xml.documentElement;
            }
            res[xml.nodeName] = X.toObj(X.removeWhite(xml));
            var validate;
            if (this.schema && (validate = this.validateSchema(res)) && !validate.valid) {
                err = new Invalid('ERROR_INVALID_SCHEMA').moreDetail({
                    validation: validate
                });
                !doNotThrowError && err.raise();
                return err;
            }
            return res;
        },
        /**
         * @method validateXMLFormat
         * @param {String|HTMLDocument} xml
         * @returns {boolean}
         */
        validateXMLFormat: function (xml) {
            if (typeof(xml) == 'string') {
                xml = this.fromString(xml);
            }
            return !xml.getElementsByTagName('parsererror').length;
        },
        /**
         * @method validateSchema
         * @param {Object} data
         * @returns {Boolean}
         */
        validateSchema: function (data) {
            return jsonSchema.validateResult(data, this.schema);
        },
        /**
         * @method toString
         * @param {HTMLDocument} xml
         * @returns {String}
         */
        toString: function (xml) {
            return new XMLSerializer().serializeToString(xml);
        },
        /**
         * @method fromString
         * @param {String} xml
         * @returns {HTMLDocument}
         */
        fromString: function (xml) {
            return new DOMParser().parseFromString(xml, 'text/xml');
        },
        /**
         * @method fromJson
         * @param {Object} o
         * @param {Boolean} [isCDATA]
         * @param {Boolean} [doNotThrowError]
         * @return {String|Boolean} xml string
         */
        fromJson: function json2xml(o, isCDATA, doNotThrowError) {
            var validate, xml = '';
            if (this.schema && (validate = this.validateSchema(o)) && !validate.valid) {
                var err = new Invalid('ERROR_INVALID_SCHEMA').moreDetail({
                    validation: validate
                });
                !doNotThrowError && err.raise();
                return err;
            }
            for (var m in o) {
                xml += toXml(o[m], m, "",isCDATA);
            }
            xml = xml.replace(/\t|\n/g, "");
            return xml;
        },
        jsonSchema: function (schema) {
            var xml = Object.create(this);
            xml.schema = schema;
            return xml;
        }
    };
    return XML;
});