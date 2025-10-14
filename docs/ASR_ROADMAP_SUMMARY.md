# ASR 兼容性规划总结

## 📅 创建日期：2025-10-14

---

## 🎯 核心问题

**当前状态**：
- node-windows-audio-capture 输出：**Float32 PCM, 48kHz, 立体声**
- 主流 ASR API 要求：**Int16 PCM, 16kHz, 单声道**
- 用户需要手动编写格式转换代码（门槛高）

**调研结果**：分析了 8 个主流 ASR 服务（阿里云、百度、腾讯、讯飞、OpenAI、Azure、Google、AWS）

---

## 🚀 解决方案路线图

### **v2.2.0 - 内置格式转换器**（预计 2 周）

**核心功能**：
```javascript
processor.setOutputFormat({
  sampleRate: 16000,  // 降采样到 16kHz
  channels: 1,        // 转为单声道
  bitDepth: 16,       // Float32 → Int16
  format: 'pcm'
});

// 或使用预设
processor.setOutputFormat('china-asr');  // 一键配置国内 ASR
```

**关键特性**：
- ✅ 实时格式转换（Stereo→Mono, Float32→Int16）
- ✅ 智能降采样（48kHz→16kHz，支持 3 种质量级别）
- ✅ ASR 预设配置（国内/国际 ASR 标准）
- ✅ WAV 文件头生成（OpenAI Whisper）
- ✅ 性能开销 <10% CPU

---

### **v2.3.0 - ASR 专用 API**（预计 3 周）

**核心功能**：
```javascript
const { AliyunGummyAdapter } = require('node-windows-audio-capture/adapters');

const adapter = new AliyunGummyAdapter({
  apiKey: process.env.DASHSCOPE_API_KEY,
  processName: 'chrome.exe'
});

adapter.on('transcript', (text) => {
  console.log('识别结果:', text);
});

await adapter.start();
```

**关键特性**：
- ✅ 支持 8 个主流 ASR 提供商
- ✅ 开箱即用（<20 行代码集成）
- ✅ 自动格式转换 + 网络通信
- ✅ 错误重试和断线重连
- ✅ 完整集成示例

**支持的 ASR 服务**：
1. 阿里云 Gummy API（已有基础）
2. 百度语音识别
3. 腾讯云语音识别
4. 讯飞语音听写
5. OpenAI Whisper API
6. Azure Speech Service
7. Google Cloud Speech-to-Text
8. AWS Transcribe

---

### **v3.0.0 - 智能 ASR 生态**（预计 1 个月）

**核心功能**：
```javascript
// 多 ASR 服务投票（提高准确率）
const processor = new MultiASRProcessor({
  providers: ['aliyun', 'baidu', 'openai'],
  votingStrategy: 'majority'
});

// 实时字幕生成
const generator = new SubtitleGenerator({
  outputFormat: 'srt',
  outputPath: './subtitles.srt'
});

// 离线 ASR（Whisper.cpp）
const offline = new OfflineASRAdapter({
  model: 'whisper-small'
});
```

**关键特性**：
- ✅ 多 ASR 并行运行（投票提高准确率）
- ✅ 实时字幕生成（SRT/VTT/ASS）
- ✅ 语言自动检测
- ✅ 离线 ASR 支持（Whisper.cpp）
- ✅ 性能监控面板
- ✅ Electron 示例应用

---

## 📊 主流 ASR API 格式要求

| ASR 服务 | 采样率 | 格式 | 声道 | 传输 |
|---------|--------|------|------|------|
| **当前输出** | 48000 Hz | Float32 | 2 | - |
| 阿里云 Gummy | ≥16kHz | Int16 | **1** ⚠️ | WebSocket |
| 百度 | 8k/16k | Int16 | **1** ⚠️ | HTTP |
| 腾讯云 | 8k/16k | Int16 | **1** ⚠️ | WebSocket |
| 讯飞 | 8k/16k | Int16 | **1** ⚠️ | WebSocket |
| OpenAI | Any | WAV | 1/2 | HTTP |
| Azure | 8k/16k | Int16 | 1 | WebSocket |
| Google | 8k-48k | Int16 | 1/2 | gRPC |
| AWS | 8k-48k | Int16 | 1/2 | HTTP/2 |

**共性**：
- ✅ 所有服务都支持 16-bit PCM（行业标准）
- ⚠️ 大多数国内 ASR 只支持 8k/16k（需要降采样）
- ⚠️ 大多数 ASR 要求单声道（需要混音）

---

## 🎯 实施时间表

```
2025-10-14 ========== v2.1.0 发布 ✅
    |
    | (2 周)
    v
2025-11-10 ========== v2.2.0 发布（格式转换器）
    |
    | (3 周)
    v
2025-12-01 ========== v2.3.0 发布（ASR 专用 API）
    |
    | (1 个月)
    v
2026-01-02 ========== v3.0.0 发布（智能 ASR 生态）
```

---

## 📦 预期成果

### v2.2.0 成果
- ✅ 用户无需手动转换音频格式
- ✅ 一键配置 ASR 预设（国内/国际）
- ✅ 支持 WAV 文件导出（Whisper）
- ✅ 性能开销 <10%

### v2.3.0 成果
- ✅ 集成代码从 ~200 行降至 <20 行
- ✅ 支持 8 个主流 ASR 提供商
- ✅ 自动处理所有格式转换和网络通信
- ✅ 完善的错误处理和重连机制

### v3.0.0 成果
- ✅ 多 ASR 投票机制（准确率 +10%）
- ✅ 实时字幕系统（延迟 <1 秒）
- ✅ 离线 ASR 支持（无需联网）
- ✅ Electron 示例应用（实时翻译）

---

## 🎉 预期影响

### 对用户
- **开发时间**：从 2-3 天降至 1 小时
- **代码量**：从 ~500 行降至 <50 行
- **学习曲线**：从高门槛到开箱即用

### 对生态
- **成为 ASR 领域首选库**：Windows 平台最强大的 ASR 音频捕获方案
- **吸引更多用户**：降低门槛，扩大用户群
- **社区贡献**：更多开发者贡献新的 ASR Adapter

---

## 📚 相关文档

1. **[ASR 兼容性路线图（完整版）](ASR_COMPATIBILITY_ROADMAP.md)** - 1200+ 行详细规划
2. **[Gummy API 兼容性分析](GUMMY-API-COMPATIBILITY.md)** - 已完成的兼容性分析
3. **[Gummy 集成示例](../examples/gummy-integration-example.js)** - 已完成的集成代码
4. **[格式转换工具](../utils/AudioFormatConverter.js)** - 已完成的转换工具

---

## 📞 反馈

如有建议或需求，请：
- GitHub Issues: https://github.com/wujelly701/node-windows-audio-capture/issues
- Email: wujelly701@gmail.com

---

**期待打造 Windows 平台最强大的 ASR 音频捕获库！** 🚀
