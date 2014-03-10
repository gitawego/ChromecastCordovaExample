define(function () {
    var defProp = Object.defineProperty;

    /**
     * basic method for class declaration.
     *
     * Tip: How to define a named class
     *
     *      var MyClass = Class({
     *          constructor:function MyClass(){
     *
     *          }
     *      });
     *
     * Tip: How to define private methods and variables (use JS native behaviour)
     *
     *      var MyClass = Class({
     *          constructor:function(){
     *              var v1 = 1,
     *              v2 = 'anotherPrivateVariable',
     *              m1 = function(){
     *                  console.log('I am private');
     *              };
     *              //define public methods who need to access the private method or variable in constructor
     *              this.getInfo = function(){
     *                  return v1+': '+v2;
     *              };
     *          },
     *          //define other public methods outside of constructor
     *          anotherFnc:function(){
     *              console.log('another public method');
     *          }
     *      });
     *
     * Tip: How to define methods and variables shared  to all the class instances (use JS native behaviour)
     *
     *      var MyClass = Class((function(){
     *          var devices = {
     *              communicationGUID:''
     *          };
     *          return {
     *              constructor:function(id){
     *                  this.id = id;
     *              },
     *              setGUID:function(){
     *                 devices.communicationGUID = '3F2504E0-4F89-11D3-9A0C-0305E82C3301';
     *              },
     *              toString:function(){
     *                  return this.id+' has shared communication GUID: '+devices.communicationGUID;
     *              }
     *          };
     *      })());
     *      var c1 = new MyClass('c1');
     *      var c2 = new MyClass('c2');
     *      c1.setGUID();
     *      c2.toString(); //c2 has shared communication GUID: 3F2504E0-4F89-11D3-9A0C-0305E82C3301;
     *
     * @class com.sesamtv.core.util.Class
     * @static
     * @cfg {Object} params
     * @cfg {Object} [params.mixin] object to be mixed in
     * @cfg {Object.<String,Function>} [params.statics] static methods
     * @cfg {Function} [params.extend] extend from this class
     * @cfg {Boolean} [params.singleton]
     * @cfg {Function} [params.constructor]
     */
    function Class(params) {
        var extend = params.extend,
            toMixin = params.mixin,
            statics = params.statics,
            Constructor = Object.hasOwnProperty.call(params, 'constructor') ?
                params.constructor :
                function Class() {
                };
        delete params.constructor;
        delete params.extend;
        delete params.mixin;
        delete params.statics;
        if (params.singleton === true) {
            delete params.singleton;
            var OriginalConstruct = Constructor, _singletonInstance;
            Constructor = function Singleton() {
                if (!_singletonInstance) {
                    OriginalConstruct.apply(this, arguments);
                    _singletonInstance = this;
                } else if (this instanceof Constructor) {
                    throw new Error('a singleton class can be only instantiated once');
                }
            };
            Constructor.getInstance = function () {
                return _singletonInstance;
            };
        }
        if (extend) {
            Constructor.prototype = Object.create(extend.prototype);
        }
        mixin(Constructor.prototype, params);

        toMixin && mixin(Constructor.prototype, toMixin);
        if (statics) {
            if (defProp) {
                defineProperty(Constructor, statics);
            } else {
                mixin(Constructor, statics);
            }
        }

        Constructor.prototype.constructor = Constructor;
        Constructor.$parent = extend;
        return Constructor;
    }

    /**
     * add abstract methods to class
     * @method addAbstract
     * @static
     * @param {Function} Kls a class function
     * @param {Array.<String>} methods
     */
    Class.addAbstract = function addAbstract(Kls, methods) {
        methods.forEach(function (m) {
            Kls.prototype[m] = function () {
                throw new Error('Unimplemented method: ' + m);
            };
        });
    };
    /**
     * @method mixin
     * @static
     * @param {Object} dest
     * @param {Object} source
     * @returns {Object}
     */
    function mixin(dest, source) {
        var name, s, empty = {};
        for (name in source) {
            s = source[name];
            if (!(name in dest) ||
                (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
                dest[name] = s;
            }
        }
        return dest;
    }

    function applyIf(dest, source) {
        var name;
        for (name in source) {
            if (!(name in dest)) {
                dest[name] = source[name];
            }
        }
        return dest;
    }

    function defineProperty(scope, props) {
        var keys = Object.keys(props), i = 0, l = keys.length;
        for (; i < l; i++) {
            defProp(scope, keys[i], {
                enumerable: false,
                value: props[keys[i]]
            });
        }
    }

    Class.mixin = mixin;
    Class.applyIf = applyIf;
    return Class;
});