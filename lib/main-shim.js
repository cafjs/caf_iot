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

const caf_comp = exports.caf_components = require('caf_components');
exports.caf_transport = require('caf_transport');
const caf_cli = exports.caf_cli = require('caf_cli');
exports.caf_sharing = require('caf_sharing');
exports.bundles = require('./bundles');
exports.plug_iot_cloud = require('./plug_iot_cloud');
exports.gen_plug_iot = require('./gen_plug_iot');

const myUtils = caf_comp.myUtils;

var staticArtifacts = {};

/*
 * See main.js
 */
exports.init = function(modules, spec, frameworkFileName, cb) {
    const cb0 = function(err, $) {
        if (cb) {
            cb(err, $);
        } else {
            if (err) {
                // eslint-disable-next-line
                console.log('Got error ' + myUtils.errToPrettyStr(err));
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

    if (window && window.location && window.location.href) {
        const specExtra = caf_cli.extractSpecFromURL(window.location.href);
        myUtils.mixin(spec.env, specExtra, true); // don't override
    }

    caf_comp.load(null, spec, frameworkFileName, modules, staticArtifacts, cb0);
};

exports.setStaticArtifacts = function(newArtifacts) {
    const old = staticArtifacts;
    staticArtifacts = newArtifacts;
    return old;
};
