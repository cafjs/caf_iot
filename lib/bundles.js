// Modifications copyright 2020 Caf.js Labs and contributors
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
 * Creates timed bundles of commands.
 *
 * An example:
 *
 *        var bundle = create({foo: ['name', 'val'], bar: ['myArg']}, 2000)
 *        bundle.foo(100, ['joe', 34]).bar(250, [43]).bar(100, [98]);
 *        bundle.__iot_freeze__((new Date()).getTime() + 1000)
 *
 * It creates a bundle with three commands: 'foo', ' bar', and 'bar' again.
 *
 * The first one executes after 100msec of bundle activation, the second 250
 * msec after the first command starts, and so on...
 *
 * The number of arguments needed for each command are described in the
 * constructor by providing the argument names. The CAs `iot` plugin
 * introspects the `iot_methods.js` at run time to create that configuration.
 *
 * The bundle will activate in 3 seconds (1 sec plus the 2 second margin), if
 * it arrives to the target before that time.
 *
 * If we want to re-issue the bundle at a different time:
 *
 *        const newBundle = bundle.__iot_clone__();
 *        newBundle.__iot_freeze__(NOW)
 *
 * and now the bundle will start executing as soon as it arrives to the target.
 *
 * @module caf_iot/bundles
 */
const constants_iot = require('./constants_iot');
const assert = require('assert');
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;

const NOW =
/**
 * Force the bundle to execute as soon as it arrives to its destination.
 *
 * @type {number}
 * @memberof! module:caf_iot/bundles
 * @alias NOW
*/
exports.NOW = constants_iot.NOW;

const NOW_SAFE =
/**
 * Force the bundle to execute as soon as it arrives to its destination unless
 * it is really old.
 *
 * @type {number}
 * @memberof! module:caf_iot/bundles
 * @alias NOW_SAFE
*/
exports.NOW_SAFE = constants_iot.NOW_SAFE;

const MARGIN_IN_MSEC =
/**
 * Default extra time to allow bundle propagation.
 *
 * @type {number}
 * @memberof! module:caf_iot/bundles
 * @alias MARGIN_IN_MSEC
 */
exports.MARGIN_IN_MSEC = 2000;

/**
 * Creates a 'vanilla' object representation of a bundle.
 *
 *
 * The type `bundleType` is:
 *
 *          {start: number, commands: Array.<commandType>}
 *
 * and `commandType`:
 *
 *          {after: mumber, method: string, args: Array.<jsonType>}
 *
 * @param {bundleObjectType} bundle A bundle to transform.
 * @return {bundleType} A 'vanilla' object representation of the bundle.
 *
 * @memberof! module:caf_iot/bundles
 * @alias toObject
 *
 */
exports.toObject = function(bundle) {
    return JSON.parse(bundle.__iot_serialize__());
};

/**
 * Creates a bundle from a 'vanilla' object representation.
 *
 *
 * @param {bundleType} bundleVanilla A 'vanilla' object representation of the
 * bundle. See `toObject`.
 * @param {bundleDescriptionType=} methods Optional object with method
 *  names and arguments.
 * @param {number=} margin A safety time margin in msec added to the starting
 * time to allow bundle propagation. It defaults to `exports.MARGIN_IN_MSEC`.
 * @return {bundleObjectType} A patched bundle.
 *
 * @memberof! module:caf_iot/bundles
 * @alias fromObject
 *
 */
exports.fromObject = function(bundleVanilla, methods, margin) {
    return create(methods, margin)
        .__iot_parse__(JSON.stringify(bundleVanilla));
};

const create =
/**
 * Constructor.
 *
 * Create timed bundle of commands.
 *
 *  The type `bundleDescriptionType` is:
 *
 *         Object<string, Array.<string>>
 *
 * where the key is the name of the command, and the value an array of strings
 * with the argument names of this command.
 *
 * The command should be a method described in the `iot_methods.js` file.
 *
 * @param {bundleDescriptionType=} methods Optional object with method
 *  names and arguments.
 * @param {number=} margin A safety time margin in msec added to the starting
 * time to allow bundle propagation. It defaults to `exports.MARGIN_IN_MSEC`
 *
 * @return {bundleObjectType} A new bundle with no commands.
 *
 * @memberof! module:caf_iot/bundles
 * @alias create
 */
