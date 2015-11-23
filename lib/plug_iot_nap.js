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
 * Schedule a restart and shutdown the board.
 *
 * It uses a file shared with the management daemon to delegate the shutdown.
 * Therefore, the requesting app does not have to be in a privileged container.
 *
 * The contents of the file is just a JSON-serialized object of type:
 *
 * {op : "haltAndRestart", when : <string, i.e., a serialized Date object>}
 *
 *
 * @name caf_iot/plug_iot_nap
 * @namespace
 * @augments caf_iot/gen_plug_iot
 *
 */

var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genPlugIoT = require('./gen_plug_iot');
var path = require('path');
var fs = require('fs');

/**
 * Factory method to  schedule a restart and shutdown the board.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlugIoT.constructor($, spec);

        $._.$.log && $._.$.log.debug('New nap plug');

        assert.equal(typeof spec.env.mailboxDir, 'string',
                     "'spec.env.mailboxDir' not a string");

        assert.equal(typeof spec.env.mailboxFile, 'string',
                     "'spec.env.mailboxFile' not a string");

        var fileName = path.resolve(spec.env.mailboxDir,
                                    spec.env.mailboxFile);

        /**
         *  Halts the board and schedules a restart.
         *
         * @param {number} afterSec Time in seconds before restart.
         *
         */
        that.__iot_haltAndRestart__ = function(afterSec) {
            try {
                var when = new Date((new Date()).getTime() + 1000*afterSec);
                var cmd = {op : 'haltAndRestart', when : when.toString()};
                var data = JSON.stringify(cmd);
                fs.writeFileSync(fileName, data);
            } catch (err) {
                $._.$.log && $._.$.log.warn('Cannot haltAndRestart: ' +
                                            myUtils.errToPrettyStr(err));
            }
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
