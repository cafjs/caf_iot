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

var caf_comp = exports.caf_components = require('caf_components');
exports.caf_transport = require('caf_transport');
exports.caf_cli = require('caf_cli');
exports.caf_platform = require('caf_platform');
exports.caf_sharing = require('caf_sharing');
var myUtils = caf_comp.myUtils;


exports.plug = require('./plug_iot.js');
exports.plug_ca = require('./plug_ca_iot.js');
exports.proxy = require('./proxy_iot.js');

exports.ca_iot = require('./ca_iot.js');


/**
 * Main initialization function for the IoT framework.
 *
 * This is typically the last call in your `iot_methods.js` file.
 *
 * It recursively loads and instatiates all the components described
 * in `iot.json`. When all of them are active, it connects to its CA to
 * receive instructions and upload sensor data.
 *
 * @param {(Module | Array.<Module>)=} modules An optional sequence of modules
 *  (or just one) to load descriptions and implementations .
 * @param {caf.specType=} spec Extra configuration data that will be merged
 *  with the framework components description. For example, to override the
 *  default name of the top component using `spec.name`.
 * @param {string=} frameworkFileName An optional file name containing a
 *  description of the framework components. It defaults to 'io.json'.
 * @param {caf.cb=} cb An optional  callback that will return an error
 * or the context `$` with the created top level
 * component bound by its name, or an error.
 *
 */
exports.init = function(modules, spec, frameworkFileName, cb) {
    var cb0 = function(err, $) {
         if (cb) {
            cb(err, $);
        } else {
            if (err) {
                console.log('Got error ' + myUtils.errToPrettyStr(err));
                process.exit(1);
            } else {
                $._.$.log && $._.$.log.debug('READY Q5JsdqWGXOzqOFg ');
            }
        }
    };
    frameworkFileName = frameworkFileName || 'iot.json';

    if (modules && !Array.isArray(modules)) {
        modules = [modules];
    }

    modules = modules || [];
    modules.push(module);

    spec = spec || {};
    spec.env = spec.env || {};

    caf_comp.load(null, spec, frameworkFileName, modules, cb0);

};


