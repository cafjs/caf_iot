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
 * A service plug to interact with IoT devices.
 * 
 * IoT devices are not expected to manage cookies or retry/redirect
 * http requests, and we need to ensure that any node.js process can
 * handle requests from any device. 
 * 
 * To do that we need to add a new route to `pipe_main.js` of the form
 * `/iot/:deviceId` so that we bypass security/uniquify steps (we rely on
 * unguessable deviceIds for security).
 * 
 * We also need to share a backend (Redis) to host the maps that we use
 * to communicate between devices and CAs.
 *  
 * It should be defined in framework.json with name 'iot_mux'.
 *
 * @name caf_iot/plug_iot
 * @namespace
 * @augments gen_redis_plug 
 */
var caf = require('caf_core');
var async = caf.async;
var genRedisPlug = require('./gen_redis_plug');
var redis = caf.redis;

var getIoT = 
'\
';

var testAndSetIoT = 
'\
';

var testAndSetAndGetIoT = 
'\
';

var luaAll = {
    testAndSetAndGetIot: testAndSetAndGetIoT,
    testAndSetIot: testAndSetIoT,
    getIoT: getIoT
};

/**
 * Factory method to create a service connector for IoT devices.
 * 
 * @see sup_main
 */
exports.newInstance = function(context, spec, secrets, cb) {

    var $ = context;
    $.log && $.log.debug('New IoT plug');
    if ($.log && $.log.isActive('TRACE')) {
        redis.debug_mode = true;
    }
    var that = genRedisPlug.constructor(spec, secrets);

    /*
     * Invokes a LUA script in the redis server.
     * 
     * Redis keeps a hash per device with name `deviceId`.
     * 
     * This hash has 4 keys with string values:
     * 
     * device_version
     * device_content
     * ca_version
     * ca_content
     * 
     * The flag isFromDevice is used to decide what keys we need:
     * 
     *  test/Set/Get with isFromDevice  true is 
     *        device_version/device_content/ca_content
     * 
     *  test/Set/Get with isFromDevice  false is 
     *        ca_version/ca_content/device_content
     * 
     *  test/Set with isFromDevice  true is 
     *        device_version/device_content
     * 
     *  test/Set with isFromDevice  false is 
     *        ca_version/ca_content
     * 
     *  Get with isFromDevice  true is 
     *        device_content
     * 
     *  Get with isFromDevice  false is 
     *        ca_content
     * 
     * 
     * @param {string} op Script name.
     * @param {boolean} isFromDevice True if request came from IoT device.
     * @param {string} deviceId Id for IoT device.
     * @param {string=} version Version number (string) of the current body.
     * @param {string=} body New JSON-serialized contents.    
     * @param {caf.cb} cb0 A callback to return results.
     */
    var doLua = function(op, isFromDevice, deviceId, version, body, cb0) {
        var argsList = [isFromDevice];
        version && argsList.push(version);
        body && argsList.push(body);
        that.doLuaOp(op, [deviceId], argsList, cb0);
    };

    var prevVersionStr = function(ver) {
        var result = "0";
        if (typeof ver === 'number') {
            result = (ver -1).toString();
        } else if (typeof ver === 'string') { 
            var version = JSON.parse(ver);
            if (typeof version === 'number') {
                return prevVersionStr(version);
            } 
        }
        return result;
    };

    /**
     * Adds an express route for accessing the state of IoT devices.
     *  
     * The device ID is mapped to `req.params.deviceId`
     * 
     * @param {Object} app An express/connect server.
     * @param {string} iotUrl A route url for IoT, e.g., '/iot/:deviceId'.
     * 
     * @name caf_iot/plug_iot#routeConfig
     * @function
     */
    that.routeConfig = function(app, iotUrl) {
        app.post(iotUrl, function(req, res) {
                     /*
                      *  req.body type is:
                      * 
                      * {toCloud: {version: number, values: Object},
                      *  fromCloud : {version:number, values: Object}}
                      * 
                      */
                     var cb0 = function(err, data) {
                         if (err) {
                             res.send('"Error: cannot read device state ' +
                                      JSON.strigify(err) + '"');
                         } else {
                             var resp = JSON.parse(data);
                             if (req.body.fromCloud && 
                                 req.body.fromCloud.version &&
                                 resp.fromCloud.version &&
                                 (req.body.fromCloud.version === 
                                  resp.fromCloud.version)) {
                                 delete resp.fromCloud.values;
                                 res.send(JSON.stringify(resp));
                             } else {
                                 res.send(data);
                             }
                         }
                     };
                     if (req.body &&  req.body.toCloud && 
                         req.body.toCloud.version) {
                         doLua('testAndSetAndGetIoT', true, req.params.deviceId,
                               prevVersionStr(req.body.toCloud.version), 
                               JSON.stringify(req.body), cb0);
                     } else {
                         // JSON string
                         res.send('"Error: no toCloud.version in input ' +
                                  JSON.stringify(req.body) + '"');
                     }
                 });
    };

    that.initClient($, $.cf.getServiceConfig('redis'), luaAll, cb);
};
