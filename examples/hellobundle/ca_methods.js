'use strict';

var caf = require('caf_core');

// TRY: reduce the margin to <10msec and see how bundles arrive late
var MARGIN=100;

exports.methods = {
    __ca_init__: function(cb) {
        this.state.counter = 0;
        this.state.msg = 'foo:';
        this.state.maxAcks = 1;
        cb(null);
    },
    __ca_pulse__: function(cb) {
        if ((this.state.acks && (this.state.acks.length > 0) &&
             (!this.state.acks[0].result))) {
            this.$.log && this.$.log.debug('Last bundle was late');
        }
        this.state.counter = this.state.counter + 1;
        var bundle = this.$.iot.newBundle(MARGIN);
        // TRY: kill the server, and the device eventually executes `recover`
        bundle.down(0, [1]).up(300, [1]).recover(5000, ['go home']);
        this.$.iot.sendBundle(bundle);
        // `notify` improves responsiveness.
        //TRY: comment the following line, and see how bundles arrive late
        this.$.session.notify([this.state.counter], 'iot');
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
