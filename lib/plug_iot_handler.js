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

"use strict";

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

var PULSE_CRON_NAME = 'pulseCron';

var constants_iot = require('./constants_iot');
var FROM_CLOUD_CHANNEL_NAME  = constants_iot.FROM_CLOUD_CHANNEL_NAME;
var FROM_CLOUD_REPLY_CHANNEL_NAME = constants_iot.FROM_CLOUD_REPLY_CHANNEL_NAME;


/**
 * Factory method to create a handler for application code.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlugIoT.constructor($, spec);

        var toCloudMap  = new SharedMap($._.$.log);
        var fromCloudMap  = new SharedMap($._.$.log);

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

        // make proxies visible to application code
        Object.keys($._.$).forEach(function(compName) {
            var comp = $._.$[compName];
            if (comp.__ca_isPlugIoT__) {
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

        myUtils.mixin(that, onlyFun);

        var initMaps = function(cb1) {
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
        };

        /**
         * Initialize the handler.
         *
         * @param {caf.cb} cb0 A callback to continue after setup.
         * @name  caf_iot/plug_iot_handler#__ca_init__
         * @function
         */
        that.__ca_init__= function(cb0) {
            $._.$.cron.__iot_addCron__(PULSE_CRON_NAME, '__ca_pulse__', [],
                                       spec.env.interval);
            async.series([
                initMaps,
                that.setup
            ], cb0);
        };


        /**
         * Schedules bundles of commands.
         *
         * @name  caf_iot/plug_iot_handler#__iot_executeCommands__
         * @function
         */
        that.__iot_executeCommands__ = function() {
            var firstIndex = ReliableChannel
                    .firstAckIndex(that.toCloud, FROM_CLOUD_CHANNEL_NAME);
            var messages = ReliableChannel.receive(that.toCloud,
                                                   that.fromCloud,
                                                   FROM_CLOUD_CHANNEL_NAME);
            messages.forEach(function(bundle, i) {
                var isOK = $._.$.bundles.__iot_addBundle_(bundle);
                ReliableChannel.send(that.toCloud,
                                     FROM_CLOUD_REPLY_CHANNEL_NAME,
                                     [{result : isOK, index: firstIndex + i}]);
            });
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
            that.loop(cb0);
        };

        // Application methods to override
        /**
         * Application setup method called every time the framework resets.
         *
         * This method is typically customized by the application.
         *
         * @param {caf.cb} cb0 A callback to continue after setup.
         * @name  caf_iot/plug_iot_handler#setup
         * @function
         */
        that.setup = function(cb0) {
            cb0(null);
        };

        /**
         * Application main method called periodically by the framework.
         *
         * This method is typically customized by the application.
         *
         * @param {caf.cb} cb0 A callback to continue after setup.
         * @name  caf_iot/plug_iot_handler#loop
         * @function
         */
        that.loop = function(cb0) {
            cb0(null);
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
            updateMapRefs();
            stateBackup = JSON.stringify(that.state);
            super__ca_begin__(msg, cb0);
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

        var syncMaps = function(cb0) {
            $._.$.cloud.cli
                .__iot_sync__(that.toCloud.getChanges(),
                              function(err, newFC) {
                                  if (err) {
                                      cb0(err);
                                  } else {
                                      try {
                                          fromCloudMap.reset();
                                          fromCloudMap.applyChanges(newFC);
                                          cb0(null);
                                      } catch(error) {
                                          cb0(error);
                                      }
                                  }
                              });
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
                    syncMaps(cb0);
                }
            });
        };

        that.__ca_init__(function(err) {
            if (err) {
                cb(err);
            } else {
                cb(null, that);
            }
        });
    } catch (err) {
        cb(err);
    }
};
