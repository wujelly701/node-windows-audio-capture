/**
 * MicrophoneCapture - 麦克风音频捕获专用类
 * 
 * 提供简洁、语义清晰的麦克风捕获 API
 * 
 * @module lib/microphone-capture
 * @since v2.9.0
 */

const { Readable } = require('stream');
const AudioCapture = require('./audio-capture');

/**
 * 麦克风捕获类
 * 
 * 专门用于捕获麦克风音频，提供比 AudioCapture 更简洁的接口
 * 
 * @class MicrophoneCapture
 * @extends Readable
 * 
 * @example
 * // 最简单的用法
 * const mic = new MicrophoneCapture();
 * mic.on('data', (chunk) => console.log('音频数据:', chunk.length));
 * await mic.start();
 * 
 * @example
 * // 选择特定麦克风
 * const microphones = await MicrophoneCapture.getMicrophones();
 * const usbMic = microphones.find(m => m.name.includes('USB'));
 * const mic = new MicrophoneCapture({ deviceId: usbMic.id });
 * await mic.start();
 * 
 * @example
 * // 启用音频效果
 * const mic = new MicrophoneCapture({
 *   denoise: true,
 *   agc: true,
 *   eq: true,
 *   eqPreset: 'voice'
 * });
 * await mic.start();
 */
class MicrophoneCapture extends Readable {
  /**
   * 创建麦克风捕获实例
   * 
   * @param {MicrophoneConfig} [config={}] - 配置选项
   * @param {string} [config.deviceId] - 麦克风设备 ID（默认：系统默认麦克风）
   * @param {number} [config.sampleRate=48000] - 采样率
   * @param {number} [config.channels=2] - 声道数（默认 2 以匹配设备 Mix Format）
   * @param {boolean} [config.denoise=false] - 启用降噪
   * @param {boolean} [config.agc=false] - 启用 AGC
   * @param {AGCOptions} [config.agcOptions] - AGC 配置
   * @param {boolean} [config.eq=false] - 启用 EQ
   * @param {EQPreset} [config.eqPreset='flat'] - EQ 预设
   * @param {boolean} [config.useExternalBuffer] - 使用外部缓冲池
   * @param {string} [config.bufferPoolStrategy='fixed'] - 缓冲池策略
   * @param {number} [config.bufferPoolSize] - 缓冲池大小
   * @param {number} [config.bufferPoolMin] - 缓冲池最小值
   * @param {number} [config.bufferPoolMax] - 缓冲池最大值
   * 
   * @throws {TypeError} 配置参数类型错误
   * @throws {Error} 设备 ID 无效
   */
  constructor(config = {}) {
    super();
    
    // 验证配置
    this._validateConfig(config);
    
    // 保存配置
    this._config = { ...config };
    
    // v2.9.0: 创建内部 AudioCapture 实例
    // 使用 deviceId 参数支持麦克风捕获
    const captureOptions = {
      sampleRate: config.sampleRate || 48000,
      // v2.9.0: 默认 2 声道以匹配大多数设备的 Mix Format
      // 注意：WASAPI 会使用设备的实际格式，这个值主要用于 WAV 编码
      channels: config.channels || 2,
      useExternalBuffer: config.useExternalBuffer,
      bufferPoolStrategy: config.bufferPoolStrategy,
      bufferPoolSize: config.bufferPoolSize,
      bufferPoolMin: config.bufferPoolMin,
      bufferPoolMax: config.bufferPoolMax
    };
    
    // 如果指定了设备 ID，则传递给底层
    if (config.deviceId) {
      captureOptions.deviceId = config.deviceId;
    }
    
    this._internalCapture = new AudioCapture(captureOptions);
    
    // 应用音频效果
    this._applyAudioEffects(config);
    
    // 转发事件
    this._setupEventForwarding();
  }
  
