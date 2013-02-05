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

    /* {deviceId: Array.<{key: string=, value: Object=, command: string=}>
     *
     *  where: an undefined value & command means delete the key .
     *        an undefined value & key means queue a new command for the device.
     */
    var changes = {};

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
                                     var cb3 = function(err, allViews) {
                                         if (err) {
                                             cb2(err);
                                         } else {
                                             iots[action.deviceId] = allViews;
                                             cb2(null);
                                         }
                                     };
                                     $.iot_mux.readIoT(action.deviceId, cb3);
                                 }
                             ], cb1);
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

    var updateIoT = function(deviceId, iotMap) {
        logActions.push(updateIoTOp(deviceId, iotMap));
    };


    that.putValueIoT = function(deviceId, key, value) {
        var deltas = changes[deviceId] || [];
        deltas.push({key: key, value: value});
        changes[deviceId] = deltas;
    };

    that.deleteValueIoT = function(deviceId, key) {
        that.putValueIoT(deviceId, key);
    };

    that.addCommand = function(deviceId, command) {
        var deltas = changes[deviceId] || [];
        deltas.push({command: command});
        changes[deviceId] = deltas;
    };

    that.getIoT = function(deviceId) {
        return iots[deviceId];
    };

    that.getToCloudValuesIoT = function(deviceId) {
        var result = iots[deviceId];
        return result && result.deviceView && result.deviceView.toCloud &&
            result.deviceView.toCloud.values ;
    };

    that.getFromCloudValuesIoT = function(deviceId) {
        var result = iots[deviceId];
        return result && result.caView && result.caView.fromCloud &&
             result.caView.fromCloud.values;
    };


    that.listDevices = function() {
        return Object.keys(iots);
    };

    that.getCommandsOutput = function(deviceId) {
        var deviceViewToCloud =  iots[deviceId] && iots[deviceId].deviceView &&
            iots[deviceId].deviceView.toCloud;
        /* Commands outputs type is
         *
         * {type: "caf_iot.channel", firstIndex: number,
         * values: Array.<string>}
         *
         */
        return deviceViewToCloud && deviceViewToCloud.values &&
            deviceViewToCloud.values.commands;
    };


    /*
     *  Garbage collect commands that were sent to the device, and we
     * know the device has already processed
     *
     * @param A set containing all the changed devices.
     *
     * @return {boolean} True if any table was modified.
     */
    var gcCommands = function(changeSet) {
        for (var deviceId in iots) {
            var lastSeenVersion = iots[deviceId].deviceView &&
                iots[deviceId].deviceView.fromCloud &&
                iots[deviceId].deviceView.fromCloud.version;
            var caViewFromCloud = iots[deviceId].caView &&
                iots[deviceId].caView.fromCloud;
            var lastVersion = caViewFromCloud && caViewFromCloud.version;

            /* Commands type is
             *
             * {type: "caf_iot.channel", firstIndex: number,
             * values: Array.<string>}
             *
             */
            var commands = caViewFromCloud && caViewFromCloud.values &&
                caViewFromCloud.values.commands;
            if (lastSeenVersion && lastVersion &&
                (lastSeenVersion === lastVersion) && commands &&
                commands.values) {
                commands.firstIndex = commands.firstIndex +
                    commands.values.length;
                delete commands.values;
                changeSet[deviceId] = true;
            }
        }
    };


    var applyChanges = function() {
        var changeSet = {};
        var deviceId;
        var caViewFromCloud ;
        var caViewToCloud;
        var deviceViewToCloud;

        // Adding to change set:
        //
        // First: those that we can garbage collect the commands  sent to them
        gcCommands(changeSet);

        // Second: those changed by the processing of the message
        for (deviceId in changes) {
            caViewFromCloud = iots[deviceId].caView &&
                iots[deviceId].caView.fromCloud;
            if (changes[deviceId].length > 0) {
                changeSet[deviceId] = true;
                if (caViewFromCloud.values === undefined) {
                    caViewFromCloud.values = {};
                }
                changes[deviceId]
                    .forEach(function(x) {
                                 if ((x.value === undefined) &&
                                     (x.command === undefined)) {
                                     delete caViewFromCloud.values[x.key];
                                 } else if (x.key) {
                                     caViewFromCloud.values[x.key] = x.value;
                                 } else if (x.command) {
                                     if (caViewFromCloud.values.commands ===
                                         undefined) {
                                         var commands =
                                             {type: 'caf_iot.channel',
                                              firstIndex: 0,
                                              values: []};
                                         caViewFromCloud.values.commands =
                                             commands;
                                     }
                                     if (caViewFromCloud.values.commands.values
                                         === undefined) {
                                         caViewFromCloud.values.commands
                                             .values = [];
                                     }
                                     caViewFromCloud.values.commands
                                         .values.push(x.command);
                                 }
                             });
            }
        }

        // Increment version when fromCloud modified
        for (deviceId in changeSet) {
            caViewFromCloud = iots[deviceId].caView.fromCloud;
            caViewFromCloud.version = caViewFromCloud.version + 1;
        }

        /* Third: those that we have seen the replies, and we need to
         help the device to GC them.*/
        for (deviceId in iots) {
            caViewToCloud = iots[deviceId].caView.toCloud;
            deviceViewToCloud =  iots[deviceId].deviceView.toCloud;
            if (caViewToCloud.version !== deviceViewToCloud.version) {
                caViewToCloud.version = deviceViewToCloud.version;
                changeSet[deviceId] = true;
            }
        }

        // Finally, push all of them to trigger a full refresh
        for (deviceId in iots) {
            updateIoT(deviceId, iots[deviceId].caView);
        }

    };

    // Framework methods

    that.__ca_init__ = function(cb0) {
        logActions = [];
        changes = {};
        cb0(null);
    };

    that.__ca_resume__ = function(cp, cb0) {
        cp = cp || {};
        iots = {};
        logActions = cp.logActions || [];
        changes = {};
        replayLog(cb0);
    };

    that.__ca_begin__ = function(msg, cb0) {
        logActions = [];
        changes = {};
        cb0(null);
    };

    var toInitLog = function(ids) {
        var result = [];
        ids.forEach(function(id) {
                        result.push(addIoTOp(id));
                    });
        return result;
    };

    that.__ca_prepare__ = function(cb0) {
        var initLog = toInitLog(Object.keys(iots));
        applyChanges();
        cb0(null, JSON.stringify({logActions: initLog.concat(logActions)}));
    };

    that.__ca_commit__ = function(cb0) {
        replayLog(cb0);
    };

    that.__ca_abort__ = function(cb0) {
        // fast-forward to ignore changes to iots in applyChanges()
        that.__ca_resume__({logActions: toInitLog(Object.keys(iots))}, cb0);
    };


    cb(null, that);
};
