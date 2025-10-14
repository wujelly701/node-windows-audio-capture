# node-windows-audio-capture ASR 兼容性路线图

## 📅 创建日期：2025-10-14

---

## 🎯 规划目标

**核心目标**：让 node-windows-audio-capture 成为最适合语音识别（ASR）场景的 Windows 音频捕获库。

**当前问题**：
- 默认输出 Float32 立体声 PCM（48kHz, 2ch）
- 大多数 ASR API 要求 Int16 单声道（16kHz, 1ch）
- 需要手动格式转换（增加用户开发成本）

**解决方案**：
- v2.2: 内置音频格式转换器
- v2.3: 专为 ASR 优化的 API
- v3.0: 智能 ASR 适配器（自动对接各大厂商 API）

---

## 📊 主流 ASR API 音频格式调研

### 1. **阿里云 Gummy API** 🇨🇳
**文档**: https://help.aliyun.com/zh/model-studio/real-time-websocket-api

| 参数 | 要求 |
|------|------|
| 采样率 | ≥16000 Hz（推荐 16kHz） |
| 格式 | PCM（Int16）、WAV、MP3、Opus、Speex、AAC、AMR |
| 声道 | **1（单声道）** ⚠️ |
| 位深度 | 16-bit（PCM） |
| 传输 | WebSocket（实时流式） |
| 编码 | Base64（WebSocket） |

**兼容性**：⚠️ 需要转换（Stereo→Mono, Float32→Int16）

---

### 2. **OpenAI Whisper API** 🌍
**文档**: https://platform.openai.com/docs/guides/speech-to-text

| 参数 | 要求 |
|------|------|
| 采样率 | 任意（自动重采样） |
| 格式 | **MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM** |
| 声道 | 单声道或立体声 |
| 位深度 | 任意 |
| 传输 | HTTP POST（文件上传） |
| 最大文件大小 | 25 MB |

**兼容性**：✅ 良好（支持 WAV 文件头即可）

---

### 3. **百度语音识别** 🇨🇳
**文档**: https://ai.baidu.com/ai-doc/SPEECH/Vk38lxily

| 参数 | 要求 |
|------|------|
| 采样率 | **8000 Hz 或 16000 Hz** |
| 格式 | PCM（Int16）、WAV、AMR、OPUS |
| 声道 | **1（单声道）** ⚠️ |
| 位深度 | 16-bit（PCM） |
| 传输 | HTTP POST（Base64 或二进制） |
| 最大长度 | 60 秒 |

**兼容性**：⚠️ 需要转换 + 重采样（48kHz→16kHz）

---

### 4. **腾讯云语音识别** 🇨🇳
**文档**: https://cloud.tencent.com/document/product/1093/35799

| 参数 | 要求 |
|------|------|
| 采样率 | **8000 Hz 或 16000 Hz** |
| 格式 | PCM（Int16）、WAV、MP3、OPUS、SPEEX、AMR、M4A |
| 声道 | **1（单声道）** ⚠️ |
| 位深度 | 16-bit（PCM） |
| 传输 | WebSocket（实时）或 HTTP（录音文件） |
| 编码 | 无压缩或 Base64 |

**兼容性**：⚠️ 需要转换 + 重采样（48kHz→16kHz）

---

### 5. **讯飞语音听写** 🇨🇳
**文档**: https://www.xfyun.cn/doc/asr/voicedictation/API.html

| 参数 | 要求 |
|------|------|
| 采样率 | **8000 Hz 或 16000 Hz** |
| 格式 | PCM（Int16）、WAV、SPEEX、AMR-WB |
| 声道 | **1（单声道）** ⚠️ |
| 位深度 | 16-bit（PCM） |
| 传输 | WebSocket（实时流式） |
| 编码 | Base64 |

**兼容性**：⚠️ 需要转换 + 重采样（48kHz→16kHz）

---

### 6. **Azure Speech Service** 🌍
**文档**: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text

