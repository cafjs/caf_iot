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
 * Creates periodic tasks.
 *
 *
 * @module caf_iot/plug_iot_cron
 * @augments module:caf_iot/gen_plug_iot
 */
// @ts-ignore: augments not attached to a class


const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genPlugIoT = require('./gen_plug_iot');

exports.newInstance = async function($, spec) {
    try {
        const all = {};

        const that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New cron plug');

        that.__iot_addCron__ = function(cronName, method, args, interval,
                                        options) {
            that.__iot_deleteCron__(cronName);
            all[cronName] = setInterval(function() {
                try {
                    if (typeof args === 'function') {
                        args(function(err, realArgs) {
                            if (err) {
                                const errMsg = 'Error in cron args():';
                                $._.$.log &&
                                    $._.$.log.warn(
                                        errMsg + myUtils.errToPrettyStr(err)
                                    );
                            } else {
                                if (Array.isArray(realArgs)) {
                                    $._.$.queue.process(method, realArgs,
                                                        options);
                                } else {
                                    $._.$.log &&
                                        $._.$.log.debug('Ignoring in cron:' +
                                                        realArgs);
                                }
                            }
                        });
                    } else {
                        $._.$.queue.process(method, args, options);
                    }
                } catch (err) {
                    $._.$.log && $._.$.log.debug('Error in cron:' +
                                                 myUtils.errToPrettyStr(err));
                }
            }, interval);
        };

        that.__iot_deleteCron__ = function(cronName) {
            const intervalId = all[cronName];
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

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb) {
            that.__iot_stop__();
            super__ca_shutdown__(data, cb);
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
