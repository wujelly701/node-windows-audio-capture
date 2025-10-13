/**
 * 音频格式转换工具类
 * 用于将 node-windows-audio-capture 的输出格式转换为 Gummy API 要求的格式
 * 
 * @author node-windows-audio-capture
 * @version 1.0.0
 * @date 2025-10-14
 */

class AudioFormatConverter {
  /**
   * 创建音频格式转换器
   * 
   * @param {Object} options - 转换选项
   * @param {number} [options.inputChannels=2] - 输入声道数（默认立体声）
   * @param {number} [options.outputChannels=1] - 输出声道数（默认单声道）
   * @param {string} [options.inputFormat='float32'] - 输入格式（默认 float32）
   * @param {string} [options.outputFormat='int16'] - 输出格式（默认 int16）
   * @param {number} [options.inputSampleRate=48000] - 输入采样率
   * @param {number} [options.outputSampleRate=48000] - 输出采样率（暂不支持重采样）
   */
  constructor(options = {}) {
    this.inputChannels = options.inputChannels || 2;
    this.outputChannels = options.outputChannels || 1;
    this.inputFormat = options.inputFormat || 'float32';
    this.outputFormat = options.outputFormat || 'int16';
    this.inputSampleRate = options.inputSampleRate || 48000;
    this.outputSampleRate = options.outputSampleRate || 48000;
    
    // 验证配置
    if (this.inputSampleRate !== this.outputSampleRate) {
      throw new Error('采样率转换暂不支持，请使用第三方重采样库');
    }
    
    if (this.inputFormat !== 'float32') {
      throw new Error('当前仅支持 float32 输入格式');
    }
    
    if (this.outputFormat !== 'int16') {
      throw new Error('当前仅支持 int16 输出格式');
    }
  }
  
  /**
   * 转换音频数据
   * 完整的转换管道：立体声→单声道 + Float32→Int16
   * 
   * @param {Buffer} inputBuffer - 输入音频数据（Float32 立体声）
   * @returns {Buffer} 转换后的音频数据（Int16 单声道）
   */
  convert(inputBuffer) {
    // 步骤1: 立体声转单声道（如果需要）
    let monoBuffer = inputBuffer;
    if (this.inputChannels === 2 && this.outputChannels === 1) {
      monoBuffer = this.stereoToMono(inputBuffer);
    }
    
    // 步骤2: Float32 转 Int16（如果需要）
    if (this.inputFormat === 'float32' && this.outputFormat === 'int16') {
      return this.float32ToInt16(monoBuffer);
    }
    
    return monoBuffer;
  }
  
  /**
   * 立体声转单声道（平均混合法）
   * 
   * @param {Buffer} stereoBuffer - 立体声 Float32 数据
   * @returns {Buffer} 单声道 Float32 数据
   * 
   * @example
   * // 输入: [L1, R1, L2, R2, L3, R3, ...]
   * // 输出: [(L1+R1)/2, (L2+R2)/2, (L3+R3)/2, ...]
   */
  stereoToMono(stereoBuffer) {
    const floatSize = 4; // Float32 = 4 bytes
    const stereoFrameSize = floatSize * 2; // 1帧立体声 = 8 bytes
    
    const frameCount = Math.floor(stereoBuffer.length / stereoFrameSize);
    const monoBuffer = Buffer.alloc(frameCount * floatSize);
    
    for (let i = 0; i < frameCount; i++) {
      const offset = i * stereoFrameSize;
      const left = stereoBuffer.readFloatLE(offset);
      const right = stereoBuffer.readFloatLE(offset + floatSize);
      
      // 平均混合
      const mono = (left + right) / 2.0;
      monoBuffer.writeFloatLE(mono, i * floatSize);
    }
    
    return monoBuffer;
  }
  
  /**
   * Float32 转 Int16 PCM
   * 
   * @param {Buffer} float32Buffer - Float32 PCM 数据
   * @returns {Buffer} Int16 PCM 数据
   * 
   * @example
   * // Float32: -1.0 ~ +1.0 (每个样本 4 bytes)
   * // Int16:  -32768 ~ +32767 (每个样本 2 bytes)
   */
  float32ToInt16(float32Buffer) {
    const floatSize = 4;
    const int16Size = 2;
    
    const sampleCount = Math.floor(float32Buffer.length / floatSize);
    const int16Buffer = Buffer.alloc(sampleCount * int16Size);
    
    for (let i = 0; i < sampleCount; i++) {
      const floatSample = float32Buffer.readFloatLE(i * floatSize);
      
      // 限制范围到 [-1.0, 1.0]
      const clamped = Math.max(-1.0, Math.min(1.0, floatSample));
      
      // 转换为 Int16 [-32768, 32767]
      const int16Sample = Math.round(clamped * 32767);
      
      int16Buffer.writeInt16LE(int16Sample, i * int16Size);
    }
    
    return int16Buffer;
  }
  
  /**
   * 获取转换后的数据大小（估计）
   * 
   * @param {number} inputSize - 输入数据大小（bytes）
   * @returns {number} 输出数据大小（bytes）
   */
  estimateOutputSize(inputSize) {
    let outputSize = inputSize;
    
    // 立体声→单声道：大小减半
    if (this.inputChannels === 2 && this.outputChannels === 1) {
      outputSize = outputSize / 2;
    }
    
    // Float32→Int16：大小减半
    if (this.inputFormat === 'float32' && this.outputFormat === 'int16') {
      outputSize = outputSize / 2;
    }
    
    return Math.floor(outputSize);
  }
  
  /**
   * 获取转换信息（用于调试）
   * 
   * @returns {Object} 转换配置信息
   */
  getInfo() {
    return {
      input: {
        format: this.inputFormat,
        channels: this.inputChannels,
        sampleRate: this.inputSampleRate,
        bytesPerSample: 4 // Float32
      },
      output: {
        format: this.outputFormat,
        channels: this.outputChannels,
        sampleRate: this.outputSampleRate,
        bytesPerSample: 2 // Int16
      },
      sizeReduction: `${((1 - this.estimateOutputSize(1000) / 1000) * 100).toFixed(1)}%`
    };
  }
}

module.exports = AudioFormatConverter;

// ============================================================
// 使用示例
// ============================================================

if (require.main === module) {
  const { AudioProcessor } = require('node-windows-audio-capture');
  
  console.log('音频格式转换器示例\n');
  
  // 创建转换器
  const converter = new AudioFormatConverter({
    inputChannels: 2,      // 立体声
    outputChannels: 1,     // 单声道
    inputFormat: 'float32',
    outputFormat: 'int16'
  });
  
  console.log('转换配置:', JSON.stringify(converter.getInfo(), null, 2));
  console.log();
  
  // 示例：转换音频数据
  const processor = new AudioProcessor({
    processId: 0, // 系统音频
    callback: (audioData) => {
      console.log(`\n原始数据: ${audioData.length} bytes`);
      
      // 转换格式
      const converted = converter.convert(audioData);
      
      console.log(`转换后: ${converted.length} bytes`);
      console.log(`压缩率: ${((1 - converted.length / audioData.length) * 100).toFixed(1)}%`);
      
      // 这里可以将 converted 发送到 Gummy API
      // sendToGummyAPI(converted);
    }
  });
  
  console.log('\n开始捕获音频（5秒）...\n');
  
  processor.start().then(() => {
    processor.startCapture();
    
    setTimeout(() => {
      processor.stopCapture();
      processor.stop();
      console.log('\n✅ 测试完成');
    }, 5000);
  });
}
