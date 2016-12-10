'use strict';

var caf = require('caf_core');

exports.methods = {
    __ca_init__: function(cb) {
        cb(null);
    },
    setMessage: function(newMsg, cb) {
        var $$ = this.$.sharing.$;
        $$.fromCloud.set('msg', newMsg);
        this.getCounter(cb);
    },
    getCounter: function(cb) {
        var $$ = this.$.sharing.$;
        cb(null, $$.toCloud.get('counter'));
    }
};

caf.init(module);
