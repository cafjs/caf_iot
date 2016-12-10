'use strict';
var caf_iot = require('../../../index.js');

exports.methods = {
    __iot_setup__: function(cb) {
        var self = this;
        this.$.cloud.registerHandler(function(msg) {
            var args = self.$.cloud.getMethodArgs(msg);
            self.$.queue.process('greetings', args);
        });
        cb(null);
    },
    greetings: function(msg, cb) {
        var self = this;
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(msg + now);
        this.$.cloud.cli.getCounter(function(err, value) {
            if (err) {
                cb(err);
            } else {
                self.$.log && self.$.log.debug('Got ' + value);
                cb(null);
            }
        });
    },
    __iot_loop__: function(cb) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('loop:' + now);
        cb(null);
    }
};

caf_iot.init(module);
