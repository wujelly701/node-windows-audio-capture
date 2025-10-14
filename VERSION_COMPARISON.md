# Version Comparison & Feature Analysis
# 版本对比与功能分析

**Date**: October 14, 2025  
**日期**: 2025年10月14日

---

## 📊 Version Overview | 版本概览

| Version | Status | Branch | Features | Release Date |
|---------|--------|--------|----------|--------------|
| **v2.3.0** | ✅ Released | `main` | Device enumeration, Format conversion, Mute control | Oct 2025 |
| **v2.4.0** | 🚧 In Dev | `feature/device-management` | + Hot-plug detection, Device events | In Progress |
| **v2.2.0** | ❌ Not Exist | N/A | Documentation reference only | N/A |

### Important Note | 重要说明

**v2.2.0 does not exist as a separate version!**  
**v2.2.0 并不作为独立版本存在！**

The documentation (`大模型LLM实时桌面翻译软件 - 功能需求分析文档 v1.1.md`) mentions "v2.2" features, but these are **actually part of v2.3.0** (already released).

文档提到的 "v2.2" 功能实际上是 **v2.3.0 的一部分**（已发布）。

---

## 🔍 Feature Mapping | 功能映射

### What the Documentation Calls "v2.2" | 文档中所谓的 "v2.2"

The requirements document mentions these as "v2.2.0 new features":  
需求文档中提到的 "v2.2.0 新特性"：

| Feature Mentioned | Actual Version | Status |
|-------------------|----------------|--------|
| ✨ Built-in ASR format conversion | **v2.3.0** ✅ | Released |
| ✨ 6 ASR preset configurations | **v2.3.0** ✅ | Released |
| ✨ Smart downsampling (48kHz → 16kHz) | **v2.3.0** ✅ | Released |
| ✨ Ultimate performance (<5ms latency) | **v2.3.0** ✅ | Released |
| ⚡ Dynamic mute control v2.1 | **v2.3.0** ✅ | Released |

**Conclusion**: All "v2.2" features mentioned in the document are **already available in v2.3.0**.  
**结论**: 文档中提到的所有 "v2.2" 功能在 **v2.3.0 中已经可用**。

---

## 📦 Available Versions for Your Translation Software
## 可用于翻译软件的版本

### Option 1: v2.3.0 (Stable - Recommended) | v2.3.0（稳定版 - 推荐）

**Install from npm**:
```bash
npm install node-windows-audio-capture@2.3.0
```

**Install from GitHub (main branch)**:
```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/main
```

**Features | 功能**:
- ✅ **Audio capture** - WASAPI Loopback mode
- ✅ **Device enumeration** - List all audio devices
- ✅ **Default device detection** - Get system default device
- ✅ **Process-specific capture** - Capture audio from specific PID
- ✅ **Dynamic mute control** - Auto-mute other processes (90%+ purity)
- ✅ **ASR format conversion** - `AudioProcessingPipeline` class
- ✅ **6 ASR presets** - china-asr, openai-whisper, azure, google, aws, deepgram
- ✅ **Smart resampling** - 3 quality levels (simple/linear/sinc)
- ✅ **TypeScript support** - Full type definitions
- ✅ **Prebuilt binaries** - No compilation required

**Included "v2.2" Features** (from documentation):
- ✅ `AudioProcessingPipeline` class
- ✅ Format conversion (Float32 → Int16)
- ✅ Resampling (48kHz → 16kHz)
- ✅ Channel conversion (Stereo → Mono)
- ✅ Performance: <5ms latency, 91.7% size reduction

**Status**: ✅ Production-ready, fully tested  
**状态**: ✅ 生产就绪，经过全面测试

---

### Option 2: v2.4.0 (Latest - Alpha) | v2.4.0（最新版 - Alpha）

**Install from GitHub (feature branch)**:
```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/feature/device-management
```