| 参数 | 要求 |
|------|------|
| 采样率 | **8000 Hz 或 16000 Hz**（推荐 16kHz） |
| 格式 | PCM（Int16）、WAV、Opus、MP3、FLAC、ALAW、MULAW |
| 声道 | **1（单声道）** 推荐 |
| 位深度 | 16-bit（PCM） |
| 传输 | WebSocket（SDK）或 HTTP（REST API） |

**兼容性**：⚠️ 需要转换 + 重采样（48kHz→16kHz）

---

### 7. **Google Cloud Speech-to-Text** 🌍
**文档**: https://cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionConfig

| 参数 | 要求 |
|------|------|
| 采样率 | **8000-48000 Hz**（推荐 16kHz） |
| 格式 | LINEAR16（PCM Int16）、FLAC、MULAW、AMR、AMR-WB、OGG_OPUS、WEBM_OPUS |
| 声道 | 1 或 2（自动分离） |
| 位深度 | 16-bit（PCM） |
| 传输 | gRPC（流式）或 HTTP（录音文件） |

**兼容性**：⚠️ 需要格式转换（Float32→Int16）

---

### 8. **AWS Transcribe** 🌍
**文档**: https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html

| 参数 | 要求 |
|------|------|
| 采样率 | **8000-48000 Hz** |
| 格式 | PCM（Int16）、FLAC、Opus |
| 声道 | 1 或 2 |
| 位深度 | 16-bit（PCM） |
| 传输 | HTTP/2（流式）或 S3（文件） |

**兼容性**：⚠️ 需要格式转换（Float32→Int16）

---

## 📈 兼容性总结

### 通用要求对比表

| ASR 服务 | 采样率 | 格式 | 声道 | 位深度 | 传输方式 | 兼容性 |
|---------|--------|------|------|--------|---------|--------|
| **node-windows-audio-capture** | 48000 Hz | Float32 PCM | 2 | 32-bit | - | - |
| 阿里云 Gummy | ≥16000 | PCM/WAV/MP3 | **1** ⚠️ | 16-bit | WebSocket | ⚠️ 需转换 |
| OpenAI Whisper | Any | WAV/MP3/... | 1/2 | Any | HTTP | ✅ 较好 |
| 百度语音 | 8k/16k | PCM/WAV | **1** ⚠️ | 16-bit | HTTP | ⚠️ 需转换+重采样 |
| 腾讯云 | 8k/16k | PCM/WAV/MP3 | **1** ⚠️ | 16-bit | WebSocket | ⚠️ 需转换+重采样 |
| 讯飞 | 8k/16k | PCM/WAV | **1** ⚠️ | 16-bit | WebSocket | ⚠️ 需转换+重采样 |
| Azure | 8k/16k | PCM/WAV | 1 | 16-bit | WebSocket | ⚠️ 需转换+重采样 |
| Google Cloud | 8k-48k | LINEAR16 | 1/2 | 16-bit | gRPC | ⚠️ 需转换 |
| AWS Transcribe | 8k-48k | PCM/FLAC | 1/2 | 16-bit | HTTP/2 | ⚠️ 需转换 |

### 核心痛点分析

#### ❌ 当前问题
1. **声道不匹配**：输出立体声（2ch），大多数 ASR 要求单声道（1ch）
2. **格式不匹配**：输出 Float32，大多数 ASR 要求 Int16
3. **采样率过高**：48kHz 输出，大多数国内 ASR 只支持 8k/16k
4. **无内置转换**：用户需手动编写转换代码（高门槛）

#### ✅ 机会
1. **OpenAI Whisper** 支持多种格式（添加 WAV 文件头即可）
2. **Google Cloud / AWS** 支持 48kHz（只需格式转换，无需重采样）
3. **所有服务** 都支持 16-bit PCM（行业标准）

---

## 🚀 v2.2.0 功能规划：内置格式转换器

### 目标
**让用户无需手动转换音频格式，直接获取 ASR 友好的音频流。**

### 新功能

#### 1. **实时格式转换 API**

