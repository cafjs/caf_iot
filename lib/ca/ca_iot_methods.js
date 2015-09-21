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

var constants_iot = require('../constants_iot');
var caf_sharing = require('caf_sharing');
var ReliableChannel = caf_sharing.ReliableChannel;

var FROM_CLOUD_MAP = constants_iot.FROM_CLOUD_MAP;

var TO_CLOUD_MAP =  constants_iot.TO_CLOUD_MAP;

var FROM_CLOUD_REPLY_CHANNEL_NAME = constants_iot.FROM_CLOUD_REPLY_CHANNEL_NAME;

var MAX_ACKS = 10;

/**
 * Mixin of CA methods to support IoT.
 *
 */
exports.methods = {

   /**
     * Extension of `__ca_init__` to create SharedMaps for IoT.
     *
     * Called just once at CA creation time.
     *
     */
    "__ca_iot_init__": function (cb) {
        this.$.sharing.addWritableMap('fromCloud', FROM_CLOUD_MAP);
        this.$.sharing.addWritableMap('toCloud', TO_CLOUD_MAP);
        cb(null);
    },

    /**
     * Called by the device every time it restarts.
     *
     */
    "__iot_resume__": function (cb) {
        var $$ = this.$.sharing.$;
        ReliableChannel.init($$.fromCloud);
        ReliableChannel.init($$.toCloud);
        cb(null, {fromCloud: $$.fromCloud.dump(), toCloud: $$.toCloud.dump()});
    },

    /**
     * Called by the device everytime it processes a command or pulses.
     *
     */
    "__iot_sync__" : function(toCloud, cb) {
        var $$ = this.$.sharing.$;
        this.$.sharing.applyDelta('toCloud', toCloud, this.$.log);
        var acks = ReliableChannel.receive($$.fromCloud, $$.toCloud,
                                           FROM_CLOUD_REPLY_CHANNEL_NAME);
        this.state.acks = (this.state.acks ? this.state.acks.concat(acks) :
                           acks);
        this.state.maxAcks = (typeof this.state.maxAcks  === 'number' ?
                              this.state.maxAcks : MAX_ACKS);
        if (this.state.acks.length > this.state.maxAcks) {
            this.state.acks.splice(0, this.state.acks.length -
                                   this.state.maxAcks);
        }
        ReliableChannel.gc($$.fromCloud, $$.toCloud);
        cb(null, $$.fromCloud.dump());
    }
};
