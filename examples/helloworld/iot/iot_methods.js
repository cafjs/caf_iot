"use strict";
var caf_iot = require('../../../index.js');

exports.methods = {
    __iot_setup__: function(cb) {
        this.state.counter = this.toCloud.get('counter') || 0;
        cb(null);
    },
    __iot_loop__ : function(cb) {
        var msg = this.fromCloud.get('msg') || 'Counter:';
        this.$.log && this.$.log.debug(msg + this.state.counter);
        this.state.counter = this.state.counter + 1;
        this.toCloud.set('counter', this.state.counter);
        cb(null);
    }
};

caf_iot.init(module);
