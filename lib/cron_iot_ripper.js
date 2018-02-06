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
 *   A cron job that detects a deadlock in the main loop.
 *
 * @module caf_iot/cron_iot_ripper
 * @augments external:caf_components/gen_cron
 */
// @ts-ignore: augments not attached to a class

var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genCron = caf_comp.gen_cron;

exports.newInstance = function($, spec, cb) {
    try {
        $._.$.log && $._.$.log.debug('New ripper cron job');

        var that = genCron.constructor($, spec);

        var ripperF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            if ($._.$.queue) {
                if ($._.$.queue.__iot_progress__()) {
                    $._.$.log && $._.$.log.debug('Queue OK');
                } else {
                    $._.$.log &&
                        $._.$.log.warn('Queue deadlocked, restarting...');
                    // Shutdown will trigger a global restart
                    that.__ca_shutdown__(null, function(err) {
                        if (err) {
                            $._.$.log &&
                                $._.$.log.error('Cannot shutdown' +
                                                myUtils.errToPrettyStr(err));
                        }
                    });
                }
            }
        };

        that.__ca_start__(ripperF);

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
