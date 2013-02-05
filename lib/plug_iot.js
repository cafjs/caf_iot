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
var genRedisPlug = caf.gen_redis_plug;
var redis = caf.redis;

/*
 * Creates an empty hash for an IoT device. Does nothing if already created.
 *
 * KEYS deviceId
 *
 * ARGV[1] Ignored
 *
 * ARGV[2] Init device view
 * ARGV[3] Init ca View
 */
var createIoT =
'if redis.call("exists", KEYS[1]) == 0 then \
    return redis.call("hmset", KEYS[1], "device_version", 0, "device_content",\
                      ARGV[2], "ca_version", 0, "ca_content", ARGV[3] );\
else \
    return {ok ="OK"} \
end ';

/*
 * Deletes a hash for an IoT device
 *
 * KEYS deviceId
 *
 */
var deleteIoT = 'return redis.call("del", KEYS[1]) ';


/*
 * Gets "device_content" if isFromDevice is 1
 * or  "ca_content" if isFromDevice is 0.
 *
 * KEYS deviceId
 *
 * Returns an array of [device_content, ca_content]
 */
var getIoT =
'if redis.call("exists", KEYS[1]) == 0 then \
   return {err ="Error: IoT device "  .. KEYS[1] .. " does not exist"} \
else \
   return redis.call("hmget", KEYS[1], "device_content", "ca_content") \
end ';


/*
 * Checks whether the new version is >= the one in redis and then resets
 * the IoT device info. We overwrite on equality to ensure we can increment
 * versions of other views for garbage collection.
 * It returns an error if the check fails.
 *
 * KEYS deviceId
 *

 * ARGV[1] 1 if  device_version/device_content will be updated, 0  if
 * ca_version, ca_content should be updated instead.
 * ARGV[2] new device_version or  ca_version
 * ARGV[3] new device_content or ca_content
 */
var testAndSetAndGetIoT =
'local function testAndSet (versionStr, contentStr, readContentStr, key, version, \
                     content) \
   local oldVersion =  tonumber(redis.call("hget", key, versionStr)); \
   if oldVersion == nil then \
      return {err ="Error: bad version number "  .. oldVersion } \
   elseif oldVersion > tonumber(version) then \
      return {err ="Error: old version > version "  .. oldVersion } \
   else \
      redis.call("hmset", key, versionStr, version, contentStr, content ); \
      return redis.call("hget", key, readContentStr); \
   end \
end \
if redis.call("exists", KEYS[1]) == 0 then \
    return {err ="Error: IoT device "  .. KEYS[1] .. " does not exist"} \
elseif  ARGV[1] == "1" then \
   return testAndSet("device_version", "device_content", "ca_content", \
                     KEYS[1], ARGV[2], ARGV[3]); \
elseif  ARGV[1] == "0" then \
   return testAndSet("ca_version", "ca_content", "device_content", \
                     KEYS[1], ARGV[2], ARGV[3]); \
else \
    return {err ="Error: Invalid isFromDevice flag "  .. ARGV[1]} \
end ';

