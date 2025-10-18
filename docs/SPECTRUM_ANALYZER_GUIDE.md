# 使用 node-windows-audio-capture 实现频谱分析器指南

## 📊 v2.10.0 当前能力

### ✅ 已有功能（时域分析）

v2.10.0 提供的实时音频统计 API 可以实现：

1. **音量表（VU Meter）**
   ```javascript
   capture.on('stats', (stats) => {
     // 显示音量条
     const volumeBar = '█'.repeat(stats.volumePercent / 2);
     console.log(`[${volumeBar}] ${stats.volumePercent.toFixed(1)}%`);
   });
   ```

2. **简单波形可视化**
   ```javascript
   capture.on('stats', (stats) => {
     // Peak 可以绘制波形包络
     drawWaveformEnvelope(stats.peak, stats.timestamp);
   });
   ```

3. **音频活动检测（VAD）**
   ```javascript
   capture.enableStats({ silenceThreshold: 0.002 });
   capture.on('stats', (stats) => {
     if (!stats.isSilence) {
       console.log('🎙️ 检测到语音');
     }
   });
   ```

---

## 🎵 频谱分析器需求（频域分析）

要实现真正的**频谱分析器**，需要以下功能：

### 1. **频率分解（FFT）** ❌ v2.10.0 不支持
   - 需要对音频数据进行**快速傅里叶变换（FFT）**
   - 将时域信号转换为频域
   - 获取不同频率的能量分布

### 2. **频段能量（Frequency Bands）** ❌ v2.10.0 不支持
   ```javascript
   // 理想的频谱分析器 API（v2.10.0 未实现）
   {
     bands: [
       { freq: '20-60Hz',   energy: 0.5 },    // 低频（Sub-bass）
       { freq: '60-250Hz',  energy: 0.7 },    // 贝斯（Bass）
       { freq: '250-500Hz', energy: 0.6 },    // 低中频
       { freq: '500-2kHz',  energy: 0.8 },    // 中频（人声）
       { freq: '2k-4kHz',   energy: 0.4 },    // 高中频
       { freq: '4k-6kHz',   energy: 0.3 },    // 存在感
       { freq: '6k-20kHz',  energy: 0.2 }     // 高频（亮度）
     ]
   }
   ```

### 3. **频谱可视化数据** ❌ v2.10.0 不支持
   - 512/1024/2048 个频率桶（bins）
   - 每个桶的能量值
   - 用于绘制频谱瀑布图、柱状图

---

## 🔧 实现方案

### 方案 1: 使用 v2.10.0 + JavaScript FFT 库（推荐）

**优点**: 立即可用，纯 JavaScript  
**缺点**: 性能略低于 C++

#### 步骤：

1. **使用 v2.10.0 获取原始音频数据**
   ```javascript
   const { AudioCapture } = require('node-windows-audio-capture');
   const fft = require('fft.js');  // 或 dsp.js

   const capture = new AudioCapture({ processId: 0 });
   
   capture.on('data', (data) => {
     // data.buffer 包含 Float32 PCM 数据
     const samples = new Float32Array(data.buffer);
     
     // 执行 FFT
     const fftSize = 2048;
     const f = new fft(fftSize);
     const out = f.createComplexArray();
     const input = f.toComplexArray(samples.slice(0, fftSize));
     f.transform(out, input);
     
     // 计算频段能量
     const bands = calculateFrequencyBands(out, data.sampleRate);
     
     // 绘制频谱
     drawSpectrum(bands);
   });
   ```

