'use strict';
var caf_iot = require('../../../index.js');

exports.methods = {
    __iot_setup__: function(cb) {
        cb(null);
    },
    down: function(speed, cb) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('vvvvvvvvvvDown:' + now + ' speed: ' +
                                       speed);
        cb(null);
    },
    up: function(speed, cb) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('^^^^^^^^^^Up:  ' + now + ' speed: ' +
                                       speed);
        cb(null);
    },
    recover: function(msg, cb) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('RECOVERING:' + now + ' msg: ' + msg);
        cb(null);
    },
    __iot_loop__: function(cb) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('loop:' + now);
        cb(null);
    }
};

caf_iot.init(module);
