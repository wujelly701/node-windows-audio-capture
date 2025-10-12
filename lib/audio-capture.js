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
    // 配置验证将在 T049 实现
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
