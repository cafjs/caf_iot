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
var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genTransactional = caf_comp.gen_transactional;
var async = caf_comp.async;

/**
 * Factory method to create an IoT device.
 *
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genTransactional.constructor($, spec);

        assert.equal(typeof spec.env.myId, 'string',
                     "'spec.env.myId' not a string");

        // become the root component of the children context
        that.$._ = that;
        that.$.loader = $._.$.loader;

        // eslint-disable-next-line
        console.log('New IoT main');

        /**
         * Run-time type information.
         *
         * @type {boolean}
         * @name iot_main#__ca_isIoTMain__
         */
        that.__ca_isIoTMain__ = true;

        /**
         * Returns this application name, e.g., 'root-helloworld'
         *
         * @return {string} A  name for this app.
         *
         * @name iot_main#__ca_getAppName__
         * @function
         */
        that.__ca_getAppName__ = function() {
            return $._.__ca_getAppName__();
        };

        /**
         * Returns the CA name, e.g., 'foo-device1'.
         *
         * @return {string} The CA name.
         *
         * @name iot_main#__ca_getName__
         * @function
         */
        that.__ca_getName__ = function() {
            return spec.env.myId;
        };

        var super__ca_checkup__ = myUtils.superior(that, '__ca_checkup__');
        var queue = async.queue(super__ca_checkup__, 1); // serialize
        that.__ca_checkup__ = function(data, cb0) {
            queue.push(data, cb0);
        };

        var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb) {
            // eslint-disable-next-line
            console.log('IOT: shutdown');
            super__ca_shutdown__(data, cb);
        };

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
                cb(err, that);
            }
        });
    } catch (err) {
        cb(err);
    }
};
