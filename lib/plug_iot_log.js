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
 * A logger component.
 *
 * The levels of logging are OFF, FATAL, ERROR, WARN, INFO,
 * DEBUG and TRACE (in that order) and they can be set with env variable
 * 'logLevel' in framework.json. For example:
 *
 *       {
 *           "module": "plug_log",
 *           "name": "log",
 *            "env": {
 *               "logLevel" : "WARN"
 *           }
 *       }
 *
 *
 * @name caf_iot/plug_iot_log
 * @namespace
 * @augments caf_iot/gen_plug_iot
 *
 */
var assert = require('assert');

var genPlugIoT = require('./gen_plug_iot');


/**
 * Factory method to create a logger component.
 *
 * @see supervisor
 */
exports.newInstance = function($, spec, cb) {

    try {

        var levels = {'OFF': -1, 'FATAL': 0, 'ERROR': 1, 'WARN': 2,
                      'INFO': 3, 'DEBUG': 4, 'TRACE': 5};

        var levelNames = ['OFF', 'FATAL', 'ERROR', 'WARN',
                          'INFO', 'DEBUG', 'TRACE'];

        var that = genPlugIoT.constructor($, spec);

        assert.equal(typeof(spec.env.logLevel), 'string',
                     "'logLevel' is not an string");
        var currentLevel = levels[spec.env.logLevel];
        assert.equal(typeof(currentLevel), 'number',
                     "'currentLevel' is not a number");

        /**
         * Sets the threshold for logging events.
         *
         * @param {string} newLogLevel A new logging level.
         * @return {string} The previous logging level.
         *
         * @name plug_log#setLevel
         * @function
         *
         */
        that.setLevel = function(newLogLevel) {
            assert.equal(typeof(newLogLevel), 'string',
                     "'newLogLevel' is not a string");
            var newLevel = levels[newLogLevel];
            assert.equal(typeof(newLevel), 'number',
                         "'newLevel' is not a number");
            var oldLevel = currentLevel;
            currentLevel = newLevel;
            return levelNames[oldLevel+1];
        };

        /**
         * Gets the current  threshold for logging events.
         *
         * @return {string} The current  threshold for logging events.
         * @name plug_log#currentLevel
         * @function
         */
        that.currentLevel = function() {
            return levelNames[currentLevel+1];
        };

        /**
         * Checks if a candidate level would log with current settings.
         *
         * @param {string} candidateLevel A candidate level.
         * @return {boolean} True if that level is logged.
         * @name plug_log#isActive
         * @function
         *
         */
        that.isActive = function(candidateLevel) {
            var candidate = (candidateLevel && levels[candidateLevel]);
            assert.equal(typeof(candidate), 'number',
                         "'candidate' is not a number");
            return (candidate <= currentLevel);
        };


        var log = function(level, msg) {
            // eslint-disable-next-line
            (level <= currentLevel) && console.log(msg);
        };

        /**
         * Logs msg at FATAL level.
         *
         * @param  {string} msg A message to be logged.
         * @name plug_log#fatal
         * @function
         *
         */
        that.fatal = function(msg) {
            log(0, msg);
        };

        /**
         * Logs msg at ERROR level.
         *
         * @param  {string} msg A message to be logged.
         * @name plug_log#error
         * @function
         *
         */
        that.error = function(msg) {
            log(1, msg);
        };

        /**
         * Logs msg at WARN level.
         *
         * @param  {string} msg A message to be logged.
         * @name plug_log#warn
         * @function
         *
         */
        that.warn = function(msg) {
            log(2, msg);
        };

        /**
         * Logs msg at INFO level.
         *
         * @param  {string} msg A message to be logged.
         * @name plug_log#info
         * @function
         *
         */
        that.info = function(msg) {
            log(3, msg);
        };

        /**
         * Logs msg at DEBUG level.
         *
         * @param  {string} msg A message to be logged.
         * @name plug_log#debug
         * @function
         *
         */
        that.debug = function(msg) {
            log(4, msg);
        };

        /**
         * Logs msg at TRACE level.
         *
         * @param  {string} msg A message to be logged.
         * @name plug_log#trace
         * @function
         *
         */
        that.trace = function(msg) {
            log(5, msg);
        };

        that.debug('New logger plug');
        cb(null, that);

    } catch (err) {
        cb(err);
    }
};
