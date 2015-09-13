#!/usr/bin/env node

/**
 * Creates a signed token to identify the device.
 *
 * ./newDeviceToken.js --password=<change> --accountsURL=https://root-accounts.cafjs.com --caOwner=foo --caLocalName=ca1 --appLocalName=helloiot --appPublisher=root
 * Alternatively, use properties CAF_<all caps, name like above no spaces>,
 *  e.g., CAF_PASSWORD or CAF_APPLOCALNAME.
 *
 */
var parseArgs = require('minimist');
var caf_cli = require('caf_cli');
var srpClient = require('caf_srp').client;

var newToken = function(settings, cb) {
    var spec = {
        log: function(x) { console.error(x);},
        securityClient: srpClient,
        accountsURL: settings.accountsURL,
        password: settings.password,
        from: settings.caOwner + '-' + settings.caLocalName,
//        durationInSec: settings.durationInSec,
        appLocalName : settings.appLocalName,
        appPublisher : settings.appPublisher,
        unrestrictedToken: false
    };

    var tf = caf_cli.TokenFactory(spec);

    tf.newToken(null, function(err, data) {
        if (err) {
            console.error('Cannot create token: ' + JSON.stringify(err));
        } else {
            console.log(data);
        }
        cb(err, data);
    });
};

var argv = parseArgs(process.argv.slice(2));

var prop = function(x, defaultValue) {
    var result =  argv[x] || process.env['CAF_' + x.toUpperCase()] ||
            defaultValue;
    if (typeof result !== 'string') {
        var msg = 'Property ' + x + ' not defined';
        console.error(msg);
        throw new Error(msg);
    }
    return result;
};

newToken({
    accountsURL: prop('accountsURL'),
    password: prop('password'),
    caOwner: prop('caOwner'),
    caLocalName: prop('caLocalName'),
    appLocalName: prop('appLocalName'),
    appPublisher: prop('appPublisher')
}, function() {});

