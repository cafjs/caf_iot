'use strict';
const caf_iot = require('caf_iot');

exports.methods = {
    async __iot_setup__() {
        return [];
    },
    async down(speed) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('vvvvvvvvvvDown:' + now + ' speed: ' +
                                       speed);
        return [];
    },
    async up(speed) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('^^^^^^^^^^Up:  ' + now + ' speed: ' +
                                       speed);
        return [];
    },
    async recover(msg) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('RECOVERING:' + now + ' msg: ' + msg);
        return [];
    },
    async __iot_loop__() {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('loop:' + now);
        return [];
    }
};

caf_iot.init(module);
