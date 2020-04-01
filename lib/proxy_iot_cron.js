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
 * A proxy to access the cron service.
 *
 * @module caf_iot/proxy_iot_cron
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const genProxy = caf_comp.gen_proxy;

exports.newInstance = async function($, spec) {

    const that = genProxy.create($, spec);

    /**
     * Adds a new cron.
     *
     * The type of `cronOptionsType` is:
     *
     *        {noSync: boolean}
     *
     * where `noSync` skips cloud synchronization.
     *
     * @param {string} cronName The unique id of the cron.
     * @param {string} methodName Object method name to call.
     * @param {Array.<jsonType>} args The arguments for the call.
     * @param {number} interval Time between calls in msec.
     * @param {cronOptionsType=} options Hint on how to process
     * cron messages.
     *
     * @memberof! module:caf_iot/proxy_iot_cron#
     * @alias addCron
     */
    that.addCron = function(cronName, methodName, args, interval, options) {
        $._.__iot_addCron__(cronName, methodName, args, interval, options);
    };

    /**
     * Deletes a cron.
     *
     * @param {string} cronName The unique id of the cron.
     *
     * @memberof! module:caf_iot/proxy_iot_cron#
     * @alias deleteCron
     */
    that.deleteCron = function(cronName) {
        $._.__iot_deleteCron__(cronName);

    };

    Object.freeze(that);
    return [null, that];
};