```javascript
const processor = AudioProcessor.create();

// 配置输出格式（针对 ASR 优化）
processor.setOutputFormat({
  sampleRate: 16000,      // 降采样到 16kHz（国内 ASR 标准）
  channels: 1,            // 转为单声道
  bitDepth: 16,           // Float32 → Int16
  format: 'pcm'           // 输出 PCM 格式
});

processor.on('data', (audioData) => {
  // 自动转换后的音频数据（16kHz, Mono, Int16）
  console.log(audioData.length);  // 32 KB/s（16000 * 1 * 2 bytes）
});
```

#### 2. **预设配置（针对主流 ASR）**

```javascript
// 预设 1：阿里云/百度/腾讯/讯飞（国内标准）
processor.setOutputFormat('china-asr');  // 等价于 16kHz, Mono, Int16

// 预设 2：OpenAI Whisper（WAV 格式）
processor.setOutputFormat('openai-whisper');  // WAV header + PCM

// 预设 3：Azure/Google Cloud（保持 48kHz）
processor.setOutputFormat('global-asr-48k');  // 48kHz, Mono, Int16

// 预设 4：原始格式（默认）
processor.setOutputFormat('raw');  // 48kHz, Stereo, Float32
```

#### 3. **WAV 文件头生成**

```javascript
// 自动添加 WAV 文件头（适用于 Whisper）
processor.setOutputFormat({
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  format: 'wav'  // 自动添加 WAV header
});

processor.on('data', (wavChunk) => {
  // 每个 chunk 都是完整的 WAV 数据（可直接保存）
  fs.appendFileSync('output.wav', wavChunk);
});
```

#### 4. **降采样算法（高质量）**

实现方式：
- **简单模式**：丢弃样本（fast but lower quality）
- **线性插值**：默认（good balance）
- **Sinc 插值**：可选（best quality but slower）

```javascript
processor.setOutputFormat({
  sampleRate: 16000,
  resamplingQuality: 'linear'  // 'simple' | 'linear' | 'sinc'
});
```

---

## 🎯 v2.3.0 功能规划：ASR 专用 API

### 目标
**提供开箱即用的 ASR 集成 API，零配置对接主流语音识别服务。**

### 新功能

#### 1. **ASR 适配器基类**

```javascript
const { ASRAdapter } = require('node-windows-audio-capture');

// 自动配置音频格式（根据 ASR 提供商）
const adapter = new ASRAdapter({
  provider: 'aliyun-gummy',  // 阿里云 Gummy
  processName: 'chrome.exe',
  enableMuteControl: true
});

adapter.on('transcript', (text) => {
  console.log('识别结果:', text);
});

await adapter.start();
```

#### 2. **支持的 ASR 提供商**

| 提供商 ID | 服务名称 | 自动配置 |
|----------|---------|---------|
| `aliyun-gummy` | 阿里云 Gummy API | 16kHz, Mono, Int16, WebSocket |
| `baidu` | 百度语音识别 | 16kHz, Mono, Int16, HTTP |
| `tencent` | 腾讯云语音识别 | 16kHz, Mono, Int16, WebSocket |
| `xunfei` | 讯飞语音听写 | 16kHz, Mono, Int16, WebSocket |
| `openai-whisper` | OpenAI Whisper API | 16kHz, Mono, Int16, WAV, HTTP |
| `azure` | Azure Speech Service | 16kHz, Mono, Int16, WebSocket |
| `google` | Google Cloud STT | 16kHz, Mono, Int16, gRPC |
| `aws` | AWS Transcribe | 16kHz, Mono, Int16, HTTP/2 |

#### 3. **完整集成示例（阿里云 Gummy）**

```javascript
const { AliyunGummyAdapter } = require('node-windows-audio-capture/adapters');

const adapter = new AliyunGummyAdapter({
  apiKey: process.env.DASHSCOPE_API_KEY,
  processName: 'chrome.exe',
  targetLanguage: 'en',  // 翻译目标语言
  enableMuteControl: true
});

adapter.on('recognition', (result) => {
  console.log('识别:', result.text);
});

adapter.on('translation', (result) => {
  console.log('翻译:', result.text);
});

adapter.on('error', (error) => {
  console.error('错误:', error);
});

await adapter.start();

// 30 秒后停止
setTimeout(() => adapter.stop(), 30000);
```

