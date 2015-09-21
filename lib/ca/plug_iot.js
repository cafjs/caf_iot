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
 * Plugin for IoT apps cloud support.
 *
 * This plugin runs in the cloud.
 *
 *
 * @name caf_iot/plug_iot
 * @namespace
 * @augments gen_plug
 *
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlug = caf_comp.gen_plug;
var async = caf_comp.async;
var path = require('path');
var ca_iot_methods = require('./ca_iot_methods').methods;


/* Disable the execution of the iot framework.*/
var disableExec = false;

exports.isFrameworkExecDisabled = function() { return disableExec;};

/**
 * Factory method to support IoT apps in the cloud.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlug.constructor($, spec);

        $._.$.log && $._.$.log.debug('New IoT plug');


        assert.equal(typeof spec.env.iotMethodsFileName, 'string',
                     "'spec.env.iotMethodsFileName' is not a string");

        var appDir = spec.env.appDir || $._.$.loader.__ca_firstModulePath__();
        assert.equal(typeof appDir, 'string',
                     "'spec.env.appDir' is not a string");
        var iotMethodsFile = path.resolve(appDir, spec.env.iotMethodsFileName);
        disableExec = true;
        /*
         * The iot methods file typically also starts the IoT framework
         * by calling `caf_iot.init()`. We just want to introspect the methods
         * that the device can execute, not start the (device) framework.
         *
         * `Init` becomes a noop if  disableExec = true
         *
         */
        var iotMethods = require(iotMethodsFile).methods;
        disableExec = false;

        var methodNames = Object.keys(iotMethods).filter(function(m) {
            return ((m.indexOf('__iot_') !== 0) &&
                    (typeof iotMethods[m] === 'function'));
        });

        /**
         * Returns the name of the methods invoked in the device.
         *
         * We use that information to create proxies that generate bundles of
         *  commands.
         *
         * @return {Array.<string>} An array with device method names.
         */
        that.iotMethodNames = function() {
            return methodNames.slice(0);
        };

        /**
         * Returns methods that should be mixed in with the CA.
         *
         * @return {Object<string, function>} A map with CA methods.
         *
         */
        that.extraCAMethods = function() {
            return ca_iot_methods;
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
