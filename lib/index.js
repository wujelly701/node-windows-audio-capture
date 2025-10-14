/**
 * node-windows-audio-capture
 * Production-ready Node.js Windows audio capture addon using WASAPI and N-API
 * 
 * @module node-windows-audio-capture
 */

const AudioCapture = require('./audio-capture');
const { AudioError, ERROR_CODES, fromNativeError, invalidConfig, deviceError, processError } = require('./errors');
const { version } = require('../package.json');

// v2.2.0 - Audio format conversion utilities
const AudioResampler = require('./audio-resampler');
const WavEncoder = require('./wav-encoder');
const AudioProcessingPipeline = require('./audio-processing-pipeline');
const AudioFormatConverter = require('../utils/AudioFormatConverter');

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
  version,
  
  // ===== v2.2.0 Audio Format Conversion Utilities =====
  
  /**
   * Audio resampler for sample rate conversion (v2.2.0)
   * @type {AudioResampler}
   */
  AudioResampler,
  
  /**
   * WAV file encoder for adding WAV headers (v2.2.0)
   * @type {WavEncoder}
   */
  WavEncoder,
  
  /**
   * Complete audio processing pipeline with ASR presets (v2.2.0)
   * @type {AudioProcessingPipeline}
   */
  AudioProcessingPipeline,
  
  /**
   * Audio format converter (Float32/Int16, Stereo/Mono) (v2.2.0)
   * @type {AudioFormatConverter}
   */
  AudioFormatConverter
};

/**
 * Default export is AudioCapture class
 */
module.exports.default = AudioCapture;
