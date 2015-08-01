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
 * A proxy that allows a CA to access its input queue.
 *
 * @name caf_iot/proxy_iot_queue
 * @namespace
 * @augments caf_components/gen_proxy
 *
 */

var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genProxy = caf_comp.gen_proxy;
var json_rpc = require('caf_transport').json_rpc;

/**
 * Factory method to create a proxy to access an input queue.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    /**
     * Gets the number of pending messages in the input queue.
     *
     * @return {number} The number of messages in the input queue.
     *
     * @name caf_ca/proxy_inqueue#queueLength
     * @function
     */
    that.queueLength = function() {
        return $._.getQueue().length();

    };

    that.process = function(msg, cb0) {
        $._.process(msg, cb0);
    };

    /**
     * Enqueues a method call request.
     *
     * @param {string} methodName The method name.
     * @param {Array.<caf.json>} args The arguments.
     */
    that.enqueue = function(methodName, args) {
        var argsArray = args.slice(0);
        argsArray.unshift(json_rpc.SYSTEM_FROM); // `to` field ignored
        var msg = json_rpc.systemRequest.apply(json_rpc.systemRequest,
                                               argsArray);
        $._.process(msg, function(err, data) {
            if (err) {
                $._.log && $._.log.trace('got unhandled request error' +
                                         myUtils.errToPrettyStr(err));
            } else {
                $._.log && $._.log.trace('data:' + JSON.stringify(data));
            }
        });
    };


    Object.freeze(that);
    cb(null, that);
};
