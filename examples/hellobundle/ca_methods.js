'use strict';

const caf = require('caf_core');

// TRY: reduce the margin to <10msec and see how bundles arrive late
const MARGIN=100;

exports.methods = {
    async __ca_init__() {
        this.state.counter = 0;
        this.state.msg = 'foo:';
        this.state.maxAcks = 1;
        return [];
    },
    async __ca_pulse__() {
        if ((this.state.acks && (this.state.acks.length > 0) &&
             (!this.state.acks[0].result))) {
            this.$.log && this.$.log.debug('Last bundle was late');
        }
        this.state.counter = this.state.counter + 1;
        const bundle = this.$.iot.newBundle(MARGIN);
        // TRY: kill the server, and the device eventually executes `recover`
        bundle.down(0, [1]).up(300, [1]).recover(5000, ['go home']);
        this.$.iot.sendBundle(bundle);
        // `notify` improves responsiveness.
        //TRY: comment the following line, and see how bundles arrive late
        this.$.session.notify([this.state.counter], 'iot');
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
