'use strict';
/* eslint-disable  no-unreachable */

const caf_iot = require('caf_iot');
const myUtils = caf_iot.caf_components.myUtils;
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

exports.methods = {
    async __iot_setup__() {
        this.state.counter = this.toCloud.get('counter') || 0;
        this.$.cron.addCron('helloCron', 'greetings', ['Hello:'], 2000);
        this.$.cron.addCron('byeCron', 'greetings', ['Bye:'], 3000);
        this.$.cron.addCron('crashCron', 'crash', [], 5000);
        return [];
    },
    async __iot_loop__() {
        const msg = this.fromCloud.get('msg') || 'Counter:';
        this.$.log && this.$.log.debug(msg + this.state.counter);
        this.state.counter = this.state.counter + 1;
        this.toCloud.set('counter', this.state.counter);
        return [];
    },
    async greetings(greet) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(greet + now);
        return [];
    },
    async crash() {
        await setTimeoutPromise(100);
        throw new Error('Oops');
    },
    // delete this method and see how error handling changes
    async __iot_error__(error) {
        this.$.log && this.$.log.warn('Got error ' +
                                      myUtils.errToPrettyStr(error));
        // try propagating `error` with `cb(error)` and see what happens
        return [];
    }
};

caf_iot.init(module);
