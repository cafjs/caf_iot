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
 * A proxy to schedule bundles of commands.
 *
 * @name caf_iot/proxy_iot_bundles
 * @namespace
 * @augments caf_components/gen_proxy
 *
 */

var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genProxy = caf_comp.gen_proxy;
var json_rpc = require('caf_transport').json_rpc;

/**
 * Factory method to create a proxy to schedule bundles of commands.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    /**
     * Adds a bundle for execution.
     *
     * type caf.bundle is:
     *{start : number, commands : Array.<{after: number, method: string,
     *                                    args: [caf.json]}>}
     * @param {caf.bundle} bundle A new bundle to schedule.
     *
     */
    that.addBundle = function(bundle) {
        $._.__iot_addBundle_(bundle);
    };


    Object.freeze(that);
    cb(null, that);
};
