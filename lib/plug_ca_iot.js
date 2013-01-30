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
 * Manages all the IoT devices associated with one CA.
 *
 * The name of this component in a ca.json description should be iot_ca.
 *
 * @name caf_iot/plug_ca_iot
 * @namespace
 * @augments gen_transactional
 *
 */

var caf = require('caf_core');
var genTransactional = caf.gen_transactional;
var async = caf.async;


var addIoTOp = function(deviceId) {
    return {op: 'addIoT', deviceId: deviceId};
};

var removeIoTOp = function(deviceId) {
    return {op: 'removeIoT', deviceId: deviceId};
};

var updateIoTOp = function(deviceId, iotMap) {
    return {op: 'updateIoT', deviceId: deviceId, iotMap: iotMap};
};

/**
 * Factory method to create a plug for this CA's IoT devices.
 *
 * @see sup_main
 */
exports.newInstance = function(context, spec, secrets, cb) {

    var $ = context;
    var logActions = [];

    /* type is {<deviceId>: {deviceView: <iotMapType>, caView: <iotMapType>}}
     *
     * where type iotMapType is {deviceView: boolean, toCloud: <iotOneMapType>,
     * fromCloud: <iotOneMapType>}
     *
     * and type iotOneMapType is {version: number, values: Object=}
     *
     *
     */
    var iots = {};

    var that = genTransactional.constructor(spec, secrets);


    var replayLog = function(cb0) {
        var iterF = function(action, cb1) {
            switch (action.op) {
            case 'addIoT' :
                async.series([
                                 function(cb2) {
                                     // noop if already there.
                                     $.iot_mux.createIoT(action.deviceId, cb2);
                                 },
                                 function(cb2) {
                                     var cb3 = function(err, caView) {
                                         if (err) {
                                             cb2(err);
                                         } else {
                                             var before = 
                                                 iots[action.deviceId] || {};
                                             before.caView = caView;
                                             iots[action.deviceId] = before;
                                             cb2(null);
                                         }
                                     };
                                     $.iot_mux.readIoT(action.deviceId, false,
                                                       cb3);
                                 }
                             ],cb1);
                break;
            case 'removeIoT':
                delete iots[action.deviceId];
                cb1(null);
                break;
            case 'updateIoT':
                if (iots[action.deviceId]) {
                    var cb2 = function(err, deviceView) {
                        if (err) {
                            cb1(err);
                        } else {
                            iots[action.deviceId].deviceView = 
                                JSON.parse(deviceView);
                            iots[action.deviceId].caView = action.iotMap;
                            cb1(null);
                        }
                    };
                    $.iot_mux.updateIoT(action.deviceId, action.iotMap, cb2);
                } else {
                    cb1("Error: updating not added IoT device " +
                        action.deviceId); 
                }
                break;
            default:
                cb1('CA IoT: invalid log action ' + action.op);
            }
        };
        async.forEachSeries(logActions, iterF, function(err, data) {
                                if (err) {
                                    $.log && $.log.debug('Error in replayLog ' +
                                                         err);
                                    cb0(err, data);
                                } else {
                                    logActions = [];
                                    cb0(err, data);
                                }
                            });
    };

    that.addIoT = function(deviceId) {
        logActions.push(addIoTOp(deviceId));
    };

    that.removeIoTOp = function(deviceId) {
        logActions.push(removeIoTOp(deviceId));
    };

    that.updateIoT = function(deviceId, values) {
        logActions.push(updateIoTOp(deviceId, values));
    };

    that.readIoT = function(deviceId) {
        return iots[deviceId];
    };

    // Framework methods

    that.__ca_init__ = function(cb0) {
        logActions = [];
        cb0(null);
    };

    that.__ca_resume__ = function(cp, cb0) {
        cp = cp || {};
        iots = {};
        logActions = cp.logActions || [];
        replayLog(cb0);
    };

    that.__ca_begin__ = function(msg, cb0) {
        logActions = [];
        cb0(null);
    };

    that.__ca_prepare__ = function(cb0) {
        var toInitLog = function(ids) {
            var result = [];
            ids.forEach(function(id) {
                            result.push(addIoTOp(id));
                        });
            return result;
        };
        var initLog = toInitLog(Object.keys(iots));
        cb0(null, JSON.stringify({logActions: initLog.concat(logActions)}));
    };

    that.__ca_commit__ = function(cb0) {
        replayLog(cb0);
    };

    that.__ca_abort__ = function(cb0) {
        logActions = [];
        cb0(null);
    };


    cb(null, that);
};
