# Caf.js

Co-design cloud assistants with your web app and IoT devices.

See https://www.cafjs.com

## Platform for IoT Devices
[![Build Status](https://travis-ci.org/cafjs/caf_iot.svg?branch=master)](https://travis-ci.org/cafjs/caf_iot)

IoT platform that runs on the device and pairs with a CA.

The IoT device programming model is very similar to programming a CA (see {@link external:caf_ca}). In fact, most of the code is reused.

Things similar to the cloud implementation. Method execution is serialized by a queue, no global state, similar plugins, and transactional changes to local state can be rolled backed on abort.

However, we do not checkpoint state, and there is only one "CA", i.e., the device. We are not that concerned about long term consistency either, since we reset the device every reboot; therefore, some plugins may not delay external actions, improving responsiveness.

We have also simplified framework methods and config files. For instance, the file `iot.json` describes both the framework, i.e., `framework.json`, and  the device, i.e., `ca.json`, component hierarchies. Also, the naming of methods is more "Arduino-friendly".

### Hello World (see `examples/helloworld`)

```
exports.methods = {
    async __iot_setup__() {
        this.state.counter = this.toCloud.get('counter') || 0;
        return [];
    },
    async __iot_loop__() {
        var msg = this.fromCloud.get('msg') || 'Counter:';
        this.$.log && this.$.log.debug(msg + this.state.counter);
        this.state.counter = this.state.counter + 1;
        this.toCloud.set('counter', this.state.counter);
        return [];
    }
};
```

Defines two methods called by the IoT framework:

* `__iot_setup__`: initializes the state of the device everytime it resets.
* `__iot_loop__`: similar to a `__ca_pulse__` CA method, it executes periodically. See {@link module:caf_iot/plug_iot_handler} for details.

Device data is described with:

* `this.state`: similar to a CA's `this.state` but not checkpointed.
* `this.scratch`: similar to a CA's `this.scratch`.
* `this.toCloud`: A `SharedMap` (see {@link external:caf_sharing}) written by the device and read by its CA. When the device resets, it also downloads the latest contents of this map that reached the cloud.
* `this.fromCloud`: A `SharedMap` written by the CA and read by the device. This is the main mechanism to configure the device or trigger actions.

In the previous example `this.toCloud` has two purposes:

* checkpoint the last value of `counter`, so that it is remembered after a reset.
* communicate this value to the CA, making it visible to external clients (see `examples/helloworld/client.js`).

The purpose of `this.fromCloud` is to allow a client to indirectly modify the behavior of the device by communicating with its CA.

The CA impersonates the device, enabling seamless interaction when the device is offline, or behind a firewall.

### Hello Cron (see `examples/hellocron`)

Similar to CA plugins, device plugins are exposed to application code with proxies in `this.$`.

An interesting plugin is `cron` (see {@link module:caf_iot/proxy_iot_cron}), which allows calls to arbitrary methods at regular intervals.

```
exports.methods = {
    async __iot_setup__() {
        this.state.counter = this.toCloud.get('counter') || 0;
        this.$.cron.addCron('helloCron', 'greetings', ['Hello:'], 2000);
        this.$.cron.addCron('byeCron', 'greetings', ['Bye:'], 3000);
        return [];
    },
    async greetings(greet) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(greet + now);
        return [];
    },
    ...
};
```

#### How are errors and exceptions handled?

The default behavior is rather crude, just log and do a full reset.

It is recommended to override that behavior by adding a method `__iot_error__`.

This method could avoid the reset by **not** propagating the error in the callback, see `__iot_error__` in {@link module:caf_iot/plug_iot_handler}  and `examples/hellocron/iot/iot_methods.js`.

### Hello Bundles (see `examples/hellobundle`)

The CA can invoke device methods by using timed bundles of commands.

`Caf.js` synchronizes device clocks with the cloud, coordinating **soft** real-time actions across the globe with UTC time. Given a few seconds to propagate commands,  millions of devices could blink within a hundred milliseconds of each other.

Why bundles and not just separate commands?

Safety. Think of controlling a drone. One command to dive as fast as it can. Second command to gracefully recover. Lost network connection between them. Oops...

If we bundle commands, both are cached in the drone before anything happens. If execution is based on UTC time, not on arrival time, we can pipeline bundles, ensuring smooth movement. And the CA can keep generating these bundles based on a higher goal. See {@link module:caf_iot/plug_iot_bundles} for details.

Extra time is added to bundles for network propagation but, when a bundle arrives to the device late, it gets ignored. The CA can detect that by monitoring responses in `this.state.acks`; this is an array of max size `this.state.maxAcks`, and elements of type:

    {result: boolean, index: number}

where:

* `result`: `False` if the bundle was late, `True` otherwise.
* `index`: An identifier for the bundle. It matches the one previously returned by {@link module:caf_iot/ca/proxy_iot#sendBundle}.

Let's look at an example.

The device code defines three simple commands for our "drone": `up`, `down`, or take a recovery action if we lose connectivity.

```
exports.methods = {
...
    async down(speed) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('Down:' +  now + ' speed: ' + speed);
        return [];
    },
    async up(speed) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('Up:  ' +  now + ' speed: ' + speed);
        return [];
    },
    async recover(msg) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug('RECOVERING:' +  now + ' msg: ' + msg);
        return [];
    },
};
```

The CA code is a bit more interesting:

```
var MARGIN=100;
exports.methods = {
    async __ca_init__() {
        this.state.maxAcks = 1;
        return [];
    },
    async __ca_pulse__() {
        if ((this.state.acks && (this.state.acks.length > 0) &&
             (!this.state.acks[0].result))) {
            this.$.log && this.$.log.debug('Last bundle was late');
        }
        var bundle = this.$.iot.newBundle(MARGIN);
        bundle.down(0, [1]).up(300, [1]).recover(5000, ['go home']);
        this.$.iot.sendBundle(bundle);
        // `notify` improves responsiveness.
        this.$.session.notify(['new bundle'], 'iot');
        return [];
    },
  ...
};
```

If you are wondering how `bundle` gets methods `down`, `up`, and `recover`, the framework instrospects the device code, and generates them at run time. *I love JavaScript*.

`__ca_pulse__` gets called every `interval` msec. If `interval` is less than `5000`, we have two cases:

* Normal case: the next bundle starts before the recovery action of the previous bundle. Only one bundle can be active, and the device skips recovery.

* Network partition for more than five seconds: no new bundles, and the device triggers recovery.

Why `notify` after `sendBundle`? To save energy and bandwidth the device typically syncs with the cloud every few seconds, and we are providing a margin of only 100 msec to execute the bundle. If the device is currently connected, `notify` uses the websocket to force the device to sync.



### Hello Cloud (see `examples/hellocloud`)

The device can also call CA methods.

The `cloud` plugin provides a standard client `Session` (see {@link external:caf_cli}). It can also receive session notifications (see {@link external:caf_session}), and process them as conventional method calls.

Notifications improve responsiveness, because otherwise the device waits until the next `__iot_loop__` to synchronize with the cloud.

For example:

```
exports.methods = {
    async __iot_setup__() {
        this.$.cloud.registerHandler((msg) => {
            var args = this.$.cloud.getMethodArgs(msg);
            this.$.queue.process('greetings', args);
        });
        return [];
    },
    async greetings(msg) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(msg + now);
        try {
            const value = await this.$.cloud.cli.getCounter().getPromise();
            this.$.log && this.$.log.debug('Got ' + value);
            return [];
        } catch (err) {
            return [err];
        }
    },
    ...
};
```

Every time the CA notifies the device, a method call for `greetings` gets queued,  and eventually, that method will call back the CA, reading its counter.

The default session identifier for a device is `iot`, but it can be changed with the property `session` (see {@link module:caf_iot/plug_iot_cloud}).

### Much more...

We have a few RPi plugins in `caf/extra` that do real IoT stuff. Controlling `gpio` pins, managing external RTC/power boards, distance sensors...

The long term strategy is **not** to duplicate the great work of other JavaScript IoT libraries supporting zillions of sensors/actuators/devices. Instead, wrap these libraries with local plugins, and focus on cloud/client integration. This is consistent with our web client strategy, i.e., integrating with other libraries such as React/Redux.