  /**
   * 验证配置参数
   * 
   * @private
   * @param {MicrophoneConfig} config - 配置对象
   * @throws {TypeError} 参数类型错误
   */
  _validateConfig(config) {
    if (config.deviceId !== undefined && typeof config.deviceId !== 'string') {
      throw new TypeError('deviceId must be a string');
    }
    
    if (config.sampleRate !== undefined) {
      if (typeof config.sampleRate !== 'number' || config.sampleRate <= 0) {
        throw new TypeError('sampleRate must be a positive number');
      }
    }
    
    if (config.channels !== undefined) {
      if (![1, 2].includes(config.channels)) {
        throw new TypeError('channels must be 1 or 2 for microphone');
      }
    }
    
    if (config.eqPreset !== undefined) {
      const validPresets = ['flat', 'voice', 'music'];
      if (!validPresets.includes(config.eqPreset)) {
        throw new TypeError(`eqPreset must be one of: ${validPresets.join(', ')}`);
      }
    }
  }
  
  /**
   * 应用音频效果
   * 
   * @private
   * @param {MicrophoneConfig} config - 配置对象
   */
  _applyAudioEffects(config) {
    // 降噪
    if (config.denoise) {
      this._internalCapture.setDenoiseEnabled(true);
    }
    
    // AGC
    if (config.agc) {
      this._internalCapture.setAGCEnabled(true);
      if (config.agcOptions) {
        this._internalCapture.setAGCOptions(config.agcOptions);
      }
    }
    
    // EQ
    if (config.eq) {
      this._internalCapture.setEQEnabled(true);
      if (config.eqPreset) {
        this._applyEQPreset(config.eqPreset);
      }
    }
  }
  
  /**
   * 应用 EQ 预设
   * 
   * @private
   * @param {EQPreset} preset - 预设名称
   */
  _applyEQPreset(preset) {
    const presets = {
      flat: { low: 0, mid: 0, high: 0 },
      voice: { low: -3, mid: 5, high: 2 },
      music: { low: 4, mid: 0, high: 3 }
    };
    
    const eq = presets[preset];
    if (eq) {
      this._internalCapture.setEQBandGain('low', eq.low);
      this._internalCapture.setEQBandGain('mid', eq.mid);
      this._internalCapture.setEQBandGain('high', eq.high);
    }
  }
  
  /**
   * 设置事件转发
   * 
   * @private
   */
  _setupEventForwarding() {
    this._internalCapture.on('data', (chunk) => {
      this.emit('data', chunk);
    });
    
    this._internalCapture.on('error', (error) => {
      this.emit('error', error);
    });
    
    this._internalCapture.on('end', () => {
      this.emit('end');
    });
  }
  
  /**
   * Readable stream 接口实现（不使用，仅为满足继承要求）
   * 
   * @private
   */
  _read() {
    // 不需要实现，我们通过事件转发数据
  }
  
  // ==================== 公开方法 ====================
  
  /**
   * 启动麦克风捕获
   * 
   * @returns {Promise<void>}
   * @throws {AudioError} 启动失败
   * 
   * @example
   * const mic = new MicrophoneCapture();
   * try {
   *   await mic.start();
   *   console.log('麦克风捕获已启动');
   * } catch (error) {
   *   console.error('启动失败:', error.message);
   * }
   */
  async start() {
    // v2.9.0: 如果没有指定 deviceId，自动获取默认麦克风
    if (!this._config.deviceId) {
      const defaultMic = await MicrophoneCapture.getDefaultMicrophone();
      if (!defaultMic) {
        throw new Error('No default microphone found. Please specify a deviceId.');
      }
      
      // 更新配置和内部捕获实例
      this._config.deviceId = defaultMic.id;
      console.log(`Using default microphone: ${defaultMic.name} (${defaultMic.id})`);
      
      // 重新创建 AudioCapture 实例以使用正确的设备 ID
      const AudioCapture = require('./audio-capture');
      const captureOptions = {
        deviceId: defaultMic.id,  // 使用默认麦克风的设备 ID
        sampleRate: this._config.sampleRate || 48000,
        channels: this._config.channels || 1,
        useExternalBuffer: this._config.useExternalBuffer,
        bufferPoolStrategy: this._config.bufferPoolStrategy,
        bufferPoolSize: this._config.bufferPoolSize,
        bufferPoolMin: this._config.bufferPoolMin,
        bufferPoolMax: this._config.bufferPoolMax
      };
      
      // 停止旧实例（如果有）
      if (this._internalCapture) {
        try {
          this._internalCapture.stop();
        } catch (e) {
          // 忽略错误
        }
      }
      
      // 创建新实例
      this._internalCapture = new AudioCapture(captureOptions);
      
      // 重新应用音频效果
      this._applyAudioEffects(this._config);
      
      // 重新设置事件转发
      this._setupEventForwarding();
    }
    
    return this._internalCapture.start();
  }
  
