const { Readable } = require('stream');
const addon = require('../build/Release/audio_addon');

class AudioCapture extends Readable {
  constructor(options = {}) {
    super(options);
    this._validateConfig(options);
    
    // v2.3: Support device selection
    // If deviceId is provided, validate it before creating processor
    if (options.deviceId !== undefined) {
      const isValid = addon.verifyDeviceId(options.deviceId);
      if (!isValid) {
        throw new Error(`Invalid device ID: ${options.deviceId}`);
      }
    }
    
    // Build processor options
    const processorOptions = {
      processId: options.processId || 0,
      loopbackMode: options.loopbackMode || 0
    };
    
    // v2.3: Add deviceId if specified
    if (options.deviceId) {
      processorOptions.deviceId = options.deviceId;
    }
    
    // v2.7: Add useExternalBuffer for zero-copy mode
    // Default is now TRUE (enabled) for better performance
    // Users can explicitly set to false to revert to traditional mode
    if (options.useExternalBuffer !== undefined) {
      processorOptions.useExternalBuffer = Boolean(options.useExternalBuffer);
    }
    // If not specified, C++ layer defaults to true (zero-copy enabled)
    
    // v2.7: Buffer pool configuration
    if (options.bufferPoolStrategy !== undefined) {
      processorOptions.bufferPoolStrategy = options.bufferPoolStrategy; // 'fixed' or 'adaptive'
    }
    if (options.bufferPoolSize !== undefined) {
      processorOptions.bufferPoolSize = options.bufferPoolSize; // Initial pool size
    }
    if (options.bufferPoolMin !== undefined) {
      processorOptions.bufferPoolMin = options.bufferPoolMin; // Min size for adaptive
    }
    if (options.bufferPoolMax !== undefined) {
      processorOptions.bufferPoolMax = options.bufferPoolMax; // Max size for adaptive
    }
    
    this._processor = new addon.AudioProcessor(processorOptions);
    this._isCapturing = false;
    this._deviceId = options.deviceId; // Store for reference
    
    // v2.7: Initialize audio effects (denoise) if specified
    if (options.effects && options.effects.denoise) {
      try {
        this._processor.setDenoiseEnabled(true);
      } catch (error) {
        throw new Error(`Failed to enable denoise: ${error.message}`);
      }
    }
  }

  _validateConfig(config) {
    if (config.processId !== undefined) {
      if (typeof config.processId !== 'number' || config.processId < 0) {
        throw new TypeError('processId must be a non-negative number');
      }
    }
    
    if (config.loopbackMode !== undefined) {
      if (typeof config.loopbackMode !== 'number' || 
          (config.loopbackMode !== 0 && config.loopbackMode !== 1)) {
        throw new TypeError('loopbackMode must be 0 (EXCLUDE) or 1 (INCLUDE)');
      }
    }
    
    // v2.3: Validate deviceId if provided
    if (config.deviceId !== undefined) {
      if (typeof config.deviceId !== 'string' || config.deviceId.length === 0) {
        throw new TypeError('deviceId must be a non-empty string');
      }
    }
    
    if (config.sampleRate !== undefined) {
      const validRates = [8000, 11025, 16000, 22050, 44100, 48000];
      if (!validRates.includes(config.sampleRate)) {
        throw new TypeError(`sampleRate must be one of: ${validRates.join(', ')}`);
      }
    }
    
    if (config.channels !== undefined) {
      if (typeof config.channels !== 'number' || config.channels < 1 || config.channels > 2) {
        throw new TypeError('channels must be 1 (mono) or 2 (stereo)');
      }
    }
    
    // v2.7: Validate audio effects configuration
    if (config.effects !== undefined) {
      if (typeof config.effects !== 'object' || config.effects === null) {
        throw new TypeError('effects must be an object');
      }
      
      if (config.effects.denoise !== undefined) {
        if (typeof config.effects.denoise !== 'boolean') {
          throw new TypeError('effects.denoise must be a boolean');
        }
      }
    }
    
    // v2.7: Validate buffer pool configuration
    if (config.bufferPoolStrategy !== undefined) {
      if (typeof config.bufferPoolStrategy !== 'string') {
        throw new TypeError('bufferPoolStrategy must be a string');
      }
      if (config.bufferPoolStrategy !== 'fixed' && config.bufferPoolStrategy !== 'adaptive') {
        throw new TypeError('bufferPoolStrategy must be "fixed" or "adaptive"');
      }
    }
    
    if (config.bufferPoolSize !== undefined) {
      if (typeof config.bufferPoolSize !== 'number' || config.bufferPoolSize < 1) {
        throw new TypeError('bufferPoolSize must be a positive number');
      }
    }
    
    if (config.bufferPoolMin !== undefined) {
      if (typeof config.bufferPoolMin !== 'number' || config.bufferPoolMin < 1) {
        throw new TypeError('bufferPoolMin must be a positive number');
      }
    }
    
    if (config.bufferPoolMax !== undefined) {
      if (typeof config.bufferPoolMax !== 'number' || config.bufferPoolMax < 1) {
        throw new TypeError('bufferPoolMax must be a positive number');
      }
    }
  }

