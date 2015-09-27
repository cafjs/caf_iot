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
 * A proxy to access the cloud service.
 *
 * @name caf_iot/proxy_iot_cloud
 * @namespace
 * @augments caf_components/gen_proxy
 *
 */

var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genProxy = caf_comp.gen_proxy;
var json_rpc = require('caf_transport').json_rpc;

/**
 * Factory method to create a proxy to access the cloud service.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    /**
     * A client session to the CA.
     *
     */
    that.cli = $._.cli;


    /**
     * Installs a handler for notifications from cloud.
     *
     * Disables the handler when argument is 'null'.
     *
     * @param {function(msg:Object)|| null} handler Function
     * to process notifications.
     *
     */
    that.registerHandler = function(handler) {
        $._.registerHandler(handler);
    };

    Object.freeze(that);
    cb(null, that);
};
