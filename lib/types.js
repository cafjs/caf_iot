
/**
 * @global
 * @typedef {function(Error?, any=):void} cbType
 *
 */

/**
 * @global
 * @typedef {Object | Array | string | number | null | boolean} jsonType
 *
 */

/**
 * @global
 * @typedef {Object<string, jsonType>} msgType
 *
 */

/**
 * @global
 * @typedef {Object} refMapType
 *
 */

/**
 * @global
 * @typedef {Object} cronOptionsType
 * @property {boolean=} noSync Whether to skip cloud synchronization.
 */

/**
 * @global
 * @typedef {Object} commandType
 * @property {number} after Delay in msec from the start of the previous
 * command.
 * @property {string} method The name of the method to invoke.
 * @property {Array.<jsonType>} args The arguments to the method.
 */

/**
 * @global
 * @typedef {Object} bundleType
 * @property {number} start Starting time in msec (UTC since 1970).
 * @property {Array.<commandType>} commands A sequence of commands to execute.
 */

/**
 * @global
 * @typedef {Object} bundleObjectType
 */

/**
 * @global
 * @typedef {Object<string, Array.<string>>} bundleDescriptionType
 */

/**
 * @global
 * @typedef {Object} specType
 * @property {string} name
 * @property {string|null} module
 * @property {string=} description
 * @property {Object} env
 * @property {Array.<specType>=} components
 *
 */

/**
 * @global
 * @typedef {Object} specDeltaType
 * @property {string=} name
 * @property {(string|null)=} module
 * @property {string=} description
 * @property {Object=} env
 * @property {Array.<specType>=} components
 *
 */

/**
 * @global
 * @typedef {Object.<string, Object>} ctxType
 */
