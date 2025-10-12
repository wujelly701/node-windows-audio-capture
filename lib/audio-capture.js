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
    // 启动捕获将在 T051 实现
  }

  stop() {
    // 停止捕获将在 T053 实现
  }

  _onData(data) {
    // 数据回调将在 T055 实现
  }

  static getDevices() {
    // 设备枚举将在 T057 实现
  }

  static getProcesses() {
    // 进程枚举将在 T059 实现
  }
}

module.exports = AudioCapture;
