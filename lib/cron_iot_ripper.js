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

const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genCron = caf_comp.gen_cron;

exports.newInstance = async function($, spec) {
    try {
        $._.$.log && $._.$.log.debug('New ripper cron job');

        const that = genCron.constructor($, spec);

        const ripperF = function() {
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

        return [null, that];
    } catch (err) {
        return [err];
    }
};
