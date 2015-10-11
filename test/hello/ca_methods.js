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
var caf = require('caf_core');

var MODULUS = 5;
var MAX_NOTIF_LENGTH = 5;
var IOT_SESSION='iot';

var incrementImpl = function(self, inc) {
    var pushNotif = function(notif) {
        if (self.state.notif.length === MAX_NOTIF_LENGTH) {
            self.state.notif.shift();
        };
        self.state.notif.push(notif);
    };

    self.state.counter = self.state.counter + inc;
    if (self.state.counter % MODULUS == 0) {
        self.$.session.notify([self.state], 'default');
        self.$.session.notify([self.state], IOT_SESSION);
        pushNotif(self.state.counter);
        var bundle = self.$.iot.newBundle()
                .bye(0, ['x1'])
                .hello(1500,['x2'])
                .hello(20000,['value:' + self.state.counter]);
        self.$.iot.sendBundle(bundle, 200);
    }
};

exports.methods = {
    '__ca_init__' : function(cb) {
        this.state.counter = -1;
        this.state.notif = [];
        this.$.session.limitQueue(1); // only the last notification
        this.$.session.limitQueue(1, IOT_SESSION); // only the last notification
        this.state.fullName = this.__ca_getAppName__() + '#' +
            this.__ca_getName__();
        this.state.trace__iot_sync__ = 'traceSync';
        this.state.trace__iot_resume__ = 'traceResume';
        cb(null);
    },
    '__ca_pulse__' : function(cb) {
        var $$ = this.$.sharing.$;
        $$.fromCloud.set('actuateX', this.state.counter);
        $$.fromCloud.set('actuateY', this.state.counter + 1);
        this.state.sensorX = $$.toCloud.get('sensorX');
        this.state.sensorY = $$.toCloud.get('sensorY');
        this.$._.$.log && this.$._.$.log.debug('sensorX: ' +
                                               this.state.sensorX +
                                               ' sensorY:' +
                                               this.state.sensorY);

        this.$._.$.log && this.$._.$.log.debug('calling PULSE!!! ' +
                                               this.state.counter);
        incrementImpl(this, 1);
        cb(null, null);
    },
    'hello' : function(key, cb) {
        this.getState(cb);
    },
    'iotForceHello' : function(delay, msg, cb) {
        var bundle = this.$.iot.newBundle()
                .hello(delay, [msg]);
        this.$.iot.sendBundle(bundle, this.$.iot.NOW);
        this.$.session.notify(['doHello'], IOT_SESSION);
        this.getState(cb);
    },
    'increment' : function(inc, cb) {
        incrementImpl(this, inc);
        this.getState(cb);
    },
    'getState' : function(cb) {
        cb(null, this.state);
    },
    'traceSync' : function(cb) {
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName+ ':Syncing!!:' + now);
        cb(null);
    },
    'traceResume' : function(cb) {
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName+ ':Resuming!!:' + now);
        cb(null);
    }
};