#### 4. **完整集成示例（OpenAI Whisper）**

```javascript
const { OpenAIWhisperAdapter } = require('node-windows-audio-capture/adapters');

const adapter = new OpenAIWhisperAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  processName: 'chrome.exe',
  language: 'zh',  // 识别中文
  chunkDuration: 10  // 每 10 秒发送一次
});

adapter.on('transcript', (result) => {
  console.log('识别结果:', result.text);
  console.log('置信度:', result.confidence);
});

await adapter.start();
```

#### 5. **通用 ASR 客户端（自定义）**

```javascript
const { GenericASRAdapter } = require('node-windows-audio-capture/adapters');

const adapter = new GenericASRAdapter({
  processName: 'chrome.exe',
  audioFormat: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'pcm'
  },
  onAudioChunk: async (audioData) => {
    // 自定义发送逻辑（支持任意 ASR 服务）
    const response = await fetch('https://your-asr-api.com/recognize', {
      method: 'POST',
      body: audioData
    });
    return await response.json();
  }
});

adapter.on('result', (result) => {
  console.log(result);
});

await adapter.start();
```

---

## 🌐 v3.0.0 功能规划：智能 ASR 生态系统

### 目标
**打造一站式 ASR 解决方案，支持多模态识别和实时字幕系统。**

### 新功能

#### 1. **多 ASR 服务同时运行**

```javascript
const { MultiASRProcessor } = require('node-windows-audio-capture');

const processor = new MultiASRProcessor({
  processName: 'chrome.exe',
  providers: [
    { name: 'aliyun', config: { apiKey: '...' } },
    { name: 'baidu', config: { apiKey: '...' } },
    { name: 'openai', config: { apiKey: '...' } }
  ],
  votingStrategy: 'majority'  // 投票策略（提高准确率）
});

processor.on('consensus', (result) => {
  // 多个 ASR 服务的共识结果（最准确）
  console.log('共识结果:', result.text);
  console.log('置信度:', result.confidence);
});

await processor.start();
```

#### 2. **实时字幕生成**

```javascript
const { SubtitleGenerator } = require('node-windows-audio-capture');

const generator = new SubtitleGenerator({
  processName: 'chrome.exe',
  asrProvider: 'aliyun-gummy',
  outputFormat: 'srt',  // SRT, VTT, ASS 字幕格式
  outputPath: './subtitles.srt'
});

generator.on('subtitle', (subtitle) => {
  console.log(`[${subtitle.startTime} --> ${subtitle.endTime}]`);
  console.log(subtitle.text);
});

await generator.start();
```

#### 3. **语言自动检测 + 多语言识别**

```javascript
const { SmartASRAdapter } = require('node-windows-audio-capture');

const adapter = new SmartASRAdapter({
  processName: 'chrome.exe',
  autoDetectLanguage: true,  // 自动检测语言
  supportedLanguages: ['zh', 'en', 'ja', 'ko'],
  onLanguageChange: (language) => {
    console.log('检测到语言切换:', language);
  }
});

adapter.on('transcript', (result) => {
  console.log(`[${result.language}] ${result.text}`);
});

await adapter.start();
```

#### 4. **ASR 性能监控**

```javascript
adapter.on('metrics', (metrics) => {
  console.log('ASR 性能指标:');
  console.log('- 平均延迟:', metrics.averageLatency, 'ms');
  console.log('- 识别速度:', metrics.charactersPerSecond, 'chars/s');
  console.log('- 错误率:', metrics.errorRate, '%');
  console.log('- 网络开销:', metrics.networkUsage, 'KB/s');
});
```

#### 5. **离线 ASR 支持**

