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
 * A proxy to schedule bundles of commands.
 *
 * @module caf_iot/proxy_iot_bundles
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const genProxy = caf_comp.gen_proxy;

exports.newInstance = async function($, spec) {

    const that = genProxy.create($, spec);

    /**
     * Adds a bundle for execution.
     *
     * The type `bundleType` is:
     *
     *      {start : number, commands : Array.<commandType>}
     *
     * and the type `commandType` is :
     *
     *      {after: number, method: string, args: Array.<jsonType>}
     *
     * @param {bundleType} bundle A new bundle to schedule.
     * @return {boolean} True if scheduled, `false` if it was too late for
     * scheduling.
     *
     * @memberof! module:caf_iot/proxy_iot_bundles#
     * @alias addBundle
     */
    that.addBundle = function(bundle) {
        return $._.__iot_addBundle__(bundle);
    };

    Object.freeze(that);
    return [null, that];
};
