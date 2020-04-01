// Modifications copyright 2020 Caf.js Labs and contributors
/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
/**
 * Constants.
 *
 *
 * @module caf_iot/constants_iot
 */

/** Channel name for request bundles from the CA.*/
exports.FROM_CLOUD_CHANNEL_NAME = 'fromCloudChannel';

/** Channel name for replies from the device to request bundles.*/
exports.FROM_CLOUD_REPLY_CHANNEL_NAME = 'fromCloudReplyChannel';

/** Force a bundle to start executing immediately. */
exports.NOW = -1;

/** Name for the `fromCloud` map.*/
exports.FROM_CLOUD_MAP = 'fromCloud';

/** Name for the `toCloud` map.*/
exports.TO_CLOUD_MAP = 'toCloud';
