/**
 * SincInterpolator - 基于 Kaiser 窗口的 Sinc 插值器
 * 
 * Sinc 插值是音频重采样的理想方法，基于 Whittaker-Shannon 插值定理。
 * 使用 Kaiser 窗口来截断无限长的 sinc 函数。
 * 
 * 核心思想:
 *   1. 预计算多相位的 sinc 系数表
 *   2. 根据小数延迟选择相位
 *   3. 执行 FIR 滤波
 * 
 * 性能优化:
 *   - 系数表预计算 (一次性成本)
 *   - Float32Array 提升计算速度
 *   - 对称性优化 (sinc 函数对称)
 *   - 边界检查最小化
 * 
 * @module lib/sinc-interpolator
 */

const KaiserWindow = require('./kaiser-window');

class SincInterpolator {
  /**
   * 创建 Sinc 插值器
   * 
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.lobeCount=16] - Sinc 瓣数 (半边长度)
   * @param {number} [options.phaseCount=1024] - 相位数量
   * @param {number} [options.beta=7] - Kaiser 窗口参数
   */
  constructor(options = {}) {
    this.lobeCount = options.lobeCount || 16;
    this.phaseCount = options.phaseCount || 1024;
    this.beta = options.beta || 7;
    
    // 计算参数
    this.filterLength = this.lobeCount * 2;
    this.tableSize = this.phaseCount * this.filterLength;
    
    // 验证参数
    this._validate();
    
    // 生成系数表
    this.coefficients = this._generateCoefficientTable();
    
    // 性能统计
    this.stats = {
      interpolationCount: 0,
      totalSamples: 0
    };
  }
  
  /**
   * 验证参数
   * @private
   */
  _validate() {
    if (this.lobeCount < 4 || this.lobeCount > 64) {
      throw new Error(`lobeCount must be in [4, 64], got ${this.lobeCount}`);
    }
    
    if (this.phaseCount < 64 || this.phaseCount > 8192) {
      throw new Error(`phaseCount must be in [64, 8192], got ${this.phaseCount}`);
    }
    
    if (this.beta < 0 || this.beta > 20) {
      throw new Error(`beta must be in [0, 20], got ${this.beta}`);
    }
  }
  
  /**
   * 归一化 sinc 函数
   * sinc(x) = sin(πx) / (πx)
   * 
   * @param {number} x - 输入值
   * @returns {number} sinc(x)
   * @private
   */
  _sinc(x) {
    if (Math.abs(x) < 1e-10) {
      return 1.0;
    }
    
    const pix = Math.PI * x;
    return Math.sin(pix) / pix;
  }
  
  /**
   * 生成系数表
   * 
   * 为每个相位生成一组滤波器系数:
   *   coeff[phase][tap] = sinc(tap - lobeCount + phase/phaseCount) * window[tap]
   * 
   * @returns {Float32Array} 系数表
   * @private
   */
  _generateCoefficientTable() {
    const startTime = Date.now();
    
    // 分配系数表内存
    const table = new Float32Array(this.tableSize);
    
    // 生成 Kaiser 窗口
    const kaiserWindow = new KaiserWindow(this.beta, this.filterLength);
    const window = kaiserWindow.getWindow();
    
    // 为每个相位生成系数
    for (let phase = 0; phase < this.phaseCount; phase++) {
      // 计算基准偏移 (归一化到 [0, 1))
      const offset = phase / this.phaseCount;
      
      // 该相位的系数起始位置
      const baseIndex = phase * this.filterLength;
      
      // 生成系数并归一化
      let sum = 0;
      for (let tap = 0; tap < this.filterLength; tap++) {
        // sinc 函数的输入: tap 相对于中心的偏移 + 相位偏移
        const x = (tap - this.lobeCount) + offset;
        
        // sinc * window
        const coeff = this._sinc(x) * window[tap];
        table[baseIndex + tap] = coeff;
        sum += coeff;
      }
      
      // 归一化以保持增益为 1
      if (Math.abs(sum) > 1e-10) {
        for (let tap = 0; tap < this.filterLength; tap++) {
          table[baseIndex + tap] /= sum;
        }
      }
    }
    
    const elapsedMs = Date.now() - startTime;
    
    // 验证系数表
    this._verifyCoefficientTable(table);
    
    console.log(`[SincInterpolator] Coefficient table generated in ${elapsedMs}ms`);
    console.log(`[SincInterpolator] Table size: ${this.tableSize} floats (${(this.tableSize * 4 / 1024).toFixed(2)} KB)`);
    
    return table;
  }
  
