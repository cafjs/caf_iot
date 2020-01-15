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
 * Connects this device with its corresponding CA.
 *
 * Properties:
 *
 *      {tokenFile: string, appProtocol: string, appPublisher: string,
 *       appLocalName: string, appSuffix: string, session: string}
 *
 * where:
 *
 * * `tokenFile`: the name of a file containing an authentication token.
 * * `appProtocol`: protocol to contact the CA, e.g., `https`.
 * * `appPublisher`: the publisher of this app.
 * * `appLocalName`: the local name of the app.
 * * `appSuffix`: the URL suffix, e.g., `cafjs.com`.
 * * `session`: The persistent session identifier.
 *
 * @module caf_iot/plug_iot_cloud
 * @augments module:caf_iot/gen_plug_iot
 *
 */
// @ts-ignore: augments not attached to a class

const assert = require('assert');
const path = require('path');
const caf_cli = require('caf_cli');
const fs = require('fs');
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genPlugIoT = require('./gen_plug_iot');
const json_rpc = require('caf_transport').json_rpc;

exports.newInstance = function($, spec, cb) {
    try {
        const that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New cloud plug');

        const loadToken = function(fileName) {
            try {
                if (typeof fs.readFileSync === 'function') {
                    const tokenDir = spec.env.tokenDir ||
                              $.loader.__ca_firstModulePath__();
                    return fs.readFileSync(path.resolve(tokenDir, fileName),
                                           {encoding: 'utf8'}).trim();
                } else {
                    // browserify, token in the url
                    return caf_cli.extractTokenFromURL(window.location.href);
                }
            } catch (ex) {
                $._.$.log && $._.$.log.warn(' NO TOKEN ' +
                                            myUtils.errToPrettyStr(ex));
                return null;
            }
        };

        assert.equal(typeof spec.env.tokenFile, 'string',
                     "'spec.env.tokenFile' not a string");
        const token = loadToken(spec.env.tokenFile);

        assert.equal(typeof spec.env.appProtocol, 'string',
                     "'spec.env.appProtocol' not a string");

        assert.equal(typeof spec.env.appPublisher, 'string',
                     "'spec.env.appPublisher' not a string");

        assert.equal(typeof spec.env.appLocalName, 'string',
                     "'spec.env.appLocalName' not a string");

        assert.equal(typeof spec.env.appSuffix, 'string',
                     "'spec.env.appSuffix' not a string");

        assert.equal(typeof spec.env.session, 'string',
                     "'spec.env.session' not a string");

        const appName = json_rpc.joinName(spec.env.appPublisher,
                                          spec.env.appLocalName);

        const appFullName = appName + '.' + spec.env.appSuffix;

        const caURL = spec.env.appProtocol + '://' + appFullName;

        const myId = $._.__ca_getName__();

        if (token !== null) {
            const cli = new caf_cli.Session(caURL, myId, {
                from: myId,
                token: token,
                session: spec.env.session,
                log: function(msg) {
                    $._.$.log && $._.$.log.debug(msg);
                }
            });

            that.cli = cli;

            cli.onclose = function(err) {
                if (err) {
                    $._.$.log && $._.$.log.debug('Error connecting to cloud:' +
                                                 myUtils.errToPrettyStr(err));
                }
                if (!that.__ca_isShutdown__) {
                    that.__ca_shutdown__(null, function(err) {
                        if (err) {
                            $._.$.log &&
                                $._.$.log.debug('Got error in cloud shutdown:' +
                                                myUtils.errToPrettyStr(err));
                        }
                    });
                }
            };

            cli.onerror = function(err) {
                if (err) {
                    $._.$.log && $._.$.log.debug('Error connecting to cloud:' +
                                                 myUtils.errToPrettyStr(err));
                }
                // shutdown in 'onclose' afterwards
            };

            cli.onopen = function() {
                cb(null, that);
            };

        } else {
            // no Token, do not create a session
            that.cli = null;
            $._.$.log && $._.$.log.warn('Disabling cloud client');
            cb(null, that);
        }

        /**
         * Gets original method arguments from message.
         *
         * @param {msgType} msg A message
         * @return {Array.<jsonType>} An array with method arguments.
         * @throws {Error} when invalid message.
         *
         * @memberof! module:caf_iot/plug_iot_cloud#
         * @alias getMethodArgs
         */
        that.getMethodArgs = function(msg) {
            return caf_cli.getMethodArgs(msg);
        };

        /**
         * Registers a handler to process messages.
         *
         * This is equivalent to `that.cli.onmessage = handler`
         *
         * @param {function(msgType):void|null} handler A function of type
         * `function(msgType)` to process notifications. `null` deregisters
         * previous handlers.
         *
         * @memberof! module:caf_iot/plug_iot_cloud#
         * @alias registerHandler
         */
        that.registerHandler = function(handler) {
            if (that.cli) {
                that.cli.onmessage = function(msg) {
                    handler && handler(msg);
                };
            } else {
                $._.$.log && $._.$.log.warn('Ignoring registerHandler:' +
                                            'Missing cloud client');
            }
        };

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            super__ca_shutdown__(data, function(err, data) {
                that.cli && that.cli.close();
                cb0(err, data);
            });
        };

    } catch (err) {
        cb(err);
    }
};
