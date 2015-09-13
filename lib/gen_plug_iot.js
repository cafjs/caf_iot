/*!
Copyright 2014 Hewlett-Packard Development Company, L.P.

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
 * Generic plug component associated with an IoT device.
 *
 * A plug IoT provides an interface to an external or local service. This
 * interface is typically wrapped into a stateless secure proxy before it gets
 *  exposed to application code.
 *
 * A plug IoT acts as a root container for that proxy, mediating access to other
 * internal services.
 *
 * By convention this proxy is always named 'proxy' so that it can be accessed
 * as <plugIoTRef>.$.proxy
 *
 *
 * @name gen_plug_iot
 * @namespace
 * @augments gen_transactional
 */
var caf_comp = require('caf_components');
var genTransactional = caf_comp.gen_transactional;


/**
 * Constructor method for a generic plug IoT component.
 *
 * @see gen_component
 *
 */
exports.constructor = function($, spec) {

    var that = genTransactional.constructor($, spec);

    // become the root component of the children context
    that.$._ = that;
    that.$.loader = $._.$.loader;

    /**
     * Run-time type information.
     *
     * @type {boolean}
     * @name gen_plug#__ca_isPlugIoT__
     */
    that.__ca_isPlugIoT__ = true;


    return that;
};
