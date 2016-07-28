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
 * A proxy that allows read-only access to properties for this IoT app.
 *
 * @name caf_iot/proxy_handler
 * @namespace
 * @augments caf_components/gen_proxy
 *
 */

var caf_comp = require('caf_components');
var genProxy = caf_comp.gen_proxy;

/**
 * Factory method to create a proxy to access read-only properties.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    Object.keys(spec.env || {}).forEach(function(x) {
        that[x] = spec.env[x]; // assumed immutable
    });

    Object.freeze(that);
    cb(null, that);
};