**Features | 功能**:
- ✅ **All v2.3.0 features** (including "v2.2" features)
- ✅ **Device hot-plug detection** 🆕 - Real-time USB device detection
- ✅ **Device event notifications** 🆕 - 5 event types
  - `deviceAdded` - Device connected
  - `deviceRemoved` - Device disconnected
  - `defaultDeviceChanged` - System default changed
  - `deviceStateChanged` - Device enabled/disabled
  - `devicePropertyChanged` - Device properties modified
- ✅ **Static device methods** 🆕 - `getAudioDevices()`, `getDefaultDeviceId()`
- ✅ **Device monitoring API** 🆕 - `startDeviceMonitoring()`, `stopDeviceMonitoring()`

**Status**: 🚧 In development, 80% complete  
**状态**: 🚧 开发中，完成 80%

**Should you use this?**  
**是否应该使用？**

**YES, if** you need hot-plug detection for your translation software.  
**是，如果**您的翻译软件需要热插拔检测功能。

**NO, if** you just need basic audio capture and ASR format conversion.  
**否，如果**您只需要基本的音频捕获和 ASR 格式转换。

---

## 💡 Recommendation for Translation Software
## 翻译软件推荐方案

### Scenario 1: Basic Implementation | 基础实现

If your translation software only needs:
- Capture audio from specific window/process
- Convert to ASR-friendly format
- Send to Alibaba Gummy or other ASR services

**Use v2.3.0** (stable):
```bash
npm install node-windows-audio-capture@2.3.0
```

**Example code**:
```javascript
const { AudioCapture } = require('node-windows-audio-capture');
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

// 1. Get target process (e.g., Chrome)
const processes = await AudioCapture.getProcesses();
const chromeProcess = processes.find(p => p.name.includes('chrome'));

// 2. Create capture instance
const capture = new AudioCapture({
  targetProcessId: chromeProcess.pid,
  sampleRate: 48000,
  channels: 2,
  format: 'float32'
});

// 3. Create ASR pipeline (Alibaba Gummy)
const pipeline = new AudioProcessingPipeline('china-asr');

// 4. Capture and process audio
capture.on('data', (event) => {
  const rawAudio = event.buffer;
  const asrAudio = pipeline.process(rawAudio); // Int16, 16kHz, Mono
  
  // Send to Alibaba Gummy
  sendToGummy(asrAudio);
});

capture.start();
```

✅ **Stable, tested, production-ready**  
✅ **稳定、经过测试、可用于生产**

---

### Scenario 2: Advanced Implementation | 高级实现

If your translation software needs:
- Automatic device switching when user plugs/unplugs USB headphones
- Notify user when default audio device changes
- Real-time device status monitoring

**Use v2.4.0** (alpha):
```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/feature/device-management
```

**Example code**:
```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// 1. Monitor device changes
AudioCapture.startDeviceMonitoring((event) => {
  console.log(`Device event: ${event.type}`);
  
  if (event.type === 'defaultDeviceChanged') {
    // User switched default audio output
    console.log('Default device changed! Restarting capture...');
    
    // Restart capture with new default device
    restartCapture();
  }
  
  if (event.type === 'deviceRemoved') {
    // USB device unplugged
    showNotification('Audio device disconnected!');
  }
});

// 2. List all devices for user selection
const devices = await AudioCapture.getAudioDevices();
console.log('Available devices:', devices);

// 3. Get current default device
const defaultId = await AudioCapture.getDefaultDeviceId();
console.log('Default device:', defaultId);
```

⚠️ **Alpha quality, 80% complete, but includes all v2.3.0 features**  
⚠️ **Alpha 质量，完成 80%，但包含所有 v2.3.0 功能**

---

## 🔧 Prebuilt Binaries | 预编译文件

### v2.3.0 (main branch) | 主分支

**Status**: ✅ Available on npm  
**状态**: ✅ npm 上可用

```bash
npm install node-windows-audio-capture@2.3.0
```

The npm package includes prebuilt binaries for Windows x64.  
npm 包包含 Windows x64 的预编译二进制文件。