  /**
   * 停止麦克风捕获
   * 
   * @example
   * mic.stop();
   * console.log('麦克风捕获已停止');
   */
  stop() {
    this._internalCapture.stop();
  }
  
  // ==================== 音频效果 - 降噪 ====================
  
  /**
   * 启用或禁用降噪
   * 
   * @param {boolean} enabled - true 启用，false 禁用
   * 
   * @example
   * mic.setDenoiseEnabled(true);
   */
  setDenoiseEnabled(enabled) {
    this._internalCapture.setDenoiseEnabled(enabled);
  }
  
  /**
   * 获取降噪状态
   * 
   * @returns {boolean} true 如果降噪已启用
   * 
   * @example
   * if (mic.getDenoiseEnabled()) {
   *   console.log('降噪已启用');
   * }
   */
  getDenoiseEnabled() {
    return this._internalCapture.getDenoiseEnabled();
  }
  
  /**
   * 获取降噪统计信息
   * 
   * @returns {DenoiseStats|null} 统计信息对象，如果未启用则返回 null
   * 
   * @example
   * const stats = mic.getDenoiseStats();
   * if (stats) {
   *   console.log('语音概率:', (stats.vadProbability * 100).toFixed(1) + '%');
   * }
   */
  getDenoiseStats() {
    return this._internalCapture.getDenoiseStats();
  }
  
  // ==================== 音频效果 - AGC ====================
  
  /**
   * 启用或禁用 AGC
   * 
   * @param {boolean} enabled - true 启用，false 禁用
   * 
   * @example
   * mic.setAGCEnabled(true);
   */
  setAGCEnabled(enabled) {
    this._internalCapture.setAGCEnabled(enabled);
  }
  
  /**
   * 获取 AGC 状态
   * 
   * @returns {boolean} true 如果 AGC 已启用
   * 
   * @example
   * if (mic.getAGCEnabled()) {
   *   console.log('AGC 已启用');
   * }
   */
  getAGCEnabled() {
    return this._internalCapture.getAGCEnabled();
  }
  
  /**
   * 设置 AGC 配置参数
   * 
   * @param {AGCOptions} options - AGC 配置
   * @param {number} [options.targetLevel=-20] - 目标输出电平 (dBFS)
   * @param {number} [options.maxGain=20] - 最大增益 (dB)
   * @param {number} [options.minGain=-10] - 最小增益 (dB)
   * @param {number} [options.attackTime=10] - 攻击时间 (ms)
   * @param {number} [options.releaseTime=100] - 释放时间 (ms)
   * 
   * @example
   * mic.setAGCOptions({
   *   targetLevel: -18,
   *   maxGain: 30,
   *   attackTime: 10,
   *   releaseTime: 100
   * });
   */
  setAGCOptions(options) {
    this._internalCapture.setAGCOptions(options);
  }
  
  /**
   * 获取 AGC 配置参数
   * 
   * @returns {AGCOptions|null} 配置对象，如果未初始化则返回 null
   * 
   * @example
   * const options = mic.getAGCOptions();
   * if (options) {
   *   console.log('目标电平:', options.targetLevel, 'dBFS');
   * }
   */
  getAGCOptions() {
    return this._internalCapture.getAGCOptions();
  }
  
  /**
   * 获取 AGC 统计信息
   * 
   * @returns {AGCStats|null} 统计信息对象，如果未初始化则返回 null
   * 
   * @example
   * const stats = mic.getAGCStats();
   * if (stats) {
   *   console.log('当前增益:', stats.currentGain.toFixed(2), 'dB');
   * }
   */
  getAGCStats() {
    return this._internalCapture.getAGCStats();
  }
  
