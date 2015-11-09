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
 * Proxy to access an IoT device.
 *
 * @name caf_iot/proxy_iot
 * @namespace
 * @augments gen_proxy
 *
 */
var caf_comp = require('caf_components');
var genProxy = caf_comp.gen_proxy;
var constants_iot = require('../constants_iot');


/**
 * Factory method to interact with an IoT device.
 *
 * @see sup_main
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);


    that.NOW = constants_iot.NOW;

    /**
     * Creates a new bundle of commands.
     *
     * @param {number=} margin The extra time in msec to allow bundle
     *  propagation. Defaults to a system wide margin.
     *
     * @return {Object} A new bundle.
     * @name caf_iot/newBundle
     * @function
     *
     */
    that.newBundle = function(margin) {
        return $._.newBundle(margin);
    };

    /**
     * Sends a bundle to the device for execution.
     *
     * @param {Object} bundle A bundle to execute.
     * @param {number=} offset Time in msec before bundle execution. It does
     * NOT include the 'margin' value. Use NOW to always force bundle execution
     *  upon arrival. The default is to add the 'margin' value.
     *
     * @name caf_iot/sendBundle
     * @function
     */
    that.sendBundle = function(bundle, offset) {
        var atTime;
        if (offset === constants_iot.NOW) {
            atTime = offset;
        } else if (typeof offset === 'number') {
            atTime = (new Date()).getTime() + offset;
        } else {
            atTime = (new Date()).getTime();
        }
        return that.sendBundleAt(bundle, atTime);
    };

    /**
     * Submits a bundle to be executed at an specific time by the device.
     *
     * @param {Object} bundle A bundle to execute.
     * @param {number} atTime Time in msec since 1/1/1970 before bundle
     * execution. It does NOT include the 'margin' value. To get rid of
     * 'margin', set it to 0 when the bundle gets created (see 'newBundle').
     * Use NOW to always force bundle execution upon arrival.
     *
     * @name caf_iot/sendBundle
     * @function
      */
    that.sendBundleAt = function(bundle, atTime) {
        return $._.sendBundleAt(bundle, atTime);
    };

    /**
     * Registers a token with the `caf_gadget` application instance that
     * manages this device.
     *
     * After the token has been registered, the device will have access to it,
     * and it will start interacting with this CA.
     *
     * @param {string} tokenStr A serialized token to access this CA.
     *
     * @name caf_iot/registerToken
     * @function
     */
    that.registerToken = function(tokenStr) {
        $._.registerToken(tokenStr);
    };

    Object.freeze(that);
    cb(null, that);
};