exports.create = function(methods, margin) {
    var commands = [];
    margin = ((typeof margin === 'number') ? margin : MARGIN_IN_MSEC);
    var start;
    methods = methods || {};
    var frozen = false;

    const that = {};

    /**
     * Parses a serialized string to initialize this bundle with commands.
     *
     * @param {string} bundleString A serialized bundle.
     * @return {bundleObjectType} This bundle initialized with commands.
     *
     * @memberof! module:caf_iot/bundles#
     * @alias __iot_parse__
     */
    that.__iot_parse__ = function(bundleString) {
        const all = JSON.parse(bundleString);
        assert(typeof all.start === 'number');
        assert(Array.isArray(all.commands));
        start = all.start;
        commands = all.commands;
        return that;
    };

    /**
     * Creates a string representation of a fully initialized bundle.
     *
     * @return {string} A serialized bundle.
     *
     * @memberof! module:caf_iot/bundles#
     * @alias __iot_serialize__
     */
    that.__iot_serialize__ = function() {
        assert(typeof start === 'number', 'Bundle start time not specified');
        return JSON.stringify({start: start, commands: commands});
    };

    /**
     * Clones this bundle to allow further modifications after freezing.
     *
     * @return {bundleObjectType} A cloned bundle.
     *
     * @memberof! module:caf_iot/bundles#
     * @alias __iot_clone__
     */
    that.__iot_clone__ = function() {
        return create(myUtils.deepClone(methods), margin)
            .__iot_parse__(that.__iot_serialize__());
    };

    /**
     * Fully initializes this bundle by setting the start
     * execution time explicitly, or based on current time.
     *
     * After this method a bundle is frozen, and needs to be cloned before it
     * can be modified.
     *
     * The starting time `newStart` could be:
     *
     *  * `NOW`: whenever the bundle arrives to its target, it will start
     * executing right away.
     *  * `NOW_SAFE`: same as `NOW` but ignoring really old bundles.
     *  * `undefined`: use the current time plus the `margin` specified in the
     * factory method.
     *  * `number`: start time in msec since  1970/01/01 UTC plus the `margin`
     * as above. If negative assumed a preprocessed `NOW_SAFE` request.
     *
     * @param {number=} newStart An optional starting time (see above).
     * @return {bundleObjectType} This bundle fully initialized.
     *
     * @memberof! module:caf_iot/bundles#
     * @alias __iot_freeze__
     */
    that.__iot_freeze__ = function(newStart) {
        if (frozen) {
            throw new Error('Bundle already frozen');
        }
        if (newStart === NOW) {
            start = newStart;
        } else if (newStart === NOW_SAFE) {
            start = -((new Date()).getTime() +
                      constants_iot.NOW_SAFE_EXPIRE_TIME_MSEC);
        } else {
            start = typeof newStart === 'number' ?
                (newStart < 0 ? newStart : newStart + margin) :
                (new Date()).getTime() + margin;
        }
        frozen = true;
        return that;
    };

    /*
     * function signature is
     *    funtion(after: number, args: [jsonType])
     *
     * where 'after' is the delay in msec from the previous command
     *
     * and 'args' is and array with the method arguments
     */
    Object.keys(methods).forEach(function(x) {
        that[x] = function() {
            if (frozen) {
                throw new Error('Bundle already frozen');
            }
            const args = Array.prototype.slice.call(arguments);
            const after = (typeof args[0] === 'number' ? args[0] : 0);
            const methodArgs = (Array.isArray(args[1]) ? args[1] : []);
            const expectedArgs = methods[x];
            if (methodArgs.length !== expectedArgs.length) {
                const err = new Error('Invalid number of arguments: expecting '
                                     + expectedArgs.length + ' got ' +
                                     methodArgs.length);
                err['expectedArgs'] = methods[x].slice(0);
                err['method'] = x;
                err['args'] = methodArgs.slice(0);
                throw err;
            }
            commands.push({after: after, method: x, args: methodArgs});
            return that;
        };
    });

    return that;
};