  // ==================== 音频效果 - EQ ====================
  
  /**
   * 启用或禁用 EQ
   * 
   * @param {boolean} enabled - true 启用，false 禁用
   * 
   * @example
   * mic.setEQEnabled(true);
   */
  setEQEnabled(enabled) {
    this._internalCapture.setEQEnabled(enabled);
  }
  
  /**
   * 获取 EQ 状态
   * 
   * @returns {boolean} true 如果 EQ 已启用
   * 
   * @example
   * if (mic.getEQEnabled()) {
   *   console.log('EQ 已启用');
   * }
   */
  getEQEnabled() {
    return this._internalCapture.getEQEnabled();
  }
  
  /**
   * 设置指定频段的增益
   * 
   * @param {'low'|'mid'|'high'} band - 频段名称
   * @param {number} gain - 增益 (dB)，范围 -20 到 +20
   * 
   * @example
   * mic.setEQBandGain('low', -3);  // 减少低音
   * mic.setEQBandGain('mid', 5);   // 增强中频（人声）
   * mic.setEQBandGain('high', 2);  // 增强高音
   */
  setEQBandGain(band, gain) {
    this._internalCapture.setEQBandGain(band, gain);
  }
  
  /**
   * 获取指定频段的增益
   * 
   * @param {'low'|'mid'|'high'} band - 频段名称
   * @returns {number} 增益 (dB)
   * 
   * @example
   * const lowGain = mic.getEQBandGain('low');
   * console.log('低频增益:', lowGain, 'dB');
   */
  getEQBandGain(band) {
    return this._internalCapture.getEQBandGain(band);
  }
  
  /**
   * 获取 EQ 统计信息
   * 
   * @returns {EQStats|null} 统计信息对象，如果未启用则返回 null
   * 
   * @example
   * const stats = mic.getEQStats();
   * if (stats) {
   *   console.log('Low:', stats.lowGain, 'Mid:', stats.midGain, 'High:', stats.highGain);
   * }
   */
  getEQStats() {
    return this._internalCapture.getEQStats();
  }
  
  // ==================== 静态方法 ====================
  
  /**
   * 枚举系统中所有麦克风设备
   * 
   * @static
   * @returns {Promise<Microphone[]>} 麦克风设备数组
   * 
   * @example
   * const microphones = await MicrophoneCapture.getMicrophones();
   * microphones.forEach(mic => {
   *   console.log(`${mic.name} (${mic.isDefault ? '默认' : ''})`);
   * });
   */
  static async getMicrophones() {
    // 使用新的 N-API 方法获取输入设备
    const AudioCapture = require('./audio-capture');
    
    try {
      // 尝试使用新的 getAudioInputDevices 方法
      if (AudioCapture.getAudioInputDevices) {
        const devices = await AudioCapture.getAudioInputDevices();
        return devices.map(d => ({
          id: d.id,
          name: d.name,
          isDefault: d.isDefault,
          isActive: d.isActive,
          channelCount: 1,  // 麦克风通常是单声道
          sampleRate: 48000,
          manufacturer: undefined
        }));
      }
    } catch (error) {
      console.warn('Failed to enumerate microphones:', error.message);
    }
    
    // 降级：使用旧方法并筛选 capture 设备
    const allDevices = await AudioCapture.getAudioDevices();
    return allDevices
      .filter(d => d.type === 'capture')
      .map(d => ({
        id: d.id,
        name: d.name,
        isDefault: d.isDefault,
        isActive: d.isActive,
        channelCount: 1,
        sampleRate: 48000,
        manufacturer: undefined
      }));
  }
  
  /**
   * 获取系统默认麦克风
   * 
   * @static
   * @returns {Promise<Microphone|null>} 默认麦克风设备，如果没有则返回 null
   * 
   * @example
   * const defaultMic = await MicrophoneCapture.getDefaultMicrophone();
   * if (defaultMic) {
   *   console.log('默认麦克风:', defaultMic.name);
   * }
   */
  static async getDefaultMicrophone() {
    const microphones = await this.getMicrophones();
    return microphones.find(m => m.isDefault) || null;
  }
}

module.exports = { MicrophoneCapture };
