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
 * Connects this device with its corresponding CA.
 *
 *
 * @name caf_iot/plug_iot_cron
 * @namespace
 * @augments caf_iot/gen_plug_iot
 *
 */

var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var json_rpc = require('caf_transport').json_rpc;

/**
 * Factory method to create cron daemons.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {

        var all = {};

        var that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New cron plug');

        that.__iot_addCron__ = function(cronName, method, args, interval) {
            that.__iot_deleteCron__(cronName);
            all[cronName] = setInterval(function() {
                try {
                    $._.queue.$.proxy.enqueue(method, args);
                } catch (err) {
                    $._.log && $._.log.trace('Error in cron:' +
                                             myUtils.errToPrettyStr(err));
                }
            }, interval);
        };

        that.__iot_deleteCron__ = function(cronName) {
            var intervalId = all[cronName];
            if (intervalId) {
                clearInterval(intervalId);
                delete all[cronName];
            }
        };

        that.__iot_stop__ = function() {
            Object.keys(all).forEach(function(x) {
                that.__iot_deleteCron__(x);
            });
        };

        var super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb) {
            that.__iot_stop__();
            super__ca_shutdown__(data, cb);
        };

        cb(null, that);

    } catch (err) {
        cb(err);
    }
};
