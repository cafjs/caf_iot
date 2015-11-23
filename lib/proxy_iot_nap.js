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
 * A proxy to schedule a restart before shutting down the board.
 *
 * @name caf_iot/proxy_iot_nap
 * @namespace
 * @augments caf_components/gen_proxy
 *
 */

var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genProxy = caf_comp.gen_proxy;
var json_rpc = require('caf_transport').json_rpc;

/**
 * Factory method to  schedule a restart and shutdown the board.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    /**
     * Halts the board and schedules a restart.
     *
     * @param {number} afterSec Time in seconds before restart.
     *
     * @name caf_iot/proxy_iot_nap#haltAndRestart
     * @function
     */
    that.haltAndRestart = function(afterSec) {
        return $._.__iot_haltAndRestart__(afterSec);
    };


    Object.freeze(that);
    cb(null, that);
};
