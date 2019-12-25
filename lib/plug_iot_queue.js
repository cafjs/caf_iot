/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
/**
 * Queue to serialize command execution
 *
 *
 * @module caf_iot/plug_iot_queue
 * @augments module:caf_iot/gen_plug_iot
 *
 */
// @ts-ignore: augments not attached to a class

var caf_comp = require('caf_components');
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var json_rpc = require('caf_transport').json_rpc;
var ERROR_CODES = json_rpc.ERROR_CODES;
var domain = require('domain');

exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlugIoT.constructor($, spec);

        var messagesProcessed = 0;

        var lastMessagesProcessed = -1;

        $._.$.log && $._.$.log.debug('New queue plug');

        var workerF = function(msg, cb0) {
            /**
             * Wraps error into a SystemError
             */
            var toSysErrorF = function(msg, code, errorStr, cb1) {
                return function(error, data) {
                    if (error) {
                        error = json_rpc.newSysError(msg, code, errorStr,
                                                     error);
                    }
                    cb1(error, data);
                };
            };

            var cb1 = myUtils.callJustOnce(function(err, data) {
                $._.$.log && $._.$.log.debug('Ignore Call >1: err:' +
                                             myUtils.errToPrettyStr(err) +
                                             ' data:' + JSON.stringify(data));
            }, cb0);

            var dom = domain.create();
            var wrapException = function(err) {
                $._.$.log && $._.$.log.debug('Got exception in queue' +
                                             err.toString());
                return json_rpc.newSysError(msg, ERROR_CODES.exceptionThrown,
                                            'Exception in queue', err);
            };
            dom.on('error', function(err) {cb1(wrapException(err));});

            var wrapAppError = function(err) {
                return (err ? json_rpc.newAppError(msg, 'AppError', err) : err);
            };


            var mainF = function() {
                var callResponse = null;
                async.series([
                    function(cb2) {
                        messagesProcessed = messagesProcessed + 1;
                        $._.__ca_begin__(msg, cb2);
                    },
                    function(cb2) {
                        var cb3 = function(error, data) {
                            var reply = data;
                            if (!error) {
                                reply = json_rpc.isNotification(msg) ?
                                    null :
                                    json_rpc.reply(error, msg, data);
                                callResponse = reply;
                            }
                            cb2(error, reply);
                        };
                        var logF = function(err, val) {
                            $._.$.log &&
                                $._.$.log.warn('Ignoring rpc_call>1 err: ' +
                                               myUtils.errToPrettyStr(err) +
                                               ' data: ' + val);
                        };
                        var cbOnce = myUtils.callJustOnce(logF, cb3);
                        // call method
                        var p = json_rpc.call(msg, $._.$.handler, cbOnce);
                        myUtils.promiseToCallback(p, cbOnce, wrapException,
                                                  wrapAppError);
                    },
                    function(cb2) {
                        var cb3 = toSysErrorF(msg, ERROR_CODES.prepareFailure,
                                              'prepareFailed', cb2);
                        // ignore checkpoint, assumed device is stateless
                        $._.__ca_prepare__(cb3);
                    },
                    function(cb2) {
                        // commit
                        var cb3 = toSysErrorF(msg, ERROR_CODES.commitFailure,
                                              'commitFailure', cb2);
                        $._.__ca_commit__(cb3);
                    }
                ], function(error) {
                    if (error) {
                        cb1(error);
                    } else {
                        cb1(null, callResponse);
                    }
                });
            };

            dom.run(mainF);
        };

        var queue = async.queue(workerF, 1); // serialize

        /**
         * Internal only.
         *
         * Checks for progress processing messages.
         *
         *
         * @return {boolean} True if message queue is empty or at least one
         * message was processed since the last call to `progress`.
         *
         * @memberof! module:caf_iot/plug_iot_queue#
         * @alias __iot_progress__
         */
        that.__iot_progress__ = function() {
            var result = true;
            if ((messagesProcessed === lastMessagesProcessed) &&
                (queue.length() > 0)) {
                result = false;
            }
            lastMessagesProcessed = messagesProcessed;
            return result;
        };

        /**
         * Strategy to handle errors:
         *
         *   1) Call user level handler with the error
         *
         *      1a) Handler propagates error in callback
         *          -Shutdown top level. If shutdown fails exit process.
         *
         *      1b) Handler does not propagate the error in callback:
         *         -Abort transaction. If abort fails follow as in 1a)
         *
         *  or if there is no user level handler follow as in 1a)
         *
         */
        var handleError = function(error, cb0) {
            var doShutdown = function(errorMsg, cb1) {
                $._.$.log && $._.$.log.error('handleError: Error in handler, ' +
                                             'force shutdown ' + errorMsg);

                $._.__ca_shutdown__(null, function(err0) {
                    if (err0) {
                        $._.$.log && $._.$.log
                            .fatal('handleError: Critical shutdown' +
                                   ' failed, exiting '
                                   + myUtils.errToPrettyStr(err0));
                        process.exit(1);
                    } else {
                        cb1(null);
                    }
                });
            };
            var cb1 = function(err) {
                if (err) {
                    doShutdown(myUtils.errToPrettyStr(err), cb0);
                } else {
                    $._.__ca_abort__(function(err0) {
                        if (err0) {
                            doShutdown(myUtils.errToPrettyStr(err0), cb0);
                        } else {
                            cb0(null);
                        }
                    });
                }
            };
            if ($._.$.handler && $._.$.handler.__iot_error__) {
                var f = myUtils.wrapAsyncFunction($._.$.handler.__iot_error__,
                                                  $._.$.handler);
                f(error, cb1);
            } else {
                // no app error handler, shutdown
                cb1(error);
            }
        };

        var __iot_process__ = function(msg, cb0) {
            var cb1 = function(err, data) {
                if (err) {
                    handleError(err, cb0);
                } else {
                    cb0(err, data);
                }
            };
            if ($._.__ca_isShutdown__) {
                var err = new Error('IoT device cannot process message');
                err['msg'] = msg;
                cb1(err);
            } else {
                queue.push(msg, cb1);
            }
        };

        /**
         * Enqueues a method call request.
         *
         * @param {string} methodName The method name.
         * @param {Array.<jsonType>} args The arguments.
         * @param {cronOptionsType=} options Hint on how to process
         * the message. The `noSync` flag skips cloud synchronization.
         * @param {cbType} cb0 A callback for errors/response.
         *
         * @memberof! module:caf_iot/plug_iot_queue#
         * @alias process
         */
        that.process = function(methodName, args, options, cb0) {
            cb0 = cb0 || function(err) {
                if (err) {
                    $._.$.log &&
                        $._.$.log.debug('Method: ' + methodName +
                                        ' Args: ' + JSON.stringify(args) +
                                        ' Error: ' +
                                        myUtils.errToPrettyStr(err));
                }
            };
            var argsArray = args.slice(0);
            argsArray.unshift(methodName);
            argsArray.unshift(json_rpc.SYSTEM_FROM); // `to` field ignored
            var msg = json_rpc.systemRequest.apply(json_rpc.systemRequest,
                                                   argsArray);
            if (options) {
                msg.options = options;
            }
            __iot_process__(msg, cb0);
        };

        var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            if (queue.length() !== 0) {
                $._.$.log &&
                    $._.$.log.warn('Warning: shutting down CA with ' +
                                   queue.length() + ' unprocessed messages');
            }
            super__ca_shutdown__(data, cb0);
        };

        cb(null, that);

    } catch (err) {
        cb(err);
    }
};
