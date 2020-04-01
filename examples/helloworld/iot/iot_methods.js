'use strict';
const caf_iot = require('caf_iot');

exports.methods = {
    async __iot_setup__() {
        this.state.counter = this.toCloud.get('counter') || 0;
        return [];
    },
    async __iot_loop__() {
        const msg = this.fromCloud.get('msg') || 'Counter:';
        this.$.log && this.$.log.debug(msg + this.state.counter);
        this.state.counter = this.state.counter + 1;
        this.toCloud.set('counter', this.state.counter);
        return [];
    }
};

caf_iot.init(module);
