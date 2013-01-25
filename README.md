# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF Extra Lib IOT (Internet of Things)

*** UNDER CONSTRUCTION, NOT WORKING... ***

This repository contains a CAF Extra lib to interact with very basic devices that have poor network connectivity and no direct user input.

The programming abstraction is based on sharing two maps (with JSON serializable values) between the device and the cloud assistant that represents it. The `toCloud` map is writable by the device and read-only by the CA. The `fromCloud` map is writable by the CA and read-only by the device. Both are replicated, provide atomic changes using version numbers, and use a simple protocol to keep replicas up to date:

Periodically the device does a POST to a URL unique to that device, for example: `http://yourapp.cafjs.com/iot/<device_id>` where  `device_id` is an unguessable random string that identifies the device (e.g., a UUID). The POST contains the following JSON:

    {
        "toCloud": {
             "index": 37,
             "values": {
                   "whatever1": ...,
                   "whatever2": ...
               }
         },
         "fromCloud": {
              "index": 75
         }
     }
     
where the `index` is the version number of the map. Note that the device provides the `index` of its locally cached version of the `fromCloud` map as an optimization, i.e., the CA can skip sending `values` if the map has not changed.

The response to the POST is similar:

    {
        "fromCloud": {
             "index": 76,
             "values": {
                   "whatever1": ...,
                   "whatever2": ...
               }
         },
         "toCloud": {
              "index": 37
         }
     }
     
Changes to both maps are asynchronous and there is no guarantee that the response has been processed after seeing the request. **This is not an RPC**. It is just a way to sync two maps with a single POST. 

The shared map model works well when we want to make the device sensor data visible in the cloud.  Moreover, in most cases we only care about the current state, and we only keep the most recent version of the map.

This is not the case when we want to send commands to the device. We need to implement a reliable channel to ensure that we do not miss commands. However, we do want to keep the simplicity of always updating to the last version of the map. Fortunately, we can easily build a unidirectional channel abstraction using (JSON serializable) arrays:

    {
        "fromCloud": {
             "index": 76,
             "values": {
                   "mycommands": {
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
         
We view the channel as an array with the sequence of all the commands, but we only have to send a chunk of that array containing commands not yet executed by the device. `firstIndex` just gives you the index of the first entry in that logical array. To garbage collect the channel the device will tell us when it has executed a command in the contents of the next POST, i.e.:


    {
        "toCloud": {
             "index": 37,
             "values": {
                   "whatever1": ...,
                   "whatever2": ...
               }
         },
         "fromCloud": {
             "index": 76
             "values": {
                   "mycommands": {
                      "type": "caf_iot.channel_ack"
                      "firstIndex": 36
                    }
                }
             }
         }
     }
 
The device is assumed stateless and commands should always be idempotent, i.e., there is no guarantee that the channel always reflects commands that have not been executed. The cloud component ignores updates that have an index smaller than the current one. When a device (re-)starts it will use an index 0 but it should increment the index to the current one (in the response) before the next update (or face another ignored update).

If the CA needs to see the output of these commands, a separate channel in `toCloud` with the same name and matching indexes will contain the responses. Garbage collection of this channel is similar to the previous case.   


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
             "description": "Enables simple interactions between a CA and a gadget of the IoT\n Properties:<deviceId> A default UUID for the device.",
             "env" : {
                 "deviceId" :"233232323"                 
            }
          }
          ...
      ]
  
    
        
            
 
