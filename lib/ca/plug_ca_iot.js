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
 * Plug for accessing an iot device associated with this CA.
 *
 * @name caf_iot/plug_ca_iot
 * @namespace
 * @augments caf_components/gen_plug_ca
 *
 */
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlugCA = caf_comp.gen_plug_ca;
var bundles = require('../bundles');
var constants_iot = require('../constants_iot');
var caf_sharing = require('caf_sharing');
var ReliableChannel = caf_sharing.ReliableChannel;
var assert = require('assert');

/**
 * Factory method for accessing an iot device associated with this CA.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {

        var that = genPlugCA.constructor($, spec);
        $._.$.log && $._.$.log.debug('New IoT CA plug');

        assert.equal(typeof spec.env.marginInMsec, 'number',
                     "'spec.env.marginInMsec' is not a number");

        that.newBundle = function(margin) {
            margin = (typeof margin === 'number' ? margin :
                      spec.env.marginInMsec);
            return bundles.newInstance($._.$.iot.iotMethodsMeta(), margin);
        };

        that.iotMethodsMeta = function() {
            return $._.$.iot.iotMethodsMeta();
        };
        
        that.sendBundleAt = function(bundle, atTime) {
            var $$ = $.sharing.$.proxy.$;
            bundle.__iot_freeze__(atTime);
            var bStr = bundle.__iot_serialize__();
            return ReliableChannel.send($$.fromCloud, constants_iot
                                        .FROM_CLOUD_CHANNEL_NAME, [bStr]);
        };

        that.registerToken = function(tokenStr) {
            // The target device name should be consistent with this CA's name.
            $._.$.iot.registerToken(tokenStr, $.ca.__ca_getName__());
        };

        // Framework methods

        var addExtraMethods = function() {
            var newMethods = $._.$.iot.extraCAMethods();
            $._.$.log && $._.$.log.debug('Adding CA methods:' +
                                         JSON.stringify(Object
                                                        .keys(newMethods)));
            myUtils.mixin($.handler, newMethods, true);
        };

        var super__ca_init__ = myUtils.superior(that, '__ca_init__');
        that.__ca_init__ = function(cb0) {
            super__ca_init__(function(err) {
                if (err) {
                    cb0(err);
                } else {
                    addExtraMethods();
                    cb0(null);
                }
            });
        };

        var super__ca_resume__ = myUtils.superior(that, '__ca_resume__');
        that.__ca_resume__ = function(cp, cb0) {
            super__ca_resume__(cp,  function(err) {
                if (err) {
                    cb0(err);
                } else {
                    addExtraMethods();
                    cb0(null);
                }
            });
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
