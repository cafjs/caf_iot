'use strict';

var caf = require('caf_core');

exports.methods = {
    __ca_init__: function(cb) {
        this.state.counter = 0;
        this.state.msg = 'foo:';
        cb(null);
    },
    __ca_pulse__: function(cb) {
        this.state.counter = this.state.counter + 1;
        this.$.session.notify([this.state.msg], 'iot');
        cb(null);
    },
    setMessage: function(newMsg, cb) {
        this.state.msg = newMsg;
        this.getCounter(cb);
    },
    getCounter: function(cb) {
        cb(null, this.state.msg + this.state.counter);
    }
};

caf.init(module);