  _read() {
    // Readable 流接口实现
  }

  start(callback) {
    if (this._isCapturing) {
      const error = new Error('Audio capture is already running');
      if (callback) {
        return callback(error);
      }
      throw error;
    }

    try {
      this._processor.start(this._onData.bind(this));
      this._isCapturing = true;
      this.emit('started');
      
      if (callback) {
        callback(null);
      }
    } catch (error) {
      this._isCapturing = false;
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
    }
  }

  stop(callback) {
    if (!this._isCapturing) {
      const error = new Error('Audio capture is not running');
      if (callback) {
        return callback(error);
      }
      throw error;
    }

    try {
      this._processor.stop();
      this._isCapturing = false;
      this.push(null); // Signal end of stream
      this.emit('stopped');
      
      if (callback) {
        callback(null);
      }
    } catch (error) {
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
    }
  }

  _onData(data) {
    try {
      // Validate data is a Buffer
      if (!Buffer.isBuffer(data)) {
        throw new TypeError('Audio data must be a Buffer');
      }

      // Push data to the Readable stream
      // Returns false if the internal buffer is full
      const shouldContinue = this.push(data);
      
      if (!shouldContinue) {
        // Back pressure: stream consumer is slow
        // The native module should handle this by pausing/buffering
        this.emit('backpressure');
      }

      // Emit data event for event-based consumers
      this.emit('data', data);
    } catch (error) {
      // Emit error but don't stop capture
      // Consumer can decide whether to stop
      this.emit('error', error);
    }
  }

  /**
   * v2.3: Get all audio output devices
   * @returns {Promise<AudioDeviceInfo[]>} Array of available audio devices
   */
  static async getAudioDevices() {
    try {
      // Call native module to get device information
      const devices = addon.getAudioDevices();
      
      // Validate return value
      if (!Array.isArray(devices)) {
        throw new TypeError('Native getAudioDevices must return an array');
      }
      
      // Validate each device object
      return devices.map((device, index) => {
        if (!device || typeof device !== 'object') {
          throw new TypeError(`Device at index ${index} must be an object`);
        }
        
        if (typeof device.id !== 'string') {
          throw new TypeError(`Device at index ${index} must have a string 'id' property`);
        }
        
        if (typeof device.name !== 'string') {
          throw new TypeError(`Device at index ${index} must have a string 'name' property`);
        }
        
        if (typeof device.description !== 'string') {
          throw new TypeError(`Device at index ${index} must have a string 'description' property`);
        }
        
        if (typeof device.isDefault !== 'boolean') {
          throw new TypeError(`Device at index ${index} must have a boolean 'isDefault' property`);
        }
        
        if (typeof device.isActive !== 'boolean') {
          throw new TypeError(`Device at index ${index} must have a boolean 'isActive' property`);
        }
        
        return {
          id: device.id,
          name: device.name,
          description: device.description,
          isDefault: device.isDefault,
          isActive: device.isActive
        };
      });
    } catch (error) {
      // Re-throw with more context
      throw new Error(`Failed to get audio devices: ${error.message}`);
    }
  }

  /**
   * v2.3: Get the default audio output device ID
   * @returns {Promise<string|null>} Default device ID or null if not found
   */
  static async getDefaultDeviceId() {
    try {
      const deviceId = addon.getDefaultDeviceId();
      return deviceId || null;
    } catch (error) {
      throw new Error(`Failed to get default device ID: ${error.message}`);
    }
  }

  /**
   * Get current device ID (if specified in constructor)
   * @returns {string|undefined} Device ID or undefined if using default
   */
  getDeviceId() {
    return this._deviceId;
  }

  /**
   * @deprecated Use getAudioDevices() instead
   */
  static getDevices() {
    console.warn('AudioCapture.getDevices() is deprecated. Use AudioCapture.getAudioDevices() instead.');
    return this.getAudioDevices();
  }

