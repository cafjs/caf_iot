'use strict';

var caf = require('caf_core');

exports.methods = {
    async __ca_init__() {
        return [];
    },
    async setMessage(newMsg) {
        var $$ = this.$.sharing.$;
        $$.fromCloud.set('msg', newMsg);
        return this.getCounter();
    },
    async getCounter() {
        var $$ = this.$.sharing.$;
        return [null, $$.toCloud.get('counter')];
    }
};

caf.init(module);
