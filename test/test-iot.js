var hello = require('./hello/main.js');
var helloIoT = require('./hello/iot/main.js');

var caf_components = require('caf_components');
var cli = require('caf_cli');
var myUtils = caf_components.myUtils;
var async = caf_components.async;
var app = hello;
var appIoT = helloIoT;
var crypto = require('crypto');

process.on('uncaughtException', function (err) {
    console.log("Uncaught Exception: " + err);
    console.log(myUtils.errToPrettyStr(err));
    process.exit(1);
});

var CA_NAME = 'antonio-' + crypto.randomBytes(16).toString('hex');
process.env['MY_ID'] = CA_NAME;

module.exports = {
    setUp: function (cb) {
        var self = this;
        app.load(null, {name: 'top'}, 'framework.json', null,
                 function(err, $) {
                     if (err) {
                         console.log('setUP Error' + err);
                         console.log('setUP Error $' + $);
                         // ignore errors here, check in method
                         cb(null);
                     } else {
                         self.$ = $;
                         cb(err, $);
                     }
                 });
    },
    tearDown: function (cb) {
        var self = this;
        if (!this.$) {
            cb(null);
        } else {
            this.$.top.__ca_graceful_shutdown__(null, cb);
        }
    },

    hello: function(test) {
        test.expect(10);
        var s;
        async.series([
            function(cb) {
                s = new cli.Session('http://root-helloiot.vcap.me:3000',
                                    CA_NAME, {from: CA_NAME,
                                              log: function(x) {
                                                  console.log(x);
                                              }});
                s.onopen = function() {
                    var cb1 = function(err, data) {
                        test.ifError(err);
                        console.log('GOT: '+ JSON.stringify(data));
                        cb(err, data);
                    };
                    s.hello('foo', cb1);
                };
                s.onerror = function(err) {
                    test.ifError(err);
                    console.log(err);
                };
            },
            function(cb) {
                var self = this;
                appIoT.load(null, {name: 'topIoT'}, null, null,
                 function(err, $) {
                     if (err) {
                         console.log('setUP Error' + err);
                         console.log('setUP Error $' + $);
                         // ignore errors here, check in method
                         cb(null);
                     } else {
                         self.$IoT = $;
                         cb(err, $);
                     }
                 });
            },
            function(cb) {
                setTimeout(function() {cb(null);}, 11000);
            },
            function(cb) {
                var self = this;
                s.getState(function(err, state) {
                    console.log(state);
                    var t = (new Date()).getTime();
                    test.equal(1, state.counter);
                    test.ok((state.sensorX > 1000000000000) &&
                            (state.sensorX < t));
                    test.ok((state.sensorY > 1000000000000) &&
                            (state.sensorY < t));
                    cb(err, state);
                });
            },
            function(cb) {
                var all = this.$IoT.topIoT.$.iot.$.handler.debugGetAll();
                // just one  exec (5 sec interval, repeat every 25 sec)
                test.equal(0, all.fromCloud.get('actuateX'));
                test.equal(1, all.fromCloud.get('actuateY'));
                test.equal(1, all.state.hello);// second hello did not exec
                test.equal(1, all.state.bye);
                console.log(all);
                cb(null);
            },

            function(cb) {
                if (!this.$IoT) {
                    cb(null);
                } else {
                    this.$IoT.topIoT.__ca_graceful_shutdown__(null, cb);
                }
            },
            function(cb) {
                s.onclose = function(err) {
                    test.ifError(err);
                    cb(null);
                };
                s.close();
            }
        ], function(err, res) {
            test.ifError(err);
            test.done();
        });

    }
};
