'use strict';
var caf_iot = require('caf_iot');

exports.methods = {
    async __iot_setup__() {
        var self = this;
        this.$.cloud.registerHandler(function(msg) {
            var args = self.$.cloud.getMethodArgs(msg);
            self.$.queue.process('greetings', args);
        });
        return [];
    },

    async greetings(msg) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(msg + now);
        try {
            var value = await this.$.cloud.cli.getCounter().getPromise();
            this.$.log && this.$.log.debug('Got ' + value);
            return [];
        } catch (err) {
            return [err];
        }
    },
    async __iot_loop__() {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('loop:' + now);
        return [];
    }
};

caf_iot.init(module);