  static getProcesses() {
    try {
      // Call native module to enumerate processes
      const processes = addon.enumerateProcesses();
      
      // Validate return value
      if (!Array.isArray(processes)) {
        throw new TypeError('Native enumerateProcesses must return an array');
      }
      
      // Validate each process object
      return processes.map((process, index) => {
        if (!process || typeof process !== 'object') {
          throw new TypeError(`Process at index ${index} must be an object`);
        }
        
        if (typeof process.pid !== 'number') {
          throw new TypeError(`Process at index ${index} must have a number 'pid' property`);
        }
        
        if (process.pid < 0) {
          throw new TypeError(`Process at index ${index} has invalid pid: ${process.pid}`);
        }
        
        if (typeof process.name !== 'string') {
          throw new TypeError(`Process at index ${index} must have a string 'name' property`);
        }
        
        return {
          pid: process.pid,
          name: process.name
        };
      });
    } catch (error) {
      // Re-throw with more context
      throw new Error(`Failed to enumerate processes: ${error.message}`);
    }
  }

  /**
   * v2.4: Start monitoring device events (hot-plug, state changes, etc.)
   * @param {Function} callback - Callback function that receives device events
   */
  static startDeviceMonitoring(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function');
    }
    
    try {
      addon.startDeviceMonitoring(callback);
    } catch (error) {
      throw new Error(`Failed to start device monitoring: ${error.message}`);
    }
  }

  /**
   * v2.4: Stop monitoring device events
   */
  static stopDeviceMonitoring() {
    try {
      addon.stopDeviceMonitoring();
    } catch (error) {
      throw new Error(`Failed to stop device monitoring: ${error.message}`);
    }
  }

  /**
   * v2.6: Get buffer pool statistics (zero-copy mode only)
   * @returns {Object|null} Pool statistics or null if not using zero-copy mode
   * 
   * Returns object with the following properties:
   * - poolHits: Number of successful buffer acquisitions from pool
   * - poolMisses: Number of times pool was empty (fallback to dynamic allocation)
   * - dynamicAllocations: Total number of dynamic allocations
   * - currentPoolSize: Current number of buffers in pool
   * - maxPoolSize: Maximum pool capacity
   * - hitRate: Percentage of requests served from pool (0-100)
   */
  getPoolStats() {
    try {
      return this._processor.getPoolStats();
    } catch (error) {
      throw new Error(`Failed to get pool statistics: ${error.message}`);
    }
  }

  /**
   * v2.7: Enable or disable audio denoising (RNNoise)
   * @param {boolean} enabled - True to enable, false to disable
   * 
   * RNNoise provides deep learning-based noise suppression optimized for speech.
   * Typical noise reduction: 15-25 dB
   * CPU overhead: 3-5%
   * Latency: < 10ms (480 samples @ 48kHz)
   * 
   * @throws {Error} If denoise processor fails to initialize
   */
  setDenoiseEnabled(enabled) {
    if (typeof enabled !== 'boolean') {
      throw new TypeError('enabled must be a boolean');
    }
    
    try {
      this._processor.setDenoiseEnabled(enabled);
    } catch (error) {
      throw new Error(`Failed to set denoise state: ${error.message}`);
    }
  }

  /**
   * v2.7: Get current denoise state
   * @returns {boolean} True if denoise is enabled, false otherwise
   */
  getDenoiseEnabled() {
    try {
      return this._processor.getDenoiseEnabled();
    } catch (error) {
      throw new Error(`Failed to get denoise state: ${error.message}`);
    }
  }

  /**
   * v2.7: Get denoise processing statistics
   * @returns {Object|null} Statistics object or null if denoise is not enabled
   * 
   * Returns object with the following properties:
   * - processedFrames: Total number of audio frames processed (480 samples each)
   * - voiceProbability: Last voice activity detection score (0.0-1.0)
   *   - > 0.5: Speech detected
   *   - < 0.5: Noise/silence
   * - frameSize: Number of samples per frame (always 480)
   * - enabled: Current denoise state (boolean)
   */
  getDenoiseStats() {
    try {
      return this._processor.getDenoiseStats();
    } catch (error) {
      throw new Error(`Failed to get denoise stats: ${error.message}`);
    }
  }

  /**
   * v2.8: Enable or disable AGC (Automatic Gain Control)
   * 
   * AGC dynamically adjusts audio gain to maintain consistent output level.
   * 
   * @param {boolean} enabled - True to enable, false to disable
   * @throws {TypeError} If enabled is not a boolean
   * @throws {Error} If AGC state change fails
   */
  setAGCEnabled(enabled) {
    if (typeof enabled !== 'boolean') {
      throw new TypeError('enabled must be a boolean');
    }
    
    try {
      this._processor.setAGCEnabled(enabled);
    } catch (error) {
      throw new Error(`Failed to set AGC state: ${error.message}`);
    }
  }

  /**
   * v2.8: Get current AGC state
   * @returns {boolean} True if AGC is enabled, false otherwise
   */
  getAGCEnabled() {
    try {
      return this._processor.getAGCEnabled();
    } catch (error) {
      throw new Error(`Failed to get AGC state: ${error.message}`);
    }
  }

  /**
   * v2.8: Set AGC configuration options
   * 
   * @param {Object} options - AGC configuration parameters
   * @param {number} [options.targetLevel=-20] - Target output level in dBFS (-30 to -10)
   * @param {number} [options.maxGain=20] - Maximum gain in dB (10-30)
   * @param {number} [options.minGain=-10] - Minimum gain in dB (-20 to 0)
   * @param {number} [options.attackTime=10] - Attack time in ms (5-20)
   * @param {number} [options.releaseTime=100] - Release time in ms (50-200)
   * 
   * @throws {TypeError} If options is not an object
   * @throws {Error} If AGC is not initialized or option setting fails
   */
  setAGCOptions(options) {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError('options must be an object');
    }
    
    try {
      this._processor.setAGCOptions(options);
    } catch (error) {
      throw new Error(`Failed to set AGC options: ${error.message}`);
    }
  }

  /**
   * v2.8: Get current AGC configuration options
   * @returns {Object|null} AGC options object or null if AGC is not initialized
   * 
   * Returns object with the following properties:
   * - targetLevel: Target output level (dBFS)
   * - maxGain: Maximum gain (dB)
   * - minGain: Minimum gain (dB)
   * - attackTime: Attack time (ms)
   * - releaseTime: Release time (ms)
   */
  getAGCOptions() {
    try {
      return this._processor.getAGCOptions();
    } catch (error) {
      throw new Error(`Failed to get AGC options: ${error.message}`);
    }
  }

  /**
   * v2.8: Get AGC processing statistics
   * @returns {Object|null} Statistics object or null if AGC is not initialized
   * 
   * Returns object with the following properties:
   * - enabled: Current AGC state (boolean)
   * - currentGain: Current applied gain (dB)
   * - averageLevel: Average input level (dBFS)
   * - rmsLinear: Current RMS value (linear scale)
   * - clipping: Whether clipping is detected (boolean)
   * - framesProcessed: Total number of audio frames processed
   */
  getAGCStats() {
    try {
      return this._processor.getAGCStats();
    } catch (error) {
      throw new Error(`Failed to get AGC stats: ${error.message}`);
    }
  }

  // ==================== v2.8: 3-Band EQ Methods ====================

  /**
   * Enable or disable 3-Band EQ
   * @param {boolean} enabled - true to enable, false to disable
   */
  setEQEnabled(enabled) {
    try {
      this._processor.setEQEnabled(Boolean(enabled));
    } catch (error) {
      throw new Error(`Failed to set EQ enabled: ${error.message}`);
    }
  }

  /**
   * Get EQ enabled state
   * @returns {boolean} Whether EQ is enabled
   */
  getEQEnabled() {
    try {
      return this._processor.getEQEnabled();
    } catch (error) {
      throw new Error(`Failed to get EQ enabled: ${error.message}`);
    }
  }

  /**
   * Set EQ band gain
   * @param {string} band - Band name: 'low', 'mid', 'high'
   * @param {number} gain - Gain in dB (-20 to +20)
   */
  setEQBandGain(band, gain) {
    const validBands = ['low', 'mid', 'high'];
    if (!validBands.includes(band)) {
      throw new Error(`Invalid band: ${band}. Must be 'low', 'mid', or 'high'`);
    }
    if (typeof gain !== 'number' || isNaN(gain)) {
      throw new Error(`Invalid gain: ${gain}. Must be a number`);
    }
    try {
      this._processor.setEQBandGain(band, gain);
    } catch (error) {
      throw new Error(`Failed to set EQ band gain: ${error.message}`);
    }
  }

  /**
   * Get EQ band gain
   * @param {string} band - Band name: 'low', 'mid', 'high'
   * @returns {number} Gain in dB
   */
  getEQBandGain(band) {
    const validBands = ['low', 'mid', 'high'];
    if (!validBands.includes(band)) {
      throw new Error(`Invalid band: ${band}. Must be 'low', 'mid', or 'high'`);
    }
    try {
      return this._processor.getEQBandGain(band);
    } catch (error) {
      throw new Error(`Failed to get EQ band gain: ${error.message}`);
    }
  }

  /**
   * Get EQ statistics
   * @returns {Object} EQ stats
   * - enabled: Whether EQ is enabled (boolean)
   * - lowGain: Low band gain in dB (number)
   * - midGain: Mid band gain in dB (number)
   * - highGain: High band gain in dB (number)
   * - framesProcessed: Total number of audio frames processed
   */
  getEQStats() {
    try {
      return this._processor.getEQStats();
    } catch (error) {
      throw new Error(`Failed to get EQ stats: ${error.message}`);
    }
  }
}

module.exports = AudioCapture;
