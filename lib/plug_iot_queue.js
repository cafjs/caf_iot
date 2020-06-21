// Modifications copyright 2020 Caf.js Labs and contributors
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

const caf_comp = require('caf_components');
const async = caf_comp.async;
const myUtils = caf_comp.myUtils;
const genPlugIoT = require('./gen_plug_iot');
const json_rpc = require('caf_transport').json_rpc;
const ERROR_CODES = json_rpc.ERROR_CODES;
const domain = require('domain');

exports.newInstance = async function($, spec) {
    try {
        const that = genPlugIoT.create($, spec);

        var messagesProcessed = 0;

        var lastMessagesProcessed = -1;

        $._.$.log && $._.$.log.debug('New queue plug');

        const workerF = function(msg, cb0) {
            /**
             * Wraps error into a SystemError
             */
            const toSysErrorF = function(msg, code, errorStr, cb1) {
                return function(error, data) {
                    if (error) {
                        error = json_rpc.newSysError(msg, code, errorStr,
                                                     error);
                    }
                    cb1(error, data);
                };
            };

            const cb1 = myUtils.callJustOnce(function(err, data) {
                $._.$.log && $._.$.log.debug('Ignore Call >1: err:' +
                                             myUtils.errToPrettyStr(err) +
                                             ' data:' + JSON.stringify(data));
            }, cb0);

            const dom = domain.create();
            const wrapException = function(err) {
                $._.$.log && $._.$.log.debug('Got exception in queue' +
                                             err.toString());
                return json_rpc.newSysError(msg, ERROR_CODES.exceptionThrown,
                                            'Exception in queue', err);
            };
            dom.on('error', function(err) {cb1(wrapException(err));});

            const wrapAppError = function(err) {
                return (err ? json_rpc.newAppError(msg, 'AppError', err) : err);
            };


            const mainF = function() {
                var callResponse = null;
                async.series([
                    function(cb2) {
                        messagesProcessed = messagesProcessed + 1;
                        $._.__ca_begin__(msg, cb2);
                    },
                    function(cb2) {
                        const cb3 = function(error, data) {
                            var reply = data;
                            if (!error) {
                                reply = json_rpc.isNotification(msg) ?
                                    null :
                                    json_rpc.reply(error, msg, data);
                                callResponse = reply;
                            }
                            cb2(error, reply);
                        };
                        const logF = function(err, val) {
                            $._.$.log &&
                                $._.$.log.warn('Ignoring rpc_call>1 err: ' +
                                               myUtils.errToPrettyStr(err) +
                                               ' data: ' + val);
                        };
                        const cbOnce = myUtils.callJustOnce(logF, cb3);
                        // call method
                        const p = json_rpc.call(msg, $._.$.handler, cbOnce);
                        myUtils.promiseToCallback(p, cbOnce, wrapException,
                                                  wrapAppError);
                    },
                    function(cb2) {
                        const cb3 = toSysErrorF(msg, ERROR_CODES.prepareFailure,
                                                'prepareFailed', cb2);
                        // ignore checkpoint, assumed device is stateless
                        $._.__ca_prepare__(cb3);
                    },
                    function(cb2) {
                        // commit
                        const cb3 = toSysErrorF(msg, ERROR_CODES.commitFailure,
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

        const queue = async.queue(workerF, 1); // serialize

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
        const handleError = function(error, cb0) {
            const doShutdown = function(errorMsg, cb1) {
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
            const cb1 = function(err) {
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
                const f = myUtils.wrapAsyncFunction($._.$.handler.__iot_error__,
                                                    $._.$.handler);
                f(error, cb1);
            } else {
                // no app error handler, shutdown
                cb1(error);
            }
        };

        const __iot_process__ = function(msg, cb0) {
            const cb1 = function(err, data) {
                if (err) {
                    handleError(err, cb0);
                } else {
                    cb0(err, data);
                }
            };
            if ($._.__ca_isShutdown__) {
                const err = new Error('IoT device cannot process message');
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
         * @param {cbType=} cb0 A callback for errors/response.
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
            const argsArray = args.slice(0);
            argsArray.unshift(methodName);
            argsArray.unshift(json_rpc.SYSTEM_FROM); // `to` field ignored
            const msg = json_rpc.systemRequest.apply(json_rpc.systemRequest,
                                                     argsArray);
            if (options) {
                msg.options = options;
            }
            __iot_process__(msg, cb0);
        };

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            if (queue.length() !== 0) {
                $._.$.log &&
                    $._.$.log.warn('Warning: shutting down CA with ' +
                                   queue.length() + ' unprocessed messages');
            }
            super__ca_shutdown__(data, cb0);
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
