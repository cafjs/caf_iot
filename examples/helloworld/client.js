'use strict';
/* eslint-disable  no-console */

var caf_core = require('caf_core');
var caf_comp = caf_core.caf_components;
var myUtils = caf_comp.myUtils;
var caf_cli = caf_core.caf_cli;
var util = require('util');
var setTimeoutPromise = util.promisify(setTimeout);

/* `from` CA needs to be the same as target `ca` to enable creation, i.e.,
 *  only owners can create CAs.
 *
 *  With security on, we would need a token to authenticate `from`.
 */
var URL = 'http://root-helloworld.vcap.me:3000/#from=foo-ca1&ca=foo-ca1';

var s = new caf_cli.Session(URL);

s.onopen = async function() {
    try {
        var counter = await s.setMessage('Hello:').getPromise();
        console.log(counter);
        await setTimeoutPromise(5000);
        counter = await s.setMessage('Bye:').getPromise();
        console.log(counter);
        await setTimeoutPromise(5000);
        counter = await s.setMessage('HelloAgain:').getPromise();
        console.log(counter);
        await setTimeoutPromise(5000);
        counter = await s.setMessage('ByeAgain:').getPromise();
        console.log('Final count:' + counter);
        s.close();
    } catch (err) {
        s.close(err);
    }
};

s.onclose = function(err) {
    if (err) {
        console.log(myUtils.errToPrettyStr(err));
        process.exit(1);
    }
    console.log('Done OK');
};
