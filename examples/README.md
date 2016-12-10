## Running the examples

First install `devDependencies`. In top `caf_iot/` dir:

    npm install

Second, run locally a `redis-server` instance at the default port 6379 with no password. In ubuntu:

    apt-get install redis-server

and then, for example, in the `examples/helloworld` directory, start "the cloud service" hosting CAs at port 3000:

    node ca_methods.js

and then, in the `examples/helloworld/iot` directory, start "the device":

    node iot_methods.js

Finally, go back to `examples/helloworld` and run a client that interacts with the "device" via the "cloud".

    node client.js
