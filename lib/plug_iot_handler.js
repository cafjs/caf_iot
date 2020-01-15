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
 * A handler for wrapping application code.
 *
 * Properties:
 *
 *      {methodsFileName: string, interval: number}
 *
 * where:
 * * `methodsFileName`: the name of a file containing the application logic. It
 * defaults to `./iot_methods.js`.
 * * `interval`: time in msec between invocations of the main loop, i.e.,
 * `__iot_loop__`.
 *
 * @module caf_iot/plug_iot_handler
 * @augments module:caf_iot/gen_plug_iot
 */
// @ts-ignore: augments not attached to a class

const assert = require('assert');
const caf_comp = require('caf_components');
const async = caf_comp.async;
const myUtils = caf_comp.myUtils;
const genPlugIoT = require('./gen_plug_iot');
const json_rpc = require('caf_transport').json_rpc;
const caf_sharing = require('caf_sharing');
const SharedMap = caf_sharing.SharedMap;
const ReliableChannel = caf_sharing.ReliableChannel;

const constants_iot = require('./constants_iot');
const FROM_CLOUD_CHANNEL_NAME = constants_iot.FROM_CLOUD_CHANNEL_NAME;
const FROM_CLOUD_REPLY_CHANNEL_NAME =
          constants_iot.FROM_CLOUD_REPLY_CHANNEL_NAME;

const PULSE_CRON_NAME = 'pulseCron';

