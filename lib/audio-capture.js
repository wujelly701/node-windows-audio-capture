const { Readable } = require('stream');
const addon = require('../build/Release/node_windows_audio_capture');

class AudioCapture extends Readable {
  constructor(options = {}) {
    super(options);
    this._validateConfig(options);
    this._processor = new addon.AudioProcessor(
      options.processId || 0,
      options.loopbackMode || 0
    );
    this._isCapturing = false;
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

  static getDevices() {
    try {
      // Call native module to get device information
      const devices = addon.GetDeviceInfo();
      
      // Validate return value
      if (!Array.isArray(devices)) {
        throw new TypeError('Native GetDeviceInfo must return an array');
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
        
        return {
          id: device.id,
          name: device.name
        };
      });
    } catch (error) {
      // Re-throw with more context
      throw new Error(`Failed to get audio devices: ${error.message}`);
    }
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
}

module.exports = AudioCapture;
