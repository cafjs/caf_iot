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
 * Main package module.
 *
 * @module caf_iot/main
 *
 */

/* eslint-disable max-len */
/**
 * @external caf_components/gen_plug
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_plug.html}
 */

/**
 * @external caf_components/gen_container
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_container.html}
 */

/**
 * @external caf_components/gen_proxy
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_proxy.html}
 */

/**
 * @external caf_components/gen_plug_ca
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_plug_ca.html}
 */

/**
 * @external caf_components/gen_supervisor
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_supervisor.html}
 */

/**
 * @external caf_components/gen_transactional
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_transactional.html}
 */

/**
 * @external caf_components/gen_cron
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_cron.html}
 */

/**
 * @external caf_ca
 * @see {@link https://cafjs.github.io/api/caf_ca/index.html}
 */

/**
 * @external caf_sharing
 * @see {@link https://cafjs.github.io/api/caf_sharing/index.html}
 */

/**
 * @external caf_cli
 * @see {@link https://cafjs.github.io/api/caf_cli/index.html}
 */

/**
 * @external caf_session
 * @see {@link https://cafjs.github.io/api/caf_session/index.html}
 */
/* eslint-enable max-len */

var caf_comp = exports.caf_components = require('caf_components');
exports.caf_transport = require('caf_transport');
exports.caf_cli = require('caf_cli');
exports.caf_sharing = require('caf_sharing');
exports.bundles = require('./bundles');
exports.plug_iot_cloud = require('./plug_iot_cloud');
exports.gen_plug_iot = require('./gen_plug_iot');

var plug = exports.plug = require('./ca/plug_iot.js');
exports.plug_ca = require('./ca/plug_ca_iot.js');
exports.proxy = require('./ca/proxy_iot.js');

var myUtils = caf_comp.myUtils;

var initCallback = null;

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
 *  description of the framework components. It defaults to `iot.json`.
 * @param {caf.cb=} cb An optional  callback that will return an error
 * or the context `$` with the created top level component bound by its name.
 *
 *
 * @memberof! module:caf_iot/main#
 * @alias init
 */
exports.init = function(modules, spec, frameworkFileName, cb) {
    if (plug.isFrameworkExecDisabled()) {
        // Load iot methods without starting a framework
        if (cb) {
            cb(null);
        }
    } else {
        var cb0 = function(err, $) {
            if (cb) {
                cb(err, $);
            } else if (initCallback !== null) {
                initCallback(err, $);
            } else {
                if (err) {
                    // eslint-disable-next-line
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
    }
};


/**
 * Sets a default callback for the `init` method.
 *
 * @param {caf.cb} newCallback A default callback for the `init` method.
 *
 * @return {caf.cb} The old value for the callback.
 *
 * @memberof! module:caf_iot/main#
 * @alias setInitCallback
 */
exports.setInitCallback = function(newCallback) {
    var old = initCallback;
    initCallback = newCallback;
    return old;
};

// module
exports.getModule = function() {
    return module;
};
