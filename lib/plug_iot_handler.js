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
 * A handler for application code.
 *
 *
 * @name caf_iot/plug_iot_handler
 * @namespace
 * @augments caf_iot/gen_plug_iot
 *
 */

var assert = require('assert');
var caf_comp = require('caf_components');
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var json_rpc = require('caf_transport').json_rpc;
var caf_sharing = require('caf_sharing');
var SharedMap = caf_sharing.SharedMap;
var ReliableChannel = caf_sharing.ReliableChannel;

var constants_iot = require('./constants_iot');
var FROM_CLOUD_CHANNEL_NAME = constants_iot.FROM_CLOUD_CHANNEL_NAME;
var FROM_CLOUD_REPLY_CHANNEL_NAME = constants_iot.FROM_CLOUD_REPLY_CHANNEL_NAME;

var PULSE_CRON_NAME = 'pulseCron';

/**
 * Factory method to create a handler for application code.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlugIoT.constructor($, spec);

        var toCloudMap = new SharedMap($._.$.log, false, 1);
        var fromCloudMap = new SharedMap($._.$.log, false, 1);

        var lastSyncErr = null;
        var lastSyncFC = null;
        var forceFullCycle = false;

        var noSync = false;

        var updateMapRefs = function() {
            that.toCloud = toCloudMap.ref();
            that.fromCloud = fromCloudMap.ref(true); //read only
        };

        assert.equal(typeof(spec.env.methodsFileName), 'string',
                     "'spec.env.methodsFileName' is not a string");

        assert.equal(typeof(spec.env.interval), 'number',
                     "'spec.env.interval' is not a number");

        // rollback changes on abort, JSON-serializable data only
        that.state = {};


        // Backup state to provide transactional behavior for the handler.
        var stateBackup = '';
        // never rollback
        that.scratch = {};
        $._.$.log && $._.$.log.debug('New handler object');

       // Make CA name visible
        that.__ca_getName__ = function() {
            return $._.__ca_getName__();
        };

        // Make application name visible
        that.__ca_getAppName__ = function() {
            return $._.__ca_getAppName__();
        };


        // make proxies visible to application code
        Object.keys($._.$).forEach(function(compName) {
            var comp = $._.$[compName];
            if (comp.$ && comp.$.proxy && comp.$.proxy.__ca_isProxy__) {
                that.$[compName] = comp.$.proxy;
            }
        });

        // capture before user code overrides them.
        var super__ca_abort__ = myUtils.superior(that, '__ca_abort__');
        var super__ca_begin__ = myUtils.superior(that, '__ca_begin__');
        var super__ca_prepare__ = myUtils.superior(that, '__ca_prepare__');
        var super__ca_commit__ = myUtils.superior(that, '__ca_commit__');

        var methods = $._.$.loader
            .__ca_loadResource__(spec.env.methodsFileName).methods;

        var onlyFun = myUtils.onlyFun(methods);

        // Application methods to override
        /**
         * Application setup method called every time the framework resets.
         *
         * This method is typically customized by the application.
         *
         * @param {caf.cb} cb0 A callback to continue after setup.
         * @name  caf_iot/plug_iot_handler#__iot_setup__
         * @function
         */
        that.__iot_setup__ = function(cb0) {
            cb0(null);
        };

        /**
         * Application main method called periodically by the framework.
         *
         * This method is typically customized by the application.
         *
         * @param {caf.cb} cb0 A callback to continue after setup.
         * @name  caf_iot/plug_iot_handler#__iot_loop__
         * @function
         */
        that.__iot_loop__ = function(cb0) {
            cb0(null);
        };

        // override methods
        myUtils.mixin(that, onlyFun);

        var initMaps = function(cb1) {
            try {
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
            } catch (err) {
                cb1(err);
            }
        };

        var initNotifHandler = function(cb1) {
            try {
                $._.$.cloud.registerHandler(function(msg) {
                    $._.$.log && $._.$.log.debug('Got notification ' +
                                                 JSON.stringify(msg));
                    var args = json_rpc.getMethodArgs(msg);
                    if (Array.isArray(args) && (args.length > 0) &&
                        args[0] && (typeof args[0] === 'object') &&
                        (typeof args[0].fromCloud === 'object')) {
                        lastSyncFC = args[0].fromCloud;
                    }
                    // The default is to trigger a full cycle
                    $._.$.queue && $._.$.queue.process('__ca_pulse__', []);
                });
                cb1(null);
            } catch (err) {
                cb1(err);
            }
        };

        var super__ca_init__ = myUtils.superior(that, '__ca_init__');
        /**
         * Initialize the handler.
         *
         * @param {caf.cb} cb0 A callback to continue after setup.
         * @name  caf_iot/plug_iot_handler#__ca_init__
         * @function
         */
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


        /**
         * Schedules bundles of commands.
         *
         * @name  caf_iot/plug_iot_handler#__iot_executeCommands__
         * @function
         */
        that.__iot_executeCommands__ = function() {
            var received = ReliableChannel.receive(that.toCloud,
                                                   that.fromCloud,
                                                   FROM_CLOUD_CHANNEL_NAME);
            var responses = [];
            received.messages.forEach(function(bundle, i) {
                try {
                    bundle = JSON.parse(bundle);
                    var isOK = $._.$.bundles.__iot_addBundle__(bundle);
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
         * Main loop periodically called by the framework.
         *
         * @param {caf.cb} cb0 A callback to continue after pulse.
         * @name  caf_iot/plug_iot_handler##__ca_pulse__
         * @function
         */
        that.__ca_pulse__= function(cb0) {
            that.__iot_executeCommands__();
            // bind `this` to `that`
            var __iot_loop__ = myUtils.superior(that, '__iot_loop__');
            __iot_loop__(cb0);
        };

        /**
         * Triggers two pulses, the second one after cloud sync finishes.
         *
         * Sync is always at the end of a pulse, and  `fullCycle` minimizes
         * latency because it can process a cloud request without waiting for
         * the cron process.
         *
         * @param {caf.cb} cb0 A callback to continue after the first pulse.
         * @name  caf_iot/plug_iot_handler##__ca_fullCycle__
         * @function
         */
        that.__ca_fullCycle__= function(cb0) {
            forceFullCycle = true;
            that.__ca_pulse__(cb0);
        };

        // Transactional methods.
        /**
         * @see caf_components/gen_transactional#__ca_begin__
         *
         * @name caf_iot/plug_iot_handler#__ca_begin__
         * @function
         *
         */
        that.__ca_begin__= function(msg, cb0) {
            if (lastSyncErr) {
                var err = lastSyncErr;
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
                stateBackup = JSON.stringify(that.state);
                noSync = msg && msg.options && msg.options.noSync;
                super__ca_begin__(msg, cb0);
            }
        };

        /**
         * @see caf_components/gen_transactional#__ca_abort__
         *
         * @name caf_iot/plug_iot_handler#__ca_abort__
         * @function
         *
         */
        that.__ca_abort__= function(cb0) {
            if (stateBackup) {
                that.state = JSON.parse(stateBackup);
            }
            super__ca_abort__(cb0);
        };

        /**
         * @see caf_components/gen_transactional#__ca_prepare__
         *
         * @name caf_iot/plug_iot_handler#__ca_prepare__
         * @function
         *
         */
        that.__ca_prepare__ = function(cb0) {
            ReliableChannel.gc(that.toCloud, that.fromCloud);
            that.toCloud.prepare();
            super__ca_prepare__(cb0);
        };

        var syncMaps = function(changes) {
            try {
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
            } catch (err) {
                lastSyncErr = err;
                lastSyncFC = null;
            }
        };

        /**
         * @see caf_components/gen_transactional#__ca_commit__
         *
         * @name caf_iot/plug_iot_handler#__ca_commit__
         * @function
         *
         */
        that.__ca_commit__ = function(cb0) {
            toCloudMap.commit(that.toCloud);
            super__ca_commit__(function(err) {
                if (err) {
                    cb0(err);
                } else {
                    /* We don't want to block the main loop, so we do
                     * a tail call outside the transaction.*/
                    if (noSync) {
                        $._.$.log && $._.$.log.trace('Skipping sync');
                        noSync = false;
                    } else {
                        syncMaps(that.toCloud.getChanges());
                    }
                    cb0(null);
                }
            });
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
