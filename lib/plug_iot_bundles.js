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
 * Executes timed bundles of commands.
 *
 * A bundle is of the form:
 *
 * {start : number, commands : Array.<{after: number, method: string,
 *                                    args: [caf.json]}>}
 *
 * where `start` is time in msec since January 1, 1970 UTC
 * ((new Date()).getTime()) synchronized with CA server time (assumed accurate).
 *
 * `after` is relative timing in msec after the previous command.
 *
 * Only one bundle can be active at any time. If a new one needs to be active
 * we stop scheduling commands for the previous one.
 *
 * Activation is dependent on the bundle arriving before the `start` time,
 * otherwise the whole bundle gets ignored.
 *
 * We can cache several non-active bundles, and this allows pipelining.
 *
 * Command execution respects serialization, and timeliness requires an almost
 *  always empty queue, and quickly executed commands.
 *
 * Bundles help to provide safety guarantees:
 *
 *  For example, when controlling a drone, we want to ensure that a network
 *  disconnect will leave
 * the drone in a safe state. Assume that we are running `caf_iot` in the
 *  drone itself. A typical bundle could command the drone to dive
 * for 3 seconds, and then with another command in the same bundle, gracefully
 * recover. The first command will not execute until the whole bundle is cached
 * in the drone, and then a network cut-off will not affect the recovery.
 *
 * Also, we could  add a long-term recovery action as the last command, such
 * as get back to the initial position and land. As long as a new bundle
 * activates  before that command, the recovery action will get ignored.
 *
 * Moreover, by pipelining bundles, the next bundle will reach the drone on
 *  time, guaranteeing smooth flying.
 *
 * @name caf_iot/plug_iot_bundles
 * @namespace
 * @augments caf_iot/gen_plug_iot
 *
 */

var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var json_rpc = require('caf_transport').json_rpc;

var OFFSET_THRESHOLD = 50;

/**
 * Factory method to execute timed bundles of commands.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {

        var active = null;

        var allBundles = {};

        var that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New bundles plug');


        that.now = function() {
            var n = (new Date()).getTime();
            var offset = $._.cloud.cli.getEstimatedTimeOffset();
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
                clearTimeout(bundle.id);
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
                        $._.queue.$.proxy.enqueue(x.method, x.args);
                    } catch (ex) {
                        $._.log && $._.log.debug('Exception in bundle cmd:' +
                                                 JSON.stringify(x) + ' ex:' +
                                                 myUtils.errToPrettyStr(ex));
                    }
                }, t);
                bundle.tracker.push(tid);
            });
            active = bundle.id;
        };

        /**
         * Adds a bundle for execution.
         *
         * type caf.bundle is:
         *{start : number, commands : Array.<{after: number, method: string,
         *                                    args: [caf.json]}>}
         * @param {caf.bundle} bundleInfo A new bundle to schedule.
         *
         */
        that.__iot_addBundle__ = function(bundleInfo) {
            var n = that.now();
            if (bundleInfo.start >= n) {
                var bundle = {info : bundleInfo, tracker: []};
                var timeoutId = setTimeout(function() {
                    activateBundle(bundle);
                }, bundleInfo.start -n);
                bundle.id = timeoutId;
                allBundles[timeoutId] = bundle;
            } else {
                $._.log && $._.log.debug('Ignoring late bundle:' +
                                         JSON.stringify(bundleInfo));
            }
        };

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
