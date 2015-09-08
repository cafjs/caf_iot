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
 * Connects this device with its corresponding CA.
 *
 *
 * @name caf_iot/plug_iot_cloud
 * @namespace
 * @augments caf_iot/gen_plug_iot
 *
 */

var assert = require('assert');
var path = require('path');
var cli = require('caf_cli');
var fs = require('fs');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var json_rpc = require('caf_transport').json_rpc;

/**
 * Factory method for an connection to this device CA.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New cloud plug');

        var tokensDir = spec.env.tokensDir || $.loader.__ca_firstModulePath__();

        var loadToken = function(fileName) {
            return fs.readFileSync(path.resolve(tokensDir, fileName));
        };

        assert.equal(typeof spec.env.tokenFile, 'string',
                     "'spec.env.tokenFile' not a string");
        var token = loadToken(spec.env.tokenFile);

        assert.equal(typeof spec.env.appProtocol, 'string',
                     "'spec.env.appProtocol' not a string");

        assert.equal(typeof spec.env.appPublisher, 'string',
                     "'spec.env.appPublisher' not a string");

        assert.equal(typeof spec.env.appLocalName, 'string',
                     "'spec.env.appLocalName' not a string");

        assert.equal(typeof spec.env.appSuffix, 'string',
                     "'spec.env.appSuffix' not a string");

        var appName = json_rpc.joinName(spec.env.appPublisher,
                                        spec.env.appLocalName);

        var appFullName = appName + '.' + spec.env.appSuffix;

        assert.equal(typeof spec.env.myId, 'string',
                     "'spec.env.myId' not a string");

        var caURL = spec.env.appProtocol + '://' + appFullName;

        var cli = new cli.Session(caURL, spec.env.myId, {
            from : spec.env.myId,
            token : token,
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
            that.__ca_shutdown__(null, function(err) {
                if (err) {
                    $._.$.log &&
                        $._.$.log.debug('Got error in cloud shutdown:' +
                                        myUtils.errToPrettyStr(err));
                }
            });
        };

        cli.onerror = function(err) {
            if (err) {
                $._.$.log && $._.$.log.debug('Got error connecting to cloud:' +
                                             myUtils.errToPrettyStr(err));
            }
            // shutdown in 'onclose' afterwards
        };

        cli.onmessage = function(msg) {
            $._.$.log && $._.$.log.debug('Got notification ' +
                                         JSON.stringify(msg));
            // trigger a full cycle
            $._.queue.$.proxy.enqueue('__ca_pulse__', []);
        };

        cli.onopen = function() {
            cb(null, that);
        };
    } catch (err) {
        cb(err);
    }
};
