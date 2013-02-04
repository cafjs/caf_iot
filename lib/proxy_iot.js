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
 * A proxy to access IoT devices.
 * 
 * 
 * 
 * @name caf_iot/proxy_iot
 * @namespace
 * @augments gen_proxy  
 * 
 */


var caf = require('caf_core');
var genProxy = caf.gen_proxy;

/**
 * Factory method to create a proxy to access IoT devices.
 *
 * @see sup_main
 */
exports.newInstance = function(context, spec, secrets, cb) {

    var that = genProxy.constructor(spec, secrets);
    var iot = secrets.iot_ca;


    /**
     * Adds an IoT device.
     * 
     * Initializes with an empty state if not already present.
     * 
     * @param {string} deviceId A UUID for this device. 
     * 
     * @name caf_iot/proxy_iot#addIoT
     * @function
     */
    that.addIoT = function(deviceId) {
        iot.addIoT(deviceId);
    };

    /**
     * Stops tracking changes to this IoT device.
     * 
     * Does not delete the state of the device from the backend.
     * 
     * @param {string} deviceId
     * 
     * @name caf_iot/proxy_iot#removeIoT
     * @function
     */
    that.removeIoT = function(deviceId) {
        iot.removeIoT(deviceId);
    };
    
    /**
     * Lists all the added devices.
     * 
     * @return {Array.<string>} List of all added device identifiers.
     *  
     * @name caf_iot/proxy_iot#listDevices
     * @function
     */
    that.listDevices = function() {
        return iot.listDevices();
    };

    /**
     * Pushes a command to be executed by the device.
     * 
     * @param {string} deviceId A device identifier.
     * @param {string} command A new command to be executed by the device.
     * 
     * @name caf_iot/proxy_iot#addCommand
     * @function
     * 
     */
    that.addCommand = function(deviceId, command) {
        iot.addCommand(deviceId, command);
    };

    /**
     * Gets the output of commands executed by the device.
     * 
     * @param {string} deviceId A device identifier.
     * @return {{type: string, firstIndex: number, values: Array.<string>}} 
     * where `values` is an array of outputs starting with command index
     * `firstIndex`.
     *     
     * @name caf_iot/proxy_iot#getCommandsOutput
     * @function
     *  
     */
    that.getCommandsOutput = function(deviceId) {
        return iot.getCommandsOutput(deviceId);
    };

    var getProxyToCloud = function(deviceId) {
        
        var handler = {};

        handler.get = function(proxy, name) {
            var map = iot.getToCloudValuesIoT(deviceId);
            return map[name];
        };
        
        handler.set = function(proxy, name, val) {
            throw new Error('toCloud is read-only');
        };
        
        handler.has = function(name) {
            var map = iot.getToCloudValuesIoT(deviceId);
             return (map[name] !== undefined);
        };
        
        handler.delete = function(name) {
            throw new Error('toCloud is read-only');
        };
        
        handler.enumerate = function() {
            // no extra inherited properties
            return handler.keys();
        };

        handler.keys = function() {
            var map = iot.getToCloudValuesIoT(deviceId);
            return Object.keys(map);
        };
        
        return Proxy.create(handler);
    };

    var getProxyFromCloud = function(deviceId) {
        
        var handler = {};

        // TODO: need to read my writes
        handler.get = function(proxy, name) {
            var map = iot.getFromCloudValuesIoT(deviceId);
            return map[name];
        };
        
        handler.set = function(proxy, name, val) {
            iot.putValueIoT(deviceId, name, val);
        };
        
        handler.has = function(name) {
            var map = iot.getFromCloudValuesIoT(deviceId);
             return (map[name] !== undefined);
        };
        
        handler.delete = function(name) {
            iot.deleteValueIoT(deviceId, name);
        };
        
        handler.enumerate = function() {
            // no extra inherited properties
            return handler.keys();
        };

        handler.keys = function() {
            var map = iot.getFromCloudValuesIoT(deviceId);
            return Object.keys(map);
        };
        
        return Proxy.create(handler);
    };


    /**
     * Gets a reference to a pair of maps implementing communication
     * between the device and the CA.
     * 
     *  `toCloud` is a read-only map  (written by the device).
     *   `fromCloud` is written by this CA and changes will be replicated
     * in the device in a transactional manner. Changes to  `fromCloud` are
     *  not visible until we process the next message.
     * 
     * @param {string} deviceId A device identifier.
     * @return {{toCloud: Object, fromCloud: Object}} 
     *     
     * @name caf_iot/proxy_iot#getIoT
     * @function
     * 
     */
    that.getIoT = function(deviceId) {
        return {toCloud : getProxyToCloud(deviceId),
                fromCloud: getProxyFromCloud(deviceId)} ;
    };


    Object.freeze(that);
    cb(null, that);
};
