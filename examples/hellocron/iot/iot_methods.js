'use strict';
/* eslint-disable  no-unreachable */

var caf_iot = require('../../../index.js');
var myUtils = caf_iot.caf_components.myUtils;

exports.methods = {
    __iot_setup__: function(cb) {
        this.state.counter = this.toCloud.get('counter') || 0;
        this.$.cron.addCron('helloCron', 'greetings', ['Hello:'], 2000);
        this.$.cron.addCron('byeCron', 'greetings', ['Bye:'], 3000);
        this.$.cron.addCron('crashCron', 'crash', [], 5000);
        cb(null);
    },
    __iot_loop__: function(cb) {
        var msg = this.fromCloud.get('msg') || 'Counter:';
        this.$.log && this.$.log.debug(msg + this.state.counter);
        this.state.counter = this.state.counter + 1;
        this.toCloud.set('counter', this.state.counter);
        cb(null);
    },
    greetings: function(greet, cb) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(greet + now);
        cb(null);
    },
    crash: function(cb) {
        setTimeout(function() {
            throw new Error('Oops');
            cb(null);
        }, 100);
    },
    // delete this method and see how error handling changes
    __iot_error__: function(error, cb) {
        this.$.log && this.$.log.warn('Got error ' +
                                      myUtils.errToPrettyStr(error));
        // try propagating `error` with `cb(error)` and see what happens
        cb(null);
    }
};

caf_iot.init(module);