var luaAll = {
    createIoT: createIoT,
    deleteIoT: deleteIoT,
    testAndSetAndGetIoT: testAndSetAndGetIoT,
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
     * The flag isFromDevice is used to decide what keys we need to update:
     *
     *  test/Set with isFromDevice  true is
     *        device_version/device_content
     *
     *  test/Set with isFromDevice  false is
     *        ca_version/ca_content
     *
     *  Get with isFromDevice  true is
     *        [device_version, device_content]
     *
     *  Get with isFromDevice false is
     *        [ca_version, ca_content]
     *
     *  test/Set/Get  is similar to test/Set but negates isFromDevice before
     *   performing the  Get.
     *
     *
     * @param {string} op Script name.
     * @param {boolean} isFromDevice True if request came from IoT device.
     * @param {string} deviceId Id for IoT device.
     * @param {number=} nextVersion Next version number (string) of the body
     * or null.
     * @param {string=} body New JSON-serialized contents or null.
     * @param {caf.cb} cb0 A callback to return results.
     */
    var doLua = function(op, isFromDevice, deviceId,
                         nextVersion, body, cb0) {
        var argsList = (isFromDevice ? [1] : [0]);
        (nextVersion !== null) && argsList.push(nextVersion);
        (body !== null) && argsList.push(body);
        that.doLuaOp(op, [deviceId], argsList, cb0);
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
                      *  fromCloud : {version:number}}
                      *
                      */
                     var cb0 = function(err, data) {
                         if (err) {
                             /* Responses that (JSON) parse into a string
                              * (as opposed to an object) are assumed by the
                              *  client to be errors.
                              */
                             res.send(JSON.stringify('Error: cannot update' +
                                                     ' device state ' +
                                                     JSON.stringify(err)));
                         } else {
                             /* TODO: skip sending again values if already
                              * cached in client.
                              */
                             res.send(data);
                         }
                     };
                     if (req.body &&  req.body.toCloud &&
                         req.body.toCloud.version) {
                         var version =
                             (typeof req.body.toCloud.version === 'string' ?
                              parseInt(req.body.toCloud.version) :
                              req.body.toCloud.version);
                         if ((typeof version !== 'number') ||
                             (isNaN(version))) {
                             cb0("version: " + req.body.toCloud.version +
                                 " is not a number");
                         } else {
                             doLua('testAndSetAndGetIoT', true,
                                   req.params.deviceId, version,
                                   JSON.stringify(req.body), cb0);
                         }
                     } else {
                         /* version 0 or no version means we need to re-sync
                          * (for example, stateless client just started)
                          * and we return last device_content/ca_content
                          */
                         doLua('getIoT', true, req.params.deviceId, null, null,
                               cb0);
                     }
                 });
    };

    /**
     * Initializes state (empty, version 0) for an IoT device.
     *
     * @param {string} deviceId A globally unique identifier for the device.
     * @param {caf.cb} cb0 A callback to return errors.
     *
     * @name caf_iot/plug_iot#createIoT
     * @function
     */
    that.createIoT = function(deviceId, cb0) {
        var empty = {deviceView : true,
                     toCloud: {version: 0, values: {}},
                     fromCloud: {version: 0, values: {}}};
        var st1 = JSON.stringify(empty);
        empty.deviceView = false;
        var st2 = JSON.stringify(empty);
        doLua('createIoT', false, deviceId, st1, st2, cb0);
    };


    /**
     * Deletes the state of an IoT device.
     *
     * @param {string} deviceId A globally unique identifier for the device.
     * @param {caf.cb} cb0 A callback to return errors.
     *
     * @name caf_iot/plug_iot#deleteIoT
     * @function
     */
    that.deleteIoT = function(deviceId, cb0) {
        doLua('deleteIoT', false, deviceId, null, null, cb0);
    };


    /**
     * Reads the state of an IoT device.
     *
     * @param {string} deviceId A globally unique identifier for the device.
     * @param {caf.cb} cb0 A callback to return error (string) or the state as
     *  a an object of type {deviceView: iotMapType, caView: iotMapType}
     *
     * where iotMapType is:
     *
     * {deviceView: boolean, toCloud: {version: number, values: Object=},
     *                       fromCloud:{version: number, values: Object=}}.
     *
     * @name caf_iot/plug_iot#readIoT
     * @function
     */
     that.readIoT = function(deviceId, cb0) {
         var cb1 = function(err, data) {
             if (err) {
                 cb0(err, data);
             } else {
                 var result = {deviceView: JSON.parse(data[0]),
                               caView: JSON.parse(data[1])};
                 cb0(err, result);
             }
         };
        doLua('getIoT', true,  deviceId, null, null, cb1);
    };

    /**
     * Updates the CA view of the state of an IoT device.
     *
     * Input content type is:
     *  {deviceView: boolean, toCloud: {version: number, values: Object=},
     *   fromCloud:{version: number, values: Object=}}
     *
     * @param {string} deviceId A globally unique identifier for the device.
     * @param {content.type} content The new content (CA's view).
     * @param {caf.cb} cb0 A callback to return error (string).
     *  It returns the device view of the state if no errors.
     * @name caf_iot/plug_iot#updateIoT
     * @function
     */
    that.updateIoT = function(deviceId, content, cb0) {
        var version = content.fromCloud.version;
        doLua('testAndSetAndGetIoT', false, deviceId, version,
              JSON.stringify(content), cb0);
    };

    that.initClient($, $.cf.getServiceConfig('redis'), luaAll, cb);
};
