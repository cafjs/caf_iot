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
 * A container component that assembles and manages one IoT device.
 *
 * The state of a IoT device and its plugins is managed transactionally using a
 *  2PC (Two-Phase Commit) protocol. See caf_components/gen_transactional for
 *  details.
 *
 * @name caf_iot/iot_main
 * @namespace
 * @augments caf_components/gen_transactional
 */
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genTransactional = caf_comp.gen_transactional;
var async = caf_comp.async;

var PULSE_CRON_NAME = 'pulseCron';

/**
 * Factory method to create an IoT device.
 *
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genTransactional.constructor($, spec);

        // become the root component of the children context
        that.$._ = that;
        that.$.loader = $._.$.loader;

        /**
         * Run-time type information.
         *
         * @type {boolean}
         * @name iot_main#__ca_isIoTMain__
         */
        that.__ca_isIoTMain__ = true;

        async.series([
            function(cb0) {
                // force initialization of lazy components.
                that.__ca_checkup__(null, cb0);
            },
            that.__ca_init__,
            function(cb0) {
                that.$.queue.process('__ca_pulse__', [], cb0);
            }
        ], function(err) {
            if (err) {
                cb(err);
            } else {
                that.$.cron.__iot_addCron__(PULSE_CRON_NAME, '__ca_pulse__', [],
                                            spec.env.interval);
                cb(err, that);
            }
        });
    } catch (err) {
        cb(err);
    }
};

