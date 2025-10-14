# Sinc 插值降采样算法设计文档

**版本**: v1.0  
**日期**: 2025-10-15  
**作者**: v2.5.0 Performance Optimization Team  
**状态**: Phase 1.1 研究与设计

---

## 📋 目录

1. [概述](#概述)
2. [当前实现分析](#当前实现分析)
3. [Kaiser 窗口 Sinc 插值理论](#kaiser-窗口-sinc-插值理论)
4. [算法设计](#算法设计)
5. [参数优化](#参数优化)
6. [性能优化策略](#性能优化策略)
7. [实现计划](#实现计划)

---

## 概述

### 目标

为 `AudioResampler` 类实现高质量的 Kaiser 窗口 Sinc 插值降采样算法，目标：

- **音频质量**: THD+N < 0.01% (总谐波失真+噪声)
- **处理速度**: < 3.0ms/秒音频 (当前 4.89ms，提升 38%)
- **CPU 占用**: < 0.3% (当前 0.5%，降低 40%)
- **内存占用**: 保持在 5MB 以内

### 应用场景

- 48kHz → 16kHz (ASR 常用采样率)
- 44.1kHz → 16kHz
- 实时音频流处理
- 语音识别前处理

---

## 当前实现分析

### v2.4.0 Sinc 插值实现

查看当前代码：`lib/audio-resampler.js` - `_resampleSinc()` 方法

```javascript
_resampleSinc(inputSamples) {
  // 当前实现：简化的 Sinc 插值
  // 问题：
  // 1. 未使用 Kaiser 窗口
  // 2. 固定窗口大小 (lobeCount = 8)
  // 3. 无系数预计算
  // 4. 性能未优化
}
```

**性能基线**:
- 平均处理时间: 4.89ms/秒
- CPU 占用: 0.5%
- 实时倍率: 204x
- THD+N: 未测试

### 问题识别

1. **音频质量**:
   - 缺少 Kaiser 窗口，频率响应不理想
   - 可能存在混叠失真

2. **性能**:
   - 每次都重新计算 Sinc 函数
   - 无插值系数缓存
   - 内存访问模式未优化

3. **可配置性**:
   - 无法调整质量级别
   - 窗口参数固定

---

## Kaiser 窗口 Sinc 插值理论

### Sinc 函数

理想低通滤波器的冲激响应：

```
sinc(x) = sin(πx) / (πx)
```

特性：
- 频域: 完美矩形低通滤波器
- 时域: 无限长，需要窗口截断

### Kaiser 窗口

由 James Kaiser 提出的可变参数窗口函数：

```
w(n) = I₀(β√(1 - ((n - N/2) / (N/2))²)) / I₀(β)
```

其中：
- `I₀`: 第一类修正贝塞尔函数
- `β`: 形状参数，控制旁瓣衰减
- `N`: 窗口长度

**参数选择**:
- `β = 5`: 适合一般音频，-60dB 旁瓣
- `β = 7`: 平衡质量和性能，-70dB 旁瓣
- `β = 10`: 高质量音频，-90dB 旁瓣

### 加窗 Sinc 插值

```
h(n) = sinc(n) × w(n)
```

降采样插值：

```
y(t) = Σ x(n) × h(t - n)
       n
```

---

## 算法设计

### 架构概览

```
Input Audio (48kHz)
    ↓
Sinc Interpolation Kernel
    ├─ Kaiser Window Function
    ├─ Sinc Function
    └─ Coefficient Cache
    ↓
Interpolated Samples
    ↓
Decimation (downsample)
    ↓
Output Audio (16kHz)
```

### 核心组件

#### 1. Kaiser 窗口生成器

```javascript
class KaiserWindow {
  constructor(beta = 7, length = 128) {
    this.beta = beta;
    this.length = length;
    this.window = this._generateWindow();
  }
  
  _generateWindow() {
    // 计算 Kaiser 窗口系数
    const window = new Float32Array(this.length);
    const i0Beta = this._besselI0(this.beta);
    const halfLength = (this.length - 1) / 2;
    
    for (let n = 0; n < this.length; n++) {
      const x = (n - halfLength) / halfLength;
      const arg = this.beta * Math.sqrt(1 - x * x);
      window[n] = this._besselI0(arg) / i0Beta;
    }
    
    return window;
  }
  
  _besselI0(x) {
    // 第一类修正贝塞尔函数 I₀(x)
    // 使用级数展开近似
    let sum = 1.0;
    let term = 1.0;
    const threshold = 1e-12;
    
    for (let k = 1; k < 50; k++) {
      term *= (x / (2 * k)) ** 2;
      sum += term;
      if (term < threshold) break;
    }
    
    return sum;
  }
}
```

#### 2. Sinc 插值核心

```javascript
class SincInterpolator {
  constructor(options = {}) {
    this.inputRate = options.inputRate || 48000;
    this.outputRate = options.outputRate || 16000;
    this.lobeCount = options.lobeCount || 16; // 每侧波瓣数
    this.beta = options.beta || 7; // Kaiser 参数
    
    // 计算关键参数
    this.ratio = this.inputRate / this.outputRate;
    this.windowLength = this.lobeCount * 2;
    
    // 生成 Kaiser 窗口
    this.kaiser = new KaiserWindow(this.beta, this.windowLength);
    
    // 预计算插值系数表
    this.coeffTable = this._buildCoeffTable();
  }
  
  _buildCoeffTable() {
    // 预计算不同相位的插值系数
    const phases = 1024; // 相位分辨率
    const table = new Array(phases);
    
    for (let phase = 0; phase < phases; phase++) {
      const t = phase / phases;
      table[phase] = this._computeCoeff(t);
    }
    
    return table;
  }
  
  _computeCoeff(t) {
    // 计算给定相位的插值系数
    const coeff = new Float32Array(this.windowLength);
    const halfLength = this.windowLength / 2;
    
    for (let i = 0; i < this.windowLength; i++) {
      const x = (i - halfLength + t) * Math.PI / this.ratio;
      
      // Sinc 函数
      const sinc = (Math.abs(x) < 1e-6) ? 1.0 : Math.sin(x) / x;
      
      // Kaiser 窗口
      const window = this.kaiser.window[i];
      
      // 加窗 Sinc
      coeff[i] = sinc * window / this.ratio;
    }
    
    return coeff;
  }
  
  interpolate(input, outputLength) {
    // 主插值循环
    const output = new Float32Array(outputLength);
    const halfLength = this.windowLength / 2;
    
    for (let i = 0; i < outputLength; i++) {
      // 计算输入位置
      const srcPos = i * this.ratio;
      const srcIndex = Math.floor(srcPos);
      const fraction = srcPos - srcIndex;
      
      // 查找系数表
      const phaseIndex = Math.floor(fraction * this.coeffTable.length);
      const coeff = this.coeffTable[phaseIndex];
      
      // 卷积求和
      let sum = 0;
      for (let j = 0; j < this.windowLength; j++) {
        const inputIndex = srcIndex + j - halfLength;
        if (inputIndex >= 0 && inputIndex < input.length) {
          sum += input[inputIndex] * coeff[j];
        }
      }
      
      output[i] = sum;
    }
    
    return output;
  }
}
```

#### 3. 集成到 AudioResampler

```javascript
// lib/audio-resampler.js

_resampleSinc(inputSamples) {
  // 延迟初始化插值器（仅创建一次）
  if (!this.sincInterpolator) {
    this.sincInterpolator = new SincInterpolator({
      inputRate: this.inputSampleRate,
      outputRate: this.outputSampleRate,
      lobeCount: this.quality === 'sinc-high' ? 20 : 16,
      beta: this.quality === 'sinc-high' ? 10 : 7
    });
  }
  
  // 执行插值
  const framesIn = inputSamples.length / this.channels;
  const framesOut = Math.ceil(framesIn / this.ratio);
  
  if (this.channels === 1) {
    // 单声道
    return this.sincInterpolator.interpolate(inputSamples, framesOut);
  } else {
    // 立体声：分离处理左右声道
    const outputSamples = new Float32Array(framesOut * 2);
    
    // 提取左声道
    const leftIn = new Float32Array(framesIn);
    for (let i = 0; i < framesIn; i++) {
      leftIn[i] = inputSamples[i * 2];
    }
    const leftOut = this.sincInterpolator.interpolate(leftIn, framesOut);
    
    // 提取右声道
    const rightIn = new Float32Array(framesIn);
    for (let i = 0; i < framesIn; i++) {
      rightIn[i] = inputSamples[i * 2 + 1];
    }
    const rightOut = this.sincInterpolator.interpolate(rightIn, framesOut);
    
    // 交织输出
    for (let i = 0; i < framesOut; i++) {
      outputSamples[i * 2] = leftOut[i];
      outputSamples[i * 2 + 1] = rightOut[i];
    }
    
    return outputSamples;
  }
}
```

---

## 参数优化

### Kaiser 参数 β 选择

| β 值 | 旁瓣衰减 | 过渡带宽度 | THD+N 预期 | 适用场景 |
|------|---------|-----------|-----------|---------|
| 5 | -60dB | 窄 | ~0.01% | 实时处理，低延迟 |
| 7 | -70dB | 中 | ~0.005% | **推荐，平衡质量和性能** |
| 10 | -90dB | 宽 | ~0.001% | 离线处理，高质量 |

**推荐配置**:
- 默认: `β = 7`
- 高质量模式: `β = 10`

### 窗口长度（lobeCount）

| lobeCount | 窗口长度 | 过渡带 | 性能影响 |
|-----------|---------|--------|---------|
| 8 | 16 samples | 宽 | 快 (当前) |
| 16 | 32 samples | 中 | 中等 **推荐** |
| 20 | 40 samples | 窄 | 慢 |

**公式**:
```
过渡带宽度 ≈ 4π / (lobeCount × 2)
```

**推荐配置**:
- 默认: `lobeCount = 16` (32 samples)
- 高质量: `lobeCount = 20` (40 samples)

### 系数表分辨率

| 分辨率 | 内存占用 | 精度 | 推荐 |
|--------|---------|------|------|
| 256 | ~32KB | 中 | 实时 |
| 512 | ~64KB | 高 | 平衡 |
| 1024 | ~128KB | 极高 | **推荐** |
| 2048 | ~256KB | 过高 | 离线 |

**推荐配置**:
- 默认: 1024 phases
- 低内存模式: 512 phases

---

## 性能优化策略

### 1. 系数预计算与缓存

**当前问题**: 每次插值都重新计算 Sinc 和窗口函数

**优化方案**:
```javascript
// 初始化时预计算
constructor() {
  this.coeffTable = this._buildCoeffTable(); // 一次性计算
}

// 运行时直接查表
const coeff = this.coeffTable[phaseIndex]; // O(1) 查找
```

**预期效果**:
- 减少 90%+ 计算量
- 处理时间从 4.89ms → ~2.5ms

### 2. SIMD 向量化优化

**可行性评估**:

Node.js v20+ 支持 SIMD (通过 WASM 或 C++ addon):

```javascript
// 标量实现 (当前)
for (let j = 0; j < windowLength; j++) {
  sum += input[inputIndex + j] * coeff[j];
}

// SIMD 实现 (4x 并行)
// 使用 SSE/AVX 指令集
// 预期加速: 2-3x
```

**决策**:
- Phase 1: 先实现标量优化版本
- Phase 1.3: 评估 SIMD 必要性
- 如果标量版本达标，SIMD 可延后到 v2.6

### 3. 内存访问优化

**问题**: 频繁访问大数组，缓存未命中

**优化策略**:
```javascript
// 1. 数据对齐
const coeff = new Float32Array(windowLength); // 16字节对齐

// 2. 局部性优化
// 将系数表按相位连续存储
this.coeffTable = new Float32Array(phases * windowLength);

// 3. 预取优化
// 使用连续内存访问模式
```

**预期效果**:
- 减少缓存未命中
- 提升 10-20% 性能

### 4. 立体声优化

**当前**: 提取左右声道 → 分别插值 → 交织

**优化**: 交织插值（减少内存操作）

```javascript
// 优化后：直接在交织数据上操作
for (let i = 0; i < framesOut; i++) {
  const srcPos = i * this.ratio;
  const srcIndex = Math.floor(srcPos) * 2; // 直接计算交织位置
  
  let sumL = 0, sumR = 0;
  for (let j = 0; j < windowLength; j++) {
    const idx = (srcIndex + j * 2);
    sumL += input[idx] * coeff[j];
    sumR += input[idx + 1] * coeff[j];
  }
  
  output[i * 2] = sumL;
  output[i * 2 + 1] = sumR;
}
```

**预期效果**:
- 减少 2 次内存拷贝
- 提升 15-25% 性能

---

## 实现计划

### Phase 1.1: 研究与设计 (当前)

- [x] 理论研究
- [x] 算法设计
- [x] 参数优化方案
- [ ] 原型验证代码
- [ ] 性能预估

### Phase 1.2: 实现 (3天)

**Day 1: 核心算法**
- [ ] 实现 KaiserWindow 类
- [ ] 实现 SincInterpolator 类
- [ ] 单元测试

**Day 2: 集成**
- [ ] 集成到 AudioResampler
- [ ] 立体声支持
- [ ] 边界条件处理

**Day 3: 测试**
- [ ] 功能测试
- [ ] 音频质量测试
- [ ] 性能基准测试

### Phase 1.3: 优化 (2天)

**Day 1: 性能优化**
- [ ] 内存访问优化
- [ ] 立体声交织优化
- [ ] 性能对比测试

**Day 2: 质量验证**
- [ ] FFT 频谱分析
- [ ] THD+N 测量
- [ ] A/B 对比测试

---

## 性能预估

### 优化效果预测

| 优化项 | 预期提升 | 累积提升 |
|--------|---------|---------|
| 基准 (v2.4.0) | - | 4.89ms |
| 系数预计算 | -50% | 2.45ms |
| 内存访问优化 | -10% | 2.20ms |
| 立体声优化 | -20% | 1.76ms |
| **总计** | **-64%** | **1.76ms** |

**目标**: < 3.0ms ✅ **预计超出目标 41%**

### 质量预估

| 指标 | v2.4.0 | v2.5.0 预期 | 改善 |
|------|--------|------------|------|
| THD+N | 未测试 | < 0.01% | 新增 |
| SNR | 未测试 | > 90dB | 新增 |
| 频率响应 | ±0.5dB | ±0.1dB | 5x ⬆️ |
| 相位失真 | 中 | 极低 | ✅ |

---

## 风险与挑战

### 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 性能不达标 | 低 | 中 | 已有预计算优化，可降级到 linear |
| 音频质量问题 | 低 | 高 | 充分测试，参考业界标准实现 |
| 内存占用过高 | 低 | 中 | 可调整系数表分辨率 |

### 时间风险

**预留缓冲**:
- 计划: 7天 (2+3+2)
- 实际: 预留 9天 (含缓冲)
- 如果超时: Phase 1.3 可延后

---

## 参考资料

### 学术文献

1. **"Discrete-Time Signal Processing"** - Oppenheim & Schafer
   - Chapter 4: Sampling of Continuous-Time Signals
   
2. **"Digital Signal Processing"** - Proakis & Manolakis
   - Chapter 10: Multirate Digital Signal Processing

3. **Kaiser Window**:
   - Kaiser, J. F. (1974). "Nonrecursive Digital Filter Design Using the I0-sinh Window Function"

### 开源实现参考

1. **libsamplerate** (Secret Rabbit Code)
   - C 语言实现，工业标准
   - URL: http://www.mega-nerd.com/SRC/

2. **speex_resampler**
   - Speex 编解码器的重采样器
   - 高性能，Apache 2.0 许可

3. **FFmpeg libswresample**
   - 专业音视频处理库
   - 多种插值算法参考

### 在线工具

1. **WolframAlpha** - 贝塞尔函数计算
2. **MATLAB/Octave** - 算法原型验证
3. **Audacity** - 音频质量对比

---

## 附录

### A. 数学公式推导

#### Sinc 函数

```
sinc(x) = sin(πx) / (πx)

特例：
sinc(0) = lim[x→0] sin(πx) / (πx) = 1
```

#### Kaiser 窗口

```
w(n) = I₀(β√(1 - ((n - N/2) / (N/2))²)) / I₀(β)

其中 I₀ 级数展开：
I₀(x) = Σ[(x/2)^(2k) / (k!)²]
        k=0 to ∞
```

#### 插值公式

```
y(t) = Σ x(n) × sinc(t - n) × w(t - n)
       n=-∞ to +∞

实际窗口截断：
y(t) = Σ x(n) × sinc(t - n) × w(t - n)
       n=t-L to t+L
```

### B. 代码示例完整版

完整实现代码将在 Phase 1.2 提交到：
- `lib/kaiser-window.js`
- `lib/sinc-interpolator.js`
- `lib/audio-resampler.js` (更新)

---

**文档版本**: 1.0  
**最后更新**: 2025-10-15  
**下次审查**: Phase 1.2 实现完成后
