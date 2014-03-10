/**
 * Created by hongbo on 12/11/13.
 */
define([
    '../util/Class',
    '../util/BaseEvented',
    './uicompositor/Module',
    '../util/Helper'
], function (Class, BaseEvented, Module, helper) {
    var moduleInst = {};
    var UICompositor = Class({
        statics: {
            define: function (opt) {
                opt.config = opt.config || {};
                return function (params) {
                    var p = helper.deepClone(opt);
                    p.config = Class.applyIf(p.config, {
                        id: 'ui_' + (new Date()) % 1e9
                    });
                    if (params) {
                        p = helper.merge(p, params);
                    }
                    var inst = new Module(p);
                    return moduleInst[inst.config.id] = inst;
                }
            },
            create: function (modules) {
                function UI(layout) {
                    return new UICompositor(layout, modules);
                }

                UI.define = function (name, opt) {
                    if (name in modules) {
                        throw new Error('module name conflict ' + name);
                    }
                    modules[name] = opt;
                };
                return UI;
            },
            byId: function (id) {
                return moduleInst[id];
            }
        },
        extend: BaseEvented,
        constructor: function UICompositor(layout, modules) {
            BaseEvented.call(this);
            this.config = {
                layout: null,
                modules: {},
                instances: {}
            };
            layout && this.setLayout(layout);
            if (modules) {
                Object.keys(modules).forEach(function (name) {
                    this.define(name, modules[name]);
                }, this);
            }
        },
        setLayout: function (layout) {
            this.setConfig('layout', helper.deepClone(layout));
            this.config.originalLayout = layout;
        },
        define: function (name, opt) {
            if (name in this.config.modules) {
                throw new Error('module name conflict ' + name);
            }
            return this.config.modules[name] = UICompositor.define(opt);
        },
        render: function (target) {
            var layout = this.config.layout,
                self = this,
                render = function (config) {
                    var children = config.children,
                        module = config.module,
                        events = config.events, mainLayout, instConfig;
                    delete config.children;
                    delete config.module;
                    delete config.events;
                    if (!self.config.modules[module]) {
                        throw new Error('module ' + module + ' not found');
                    }
                    instConfig = {
                        config: {
                            id: config.id
                        }
                    };
                    if (config.config) {
                        instConfig.config = helper.merge(instConfig.config, config.config);
                    }
                    mainLayout = self.config.instances[config.id] = new self.config.modules[module](instConfig);
                    children && children.forEach(function (child) {
                        mainLayout.add(render(child), child.options);
                    }, this);
                    events && self.parseEvents(events);
                    return mainLayout;
                };
            target = target || layout.placeAt;
            if (target) {
                return render(layout).render(typeof(target) === 'string' ? document.querySelector(target) : target);
            } else {
                return render(layout).render();
            }
        },
        parseEvents: function (evts) {
            var self = this,
                regxp = /(.*?)\/(.*)/,
                evt, evtConf, inst, evtName, target, method;
            for (evt in evts) {
                evtConf = evts[evt];
                if (!evts.hasOwnProperty(evt)) {
                    continue;
                }
                evt.replace(regxp, function (ignore, i, n) {
                    inst = i;
                    evtName = n;
                });
                evtConf.method.replace(regxp, function (ignore, t, m) {
                    target = t;
                    method = m;
                });
                if (!inst || !evtName || !target || !method) {
                    continue;
                }
                this.config.instances[inst].on(evtName, function (evt) {
                    if (evtConf.params) {
                        if (typeof(evtConf.params) === 'string') {
                            evtConf.params = (new Function('config', 'return ' + evtConf.params + ';'))(self.config);
                        }
                        self.config.instances[target][method](evtConf.params, evt);
                    } else {
                        self.config.instances[target][method](evt);
                    }
                });
            }
        }
    });
    return UICompositor;
});