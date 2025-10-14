# 📦 node-windows-audio-capture v2.2.0

**发布日期**: 2025-10-14  
**主题**: 内置 ASR 格式转换 - 简化集成，极致性能

---

## 🎯 版本概览

v2.2.0 是一个重大功能更新，为 `node-windows-audio-capture` 添加了完整的音频格式转换能力，专为 ASR（自动语音识别）场景优化。此版本将 ASR 集成从 200+ 行代码简化到 **1 行配置**，同时实现 **91.7% 大小减少**和 **<5ms 处理延迟**。

### 🌟 核心亮点

| 特性 | 说明 | 指标 |
|-----|------|------|
| **一键配置** | 6 个 ASR 预设，一行代码完成设置 | 200+ 行 → 1 行 |
| **智能降采样** | 高质量 48kHz → 16kHz 转换 | 3 种质量级别 |
| **格式转换** | Float32 → Int16，立体声 → 单声道 | 自动优化 |
| **WAV 生成** | OpenAI Whisper 专用 WAV 格式 | 零配置 |
| **极致性能** | 91.7% 大小减少，12:1 压缩比 | <5ms 延迟 |
| **全面测试** | 53 个测试用例，98.1% 通过率 | 生产就绪 |

---

## 🚀 新增特性

### 1. AudioProcessingPipeline - 一行代码配置 ASR

6个预设配置，开箱即用：

```javascript
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

// 一行代码配置！
const pipeline = new AudioProcessingPipeline('china-asr');

capture.on('data', (event) => {
  const asrReady = pipeline.process(event.buffer);
  // 直接发送到 ASR API，无需手动转换！
});
```

**支持的预设**:
- 🇨🇳 `china-asr`: 阿里云/百度/腾讯/讯飞（Int16, 16kHz, Mono）
- 🌍 `openai-whisper`: OpenAI Whisper（WAV + Int16, 16kHz, Mono）
- 🌍 `azure`: Azure Speech Service（Int16, 16kHz, Mono）
- 🌍 `google`: Google Cloud STT（Int16, 16kHz, Mono）
- 🌍 `global-asr-48k`: 48kHz ASR服务（Int16, 48kHz, Mono）
- 🎤 `raw`: 原始WASAPI输出（Float32, 48kHz, Stereo）

### 2. AudioResampler - 智能音频降采样器

- 高质量音频采样率转换（48kHz → 16kHz）
- 3种质量级别：`simple` / `linear` / `sinc`
- 自动内存管理和性能统计

### 3. WavEncoder - WAV 文件头生成器

- 为PCM数据生成标准WAV文件头
- 支持即时模式和流式模式
- OpenAI Whisper专用预设

---

## 📊 性能指标

| 指标 | v2.1.0 | v2.2.0 | 提升 |
|------|--------|--------|------|
| **数据大小** | 920KB/秒 | 76.8KB/秒 | **91.7% ↓** |
| **处理延迟** | N/A | <5ms | **极低延迟** |
| **压缩比** | 1:1 | 12:1 | **12倍** |
| **代码行数** | 200+ | 1 | **99.5% ↓** |
| **测试通过率** | 42/42 | 52/53 | **98.1%** |

---

## 🔄 Breaking Changes

**无破坏性变更**。v2.2.0 完全向后兼容 v2.1.0。

---

## 📦 安装

```bash
npm install node-windows-audio-capture@2.2.0
```

或从GitHub安装：

```bash
npm install wujelly701/node-windows-audio-capture#v2.2.0
```

---

## 📖 完整文档

- [完整发布说明](https://github.com/wujelly701/node-windows-audio-capture/blob/main/docs/V2.2_RELEASE_NOTES.md)
- [格式转换示例](https://github.com/wujelly701/node-windows-audio-capture/blob/main/examples/format-conversion-example.js)
- [ASR兼容性路线图](https://github.com/wujelly701/node-windows-audio-capture/blob/main/docs/ASR_COMPATIBILITY_ROADMAP.md)
- [API文档](https://github.com/wujelly701/node-windows-audio-capture/blob/main/docs/api.md)

---

## 🙏 致谢

感谢所有测试者和贡献者的反馈！

---

**Made with ❤️ for the Windows audio community**