2. **推荐的 FFT 库**
   - [`fft.js`](https://www.npmjs.com/package/fft.js) - 快速、轻量
   - [`dsp.js`](https://www.npmjs.com/package/dspjs) - 功能丰富
   - [`fili.js`](https://www.npmjs.com/package/fili) - 包含滤波器

3. **完整示例（伪代码）**
   ```javascript
   const { AudioCapture } = require('node-windows-audio-capture');
   const FFT = require('fft.js');

   const FFT_SIZE = 2048;
   const SAMPLE_RATE = 48000;
   
   const capture = new AudioCapture({ processId: 0 });
   const fft = new FFT(FFT_SIZE);
   
   // 定义频段（7段均衡器风格）
   const frequencyBands = [
     { name: 'Sub-bass',  range: [20, 60] },
     { name: 'Bass',      range: [60, 250] },
     { name: 'Low-mid',   range: [250, 500] },
     { name: 'Mid',       range: [500, 2000] },
     { name: 'High-mid',  range: [2000, 4000] },
     { name: 'Presence',  range: [4000, 6000] },
     { name: 'Brilliance',range: [6000, 20000] }
   ];
   
   capture.on('data', (data) => {
     const samples = new Float32Array(data.buffer);
     
     // 取足够的样本进行 FFT
     if (samples.length < FFT_SIZE) return;
     
     // 转换为复数数组
     const input = samples.slice(0, FFT_SIZE);
     const complexInput = new Array(FFT_SIZE * 2);
     for (let i = 0; i < FFT_SIZE; i++) {
       complexInput[i * 2] = input[i];     // 实部
       complexInput[i * 2 + 1] = 0;        // 虚部
     }
     
     // 执行 FFT
     const output = new Array(FFT_SIZE * 2);
     fft.transform(output, complexInput);
     
     // 计算每个频段的能量
     const bandEnergies = frequencyBands.map(band => {
       const [minFreq, maxFreq] = band.range;
       const minBin = Math.floor(minFreq * FFT_SIZE / SAMPLE_RATE);
       const maxBin = Math.ceil(maxFreq * FFT_SIZE / SAMPLE_RATE);
       
       let energy = 0;
       for (let i = minBin; i <= maxBin; i++) {
         const real = output[i * 2];
         const imag = output[i * 2 + 1];
         energy += Math.sqrt(real * real + imag * imag);
       }
       
       return {
         name: band.name,
         frequency: band.range,
         energy: energy / (maxBin - minBin + 1),
         dB: 20 * Math.log10(energy / (maxBin - minBin + 1))
       };
     });
     
     // 输出频谱数据
     console.log('\n频谱分析:');
     bandEnergies.forEach(band => {
       const barLength = Math.floor(band.energy * 50);
       const bar = '█'.repeat(barLength);
       console.log(`${band.name.padEnd(12)}: [${bar}] ${band.dB.toFixed(1)} dB`);
     });
   });
   
   await capture.start();
   ```

---

### 方案 2: 扩展 node-windows-audio-capture（v2.11.0?）

如果需要**高性能**的频谱分析，可以在下一版本中添加 C++ FFT：

#### 建议的新 API（v2.11.0 概念）

```typescript
// 启用频谱分析
capture.enableSpectrum({
  fftSize: 2048,           // FFT 大小
  interval: 100,           // 更新间隔（ms）
  smoothing: 0.8,          // 平滑系数
  frequencyBands: [        // 自定义频段
    [20, 60],              // Sub-bass
    [60, 250],             // Bass
    [250, 500],            // Low-mid
    [500, 2000],           // Mid
    [2000, 4000],          // High-mid
    [4000, 6000],          // Presence
    [6000, 20000]          // Brilliance
  ]
});

// 'spectrum' 事件
capture.on('spectrum', (spectrum) => {
  // 完整频谱数据（2048 个频率桶）
  spectrum.frequencies;    // Float32Array[2048]
  spectrum.magnitudes;     // Float32Array[2048]
  
  // 频段能量
  spectrum.bands;          // Array<{ freq, energy, dB }>
  
  // 主导频率
  spectrum.dominantFreq;   // 440 (Hz)
  
  // 时间戳
  spectrum.timestamp;      // Unix ms
});
```

#### C++ 实现（kiss_fft 或 pffft）

```cpp
// src/napi/spectrum_analyzer.h
#include <kiss_fft.h>

class SpectrumAnalyzer {
private:
  kiss_fft_cfg fft_cfg_;
  int fft_size_;
  std::vector<kiss_fft_cpx> fft_in_;
  std::vector<kiss_fft_cpx> fft_out_;
  
public:
  SpectrumAnalyzer(int fft_size) 
    : fft_size_(fft_size) {
    fft_cfg_ = kiss_fft_alloc(fft_size, 0, nullptr, nullptr);
    fft_in_.resize(fft_size);
    fft_out_.resize(fft_size);
  }
  
  void Analyze(const float* samples, size_t count) {
    // 复制样本到 FFT 输入
    for (int i = 0; i < fft_size_ && i < count; i++) {
      fft_in_[i].r = samples[i];
      fft_in_[i].i = 0.0f;
    }
    
    // 执行 FFT
    kiss_fft(fft_cfg_, fft_in_.data(), fft_out_.data());
    
    // 计算幅度谱
    for (int i = 0; i < fft_size_ / 2; i++) {
      float real = fft_out_[i].r;
      float imag = fft_out_[i].i;
      magnitudes_[i] = sqrt(real * real + imag * imag);
    }
  }
};
```

---

## 🎨 可视化示例

### 1. 终端频谱分析器（ASCII）

```javascript
function drawTerminalSpectrum(bandEnergies) {
  console.clear();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎵 实时频谱分析器');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  bandEnergies.forEach(band => {
    const barLength = Math.floor(band.energy * 60);
    const bar = '█'.repeat(barLength);
    const empty = '░'.repeat(60 - barLength);
    
    console.log(`${band.name.padEnd(12)}: [${bar}${empty}] ${band.dB.toFixed(1)} dB`);
  });
}
```

### 2. Web 频谱分析器（Canvas）

```javascript
const canvas = document.getElementById('spectrum');
const ctx = canvas.getContext('2d');

function drawCanvasSpectrum(bandEnergies) {
  const barWidth = canvas.width / bandEnergies.length;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  bandEnergies.forEach((band, i) => {
    const barHeight = (band.energy / maxEnergy) * canvas.height;
    const x = i * barWidth;
    const y = canvas.height - barHeight;
    
    // 渐变色
    const hue = (i / bandEnergies.length) * 360;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    
    ctx.fillRect(x, y, barWidth - 2, barHeight);
  });
}
```

### 3. Electron 频谱分析器（完整应用）

```javascript
// main.js
const { app, BrowserWindow } = require('electron');
const { AudioCapture } = require('node-windows-audio-capture');

let mainWindow;
let capture;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });
  
  mainWindow.loadFile('index.html');
  
  // 启动音频捕获
  capture = new AudioCapture({ processId: 0 });
  
  capture.on('data', (data) => {
    const spectrum = analyzeSpectrum(data.buffer, data.sampleRate);
    mainWindow.webContents.send('spectrum', spectrum);
  });
  
  capture.start();
});
```

---

## 📊 实战案例

### 案例 1: 7段均衡器风格频谱

```javascript
const bands = [
  { name: '60Hz',   range: [20, 60],    color: '#e74c3c' },
  { name: '170Hz',  range: [60, 250],   color: '#e67e22' },
  { name: '310Hz',  range: [250, 500],  color: '#f39c12' },
  { name: '600Hz',  range: [500, 2000], color: '#2ecc71' },
  { name: '1kHz',   range: [2000, 4000],color: '#3498db' },
  { name: '3kHz',   range: [4000, 6000],color: '#9b59b6' },
  { name: '6kHz',   range: [6000, 20000],color: '#e91e63' }
];
```

### 案例 2: 音乐节奏检测

```javascript
let bassHistory = [];

capture.on('data', (data) => {
  const spectrum = analyzeSpectrum(data.buffer);
  const bassEnergy = spectrum.bands.find(b => b.name === 'Bass').energy;
  
  bassHistory.push(bassEnergy);
  if (bassHistory.length > 10) bassHistory.shift();
  
  const avgBass = bassHistory.reduce((a, b) => a + b) / bassHistory.length;
  
  // 检测鼓点（贝斯突增）
  if (bassEnergy > avgBass * 1.5) {
    console.log('🥁 鼓点检测！');
    triggerVisualEffect();
  }
});
```

### 案例 3: 语音/音乐分类

```javascript
capture.on('data', (data) => {
  const spectrum = analyzeSpectrum(data.buffer);
  
  // 计算频谱质心（Spectral Centroid）
  let weightedSum = 0;
  let totalEnergy = 0;
  
  spectrum.bands.forEach(band => {
    const centerFreq = (band.range[0] + band.range[1]) / 2;
    weightedSum += centerFreq * band.energy;
    totalEnergy += band.energy;
  });
  
  const centroid = weightedSum / totalEnergy;
  
  if (centroid < 1000) {
    console.log('🎵 低频内容（音乐、贝斯）');
  } else if (centroid < 3000) {
    console.log('🎙️ 中频内容（语音）');
  } else {
    console.log('🔔 高频内容（哨声、铃声）');
  }
});
```

---

## 🚀 推荐工具链

### JavaScript FFT 库对比

| 库 | 性能 | 功能 | 易用性 | 推荐度 |
|----|------|------|--------|--------|
| **fft.js** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ 首选 |
| **dsp.js** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ 功能丰富 |
| **kiss-fft-js** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ 移植自 C |
| **jsfft** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⚠️ 已过时 |

### 可视化库

- **Chart.js** - 简单的柱状图
- **D3.js** - 灵活的频谱瀑布图
- **Three.js** - 3D 频谱可视化
- **Pixi.js** - 高性能 2D 渲染

---

## 📝 完整示例代码

### `spectrum-analyzer.js` - 完整实现

```javascript
const { AudioCapture } = require('node-windows-audio-capture');
const FFT = require('fft.js');

class SpectrumAnalyzer {
  constructor(fftSize = 2048) {
    this.fftSize = fftSize;
    this.fft = new FFT(fftSize);
    this.capture = null;
    
    // 定义频段
    this.bands = [
      { name: 'Sub-bass',  range: [20, 60] },
      { name: 'Bass',      range: [60, 250] },
      { name: 'Low-mid',   range: [250, 500] },
      { name: 'Mid',       range: [500, 2000] },
      { name: 'High-mid',  range: [2000, 4000] },
      { name: 'Presence',  range: [4000, 6000] },
      { name: 'Brilliance',range: [6000, 20000] }
    ];
  }
  
  async start() {
    this.capture = new AudioCapture({ processId: 0 });
    
    this.capture.on('data', (data) => {
      const spectrum = this.analyze(data.buffer, data.sampleRate);
      this.onSpectrum(spectrum);
    });
    
    await this.capture.start();
  }
  
  analyze(buffer, sampleRate) {
    const samples = new Float32Array(buffer);
    if (samples.length < this.fftSize) return null;
    
    // 准备 FFT 输入
    const input = new Array(this.fftSize * 2);
    for (let i = 0; i < this.fftSize; i++) {
      input[i * 2] = samples[i];
      input[i * 2 + 1] = 0;
    }
    
    // 执行 FFT
    const output = new Array(this.fftSize * 2);
    this.fft.transform(output, input);
    
    // 计算频段能量
    const bandEnergies = this.bands.map(band => {
      const [minFreq, maxFreq] = band.range;
      const minBin = Math.floor(minFreq * this.fftSize / sampleRate);
      const maxBin = Math.ceil(maxFreq * this.fftSize / sampleRate);
      
      let energy = 0;
      for (let i = minBin; i <= maxBin; i++) {
        const real = output[i * 2];
        const imag = output[i * 2 + 1];
        energy += Math.sqrt(real * real + imag * imag);
      }
      
      const avgEnergy = energy / (maxBin - minBin + 1);
      
      return {
        name: band.name,
        frequency: band.range,
        energy: avgEnergy,
        dB: 20 * Math.log10(avgEnergy + 1e-10),
        normalized: Math.min(avgEnergy / 10, 1.0) // 归一化到 0-1
      };
    });
    
    return {
      bands: bandEnergies,
      timestamp: Date.now()
    };
  }
  
  onSpectrum(spectrum) {
    // 子类重写此方法
    console.log(spectrum);
  }
  
  async stop() {
    if (this.capture) {
      await this.capture.stop();
    }
  }
}

// 使用示例
class ConsoleSpectrumAnalyzer extends SpectrumAnalyzer {
  onSpectrum(spectrum) {
    if (!spectrum) return;
    
    console.clear();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎵 实时频谱分析器');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    spectrum.bands.forEach(band => {
      const barLength = Math.floor(band.normalized * 60);
      const bar = '█'.repeat(barLength);
      const empty = '░'.repeat(60 - barLength);
      
      console.log(`${band.name.padEnd(12)}: [${bar}${empty}] ${band.dB.toFixed(1)} dB`);
    });
  }
}

// 启动
const analyzer = new ConsoleSpectrumAnalyzer(2048);
analyzer.start().catch(console.error);
```

---

## 🎯 总结

### v2.10.0 能做什么？

✅ **可以做**:
- 音量表（VU Meter）
- 波形包络可视化
- 音频活动检测（VAD）
- 实时音量监控
- 简单的时域分析

❌ **不能做**:
- 真正的频谱分析（需要 FFT）
- 频段均衡器显示
- 频谱瀑布图
- 音调检测
- 复杂的频域分析

### 推荐方案

1. **立即实现**: 使用 v2.10.0 + JavaScript FFT 库（如 `fft.js`）
2. **长期规划**: 在 v2.11.0 中添加 C++ FFT 支持（更高性能）

---

## 📚 参考资源

- [FFT.js 文档](https://www.npmjs.com/package/fft.js)
- [Web Audio API Analyzer](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [音频频谱分析原理](https://en.wikipedia.org/wiki/Spectral_density)
- [频谱分析器设计](https://www.dspguide.com/)

---

**需要帮助？** 欢迎在 [GitHub Issues](https://github.com/wujelly701/node-windows-audio-capture/issues) 提问！
