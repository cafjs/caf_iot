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

var util = require('util');

exports.methods = {
    '__iot_setup__' : function(cb) {
        var lastIndex = this.fromCloud.get('index');
        this.state.index = (lastIndex ? lastIndex : 0);
        this.state.hello = 0;
        this.state.bye = 0;
        cb(null);
    },

    async __iot_loop__() {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' loop:');
        this.state.current = now;
        this.toCloud.set('index', this.state.index);
        this.state.index = this.state.index  + 1;
        this.$.log && this.$.log.debug('actuateX:' +
                                       this.fromCloud.get('actuateX'));
        this.$.log && this.$.log.debug('actuateY:' +
                                       this.fromCloud.get('actuateY'));
        this.toCloud.set('sensorX', now);
        this.toCloud.set('sensorY', now+1);
        return [];
    },

    'hello' : function(name, cb) {
        var now = (new Date()).getTime();
        this.state.hello = this.state.hello + 1;
        this.state.current = now;
        this.$.log && this.$.log.debug(now + ' hello:' + name);
        cb(null);
    },

    async bye(name) {
        var now = (new Date()).getTime();
        this.state.current = now;
        this.$.log && this.$.log.debug(now + ' bye1:' + name);
        var setTimeoutPromise = util.promisify(setTimeout);
        await setTimeoutPromise(1000);
        if (this.state.current !== now) {
            this.state.error = true;
            return[new Error('BUG!: Found race current !== now')];
        } else {
            now = (new Date()).getTime();
            this.$.log && this.$.log.debug(now + ' bye2:' + name);
            this.state.bye = this.state.bye + 1;
            return [];
        }
    },

    //backdoor for testing
    'debugGetAll' : function() {
        return { state: this.state, toCloud: this.toCloud,
                 fromCloud: this.fromCloud };
    }
};
