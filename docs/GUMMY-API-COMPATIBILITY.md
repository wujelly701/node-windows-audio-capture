# node-windows-audio-capture 与阿里云 Gummy API 音频格式兼容性分析

## 📋 分析日期：2025-10-14

---

## 🎯 结论（TL;DR）

**✅ 基本兼容，但需要格式转换**

- node-windows-audio-capture 默认输出 **Float32 PCM**
- Gummy API 要求 **PCM (16-bit integer)** 或其他格式
- **需要进行格式转换**（Float32 → Int16）

---

## 📊 音频格式对比

### node-windows-audio-capture 输出格式

| 参数 | 默认值 | 说明 |
|------|--------|------|
| **采样率** | **48000 Hz** | 系统默认（也可能是 44100 Hz）|
| **声道数** | **2 (立体声)** | 系统默认 |
| **位深度** | **32-bit Float** | IEEE Float 格式 |
| **字节序** | Little Endian | 小端序 |
| **数据格式** | **Float32 PCM** | 每个样本 4 字节 |
| **数据包大小** | ~3500 bytes | 约 9ms 音频 |
| **数据包频率** | ~100 packets/s | 高吞吐量 |
| **比特率** | ~384 KB/s | 48000 × 2 × 4 bytes |

**关键特征**：
- ✅ 输出**原始 PCM 数据**（无文件头）
- ✅ 使用 WASAPI `GetMixFormat()` 获取系统默认格式
- ⚠️ 默认是 **Float32** 而非 Int16

---

### 阿里云 Gummy API 要求