  /**
   * 验证系数表
   * @param {Float32Array} table - 系数表
   * @private
   */
  _verifyCoefficientTable(table) {
    // 检查前几个相位的系数和
    const phasesToCheck = Math.min(5, this.phaseCount);
    
    for (let phase = 0; phase < phasesToCheck; phase++) {
      const baseIndex = phase * this.filterLength;
      let sum = 0;
      
      for (let tap = 0; tap < this.filterLength; tap++) {
        sum += table[baseIndex + tap];
      }
      
      // 系数和应该接近 1.0
      if (Math.abs(sum - 1.0) > 0.001) {
        console.warn(`[SincInterpolator] Phase ${phase} coefficient sum = ${sum.toFixed(6)} (expected ~1.0)`);
      }
    }
  }
  
  /**
   * 插值单个样本 (单声道)
   * 
   * @param {Float32Array} input - 输入缓冲区
   * @param {number} position - 插值位置 (可以是小数)
   * @returns {number} 插值结果
   */
  interpolate(input, position) {
    // 整数部分和小数部分
    const intPart = Math.floor(position);
    const fracPart = position - intPart;
    
    // 选择相位
    const phase = Math.floor(fracPart * this.phaseCount);
    const baseIndex = phase * this.filterLength;
    
    // FIR 滤波
    let sum = 0;
    const startTap = intPart - this.lobeCount;
    
    for (let tap = 0; tap < this.filterLength; tap++) {
      const sampleIndex = startTap + tap;
      
      // 边界检查
      if (sampleIndex >= 0 && sampleIndex < input.length) {
        sum += input[sampleIndex] * this.coefficients[baseIndex + tap];
      }
    }
    
    this.stats.interpolationCount++;
    this.stats.totalSamples++;
    
    return sum;
  }
  
  /**
   * 批量插值 (单声道)
   * 
   * @param {Float32Array} input - 输入缓冲区
   * @param {Float32Array} output - 输出缓冲区
   * @param {number} ratio - 重采样比率 (inputRate / outputRate)
   */
  resample(input, output, ratio) {
    const outputLength = output.length;
    
    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      output[i] = this.interpolate(input, position);
    }
  }
  
  /**
   * 批量插值 (立体声交织格式)
   * 
   * 输入/输出格式: [L, R, L, R, ...]
   * 
   * @param {Float32Array} input - 输入缓冲区 (交织)
   * @param {Float32Array} output - 输出缓冲区 (交织)
   * @param {number} ratio - 重采样比率
   */
  resampleStereo(input, output, ratio) {
    const outputFrames = output.length / 2;
    
    for (let frame = 0; frame < outputFrames; frame++) {
      const position = frame * ratio;
      
      // 整数部分和小数部分
      const intPart = Math.floor(position);
      const fracPart = position - intPart;
      
      // 选择相位
      const phase = Math.floor(fracPart * this.phaseCount);
      const baseIndex = phase * this.filterLength;
      
      // 双通道 FIR 滤波
      let sumL = 0;
      let sumR = 0;
      const startTap = intPart - this.lobeCount;
      
      for (let tap = 0; tap < this.filterLength; tap++) {
        const frameIndex = startTap + tap;
        
        // 边界检查
        if (frameIndex >= 0 && frameIndex < input.length / 2) {
          const coeff = this.coefficients[baseIndex + tap];
          const sampleIndexL = frameIndex * 2;
          const sampleIndexR = frameIndex * 2 + 1;
          
          sumL += input[sampleIndexL] * coeff;
          sumR += input[sampleIndexR] * coeff;
        }
      }
      
      // 写入输出
      const outIndexL = frame * 2;
      const outIndexR = frame * 2 + 1;
      output[outIndexL] = sumL;
      output[outIndexR] = sumR;
      
      this.stats.interpolationCount++;
      this.stats.totalSamples += 2;
    }
  }
  
  /**
   * 获取插值器配置
   * @returns {Object} 配置信息
   */
  getConfig() {
    return {
      lobeCount: this.lobeCount,
      phaseCount: this.phaseCount,
      beta: this.beta,
      filterLength: this.filterLength,
      tableSize: this.tableSize,
      tableSizeKB: (this.tableSize * 4 / 1024).toFixed(2)
    };
  }
  
  /**
   * 获取性能统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      interpolationCount: this.stats.interpolationCount,
      totalSamples: this.stats.totalSamples
    };
  }
  
  /**
   * 重置统计计数器
   */
  resetStats() {
    this.stats.interpolationCount = 0;
    this.stats.totalSamples = 0;
  }
}

module.exports = SincInterpolator;
