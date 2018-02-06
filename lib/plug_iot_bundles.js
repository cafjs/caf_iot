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
 * Executes bundles of commands respecting UTC time constraints.
 *
 * The type `bundleType` is:
 *
 *      {start : number, commands : Array.<commandType>}
 *
 * and the type `commandType` is :
 *
 *      {after: number, method: string, args: Array.<jsonType>}
 *
 * where:
 *
 * * `start:` time to activate the bundle in msec since January 1, 1970 UTC.
 *
 * * `after:` delay in msec after the previous command.
 *
 * Only one bundle can be active at any time. If a new one activates,
 * all the pending commands from previous ones are ignored.
 *
 * Activation is dependent on the bundle arriving before the `start` time,
 * i.e., late bundles are always ignored.
 *
 * The device can cache non-activated bundles, and this
 * allows pipelining of bundles.
 *
 * Why bundles and not just separate commands?
 *
 * Bundles help to provide safety guarantees. For example:
 *
 * When controlling a drone, we want to ensure that a network
 *  disconnect will leave the drone in a safe state.
 *
 * A typical bundle could command the drone to dive
 * for 3 seconds, and then with another command in the same bundle, gracefully
 * recover.
 *
 * The first command will not execute until the whole bundle is cached
 * in the drone, and then a network cut-off will not affect the recovery.
 *
 * Also, we could add a long-term recovery action as the last command, such
 * as get back to the initial position and land. As long as a new bundle
 * activates  before that command, the recovery action will get ignored.
 *
 * Moreover, by pipelining bundles with a CA, the next bundle will reach the
 * drone on time, guaranteeing smooth flying.
 *
 * @module caf_iot/plug_iot_bundles
 * @augments module:caf_iot/gen_plug_iot
 */
// @ts-ignore: augments not attached to a class


var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var crypto = require('crypto');
var HASH_ALGO = 'md5';

var OFFSET_THRESHOLD = 50;

var constants_iot = require('./constants_iot');

/* Force a bundle to start executing immediately. */
var NOW = constants_iot.NOW;

exports.newInstance = function($, spec, cb) {
    try {

        var active = null;

        var allBundles = {};

        var that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New bundles plug');

        /**
         * Gets the corrected UTC time.
         *
         * Equivalent to `(new Date()).getTime()` after applying an offset.
         *
         * @return {number} Number of msec since January 1, 1970 UTC.
         *
         * @memberof! module:caf_iot/plug_iot_bundles#
         * @alias now
         */
        that.now = function() {
            var n = (new Date()).getTime();
            var offset = ($._.$.cloud.cli &&
                          $._.$.cloud.cli.getEstimatedTimeOffset()) || 0;
            /* Small offsets means local NTP is working, and
             * it is likely to be more accurate than our poor man's pseudo-NTP
             * solution, so we ignore it.*/
            if (Math.abs(offset) > OFFSET_THRESHOLD) {
                n = n + offset;
            }
            return n;
        };

        var deleteBundle = function(bundle) {
            if (bundle) {
                $._.$.log && $._.$.log.debug('Deleting bundle: id: ' +
                                             bundle.id + ' info: ' +
                                             JSON.stringify(bundle.info));
                clearTimeout(bundle.timeoutId);
                bundle.tracker.forEach(function(x) { clearTimeout(x);});
                delete allBundles[bundle.id];
                if (active === bundle.id) {
                    active = null;
                }
            }
        };

        var activateBundle = function(bundle) {
            if (active) {
                deleteBundle(allBundles[active]);
            }
            var t = 0;
            bundle.info.commands.forEach(function(x) {
                t = t + x.after;
                var tid = setTimeout(function() {
                    try {
                        $._.$.queue.process(x.method, x.args);
                    } catch (ex) {
                        $._.$.log &&
                            $._.$.log.debug('Exception in bundle cmd:' +
                                            JSON.stringify(x) + ' ex:' +
                                            myUtils.errToPrettyStr(ex));
                    }
                }, t);
                bundle.tracker.push(tid);
            });
            active = bundle.id;
        };

        var computeBundleId = function(bundleInfo) {
            var pStr = JSON.stringify(bundleInfo);
            return crypto.createHash(HASH_ALGO).update(pStr).digest('hex');
        };

        /**
         * Adds a bundle for execution.
         *
         * @param {bundleType} bundleInfo A new bundle to schedule.
         * @return {boolean} True if scheduled, `false` if too late to schedule.
         *
         * @memberof! module:caf_iot/plug_iot_bundles#
         * @alias __iot_addBundle__
         */
        that.__iot_addBundle__ = function(bundleInfo) {
            var n = that.now();
            if (bundleInfo.start === NOW) {
                bundleInfo.start = n;
            }
            if (bundleInfo.start >= n) {
                var bundle = {info: bundleInfo, tracker: []};
                var timeoutId = setTimeout(function() {
                    activateBundle(bundle);
                }, bundleInfo.start -n);
                bundle.timeoutId = timeoutId;
                bundle.id = computeBundleId(bundleInfo);
                allBundles[bundle.id] = bundle;
                return true;
            } else {
                $._.$.log && $._.$.log.debug('Ignoring late bundle: now:' +
                                             n + ' bundle:' +
                                             JSON.stringify(bundleInfo));
                return false;
            }
        };

        /**
         * Deletes all cached bundles.
         *
         * @memberof! module:caf_iot/plug_iot_bundles#
         * @alias __iot_stop__
         */
        that.__iot_stop__ = function() {
            Object.keys(allBundles).forEach(function(x) {
                deleteBundle(allBundles[x]);
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
