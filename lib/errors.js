/**
 * Custom error class for audio capture operations
 */
class AudioError extends Error {
  /**
   * Create an AudioError
   * @param {string} message - Error message
   * @param {string} code - Error code (use ERROR_CODES constants)
   * @param {Object} [details] - Additional error details
   */
  constructor(message, code, details = {}) {
    super(message);
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AudioError);
    }
    
    this.name = 'AudioError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert error to JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Convert error to string representation
   */
  toString() {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/**
 * Standard error codes for audio capture operations
 */
const ERROR_CODES = {
  // Configuration errors
  INVALID_CONFIG: 'INVALID_CONFIG',
  INVALID_PROCESS: 'INVALID_PROCESS',
  INVALID_DEVICE: 'INVALID_DEVICE',
  INVALID_SAMPLE_RATE: 'INVALID_SAMPLE_RATE',
  INVALID_CHANNELS: 'INVALID_CHANNELS',
  
  // Device errors
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
  DEVICE_IN_USE: 'DEVICE_IN_USE',
  DEVICE_INITIALIZATION_FAILED: 'DEVICE_INITIALIZATION_FAILED',
  
  // Process errors
  PROCESS_NOT_FOUND: 'PROCESS_NOT_FOUND',
  PROCESS_ACCESS_DENIED: 'PROCESS_ACCESS_DENIED',
  PROCESS_TERMINATED: 'PROCESS_TERMINATED',
  
  // Capture errors
  CAPTURE_ALREADY_RUNNING: 'CAPTURE_ALREADY_RUNNING',
  CAPTURE_NOT_RUNNING: 'CAPTURE_NOT_RUNNING',
  CAPTURE_START_FAILED: 'CAPTURE_START_FAILED',
  CAPTURE_STOP_FAILED: 'CAPTURE_STOP_FAILED',
  CAPTURE_FAILED: 'CAPTURE_FAILED',
  
  // Audio client errors
  AUDIO_CLIENT_INIT_FAILED: 'AUDIO_CLIENT_INIT_FAILED',
  AUDIO_CLIENT_START_FAILED: 'AUDIO_CLIENT_START_FAILED',
  AUDIO_CLIENT_STOP_FAILED: 'AUDIO_CLIENT_STOP_FAILED',
  AUDIO_FORMAT_NOT_SUPPORTED: 'AUDIO_FORMAT_NOT_SUPPORTED',
  
  // System errors
  COM_INIT_FAILED: 'COM_INIT_FAILED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',
  
  // Data errors
  INVALID_BUFFER: 'INVALID_BUFFER',
  BUFFER_OVERFLOW: 'BUFFER_OVERFLOW',
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  
  // Native addon errors
  NATIVE_ERROR: 'NATIVE_ERROR',
  ADDON_NOT_LOADED: 'ADDON_NOT_LOADED',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED'
};

/**
 * Create an AudioError from a native error
 * @param {Error} nativeError - Error from native module
 * @param {string} [context] - Additional context about where the error occurred
 * @returns {AudioError}
 */
function fromNativeError(nativeError, context = '') {
  const message = context 
    ? `${context}: ${nativeError.message}`
    : nativeError.message;
  
  return new AudioError(
    message,
    ERROR_CODES.NATIVE_ERROR,
    {
      nativeError: nativeError.message,
      nativeStack: nativeError.stack,
      context
    }
  );
}

/**
 * Create an AudioError for invalid configuration
 * @param {string} parameter - Invalid parameter name
 * @param {*} value - Invalid value
 * @param {string} [reason] - Reason why value is invalid
 * @returns {AudioError}
 */
function invalidConfig(parameter, value, reason = '') {
  const message = reason
    ? `Invalid ${parameter}: ${reason}`
    : `Invalid ${parameter}: ${value}`;
  
  return new AudioError(
    message,
    ERROR_CODES.INVALID_CONFIG,
    { parameter, value, reason }
  );
}

/**
 * Create an AudioError for device issues
 * @param {string} deviceId - Device identifier
 * @param {string} reason - Reason for the error
 * @returns {AudioError}
 */
function deviceError(deviceId, reason) {
  return new AudioError(
    `Device error (${deviceId}): ${reason}`,
    ERROR_CODES.DEVICE_NOT_FOUND,
    { deviceId, reason }
  );
}

/**
 * Create an AudioError for process issues
 * @param {number} pid - Process ID
 * @param {string} reason - Reason for the error
 * @returns {AudioError}
 */
function processError(pid, reason) {
  return new AudioError(
    `Process error (PID ${pid}): ${reason}`,
    ERROR_CODES.PROCESS_NOT_FOUND,
    { pid, reason }
  );
}

module.exports = {
  AudioError,
  ERROR_CODES,
  fromNativeError,
  invalidConfig,
  deviceError,
  processError
};
