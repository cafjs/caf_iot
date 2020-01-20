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
 * A proxy to access the CAF.js cloud service.
 *
 * @module caf_iot/proxy_iot_cloud
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const genProxy = caf_comp.gen_proxy;

exports.newInstance = async function($, spec) {

    const that = genProxy.create($, spec);

    /**
     * A client session to the CA.
     *
     * @see {@link external:caf_cli}
     *
     * @type {Object}
     *
     * @memberof! module:caf_iot/proxy_iot_cloud#
     * @alias cli
     *
     */
    that.cli = $._.cli;

    /**
     * Gets original method arguments from message.
     *
     * @param {msgType} msg A message
     * @return {Array.<jsonType>} An array with method arguments.
     * @throws {Error} when invalid message.
     *
     * @memberof! module:caf_iot/proxy_iot_cloud#
     * @alias getMethodArgs
     */
    that.getMethodArgs = function(msg) {
        return $._.getMethodArgs(msg);
    };

    /**
     * Installs a handler for notifications from cloud.
     *
     * The default handler logs the notification and forces a full cycle that
     * syncs with the cloud.
     *
     * Disables the handler when the argument is `null`.
     *
     * @param {function(msgType):void|null} handler A function
     * of type `function(msgType)` to process notifications.
     *
     * @memberof! module:caf_iot/proxy_iot_cloud#
     * @alias registerHandler
     */
    that.registerHandler = function(handler) {
        $._.registerHandler(handler);
    };

    Object.freeze(that);
    return [null, that];
};
