'use strict';
const caf_iot = require('caf_iot');

exports.methods = {
    async __iot_setup__() {
        this.$.cloud.registerHandler((msg) => {
            const args = this.$.cloud.getMethodArgs(msg);
            this.$.queue.process('greetings', args);
        });
        return [];
    },

    async greetings(msg) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(msg + now);
        try {
            const value = await this.$.cloud.cli.getCounter().getPromise();
            this.$.log && this.$.log.debug('Got ' + value);
            return [];
        } catch (err) {
            return [err];
        }
    },
    async __iot_loop__() {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('loop:' + now);
        return [];
    }
};

caf_iot.init(module);
