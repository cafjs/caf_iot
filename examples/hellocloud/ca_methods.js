'use strict';

var caf = require('caf_core');

exports.methods = {
    async __ca_init__() {
        this.state.counter = 0;
        this.state.msg = 'foo:';
        return [];
    },
    async __ca_pulse__() {
        this.state.counter = this.state.counter + 1;
        this.$.session.notify([this.state.msg], 'iot');
        return [];
    },
    async setMessage(newMsg) {
        this.state.msg = newMsg;
        return this.getCounter();
    },
    async getCounter() {
        return [null, this.state.msg + this.state.counter];
    }
};

caf.init(module);
