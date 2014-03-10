define([
    '../util/Class',
    '../util/BaseEvented'
], function (Class, BaseEvented) {
    var slice = Array.prototype.slice, undef = {}.undef;
    /**
     *
     * basic task manager
     *
     * notice: call is faster than apply, see (apply vs call vs conditional switch)[http://jsperf.com/apply-vs-call-vs-switch-call]
     *
     * @class com.sesamtv.core.engine.TaskManager
     * @constructor
     * @param {Array} tasks
     * @param {Function} done callback when tasks are done
     * @param {Object} [options]
     * @param {Object} options.scope scope of callback
     * @param {Number} options.delay delay time between each task
     * @param {Boolean} options.async if in async mode
     */

    return Class({
        extend:BaseEvented,
        constructor: function (tasks, done, options) {
            BaseEvented.call(this);
            this.queue = [];
            this.tasks = tasks.map(this.addTask, this);
            this.done = done || function () {
            };
            this.options = {

            };
            options && Class.mixin(this.options, options);
            this.runner = null;
        },
        /**
         * empty both queue and tasks
         * @method purgeTasks
         */
        purgeTasks: function () {
            this.queue.length = 0;
            this.tasks.length = 0;
        },
        /**
         * @method addTask
         * @param {Function|Object} task
         * @param {Number} [idx]
         * @return {Object}
         */
        addTask: function (task, idx) {
            var obj = {};
            if (typeof(task) === 'function') {
                obj.task = task;
                obj.id = '#Task: ' + (new Date()).getTime() + Math.floor(Math.random() * 100);
            } else {
                obj = task;
            }
            this.queue.push(obj.id);
            if (typeof(idx) !== 'number') {
                this.tasks.push(obj);
            }
            return obj;
        },
        removeTask: function (id) {
            this.tasks.splice(this.tasks.indexOf(this.getTaskById(id)), 1);
            return this;
        },
        removeTaskQueue: function (id) {
            this.queue.splice(this.queue.indexOf(id), 1);
            return this;
        },
        /**
         * @method getTaskById
         * @param {String} id
         * @return {Object}
         */
        getTaskById: function (id) {
            var task, i = 0, l = this.tasks.length;
            for (; i < l; i++) {
                if (this.tasks[i].id === id) {
                    task = this.tasks[i];
                    break;
                }
            }
            return task;
        },
        run: function (mode) {
            this.runner = this[mode || this.options.async ? 'async' : 'sync']().run();
            return this.runner;
        },
        pause: function () {
            return this.runner.pause();
        },
        resume: function () {
            return this.runner.resume();
        },
        cancel: function () {
            return this.runner.cancel();
        },
        /**
         * run tasks in sync mode
         * @method sync
         * @return {Object}
         */
        sync: function () {
            var self = this,
                cancelled = false, pause = false, waiting = null, waitingParams = null, delayHandler,
                current, currentHandler, pauseArgs,
                next = function (continueNext, paramFromPrevTask) {
                    var error = continueNext instanceof Error ? continueNext : null,
                        currentStep = {
                            total: self.tasks.length,
                            current: self.tasks.length - self.queue.length,
                            cancelled: cancelled,
                            params: paramFromPrevTask,
                            error: error
                        };
                    if (next.info.called) {
                        return;
                    }
                    if (!error) {
                        continueNext = "boolean" == typeof(continueNext) ? continueNext : true;
                    }
                    if (pause) {
                        return pauseArgs = slice.call(arguments);
                    } else {
                        pauseArgs = null;
                    }
                    if (cancelled || error || !continueNext) {
                        delete self.runner;
                        return self.done.call(self.options.scope, currentStep);
                    }
                    if (self.queue.length === 0) {
                        delete self.runner;
                        return self.done.call(self.options.scope, null, paramFromPrevTask);
                    }

                    if ('delay' in self.options) {
                        delayHandler = setTimeout(function () {
                            run(paramFromPrevTask);
                        }, self.options.delay);
                    } else {
                        run(paramFromPrevTask)
                    }


                }, run = function (params) {
                    delete next.params;
                    if (!self.queue.length) {
                        throw new Error("empty task list");
                    }
                    current = self.getTaskById(self.queue.shift()).task;
                    next.info = {
                        total: self.tasks.length,
                        from: self.tasks.length - self.queue.length - 1
                    };
                    currentHandler = current.call(self.options.scope, next, params);
                };
            next.$ = this;
            next.wait = function (params) {
                waitingParams = params;
                params.delay = params.delay || 0;
                if (params.condition()) {
                    waitingParams = null;
                    waiting = null;
                    return next(true, params.params);
                }
                waiting = setTimeout(function () {
                    next.wait(params);
                }, params.delay);
            };

            return {
                cancel: function () {
                    self.set('status','cancelled');
                    cancelled = true;
                    clearTimeout(waiting);
                    clearTimeout(delayHandler);
                    currentHandler && currentHandler.onCancelled && currentHandler.onCancelled();
                    next();
                    next.info.called = true;
                    return this;
                },
                pause: function () {
                    pause = true;
                    self.set('status','paused');
                    currentHandler && currentHandler.onPaused && currentHandler.onPaused();
                    if (waiting) {
                        clearTimeout(waiting);
                    }
                    return this;
                },
                resume: function () {
                    self.set('status','resumed');
                    pause = false;
                    currentHandler && currentHandler.onResumed && currentHandler.onResumed();
                    if (waiting) {
                        return current.wait(waitingParams);
                    }
                    next.apply(null, pauseArgs);
                    return this;
                },
                run: function () {
                    self.set('status','running');
                    run();
                    return this;
                }
            };
        },
        /**
         * run tasks in async mode
         * @method async
         * @return {Object}
         */
        async: function () {
            var self = this,
                total = this.queue.length,
                task, idx, cancelled = false,
                errors = [], res = [],
                done = function (idx) {
                    return function (err, data) {
                        if (cancelled) {
                            return;
                        }
                        if (err) {
                            errors[idx] = err;
                        }
                        if (data) {
                            res[idx] = data;
                        }
                        if (!--total) {
                            self.done(errors.length ? {
                                errors: errors
                            } : undef, res.length ? res : undef);
                        }
                    }
                }, run = function () {
                    if (!self.queue.length) {
                        return console.log("taskBufferAsync - no task appending");
                    }
                    while (!cancelled && self.queue.length) {
                        idx = total - self.queue.length;
                        self.getTaskById(self.queue.shift()).
                            task.call(self.options.scope, done(idx), {
                                order: idx
                            });
                    }
                };
            return {
                run: function () {
                    run();
                    self.set('status','running');
                    return this;
                },
                cancel: function () {
                    cancelled = true;
                    self.set('status','cancelled');
                    delete self.runner;
                    self.done({
                        cancelled: true
                    });
                    return this;
                }
            };
        }
    });
});