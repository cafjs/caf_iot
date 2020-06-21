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
 * A container component that assembles and manages one IoT device.
 *
 * The state of a IoT device and its plugins is managed transactionally using a
 *  2PC (Two-Phase Commit) protocol.
 *
 * Properties:
 *
 *      {interval: number}
 *
 * where:
 * * `interval`: time in msec between invocations of the main loop, i.e.,
 * `__iot_loop__`.
 *
 * See {@link external:caf_components/gen_transactional} for details.
 *
 * @module caf_iot/iot_main
 * @augments external:caf_components/gen_transactional
 */
// @ts-ignore: augments not attached to a class

const assert = require('assert');
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genTransactional = caf_comp.gen_transactional;
const async = caf_comp.async;
const PULSE_CRON_NAME = 'pulseCron';

exports.newInstance = function($, spec, cb) {
    try {
        const that = genTransactional.create($, spec);

        assert.equal(typeof spec.env.myId, 'string',
                     "'spec.env.myId' not a string");

        assert.equal(typeof(spec.env.interval), 'number',
                     "'spec.env.interval' is not a number");


        // become the root component of the children context
        that.$._ = that;
        that.$.loader = $._.$.loader;

        // eslint-disable-next-line
        console.log('New IoT main');

        /**
         * Run-time type information.
         *
         * @type {boolean}
         *
         * @memberof! module:caf_iot/iot_main#
         * @alias __ca_isIoTMain__
         */
        that.__ca_isIoTMain__ = true;

        /**
         * Returns this application name, e.g., `root-helloworld`
         *
         * @return {string} A  name for this app.
         *
         * @memberof! module:caf_iot/iot_main#
         * @alias __ca_getAppName__
         */
        that.__ca_getAppName__ = function() {
            return $._.__ca_getAppName__();
        };

        /**
         * Returns the CA name, e.g., `foo-device1`.
         *
         * @return {string} The CA name.
         *
         * @memberof! module:caf_iot/iot_main#
         * @alias __ca_getName__
         */
        that.__ca_getName__ = function() {
            return spec.env.myId;
        };

        const super__ca_checkup__ = myUtils.superior(that, '__ca_checkup__');
        const queue = async.queue((data, cb0) => {
            super__ca_checkup__(data, (err, res) => {
                if (err) {
                    cb0(err);
                } else {
                    if (data && data.restartAll) {
                        async.series([
                            that.__ca_init__,
                            function(cb1) {
                                that.$.queue.process('__iot_setup__', [], null,
                                                     cb1);
                            },
                            function(cb1) {
                                // Do not delay the first one
                                that.$.queue.process('__ca_pulse__', [], null,
                                                     cb1);
                            }
                        ], (err) => {
                            if (err) {
                                cb0(err);
                            } else {
                                that.$.cron.__iot_addCron__(
                                    PULSE_CRON_NAME, '__ca_pulse__', [],
                                    spec.env.interval
                                );
                                cb0(err, res);
                            }
                        });
                    } else {
                        cb0(err, res);
                    }
                }
            });
        }, 1); //serialize

        that.__ca_checkup__ = function(data, cb0) {
            const myData = data ? {...data} : {};
            delete myData.restartAll;
            queue.push(myData, cb0);
        };

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb) {
            // eslint-disable-next-line
            console.log('IOT: shutdown');
            super__ca_shutdown__(data, cb);
        };

        // force initialization of lazy components.
        that.__ca_checkup__(null, function(err) {
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