```javascript
const { OfflineASRAdapter } = require('node-windows-audio-capture');

// 使用本地 Whisper 模型（无需联网）
const adapter = new OfflineASRAdapter({
  processName: 'chrome.exe',
  model: 'whisper-small',  // 本地模型
  language: 'zh'
});

adapter.on('transcript', (result) => {
  console.log('离线识别:', result.text);
});

await adapter.start();
```

---

## 🏗️ 实施计划

### Phase 1: v2.2.0 - 内置格式转换器（预计 2 周）

**时间**：2025-10-28 - 2025-11-10

**核心任务**：
1. ✅ 实现 `AudioFormatConverter` 类（已完成）
2. [ ] 集成到 `AudioProcessor` 中（添加 `setOutputFormat()` API）
3. [ ] 实现降采样算法（48kHz → 16kHz）
4. [ ] 实现 WAV 文件头生成
5. [ ] 添加预设配置（china-asr, openai-whisper 等）
6. [ ] 性能优化（降低 CPU 使用率）
7. [ ] 单元测试（覆盖率 90%+）
8. [ ] 文档更新（README + API 文档）

**成功标准**：
- ✅ 支持实时格式转换（Float32→Int16, Stereo→Mono）
- ✅ 支持降采样（48kHz→16kHz，质量损失 <5%）
- ✅ CPU 开销 <10%
- ✅ 延迟增加 <50ms

---

### Phase 2: v2.3.0 - ASR 专用 API（预计 3 周）

**时间**：2025-11-11 - 2025-12-01

**核心任务**：
1. [ ] 设计 `ASRAdapter` 基类架构
2. [ ] 实现 `AliyunGummyAdapter`（基于现有示例）
3. [ ] 实现 `BaiduASRAdapter`
4. [ ] 实现 `TencentASRAdapter`
5. [ ] 实现 `OpenAIWhisperAdapter`
6. [ ] 实现 `GenericASRAdapter`（通用接口）
7. [ ] 添加错误重试和断线重连机制
8. [ ] 创建完整集成示例（每个提供商一个）
9. [ ] 单元测试和集成测试
10. [ ] 详细文档（每个 Adapter 的使用指南）

**成功标准**：
- ✅ 支持至少 4 个主流 ASR 提供商
- ✅ 集成代码 <20 行（开箱即用）
- ✅ 自动处理格式转换和网络通信
- ✅ 完善的错误处理和重连机制

---

### Phase 3: v3.0.0 - 智能 ASR 生态系统（预计 1 个月）

**时间**：2025-12-02 - 2026-01-02

**核心任务**：
1. [ ] 实现 `MultiASRProcessor`（多 ASR 投票）
2. [ ] 实现 `SubtitleGenerator`（实时字幕）
3. [ ] 实现语言自动检测
4. [ ] 实现性能监控和指标统计
5. [ ] 实现离线 ASR（集成 Whisper.cpp）
6. [ ] 创建 Electron 示例应用（实时翻译字幕）
7. [ ] 创建 CLI 工具（命令行 ASR）
8. [ ] 完整文档和教程
9. [ ] 性能基准测试报告

**成功标准**：
- ✅ 支持多 ASR 服务并行运行
- ✅ 实时字幕延迟 <1 秒
- ✅ 语言检测准确率 >95%
- ✅ 离线 ASR 性能接近在线服务

---

## 📦 新增文件结构

