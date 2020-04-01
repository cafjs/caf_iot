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
 * Proxy that a CA uses to interact with an IoT device.
 *
 * @module caf_iot/ca/proxy_iot
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const genProxy = caf_comp.gen_proxy;
const constants_iot = require('../constants_iot');

exports.newInstance = async function($, spec) {

    const that = genProxy.create($, spec);

    /**
     * Force the bundle to execute as soon as it arrives to its destination.
     *
     * @type {number}
     * @memberof! module:caf_iot/ca/proxy_iot#
     * @alias NOW
     */
    that.NOW = constants_iot.NOW;

    /**
     * Creates a new bundle of commands.
     *
     * @param {number=} margin A safety time margin in msec added to the
     * starting time to allow bundle propagation. Defaults to a system wide
     * margin.
     *
     * @return {bundleObjectType} A new bundle.
     *
     * @see module:caf_iot/bundles
     * @memberof! module:caf_iot/ca/proxy_iot#
     * @alias newBundle
     *
     */
    that.newBundle = function(margin) {
        return $._.newBundle(margin);
    };

    /**
     * Returns the name and arguments of the device methods.
     *
     * We use this info internally to add bundle methods that construct
     * commands.
     *
     *  The type `bundleDescriptionType` is:
     *
     *         Object<string, Array.<string>>
     *
     * where the key is the name of the command, and the value an array of
     * strings with the argument names of this command (ignoring the last
     * callback).
     *
     * @return {bundleDescriptionType} An object with device
     *  method names as keys, and an array with argument names as values.
     *
     * @memberof! module:caf_iot/ca/proxy_iot#
     * @alias iotMethodsMeta
     */
    that.iotMethodsMeta = function() {
        return $._.iotMethodsMeta();
    };

    /**
     * Sends to the device a bundle to be executed.
     *
     * The `offset` value could be:
     *
     *  * `NOW`: whenever the bundle arrives to its target, it will start
     * executing right away.
     *  * `undefined`: use the current time plus the `margin` specified in the
     * factory method.
     *  * `number`: an offset in msec to be added to the current time plus
     *  the `margin` as above.
     *
     * To know whether the bundle was late (and ignored) we use responses in
     * `this.state.acks`, i.e., an array of max size `this.state.maxAcks`,
     * and elements of type:
     *
     *      {response: boolean, index: number}
     *
     *  where:
     *
     * * `response`: `False` if the bundle was late, `True` otherwise.
     * * `index`: An identifier for the bundle. It matches the one returned by
     * this method.
     *
     * @param {bundleObjectType} bundle A bundle to execute.
     * @param {number=} offset Time offset, see above.
     *
     * @return {number} An identifier for the bundle.
     *
     * @memberof! module:caf_iot/ca/proxy_iot#
     * @alias sendBundle
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
     * Submits a bundle to be executed by the device at a specific time.
     *
     * Note that `margin` is still added. To get rid of
     * `margin`, set it to 0 when the bundle gets created (see `newBundle`).
     *
     * @param {bundleObjectType} bundle A bundle to execute.
     * @param {number} atTime Time in msec since 1/1/1970 before bundle
     * execution or NOW.
     *
     * @return {number} An id for the bundle.
     *
     * @memberof! module:caf_iot/ca/proxy_iot#
     * @alias sendBundleAt
     */
    that.sendBundleAt = function(bundle, atTime) {
        return $._.sendBundleAt(bundle, atTime);
    };

    /**
     * Registers a token with the `caf_gadget` application instance that
     * manages this device.
     *
     * After the token has been registered, the device can have access to it
     * through its local manager, enabling secure interactions with
     * this CA.
     *
     * @param {string=} tokenStr A serialized token to access this CA. If
     * missing, the call is a no-op.
     *
     * @memberof! module:caf_iot/ca/proxy_iot#
     * @alias registerToken
     */
    that.registerToken = function(tokenStr) {
        tokenStr && $._.registerToken(tokenStr);
    };

    /**
     * Force the invocation of a method on the device. No delay or other
     * timing constraints are enforced.
     *
     * If the device is not connected, it will execute when it comes back
     * online.
     *
     * @param {string} method A device method to invoke.
     * @param {Array.<jsonType>} args An array with method arguments.
     *
     * @memberof! module:caf_iot/ca/proxy_iot#
     * @alias iotApply
     */
    that.iotApply = function(method, args) {
        const bundle = that.newBundle();
        bundle[method](0, args);
        that.sendBundle(bundle, constants_iot.NOW);
    };

    Object.freeze(that);
    return [null, that];
};
