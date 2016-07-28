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
 * @name caf_iot/proxy_iot_cron
 * @namespace
 * @augments caf_components/gen_proxy
 *
 */

var caf_comp = require('caf_components');
var genProxy = caf_comp.gen_proxy;

/**
 * Factory method to create a proxy to access the cron service.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    /**
     * Adds a new cron.
     *
     * @param {string} cronName The unique id of the cron.
     * @param {string} methodName Object method name to call.
     * @param {Array.<caf.json>} args The arguments for the call.
     * @param {number} interval Time between calls in msec.
     *
     * @name caf_iot/proxy_cron#addCron
     * @function
     */
    that.addCron = function(cronName, methodName, args, interval) {
        $._.__iot_addCron__(cronName, methodName, args, interval);

    };

    /**
     * Deletes a cron.
     *
     * @param {string} cronName The unique id of the cron.
     *
     * @name caf_iot/proxy_cron#deleteCron
     * @function
     */
    that.deleteCron = function(cronName) {
        $._.__iot_deleteCron__(cronName);

    };

    Object.freeze(that);
    cb(null, that);
};
