var caf_iot = require('../../../index');

exports.load = function($, spec, name, modules, cb) {
    modules = modules || [];
    modules.push(module);

    caf_iot.init(modules, spec, name, cb);
};

