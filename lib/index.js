/**
 * node-windows-audio-capture
 * Production-ready Node.js Windows audio capture addon using WASAPI and N-API
 * 
 * @module node-windows-audio-capture
 */

const AudioCapture = require('./audio-capture');
const { AudioError, ERROR_CODES, fromNativeError, invalidConfig, deviceError, processError } = require('./errors');
const { version } = require('../package.json');

/**
 * Main module exports
 * @namespace
 */
module.exports = {
  /**
   * AudioCapture class for capturing audio from Windows processes
   * @type {AudioCapture}
   */
  AudioCapture,
  
  /**
   * Custom error class for audio capture operations
   * @type {AudioError}
   */
  AudioError,
  
  /**
   * Standard error codes
   * @type {Object}
   */
  ERROR_CODES,
  
  /**
   * Error code constants (alias for ERROR_CODES)
   * @type {Object}
   */
  ErrorCodes: ERROR_CODES,
  
  /**
   * Helper function to create AudioError from native error
   * @type {Function}
   */
  fromNativeError,
  
  /**
   * Helper function to create invalid config error
   * @type {Function}
   */
  invalidConfig,
  
  /**
   * Helper function to create device error
   * @type {Function}
   */
  deviceError,
  
  /**
   * Helper function to create process error
   * @type {Function}
   */
  processError,
  
  /**
   * Module version
   * @type {string}
   */
  version
};

/**
 * Default export is AudioCapture class
 */
module.exports.default = AudioCapture;
