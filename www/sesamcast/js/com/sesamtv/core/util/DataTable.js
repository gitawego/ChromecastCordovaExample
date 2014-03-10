define(function () {
    /**
     * create a multi-dimension array data table
     *
     *      //define a multi-dimension table with header
     *      var d = new DataTable({data:[['firstName','lastName','age'],['paul','dufour',34],['jean-micheal','lechat',40]],header:true});
     *      d.get(0); //should return {firstName:'paul','lastName':'dufour','age':34}
     *      //define a normal multi-dimension table
     *      var d = new DataTable();
     *      d.set(0,0,'plugin1').set(0,1,'plugin2').set(1,1,'plugin3').set(2,1,'plugin4').set(2,2,'plugin5').set(0,3,'state2');
     *      d.get(0);//should return ["plugin1", "plugin2", undefined × 1, "state2"]
     *      d.get(0,2); //should return undefined
     *      //to get closest value
     *      d.get(0,2,true); //should return 'plugin2'
     *      d.get(2,0,true);// should return 'plugin1'
     *
     * @class com.sesamtv.core.util.DataTable
     * @cfg {Object} [config]
     * @cfg {Array} config.data
     * @cfg {Array|Boolean} [config.header]
     */
    function DataTable(config) {
        config = config || {};
        /**
         * @property source
         * @type {Array}
         */
        this.source = [];
        this.map = {};
        if (config.data) {
            this.source = config.data;
        }
        if ('header' in config) {
            this.setHeader(config.header);
        }
    }

    DataTable.prototype = {
        constructor: DataTable,
        /**
         * if has header, action is always replace
         * @method set
         * @param {Number} i index of y dimension
         * @param {Number} j index of x dimension
         * @param {String} e value to be set
         * @param {String} [action='replace'] 3 actions: replace, before, after
         * @param {Array.<Array>} [source]
         */
        set: function (i, j, e, action, source) {
            this.map[e] = [i, j];
            if (!source) {
                source = this.source;
            }
            if (this.header) {
                i++;
                action = 'replace';
            }
            action = action || 'replace';
            var o;
            if (!( o = source[i] )) {
                o = source[i] = [];
            }
            if (j in o && action !== 'replace') {
                o.splice(action === 'before' ? j : j + 1, 0, e);
            } else {
                o[j] = e;
            }
            return source;
        },
        /**
         * if header is an array, add it as source's header
         * @method setHeader
         * @param {Array|Boolean} header
         */
        setHeader: function (header) {
            if (header instanceof Array) {
                if (this.header) {
                    throw new Error('header has already set');
                }
                this.source.unshift(header);
                this.header = header;
            } else {
                if (header === false) {
                    if (this.header instanceof Array) {
                        this.source.shift();
                    }
                }
                this.header = header !== false;
            }
            return this;
        },
        inRange: function (i, j) {
            var source = this.source.slice(0), size;
            if (this.header) {
                source.shift();
            }
            size = this.size(source);
            return !(i > size.y - 1 || i < 0 || j > size.x - 1 || j < 0);
        },
        /**
         * get a source map with filled gaps
         * @method getFilledSource
         * @returns {Array}
         */
        getFilledSource: function () {
            var source = JSON.parse(JSON.stringify(this.source)),
                size, item, prevItem, i, j, prevItemFirst;
            if (this.header) {
                source.shift();
            }
            size = this.size(source);
            for (j = 0; j < size.x; j++) {
                prevItemFirst = false;
                for (i = 0; i < size.y; i++) {
                    if (item = this.get(i, j)) {
                        prevItem = item;
                        prevItemFirst = i === 0;
                    } else {
                        source[i] = source[i] || [];
                        source[i][j] = prevItemFirst ? (prevItem || this.get(i, j - 1)) : (this.get(i, j - 1) || prevItem);
                    }
                }
            }
            return source;
        },
        /**
         * @method get
         * @param {Number} i index of y dimension
         * @param {Number} [j] index of x dimension
         * @param {Boolean} [closest] get closest item if not found
         * @returns {*|{key:String,value:*}}
         */
        get: function (i, j, closest) {
            var source = closest ? this.getFilledSource() : this.source,
                header = this.header ? source.shift() : null,
                o = source[i],
                e, res;
            if (!this.inRange(i, j)) {
                return undefined;
            }
            if (arguments.length === 1) {
                if (this.header && o instanceof Array) {
                    res = {};
                    header.forEach(function (k, idx) {
                        res[k] = o[idx];
                    });
                    return res;
                }
                return o;
            }

            if (o && j in o) {
                e = o[j];
            }

            if (this.header) {
                res = {
                    key: header[0][j]
                };
                res.value = e;
                return res;
            }
            return e;
        },
        /**
         * @method getAll
         * @returns {Array}
         */
        getAll: function () {
            if (!this.header) {
                return this.source;
            }
            var res = [], i = 1, l = this.source.length;
            for (; i < l; i++) {
                res.push(this.get(i - 1));
            }
            return res;
        },
        /**
         * get data dimension
         * @method size
         * @param {Array} source
         * @returns {{x: Number, y: Number}}
         */
        size: function (source) {
            source = source || this.source;
            if (this.header) {
                return {
                    x: source[0].length,
                    y: source.length - 1
                };
            }
            var s = {
                x: 0,
                y: source.length
            }, len = source[0].length, i = 1, l;

            for (; i < s.y; i++) {
                l = source[i].length;
                if (l > len) {
                    len = l;
                }
            }
            s.x = len;

            return s;
        },
        /**
         * @method remove
         * @param {Number} i
         * @param {Number} [j]
         * @returns {*}
         */
        remove: function (i, j) {
            if (arguments.length === 1) {
                return this.source.splice(i, 1);
            }
            var o = this.source[i];
            if (o && j in o) {
                return o.splice(j, 1);
            }
        }
    };
    return DataTable;
});