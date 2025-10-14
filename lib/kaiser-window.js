/**
 * KaiserWindow - Kaiser 窗口函数生成器
 * 
 * Kaiser 窗口是一种可变参数窗口函数，由 James Kaiser 提出。
 * 通过调整 β 参数可以在主瓣宽度和旁瓣衰减之间进行权衡。
 * 
 * 数学定义:
 *   w(n) = I₀(β√(1 - ((n - N/2) / (N/2))²)) / I₀(β)
 * 
 * 其中:
 *   - I₀: 第一类修正贝塞尔函数
 *   - β: 形状参数，控制旁瓣衰减
 *   - N: 窗口长度
 * 
 * β 参数选择:
 *   - β = 5: -60dB 旁瓣衰减 (快速)
 *   - β = 7: -70dB 旁瓣衰减 (平衡，推荐)
 *   - β = 10: -90dB 旁瓣衰减 (高质量)
 * 
 * @module lib/kaiser-window
 */

class KaiserWindow {
  /**
   * 创建 Kaiser 窗口
   * 
   * @param {number} [beta=7] - 形状参数 (5-10)
   * @param {number} [length=32] - 窗口长度
   */
  constructor(beta = 7, length = 32) {
    this.beta = beta;
    this.length = length;
    
    // 验证参数
    this._validate();
    
    // 生成窗口系数
    this.window = this._generateWindow();
  }
  
  /**
   * 验证参数
   * @private
   */
  _validate() {
    if (this.beta < 0) {
      throw new Error(`Kaiser beta must be non-negative, got ${this.beta}`);
    }
    
    if (this.length < 2) {
      throw new Error(`Kaiser window length must be >= 2, got ${this.length}`);
    }
    
    if (this.length % 2 !== 0) {
      throw new Error(`Kaiser window length must be even, got ${this.length}`);
    }
  }
  
  /**
   * 第一类修正贝塞尔函数 I₀(x)
   * 
   * 使用级数展开计算:
   *   I₀(x) = Σ[(x/2)^(2k) / (k!)²]
   *           k=0 to ∞
   * 
   * @param {number} x - 输入值
   * @returns {number} I₀(x) 的值
   * @private
   */
  _besselI0(x) {
    // 对于 x = 0，直接返回 1
    if (Math.abs(x) < 1e-10) {
      return 1.0;
    }
    
    // 级数求和
    let sum = 1.0;
    let term = 1.0;
    const threshold = 1e-12; // 收敛阈值
    
    // 最多迭代 50 次
    for (let k = 1; k < 50; k++) {
      term *= (x / (2 * k)) ** 2;
      sum += term;
      
      // 检查收敛
      if (term < threshold) {
        break;
      }
    }
    
    return sum;
  }
  
  /**
   * 生成 Kaiser 窗口系数
   * @returns {Float32Array} 窗口系数数组
   * @private
   */
  _generateWindow() {
    const window = new Float32Array(this.length);
    const i0Beta = this._besselI0(this.beta);
    
    // 对于偶数长度，中心在 (length/2 - 0.5) 和 (length/2 + 0.5) 之间
    // 使用 (length - 1) / 2 作为中心位置
    const center = (this.length - 1) / 2.0;
    const halfLength = this.length / 2.0;
    
    for (let n = 0; n < this.length; n++) {
      // 归一化位置: [-1, 1]
      const x = (n - center) / halfLength;
      
      // 计算 β√(1 - x²)
      const arg = this.beta * Math.sqrt(Math.max(0, 1 - x * x));
      
      // Kaiser 窗口公式
      window[n] = this._besselI0(arg) / i0Beta;
    }
    
    return window;
  }
  
  /**
   * 获取窗口系数
   * @returns {Float32Array} 窗口系数数组
   */
  getWindow() {
    return this.window;
  }
  
  /**
   * 获取指定位置的窗口值
   * @param {number} index - 索引位置
   * @returns {number} 窗口值
   */
  getValue(index) {
    if (index < 0 || index >= this.length) {
      throw new Error(`Index ${index} out of bounds [0, ${this.length})`);
    }
    return this.window[index];
  }
  
  /**
   * 获取窗口统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    
    for (let i = 0; i < this.length; i++) {
      const val = this.window[i];
      if (val < min) min = val;
      if (val > max) max = val;
      sum += val;
    }
    
    return {
      beta: this.beta,
      length: this.length,
      min: min,
      max: max,
      mean: sum / this.length,
      centerValue: this.window[Math.floor(this.length / 2)],
      edgeValue: this.window[0]
    };
  }
  
  /**
   * 将窗口应用到信号
   * @param {Float32Array|Array} signal - 输入信号
   * @returns {Float32Array} 加窗后的信号
   */
  apply(signal) {
    if (signal.length !== this.length) {
      throw new Error(`Signal length ${signal.length} does not match window length ${this.length}`);
    }
    
    const output = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      output[i] = signal[i] * this.window[i];
    }
    
    return output;
  }
}

module.exports = KaiserWindow;
