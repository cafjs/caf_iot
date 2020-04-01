'use strict';

const caf = require('caf_core');

exports.methods = {
    async __ca_init__() {
        return [];
    },
    async setMessage(newMsg) {
        const $$ = this.$.sharing.$;
        $$.fromCloud.set('msg', newMsg);
        return this.getCounter();
    },
    async getCounter() {
        const $$ = this.$.sharing.$;
        return [null, $$.toCloud.get('counter')];
    }
};

caf.init(module);
