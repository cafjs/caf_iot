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
 * A proxy  to access the main message queue.
 *
 * @module caf_iot/proxy_iot_queue
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genProxy = caf_comp.gen_proxy;

exports.newInstance = async function($, spec) {

    const that = genProxy.create($, spec);

    /**
     * Enqueues a method call request.
     *
     * The type of `cronOptionsType` is:
     *
     *        {noSync: boolean}
     *
     * where `noSync` skips cloud synchronization.
     *
     * @param {string} methodName The method name.
     * @param {Array.<jsonType>} args The arguments.
     * @param {cronOptionsType=} options Hint on how to process the request.
     *
     * @memberof! module:caf_iot/proxy_iot_queue#
     * @alias process
     */
    that.process = function(methodName, args, options) {
        $._.process(methodName, args, options || null, function(err, data) {
            if (err) {
                $._.log && $._.log.trace('got unhandled request error' +
                                         myUtils.errToPrettyStr(err));
            } else {
                $._.log && $._.log.trace('data:' + JSON.stringify(data));
            }
        });
    };


    Object.freeze(that);
    return [null, that];
};
