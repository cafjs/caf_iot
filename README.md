# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF Extra Lib IOT (Internet of Things)

**UNDER CONSTRUCTION, NOT WORKING...**

This repository contains a CAF Extra lib to interact with very basic devices that have poor network connectivity and no direct user input. The standard CAF client library is not adequate for a device that measures free memory in kilobytes. 

The programming abstraction is based on sharing two maps (with JSON serializable values) between the device and the cloud assistant that represents it. The `toCloud` map is writable by the device and read-only by the CA. The `fromCloud` map is writable by the CA and read-only by the device. Both are replicated, provide atomic changes using version numbers, and use a simple protocol to keep replicas up to date:

Periodically the device POSTs to a URL unique to that device, for example: `http://yourapp.cafjs.com/iot/<deviceId>` where  `deviceId` is an unguessable random string that identifies the device (e.g., a UUID). The POST message contains the following JSON:

    // FROM DEVICE TO CLOUD
    {
        "toCloud": {
             "version": 37,
             "values": {
                   "whatever1": ...,
                   "whatever2": ...
               }
         },
         "fromCloud": {
              "version": 75
         }
     }
     
where `version` is the version number of the map. Note that the device provides the `version` of its locally cached version of the `fromCloud` map as an optimization, i.e., the CA can skip sending `values` again if the map has not changed.

The response to the POST is similar:

    // FROM CLOUD TO DEVICE
    {
        "fromCloud": {
             "version": 76,
             "values": {
                   "anotherwhatever1": ...,
                   "anotherwhatever2": ...
               }
         },
         "toCloud": {
              "version": 37
         }
     }
     
Changes to both maps are asynchronous and there is no guarantee that the response has been processed after seeing the request. **This is not an RPC**. It is just a way to sync two maps with a single POST. 

The shared map model works well when we want to make the device sensor data visible in the cloud or set device output pins to some value.  Moreover, in those cases we typically only care about the current state, and we just need to keep the most recent version of the map.

This is not the case when we want to send a sequence of commands to the device. We need to implement a reliable channel to ensure that we do not miss commands. However, we do want to keep the simplicity of always updating to the last version of the map. Fortunately, we can easily build a unidirectional channel abstraction using (JSON serializable) arrays:

    // FROM CLOUD TO DEVICE
    {
        "fromCloud": {
             "version": 76,
             "values": {
                   "commands": {
                      "type": "caf_iot.channel"
                      "firstIndex": 34,
                      "values": [
                                 "doAction34...",
                                 "doAction35..",
                                 ...
                                 ]
                   }
               }
         },
         ...
         
We view the channel as an array containing the command sequence, but we can exclude from that sequence commands that have already been executed by the device. `firstIndex` gives you the index of the first non-executed command in that logical array. To facilitate garbage collecting the channel, the device will inform us when it has executed a command in the contents of the next POST, e.g.:


    // FROM DEVICE TO CLOUD
    {
        "toCloud": {
             "version": 59,
             "values": {
                   "whatever1": ...,
                   "whatever2": ...
               }
         },
         "fromCloud": {
             "version": 76
             "values": {
                   "commands": {
                      "type": "caf_iot.channel_ack"
                      "firstIndex": 36
                    }
                }
             }
         }
     }
 
The device is assumed stateless and commands should always be either idempotent or we just don't care if they execute multiple times. The reason is that  there is no guarantee that the channel always contains non-executed commands. 

The cloud component ignores updates that have a version number smaller than the current one. When a device (re-)starts it doesn't know the last version number and will use 0 instead. The response always contains the last one, and the next request from that device should use this new value to avoid being ignored again.

When the CA needs to see the output of these commands, a separate channel in `toCloud` with the same name (`commands`) and matching indexes will contain the responses. Garbage collection of this channel is similar to the previous case.   


## API

    lib/proxy_iot.js
 
## Configuration Example

### framework.json

      "plugs": [
        {
            "module": "caf_iot/plug",
            "name": iot_mux",
            "description": "Interacts with a backend service to store IoT maps",
            "env": {
            
            }
        }
 



### ca.json

    "internal" : [
        {
            "module": "caf_iot/plug_ca",
            "name": "iot_ca",
            "description": "Manages IoT maps for this CA.",
            "env" : {
            }
        }
        ...
     ]   
     "proxies" : [
         {
             "module": "caf_iot/proxy",
             "name": "iot",
             "description": "Enables simple interactions between a CA and a gadget of the IoT\n Properties:<deviceId> A default UUID for the device. (testing)",
             "env" : {
                 "deviceId" :"233232323"                 
            }
          }
          ...
      ]
  
    
        
            
 