exports.newInstance = async function($, spec) {
    try {
        const that = genPlugIoT.constructor($, spec);

        const toCloudMap = new SharedMap($._.$.log, false, 1);
        const fromCloudMap = new SharedMap($._.$.log, false, 1);

        var lastSyncErr = null;
        var lastSyncFC = null;
        var forceFullCycle = false;

        var noSync = false;

        const updateMapRefs = function() {

            /**
             * `SharedMap` to upload information to the CA.
             *
             * @type {refMapType}
             *
             * @memberof! module:caf_iot/plug_iot_handler#
             * @alias toCloud
             */
            that.toCloud = toCloudMap.ref();

            /**
             * `SharedMap` to download information from the CA.
             *
             * It is read-only.
             *
             * @type {refMapType}
             *
             * @memberof! module:caf_iot/plug_iot_handler#
             * @alias fromCloud
             */
            that.fromCloud = fromCloudMap.ref(true); //read only
        };

        assert.equal(typeof(spec.env.methodsFileName), 'string',
                     "'spec.env.methodsFileName' is not a string");

        assert.equal(typeof(spec.env.interval), 'number',
                     "'spec.env.interval' is not a number");

        /**
         * State of this device handler.
         *
         * It roll backs changes on abort, and contains JSON-serializable data
         * only.
         *
         * @type {Object}
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias state
         */
        that.state = {};

        /**
         * Scratch state of this device handler.
         *
         * It never rollbacks and contains anything.
         *
         * @type {Object}
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias scratch
         */
        that.scratch = {};

        $._.$.log && $._.$.log.debug('New handler object');

        /**
         * Returns the name of this device.
         *
         * Matches the name of its CA in the cloud.
         *
         * @return {string} The name of this device.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __ca_getName__
         */
        that.__ca_getName__ = function() {
            return $._.__ca_getName__();
        };

        /**
         * Returns the application name.
         *
         * @return {string} The application name.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __ca_getAppName__
         */
        that.__ca_getAppName__ = function() {
            return $._.__ca_getAppName__();
        };


        // make proxies visible to application code
        Object.keys($._.$).forEach(function(compName) {
            const comp = $._.$[compName];
            if (comp.$ && comp.$.proxy && comp.$.proxy.__ca_isProxy__) {
                that.$[compName] = comp.$.proxy;
            }
        });

        // capture before user code overrides them.
        const super__ca_begin__ = myUtils.superior(that, '__ca_begin__');
        const super__ca_prepare__ = myUtils.superior(that, '__ca_prepare__');
        const super__ca_commit__ = myUtils.superior(that, '__ca_commit__');

        const methods = $._.$.loader
            .__ca_loadResource__(spec.env.methodsFileName).methods;

        const onlyFun = myUtils.onlyFun(methods);

        // Application methods to override
        /**
         * Application setup method called every time the framework resets.
         *
         * This method is typically customized by the application.
         *
         * @param {cbType} cb0 A callback to continue after setup.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __iot_setup__
         */
        that.__iot_setup__ = function(cb0) {
            cb0(null);
        };

        /**
         * Application main method called periodically by the framework.
         *
         * This method is typically customized by the application.
         *
         * @param {cbType} cb0 A callback to continue after setup.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __iot_loop__
         */
        that.__iot_loop__ = function(cb0) {
            cb0(null);
        };

        /**
         * Optional error handler provided by the application.
         *
         * This method is `null` unless provided by the application.
         *
         * Strategy to handle errors:
         *
         *   1. Call this handler with the error
         *
         *       1.1 If handler propagates error in callback, shutdown top
         *  level. If shutdown fails exit process.
         *
         *       1.2 If handler does **not** propagate the error in callback,
         *  just abort transaction. If abort fails follow as in 1.1
         *
         *   2. If this handler is `null`, follow as in 1.1
         *
         * The type of the handler is `function(Error, cbType)` where:
         *
         * `Error`: An error raised by the last processed command.
         * `cbType`:  A callback that will propagate the error if it
         * wants a shutdown, or, if the error is not propagated, just abort.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __iot_error__
         * @function
         */
        that.__iot_error__ = null;

        // override methods
        myUtils.mixin(that, onlyFun);

        const initMaps = function(cb1) {
            try {
                if ($._.$.cloud.cli) {
                    $._.$.cloud.cli.__iot_resume__(function(err, maps) {
                        if (err) {
                            cb1(err);
                        } else {
                            toCloudMap.reset();
                            toCloudMap.applyChanges(maps.toCloud);
                            fromCloudMap.reset();
                            fromCloudMap.applyChanges(maps.fromCloud);
                            updateMapRefs();
                            cb1(null);
                        }
                    });
                } else {
                    $._.$.log && $._.$.log.warn('initMaps: No client session');
                    toCloudMap.reset();
                    fromCloudMap.reset();
                    updateMapRefs();
                    cb1(null);
                }
            } catch (err) {
                cb1(err);
            }
        };

        const initNotifHandler = function(cb1) {
            try {
                $._.$.cloud.registerHandler(function(msg) {
                    $._.$.log && $._.$.log.debug('Got notification ' +
                                                 JSON.stringify(msg));
                    const args = json_rpc.getMethodArgs(msg);
                    if (Array.isArray(args) && (args.length > 0) &&
                        args[0] && (typeof args[0] === 'object') &&
                        (typeof args[0].fromCloud === 'object')) {
                        lastSyncFC = args[0].fromCloud;
                    }
                    // The default is to trigger a full cycle
                    $._.$.queue && $._.$.queue.process('__ca_fullCycle__', []);
                });
                cb1(null);
            } catch (err) {
                cb1(err);
            }
        };

        const super__ca_init__ = myUtils.superior(that, '__ca_init__');
        that.__ca_init__= function(cb0) {
            async.series([
                super__ca_init__,
                initMaps,
                initNotifHandler,
                function(cb1) {
                    // Ensure that initialization is serialized
                    $._.$.queue.process('__iot_setup__', [], null, cb1);
                },
                function(cb1) {
                    // Do not wait for the cron
                    $._.$.queue.process('__ca_pulse__', [], null, cb1);
                }
            ], function(err, data) {
                if (err) {
                    cb0(err);
                } else {
                    $._.$.cron.__iot_addCron__(PULSE_CRON_NAME, '__ca_pulse__',
                                               [], spec.env.interval);
                    cb0(err, data);
                }
            });
        };


        /*
         * Internal function.
         *
         * Schedules bundles of commands.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __iot_executeCommands__
         */
        that.__iot_executeCommands__ = function() {
            const received = ReliableChannel.receive(that.toCloud,
                                                     that.fromCloud,
                                                     FROM_CLOUD_CHANNEL_NAME);
            const responses = [];
            received.messages.forEach(function(bundle, i) {
                try {
                    bundle = JSON.parse(bundle);
                    const isOK = $._.$.bundles.__iot_addBundle__(bundle);
                    responses.push({result: isOK, index: received.index + i});
                } catch (ex) {
                    $._.$.log && $._.$.log.error('Ignoring unparseable bundle' +
                                                 bundle);
                    responses.push({result: false, index: received.index + i});
                }
            });
            if (responses.length > 0) {
                ReliableChannel.send(that.toCloud,
                                     FROM_CLOUD_REPLY_CHANNEL_NAME, responses);
            }
        };

        /**
         * Internal function.
         *
         * Main loop periodically called by the framework.
         *
         * @param {cbType} cb0 A callback to continue after pulse.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __ca_pulse__
         */
        that.__ca_pulse__= function(cb0) {
            that.__iot_executeCommands__();
            let __iot_loop__ = that['__iot_loop__'];
            // enable async/await, and bind `this` to `that`
            __iot_loop__= myUtils.wrapAsyncFunction(__iot_loop__, that);
            __iot_loop__(cb0);
        };

        /**
         * Internal function.
         *
         * Triggers two pulses, the second one after cloud sync finishes.
         *
         * Sync is always at the end of a pulse, and  `fullCycle` minimizes
         * latency because it can process a cloud request without waiting for
         * the cron process.
         *
         * @param {cbType} cb0 A callback to continue after the first pulse.
         *
         * @memberof! module:caf_iot/plug_iot_handler#
         * @alias __ca_fullCycle__
         */
        that.__ca_fullCycle__= function(cb0) {
            forceFullCycle = true;
            that.__ca_pulse__(cb0);
        };

        // Transactional methods.
        that.__ca_begin__= function(msg, cb0) {
            if (lastSyncErr) {
                const err = lastSyncErr;
                lastSyncErr = null;
                lastSyncFC = null;
                cb0(err);
            } else {
                if (lastSyncFC) {
                    fromCloudMap.reset();
                    fromCloudMap.applyChanges(lastSyncFC);
                    lastSyncFC = null;
                }
                updateMapRefs();
                noSync = msg && msg.options && msg.options.noSync;
                super__ca_begin__(msg, cb0);
            }
        };

        that.__ca_prepare__ = function(cb0) {
            ReliableChannel.gc(that.toCloud, that.fromCloud);
            that.toCloud.prepare();
            super__ca_prepare__(cb0);
        };

        const syncMaps = function(changes) {
            try {
                if ($._.$.cloud.cli) {
                    $._.$.cloud.cli.__iot_sync__(changes, function(err, newFC) {
                        // delay processing until the next message.
                        if (err) {
                            lastSyncErr = err;
                            lastSyncFC = null;
                        } else {
                            lastSyncErr = null;
                            lastSyncFC = newFC;
                            if (forceFullCycle) {
                                forceFullCycle = false;
                                //Do not wait for the cron
                                $._.$.queue &&
                                    $._.$.queue.process('__ca_pulse__', []);
                            }
                        }
                    });
                } else {
                    $._.$.log && $._.$.log.warn('syncMaps: No client session');
                    lastSyncErr = null;
                    lastSyncFC = null;
                }
            } catch (err) {
                lastSyncErr = err;
                lastSyncFC = null;
            }
        };

        that.__ca_commit__ = function(cb0) {
            super__ca_commit__(function(err) {
                if (err) {
                    cb0(err);
                } else {
                    /* We don't want to block the main loop, so we do
                     * a tail call outside the transaction.*/
                    if (noSync) {
                        $._.$.log &&
                            $._.$.log.trace('Skipping sync,' +
                                            " ignoring 'toCloud' changes");
                        noSync = false;
                    } else {
                        toCloudMap.commit(that.toCloud);
                        syncMaps(that.toCloud.getChanges());
                    }
                    cb0(null);
                }
            });
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