```
node-windows-audio-capture/
├── lib/
│   ├── audio-format-converter.js       ✅ 已完成（v2.1.0）
│   ├── audio-resampler.js              🆕 v2.2.0（降采样）
│   ├── wav-encoder.js                  🆕 v2.2.0（WAV 文件头）
│   └── adapters/                       🆕 v2.3.0
│       ├── base-asr-adapter.js
│       ├── aliyun-gummy-adapter.js
│       ├── baidu-asr-adapter.js
│       ├── tencent-asr-adapter.js
│       ├── openai-whisper-adapter.js
│       ├── azure-speech-adapter.js
│       ├── google-stt-adapter.js
│       ├── aws-transcribe-adapter.js
│       └── generic-asr-adapter.js
├── examples/
│   ├── gummy-integration-example.js    ✅ 已完成（v2.1.0）
│   ├── format-conversion-example.js    🆕 v2.2.0
│   ├── baidu-asr-example.js           🆕 v2.3.0
│   ├── tencent-asr-example.js         🆕 v2.3.0
│   ├── openai-whisper-example.js      🆕 v2.3.0
│   ├── multi-asr-example.js           🆕 v3.0.0
│   └── subtitle-generator-example.js   🆕 v3.0.0
├── docs/
│   ├── GUMMY-API-COMPATIBILITY.md      ✅ 已完成（v2.1.0）
│   ├── ASR_COMPATIBILITY_ROADMAP.md    ✅ 本文档
│   ├── ASR_INTEGRATION_GUIDE.md        🆕 v2.3.0
│   └── PERFORMANCE_BENCHMARKS.md       🆕 v3.0.0
└── utils/
    └── AudioFormatConverter.js         ✅ 已完成（v2.1.0）
```

---

## 🎯 关键技术挑战与解决方案

### 挑战 1: 降采样算法性能

**问题**：48kHz → 16kHz 降采样需要高质量插值算法，可能影响实时性能。

**解决方案**：
- 提供 3 种质量级别：
  - `simple`: 直接丢弃样本（CPU <1%, 质量 ~70%）
  - `linear`: 线性插值（CPU ~3%, 质量 ~85%）⭐ 默认
  - `sinc`: Sinc 插值（CPU ~8%, 质量 ~95%）

### 挑战 2: 多 ASR 服务同步

**问题**：不同 ASR 服务延迟不同，如何同步结果？

**解决方案**：
- 使用时间戳对齐算法
- 设置超时机制（慢速 ASR 超时后使用快速 ASR 结果）

### 挑战 3: 离线 ASR 性能

**问题**：本地 Whisper 模型推理速度慢，可能无法实时处理。

**解决方案**：
- 使用 Whisper.cpp（C++ 优化版本）
- GPU 加速（如果可用）
- 缓冲机制（批量处理）

---

## 📊 预期性能指标

### v2.2.0 格式转换性能

| 操作 | CPU 使用率 | 内存开销 | 延迟增加 |
|------|-----------|----------|---------|
| Stereo→Mono | <2% | +0.5 MB | <10ms |
| Float32→Int16 | <3% | +1 MB | <15ms |
| 48kHz→16kHz (linear) | <5% | +2 MB | <30ms |
| **总计** | **<10%** | **+3.5 MB** | **<50ms** |

### v2.3.0 ASR 集成性能

| 操作 | CPU 使用率 | 内存开销 | 端到端延迟 |
|------|-----------|----------|-----------|
| 音频捕获 | ~5% | ~10 MB | - |
| 格式转换 | ~10% | ~3.5 MB | ~50ms |
| 网络传输 | ~3% | ~5 MB | 100-500ms |
| ASR 识别 | - | - | 200-1000ms |
| **总计** | **~18%** | **~18.5 MB** | **350-1550ms** |

---

## 🎉 总结

### 短期目标（v2.2）
✅ **解决格式不兼容问题**，让用户无需手动转换音频。

### 中期目标（v2.3）
✅ **提供开箱即用的 ASR 集成**，降低开发门槛到 <20 行代码。

### 长期目标（v3.0）
✅ **打造智能 ASR 生态系统**，支持多模态识别、实时字幕、离线处理。

---

**预计完成时间**: 2026 年 1 月  
**文档版本**: 1.0  
**下次更新**: v2.2.0 发布后

---

## 📞 反馈与建议

如果您有关于 ASR 集成的需求或建议，请：
- 在 GitHub Issues 中提出
- 发送邮件至 wujelly701@gmail.com

---

**期待将 node-windows-audio-capture 打造成最强大的 Windows ASR 音频捕获库！** 🚀