根据 [Gummy 实时 WebSocket API 文档](https://help.aliyun.com/zh/model-studio/real-time-websocket-api)：

| 参数 | 要求 | 说明 |
|------|------|------|
| **sample_rate** | **≥ 16000 Hz** | 支持 16000Hz 及以上采样率 |
| **format** | **pcm, wav, mp3, opus, speex, aac, amr** | 多种格式支持 |
| **channels** | **单声道（1）** | 必须是单声道音频 ⚠️ |
| **字节序** | Little Endian | 通常要求 |
| **位深度** | **16-bit Integer** (PCM) | PCM 格式通常是 Int16 |

**run-task 指令示例**：
```json
{
  "payload": {
    "model": "gummy-realtime-v1",
    "parameters": {
      "sample_rate": 16000,
      "format": "pcm",
      "source_language": null,
      "transcription_enabled": true,
      "translation_enabled": true,
      "translation_target_languages": ["en"]
    }
  }
}
```

**关键要求**：
- ✅ **支持 PCM 格式**
- ⚠️ **必须是单声道**（node-windows-audio-capture 默认双声道）
- ⚠️ **PCM 通常指 Int16**（node-windows-audio-capture 是 Float32）
- ✅ 支持 16000Hz 及以上采样率（48000Hz 符合）

---

## ⚠️ 不兼容点

### 1. 声道数不匹配

| 项目 | node-windows-audio-capture | Gummy API |
|------|---------------------------|-----------|
| 声道数 | **2 (立体声)** | **1 (单声道)** ⚠️ |

**影响**：必须进行立体声转单声道

**解决方案**：
```javascript
// 方法1: 取左声道
function stereoToMono_LeftChannel(stereoBuffer) {
  const samples = stereoBuffer.length / 8; // Float32 = 4 bytes, 2 channels
  const mono = Buffer.alloc(samples * 4);
  
  for (let i = 0; i < samples; i++) {
    const left = stereoBuffer.readFloatLE(i * 8);  // 左声道
    mono.writeFloatLE(left, i * 4);
  }
  
  return mono;
}

// 方法2: 平均混合（推荐）
function stereoToMono_Average(stereoBuffer) {
  const samples = stereoBuffer.length / 8;
  const mono = Buffer.alloc(samples * 4);
  
  for (let i = 0; i < samples; i++) {
    const left = stereoBuffer.readFloatLE(i * 8);
    const right = stereoBuffer.readFloatLE(i * 8 + 4);
    const average = (left + right) / 2;
    mono.writeFloatLE(average, i * 4);
  }
  
  return mono;
}
```

---

### 2. 数据格式不匹配

| 项目 | node-windows-audio-capture | Gummy API |
|------|---------------------------|-----------|
| 位深度 | **Float32 (4 bytes)** | **Int16 (2 bytes)** ⚠️ |
| 数值范围 | -1.0 ~ +1.0 | -32768 ~ +32767 |

**影响**：PCM 格式通常指 Int16，需要转换

**解决方案**：
```javascript
// Float32 → Int16 转换
function float32ToInt16(float32Buffer) {
  const samples = float32Buffer.length / 4;
  const int16Buffer = Buffer.alloc(samples * 2);
  
  for (let i = 0; i < samples; i++) {
    const floatSample = float32Buffer.readFloatLE(i * 4);
    
    // 限制范围 [-1.0, 1.0]
    const clamped = Math.max(-1, Math.min(1, floatSample));
    
    // 转换为 Int16 [-32768, 32767]
    const int16Sample = Math.round(clamped * 32767);
    
    int16Buffer.writeInt16LE(int16Sample, i * 2);
  }
  
  return int16Buffer;
}
```

---

### 3. 采样率优化（可选）

| 项目 | node-windows-audio-capture | Gummy API |
|------|---------------------------|-----------|
| 采样率 | **48000 Hz** | **≥ 16000 Hz** (推荐 16000) |

**影响**：48kHz → 16kHz 可降低带宽和延迟，但需要重采样

**是否必需**：❌ 非必需，Gummy 支持 48kHz

**解决方案**（可选）：
```javascript
// 使用第三方库进行重采样
const { Resampler } = require('audio-resampler');

const resampler = new Resampler({
  fromSampleRate: 48000,
  toSampleRate: 16000,
  channels: 1,
  type: 'zero-order-hold'  // 或 'linear', 'sinc'
});

const resampled = resampler.resample(audioBuffer);
```

---

## ✅ 完整转换流程

### 推荐的转换管道

```javascript
const { AudioProcessor } = require('node-windows-audio-capture');

// 1. 立体声 → 单声道（平均混合）
function stereoToMono(stereoFloat32Buffer) {
  const samples = stereoFloat32Buffer.length / 8;
  const mono = Buffer.alloc(samples * 4);
  
  for (let i = 0; i < samples; i++) {
    const left = stereoFloat32Buffer.readFloatLE(i * 8);
    const right = stereoFloat32Buffer.readFloatLE(i * 8 + 4);
    mono.writeFloatLE((left + right) / 2, i * 4);
  }
  
  return mono;
}

// 2. Float32 → Int16
function float32ToInt16(float32Buffer) {
  const samples = float32Buffer.length / 4;
  const int16Buffer = Buffer.alloc(samples * 2);
  
  for (let i = 0; i < samples; i++) {
    const floatSample = float32Buffer.readFloatLE(i * 4);
    const clamped = Math.max(-1, Math.min(1, floatSample));
    const int16Sample = Math.round(clamped * 32767);
    int16Buffer.writeInt16LE(int16Sample, i * 2);
  }
  
  return int16Buffer;
}

// 3. 完整转换管道
const processor = new AudioProcessor({
  processId: targetPid,
  callback: (audioData) => {
    // 步骤1: 立体声 → 单声道
    const monoFloat32 = stereoToMono(audioData);
    
    // 步骤2: Float32 → Int16 PCM
    const int16Pcm = float32ToInt16(monoFloat32);
    
    // 步骤3: 发送到 Gummy API
    sendToGummyAPI(int16Pcm);
  }
});

processor.start();
processor.setMuteOtherProcesses(true);
processor.startCapture();
```

---

## 📊 数据流对比

### 转换前（node-windows-audio-capture 原始输出）

```
捕获音频 (48kHz, 立体声, Float32)
  ↓
3500 bytes/packet (~9ms 音频)
  = 437.5 samples × 2 channels × 4 bytes
  ↓
数据包频率: ~100 packets/s
比特率: ~384 KB/s
```

### 转换后（Gummy API 格式）

```
单声道 Int16 PCM (48kHz 或 16kHz)
  ↓
Option A: 保持 48kHz
  875 bytes/packet (~9ms 音频)
  = 437.5 samples × 1 channel × 2 bytes
  比特率: ~96 KB/s (减少 75%)
  
Option B: 降采样到 16kHz
  292 bytes/packet (~9ms 音频)  
  = 145.8 samples × 1 channel × 2 bytes
  比特率: ~32 KB/s (减少 92%)
```

---

## 🔧 实现建议

### 方案 A：简单转换（推荐用于 MVP）

**特点**：
- ✅ 实现简单，性能高
- ✅ 保持 48kHz 采样率
- ✅ 音质最佳

**步骤**：
1. 立体声 → 单声道（平均混合）
2. Float32 → Int16 PCM
3. 直接发送到 Gummy API

**代码**：见上面的"完整转换流程"

---

### 方案 B：完整优化（用于生产环境）

**特点**：
- ✅ 降低带宽和延迟
- ✅ 节省网络流量
- ⚠️ 需要额外的重采样库

**步骤**：
1. 立体声 → 单声道
2. Float32 → Int16
3. 48kHz → 16kHz 重采样
4. 发送到 Gummy API

**依赖**：
```bash
npm install audio-resampler
# 或
npm install node-speex-resampler
```

---

## 📝 WebSocket 发送示例

```javascript
const WebSocket = require('ws');
const { AudioProcessor } = require('node-windows-audio-capture');

// 建立 WebSocket 连接
const ws = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/inference', {
  headers: {
    'Authorization': `bearer ${process.env.DASHSCOPE_API_KEY}`
  }
});

ws.on('open', () => {
  console.log('✅ WebSocket 已连接');
  
  // 发送 run-task 指令
  ws.send(JSON.stringify({
    header: {
      action: 'run-task',
      task_id: generateUUID(),
      streaming: 'duplex'
    },
    payload: {
      model: 'gummy-realtime-v1',
      task_group: 'audio',
      task: 'asr',
      function: 'recognition',
      parameters: {
        sample_rate: 48000,  // 或 16000
        format: 'pcm',
        transcription_enabled: true,
        translation_enabled: true,
        translation_target_languages: ['en']
      },
      input: {}
    }
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  if (event.header.event === 'task-started') {
    console.log('✅ 任务已开启，开始发送音频');
    
    // 启动音频捕获
    const processor = new AudioProcessor({
      processId: targetPid,
      callback: (audioData) => {
        // 转换音频格式
        const monoFloat32 = stereoToMono(audioData);
        const int16Pcm = float32ToInt16(monoFloat32);
        
        // 发送二进制音频数据
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(int16Pcm);
        }
      }
    });
    
    processor.start();
    processor.setMuteOtherProcesses(true);
    processor.startCapture();
  }
  
  if (event.header.event === 'result-generated') {
    console.log('翻译结果:', event.payload.output.translations);
    console.log('识别结果:', event.payload.output.transcription);
  }
});
```

---

## 🎯 性能考虑

### CPU 使用率

| 操作 | CPU 占用（估计） |
|------|-----------------|
| node-windows-audio-capture 捕获 | ~2-3% |
| 立体声 → 单声道转换 | ~1% |
| Float32 → Int16 转换 | ~1% |
| 重采样 48kHz → 16kHz | ~3-5% |
| WebSocket 发送 | ~1% |
| **总计（方案 A）** | **~5%** |
| **总计（方案 B）** | **~10%** |

### 延迟分析

| 阶段 | 延迟 |
|------|------|
| 音频捕获 | ~9ms (数据包大小) |
| 格式转换 | ~1-2ms |
| WebSocket 发送 | ~10-50ms (网络) |
| Gummy 处理 | ~100-500ms |
| **总延迟（端到端）** | **~120-560ms** |

---

## ✅ 兼容性总结

| 参数 | 兼容性 | 需要转换 |
|------|--------|---------|
| 采样率 (48kHz) | ✅ 兼容 | ❌ 可选优化 |
| 声道数 (立体声→单声道) | ⚠️ 不兼容 | ✅ **必需** |
| 位深度 (Float32→Int16) | ⚠️ 不兼容 | ✅ **必需** |
| 数据格式 (PCM) | ✅ 兼容 | ❌ 无需转换 |
| 字节序 (Little Endian) | ✅ 兼容 | ❌ 无需转换 |

---

## 📚 相关资源

### 文档链接
- [Gummy WebSocket API 文档](https://help.aliyun.com/zh/model-studio/real-time-websocket-api)
- [node-windows-audio-capture API 文档](docs/API.md)
- [node-windows-audio-capture v2.1 发布说明](docs/V2.1_RELEASE_NOTES.md)

### 第三方库
- **重采样**: `audio-resampler`, `node-speex-resampler`
- **WebSocket**: `ws`, `websocket`
- **UUID**: `uuid`

### 示例代码
- [Gummy 官方示例](https://github.com/aliyun/alibabacloud-bailian-speech-demo)
- [node-windows-audio-capture 测试](test-v2.1-mute-control.js)

---

## 🎓 开发建议

### MVP 阶段（快速实现）

1. **使用方案 A**（简单转换）
2. 保持 48kHz 采样率
3. 专注功能实现，忽略性能优化

### 生产阶段（优化版本）

1. **使用方案 B**（完整优化）
2. 降采样到 16kHz 节省带宽
3. 添加音频缓冲和队列管理
4. 实现自适应比特率控制

### 测试要点

- [ ] 验证立体声到单声道转换的音质
- [ ] 测试 Float32 到 Int16 的数值精度
- [ ] 检查长时间运行的内存泄漏
- [ ] 验证 WebSocket 断线重连机制
- [ ] 测试不同采样率的兼容性

---

## 💡 常见问题

### Q1: 为什么不直接捕获 Int16 格式？

**A**: WASAPI `GetMixFormat()` 返回系统默认格式，Windows 通常使用 Float32。修改格式需要音频重采样器，会增加复杂度。

### Q2: 48kHz 和 16kHz 哪个更好？

**A**: 
- **48kHz**: 音质更好，适合音乐、高质量语音
- **16kHz**: 网络流量更小，延迟更低，适合语音识别

对于 Gummy 翻译，16kHz 已经足够。

### Q3: 立体声转单声道会丢失信息吗？

**A**: 会丢失空间信息，但对于语音识别和翻译影响很小。平均混合法可以保留大部分语音内容。

### Q4: Float32 转 Int16 会损失精度吗？

**A**: 会有轻微精度损失（Float32 有效位数 ~24bit，Int16 只有 16bit），但对语音识别几乎无影响。

---

**更新日期**: 2025-10-14  
**分析者**: GitHub Copilot  
**版本**: v1.0
