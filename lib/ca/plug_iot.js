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
 * Plugin for IoT apps cloud support.
 *
 * This plugin runs in the cloud.
 *
 * Properties:
 *
 *        {iotMethodsFileName: string, appDir: string|null,
 *         iotDeviceManagerAppURL: string}
 *
 * where:
 *
 *  * `iotMethodsFileName`: name of the iot methods file. With a default setup
 * is `../iot/lib/iot_methods.js`.
 *  *  `appDir`: directory for `iotMethodsFileName`. With a `null` value it
 * defaults to the directory that contains the app `ca_methods.js` file, i.e.,
 * `<app_dir>/lib`.
 *  * `iotDeviceManagerAppURL`: URL of the service managing the device. Default
 * setup is `https://root-gadget.cafjs.com`.
 *
 * @module caf_iot/ca/plug_iot
 * @augments external:caf_components/gen_plug
 */
// @ts-ignore: augments not attached to a class

const assert = require('assert');
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genPlug = caf_comp.gen_plug;
const path = require('path');
const ca_iot_methods = require('./ca_iot_methods').methods;
const caf_cli = require('caf_cli');
const getParNames = require('get-parameter-names');

/* Disable the execution of the iot framework.*/
var disableExec = false;

exports.isFrameworkExecDisabled = function() { return disableExec;};

exports.newInstance = async function($, spec) {
    try {
        const that = genPlug.create($, spec);

        const tokenCache = {};

        $._.$.log && $._.$.log.debug('New IoT plug');


        assert.equal(typeof spec.env.iotMethodsFileName, 'string',
                     "'spec.env.iotMethodsFileName' is not a string");

        const appDir = spec.env.appDir || $._.$.loader.__ca_firstModulePath__();
        assert.equal(typeof appDir, 'string',
                     "'spec.env.appDir' is not a string");
        const iotMethodsFile = path.resolve(appDir,
                                            spec.env.iotMethodsFileName);
        disableExec = true;
        /*
         * The iot methods file typically also starts the IoT framework
         * by calling `caf_iot.init()`. We just want to introspect the methods
         * that the device can execute, not start the (device) framework.
         *
         * `init()` becomes a noop if  disableExec = true
         *
         */
        const iotMethods = require(iotMethodsFile).methods;
        disableExec = false;

        assert.equal(typeof spec.env.iotDeviceManagerAppURL, 'string',
                     "'spec.env.iotDeviceManagerAppURL' is not a string");

        const iotMethodsMeta = {};
        Object.keys(iotMethods)
            .filter(function(m) {
                return ((m.indexOf('__iot_') !== 0) &&
                        (typeof iotMethods[m] === 'function'));
            })
            .forEach(function(m) {
                const meta = getParNames(iotMethods[m]).map(
                    function(x) { return x.trim();}
                );
                // Get rid of the callback argument if not async
                if (iotMethods[m].constructor.name === 'AsyncFunction') {
                    // assumed async functions do not also provide a callback
                    iotMethodsMeta[m] = meta;
                } else {
                    iotMethodsMeta[m] = meta.slice(0, meta.length -1);
                }
            });


        /*
         * Returns the name and arguments of the methods invoked in the device.
         *
         * We use that information to create proxies that generate bundles of
         *  commands.
         *
         * @return {Object<string, Array.<string>>} An object with device
         *  method names as keys, and an array with argument names as values.
         */
        that.iotMethodsMeta = function() {
            return myUtils.deepClone(iotMethodsMeta);
        };

        /*
         * Registers the given token with a CA that manages the device.
         *
         * Later on, the device can download the token from this CA, starting
         * the interaction with this application.
         *
         * Note this is a best-effort, idempotent method.
         *
         *
         * @param {string} tokenStr A serialized token to access a CA.
         * @param {string} deviceName A device that is being granted access.
         */
        that.registerToken = function(tokenStr, deviceName) {
            // TO DO: migrate to the crossapp plugin
            if (tokenCache[tokenStr] !== deviceName) {
                const cli = new caf_cli.Session(
                    spec.env.iotDeviceManagerAppURL,
                    deviceName, {
                        from: 'NOBODY-UNKNOWN',
                        disableBackchannel: true,
                        session: 'default',
                        maxRetries: 0,
                        log: function(msg) {
                            $._.$.log && $._.$.log.debug(msg);
                        }
                    }
                );

                cli.onclose = function(err) {
                    if (err) {
                        $._.$.log &&
                            $._.$.log.debug('Cannot register token: ' +
                                            myUtils.errToPrettyStr(err));
                    }
                };

                cli.onopen = function() {
                    cli.addToken(tokenStr, function(err) {
                        if (err) {
                            $._.$.log &&
                                $._.$.log.debug('Error registering token: ' +
                                                myUtils.errToPrettyStr(err));
                        } else {
                            // no more retries
                            tokenCache[tokenStr] = deviceName;
                            $._.$.log &&
                                $._.$.log.debug('Token registered for device ' +
                                                deviceName);
                        }
                        cli.close();
                    });
                };
            }
        };

        /*
         * Returns methods that should be mixed in with the CA.
         *
         * @return {Object<string, function>} A map with CA methods.
         *
         */
        that.extraCAMethods = function() {
            return ca_iot_methods;
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