### v2.4.0 (feature/device-management branch) | 开发分支

**Status**: ✅ Prebuilt binary available in GitHub  
**状态**: ✅ GitHub 上可用预编译二进制文件

The feature branch now includes:
- ✅ `prebuilds/win32-x64/node-windows-audio-capture.node` (353KB)
- ✅ Automatic loading via `node-gyp-build`
- ✅ No compilation required on installation

开发分支现在包含：
- ✅ `prebuilds/win32-x64/node-windows-audio-capture.node`（353KB）
- ✅ 通过 `node-gyp-build` 自动加载
- ✅ 安装时无需编译

**Verified working**: Just fixed the installation issue in commit `d445e54`.  
**已验证可用**: 刚刚在提交 `d445e54` 中修复了安装问题。

---

## 📝 Documentation Corrections | 文档更正

### Issue in Requirements Document | 需求文档中的问题

The file `大模型LLM实时桌面翻译软件 - 功能需求分析文档 v1.1.md` mentions:

```markdown
**使用 node-windows-audio-capture v2.2 实现** ✨ **已更新**：

**v2.2.0 新特性** 🆕：
- ✨ **内置 ASR 格式转换**
- ✨ **6个 ASR 预设配置**
- ✨ **智能降采样**
- ✨ **极致性能** - <5ms延迟
```

### Correction | 更正

**v2.2.0 does not exist**. These features are part of **v2.3.0**.  
**v2.2.0 不存在**。这些功能是 **v2.3.0** 的一部分。

**Recommended change**:
```markdown
**使用 node-windows-audio-capture v2.3.0 实现** ✨ **已更新**：

**v2.3.0 新特性** 🆕：
- ✨ **内置 ASR 格式转换** - AudioProcessingPipeline 类
- ✨ **6个 ASR 预设配置** - 支持阿里Gummy、OpenAI Whisper、Azure等
- ✨ **智能降采样** - 48kHz → 16kHz，3种质量级别
- ✨ **极致性能** - <5ms延迟，91.7%大小减少

**可选 v2.4.0 增强** 🆕：
- ✨ **设备热插拔检测** - 实时监控 USB 设备插拔
- ✨ **设备事件通知** - 5 种事件类型（deviceAdded, deviceRemoved等）
```

---

## ✅ Conclusion & Recommendation | 结论与建议

### For Your Translation Software | 对于您的翻译软件

**Start with v2.3.0** (stable):
1. ✅ All features from "v2.2" documentation are available
2. ✅ Stable, production-ready
3. ✅ Includes `AudioProcessingPipeline` for ASR integration
4. ✅ Prebuilt binaries on npm

**Upgrade to v2.4.0** when:
1. You need hot-plug detection
2. You want automatic device switching
3. You need real-time device notifications
4. v2.4.0 is released to main branch

开始使用 **v2.3.0**（稳定版）：
1. ✅ "v2.2" 文档中的所有功能都可用
2. ✅ 稳定，可用于生产
3. ✅ 包含用于 ASR 集成的 `AudioProcessingPipeline`
4. ✅ npm 上有预编译二进制文件

**升级到 v2.4.0** 当：
1. 需要热插拔检测
2. 需要自动设备切换
3. 需要实时设备通知
4. v2.4.0 发布到主分支

### No v2.2 Prebuilt Binary Needed | 无需 v2.2 预编译文件

**v2.2 does not exist**, so no prebuilt binary is needed.  
**v2.2 不存在**，因此不需要预编译文件。

Use:
- **v2.3.0** for stable features (from npm or main branch)
- **v2.4.0** for latest features (from feature/device-management branch)

Both versions have prebuilt binaries available.  
两个版本都有可用的预编译二进制文件。

---

**Last Updated**: October 14, 2025  
**最后更新**: 2025年10月14日

**Status**: Documentation clarified | 文档已澄清  
**状态**: 文档已澄清
