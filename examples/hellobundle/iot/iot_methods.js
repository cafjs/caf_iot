'use strict';
var caf_iot = require('caf_iot');

exports.methods = {
    async __iot_setup__() {
        return [];
    },
    async down(speed) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('vvvvvvvvvvDown:' + now + ' speed: ' +
                                       speed);
        return [];
    },
    async up(speed) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('^^^^^^^^^^Up:  ' + now + ' speed: ' +
                                       speed);
        return [];
    },
    async recover(msg) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('RECOVERING:' + now + ' msg: ' + msg);
        return [];
    },
    async __iot_loop__() {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug('loop:' + now);
        return [];
    }
};

caf_iot.init(module);
