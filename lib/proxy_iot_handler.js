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
 * A proxy that allows access to read-only app properties.
 *
 * By convention this proxy is called `props`.
 *
 * This means that a property  `foo`, defined in `iot.json`, can
 * be accessed as:
 *
 *      this.$.props.foo
 *
 * @module caf_iot/proxy_iot_handler
 * @augments external:caf_components/gen_proxy
 *
 */
// @ts-ignore: augments not attached to a class

var caf_comp = require('caf_components');
var genProxy = caf_comp.gen_proxy;

exports.newInstance = function($, spec, cb) {

    var that = genProxy.constructor($, spec);

    Object.keys(spec.env || {}).forEach(function(x) {
        that[x] = spec.env[x]; // assumed immutable
    });

    Object.freeze(that);
    cb(null, that);
};
