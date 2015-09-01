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
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var json_rpc = require('caf_transport').json_rpc;

var PULSE_CRON_NAME = 'pulseCron';

/**
 * Factory method to create a handler for application code.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlugIoT.constructor($, spec);

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

        var methods = $._.$.loader
            .__ca_loadResource__(spec.env.methodsFileName).methods;

        var onlyFun = myUtils.onlyFun(methods);

        myUtils.mixin(that, onlyFun);

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
            that.__iot_setup_(cb0);
        };

        /**
         * Application setup method called every time the framework resets.
         *
         * This method is typically customized by the application.
         *
         * @param {caf.cb} cb0 A callback to continue after setup.
         * @name  caf_iot/plug_iot_handler#__iot_setup__
         * @function
         */
        that.__iot_setup__= function(cb0) {
            cb0(null);
        };

        /**
         * Main loop periodically called by the framework.
         *
         * @param {caf.cb} cb0 A callback to continue after pulse.
         * @name  caf_iot/plug_iot_handler##__ca_pulse__
         * @function
         */
        that.__ca_pulse__= function(cb0) {

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
        that.__iot_loop__= function(cb0) {
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

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
