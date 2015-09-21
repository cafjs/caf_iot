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

var constants_iot = require('./constants_iot');
var assert = require('assert');

var NOW = exports.NOW = constants_iot.NOW;

/* Extra time to allow bundle propagation. */
var MARGIN_IN_MSEC = exports.MARGIN_IN_MSEC = 2000;

var toObject = exports.toObject = function(bundle) {
    return JSON.parse(bundle.__iot_serialize__());
};

var fromObject = exports.fromObject = function(bundleObj, methods, margin) {
    return newInstance(methods, margin)
        .__iot_parse__(JSON.stringify(bundleObj));
};

/**
 * Factory method for a bundle of commands.
 *
 * @param {Array.<string>=} methods Optional array of method names.
 * @param {number=} margin Options safety time margin to allow bundle
 *  propagation in msec. It defaults to exports.MARGIN_IN_MSEC
 *
 * @return {Object} An empty  bundle.
 */
var newInstance = exports.newInstance = function(methods, margin) {
    var commands = [];
    margin = ((typeof margin === 'number') ? margin : MARGIN_IN_MSEC);
    var start;
    methods = methods || [];
    var frozen = false;

    var that = {};

    /**
     * Parses a serialized string to initialize this bundle with commands.
     *
     * @param {string} bundleString A serialized bundle.
     *
     */
    that.__iot_parse__ = function(bundleString) {
        var all = JSON.parse(bundleString);
        assert(typeof all.start === 'number');
        assert(Array.isArray(all.commands));
        start = all.start;
        commands = all.commands;
        return that;
    };

    /**
     * Create a string representation of fully initialized bundle.
     *
     * @return {string} A serialized bundle.
     */
    that.__iot_serialize__ = function() {
        assert(typeof start === 'number', 'Bundle start time not specified');
        return JSON.stringify({start: start, commands: commands});
    };

    /**
     * Clone this bundle to allow further modifications after freezing.
     *
     * @return {Object} A cloned bundle.
     */
    that.__iot_clone__ = function() {
        return newInstance(methods.slice(0), margin)
            .__iot_parse__(that.__iot_serialize__());
    };

    /**
     * Declare this bundle fully initialized, setting the bundle start
     * execution time explicitly or based on current time.
     *
     * After this method a bundle needs to be cloned before it can be modified.
     *
     * @param {number=} newStart An optional starting time (msec since
     * 1970/01/01) for this bundle, or NOW -meaning whenever the bundle arrives
     *  to its target-. If not specified we use the current time as base. In
     * all cases (except NOW) we always add the `margin` time specified in
     * the factory method to allow bundle propagation.
     */
    that.__iot_freeze__ = function(newStart) {
        if (frozen) {
            throw new Error('Bundle already frozen');
        }
        if (newStart === NOW) {
            start = newStart;
        } else {
            start = ((typeof newStart === 'number') ? newStart + margin :
                     (new Date()).getTime() + margin);
        }
        frozen = true;
        return that;
    };

    /*
     * function signature is
     *    funtion(after: number, args: [caf.json])
     *
     * where 'after' is the delay in msec from the previous command
     *
     * and 'args' is and array with the method arguments
     */
    methods.forEach(function(x) {
        that[x] = function() {
            if (frozen) {
                throw new Error('Bundle already frozen');
            }
            var args = Array.prototype.slice.call(arguments);
            var after = (typeof args[0] === 'number' ? args[0] : 0);
            var methodArgs = (Array.isArray(args[1]) ? args[1] : []);
            commands.push({after : after, method : x, args: methodArgs});
            return that;
        };
    });

    return that;
};
