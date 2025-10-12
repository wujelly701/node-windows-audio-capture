# node-windows-audio-capture

[![CI Build](https://github.com/wujelly701/node-windows-audio-capture/workflows/CI%20Build/badge.svg)](https://github.com/wujelly701/node-windows-audio-capture/actions)
[![npm version](https://img.shields.io/npm/v/node-windows-audio-capture.svg)](https://www.npmjs.com/package/node-windows-audio-capture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

高性能的 Windows 音频捕获 Node.js 原生模块，支持按进程捕获音频流。

## ✨ 特性

- 🎯 **按进程捕获**：精确捕获指定应用程序的音频输出
- 🔄 **实时流式处理**：基于 Node.js Stream API，支持流式数据处理
- 🎛️ **灵活配置**：支持多种采样率、声道数、音频格式
- 🔌 **Loopback 模式**：支持捕获系统播放的音频（不需要虚拟音频设备）
- 📊 **设备管理**：枚举音频设备和进程
- 🛡️ **完善的错误处理**：详细的错误码和自动重连机制
- ⚡ **高性能**：低延迟（< 50ms）、低 CPU 占用（< 10%）
- 🧪 **完整测试**：单元测试、集成测试、性能测试、内存泄漏测试
- 📦 **预构建二进制**：支持多平台多架构，无需编译

## 📋 系统要求

- **操作系统**：Windows 10/11（需要 WASAPI 支持）
- **Node.js**：>= 16.x
- **架构**：x64、arm64

## 📦 安装

```bash
npm install node-windows-audio-capture
```

### 从源码编译（可选）

如果需要从源码编译（例如开发或不支持的平台）：

```bash
npm install --build-from-source
```

**编译依赖**：
- Windows Build Tools（Visual Studio）
- Python 3.x
- node-gyp

## 🚀 快速开始

### 基础音频捕获

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// 创建捕获实例
const capture = new AudioCapture({
  processId: 1234,        // 目标进程 ID
  loopbackMode: true,     // 启用 Loopback 模式
  sampleRate: 48000,      // 48kHz 采样率
  channels: 2             // 立体声
});

// 监听音频数据
capture.on('data', (audioBuffer) => {
  console.log(`接收到音频数据: ${audioBuffer.length} bytes`);
  // 处理音频数据...
});

// 监听错误
capture.on('error', (error) => {
  console.error('捕获错误:', error.message);
});

// 启动捕获
await capture.start();

// 停止捕获
setTimeout(() => {
  capture.stop();
}, 10000);
```

### 枚举进程

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const processes = await AudioCapture.getProcesses();
processes.forEach(proc => {
  console.log(`[PID: ${proc.processId}] ${proc.name}`);
});
```

### 流式处理

```javascript
const fs = require('fs');
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 1234 });
const writeStream = fs.createWriteStream('output.raw');

// 使用管道将音频流写入文件
capture.pipe(writeStream);

await capture.start();
```

## 📚 API 概览

### AudioCapture 类

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `constructor(config)` | `AudioCaptureConfig` | `AudioCapture` | 创建捕获实例 |
| `start()` | - | `Promise<void>` | 启动音频捕获 |
| `stop()` | - | `void` | 停止音频捕获 |
| `getDevices()` | - | `Promise<Device[]>` | 枚举音频设备（静态方法） |
| `getProcesses()` | - | `Promise<Process[]>` | 枚举系统进程（静态方法） |

### 配置选项

```typescript
interface AudioCaptureConfig {
  processId: number;           // 目标进程 ID（必需）
  loopbackMode?: boolean;      // Loopback 模式（默认: true）
  sampleRate?: number;         // 采样率（默认: 48000）
  channels?: number;           // 声道数（默认: 2）
  format?: 'float32' | 'int16'; // 音频格式（默认: 'float32'）
}
```

### 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `'data'` | `Buffer` | 接收到音频数据 |
| `'error'` | `AudioError` | 发生错误 |
| `'end'` | - | 捕获结束 |

### 错误码

```javascript
const { ERROR_CODES } = require('node-windows-audio-capture');

ERROR_CODES.PROCESS_NOT_FOUND        // 进程未找到
ERROR_CODES.DEVICE_NOT_FOUND         // 设备未找到
ERROR_CODES.INITIALIZATION_FAILED    // 初始化失败
ERROR_CODES.CAPTURE_FAILED           // 捕获失败
// ... 更多错误码
```

## 📖 详细文档

- [完整 API 文档](docs/api.md)
- [示例代码](examples/)
  - [基础捕获](examples/basic-capture.js)
  - [流处理与音量检测](examples/stream-processing.js)
  - [错误处理与自动重连](examples/error-handling.js)

## 🎯 使用示例

### 实时音量监测

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 1234 });

capture.on('data', (buffer) => {
  // 计算 RMS 音量
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 4) {
    const sample = buffer.readFloatLE(i);
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / (buffer.length / 4));
  const db = 20 * Math.log10(rms);
  
  console.log(`音量: ${db.toFixed(1)} dB`);
});

await capture.start();
```

### 错误处理与重连

```javascript
const { AudioCapture, ERROR_CODES } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 1234 });

capture.on('error', async (error) => {
  if (error.code === ERROR_CODES.DEVICE_DISCONNECTED) {
    console.log('设备断开，尝试重连...');
    await new Promise(r => setTimeout(r, 2000));
    await capture.start();
  }
});

await capture.start();
```

### 保存为 WAV 文件

```javascript
const fs = require('fs');
const { AudioCapture } = require('node-windows-audio-capture');

// 写入 WAV 文件头
function writeWavHeader(stream, sampleRate, channels, dataSize) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20); // Float32
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 4, 28);
  header.writeUInt16LE(channels * 4, 32);
  header.writeUInt16LE(32, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  stream.write(header);
}

const capture = new AudioCapture({ 
  processId: 1234,
  sampleRate: 48000,
  channels: 2
});

const writeStream = fs.createWriteStream('output.wav');
let dataSize = 0;

// 预留头部空间
writeStream.write(Buffer.alloc(44));

capture.on('data', (chunk) => {
  dataSize += chunk.length;
  writeStream.write(chunk);
});

capture.on('end', () => {
  // 回写正确的文件头
  const fd = fs.openSync('output.wav', 'r+');
  const header = Buffer.alloc(44);
  writeWavHeader({ write: (buf) => fs.writeSync(fd, buf, 0, buf.length, 0) }, 
                  48000, 2, dataSize);
  fs.closeSync(fd);
});

await capture.start();
```

## 🔧 高级功能

### 多进程同时捕获

```javascript
const captures = [1234, 5678, 9012].map(pid => {
  const capture = new AudioCapture({ processId: pid });
  capture.on('data', (data) => {
    console.log(`进程 ${pid}: ${data.length} bytes`);
  });
  return capture;
});

await Promise.all(captures.map(c => c.start()));
```

### Electron 集成

```bash
# 重新编译原生模块以匹配 Electron 版本
npm run rebuild:electron
```

```javascript
// 在 Electron 主进程中使用
const { AudioCapture } = require('node-windows-audio-capture');

ipcMain.handle('start-capture', async (event, processId) => {
  const capture = new AudioCapture({ processId });
  
  capture.on('data', (data) => {
    event.sender.send('audio-data', data);
  });
  
  await capture.start();
  return 'started';
});
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- tests/audio-capture.test.js

# 生成覆盖率报告
npm run test:coverage

# 性能测试（需要 --expose-gc）
node --expose-gc node_modules/.bin/mocha tests/performance.test.js

# 内存泄漏测试
node --expose-gc node_modules/.bin/mocha tests/memory-leak.test.js
```

## 🏗️ 构建

```bash
# 开发构建
npm run build

# 发布构建（多平台预构建）
npm run prebuild

# Electron 重构建
npm run rebuild:electron -- --electron-version=27.0.0
```

## 📊 性能指标

- **延迟**：中位数 < 50ms，P95 < 100ms
- **CPU 使用率**：< 10%（单核）
- **吞吐量**：> 1 MB/s
- **内存占用**：< 50 MB（长时间运行）

## 🛠️ 故障排除

### 常见问题

**Q: 报错 "Module did not self-register"**

A: 这通常是因为 Node.js 版本不匹配。尝试重新安装：
```bash
npm rebuild node-windows-audio-capture
```

**Q: 捕获失败，错误码 DEVICE_NOT_FOUND**

A: 确保目标进程正在播放音频，并且系统音频设备正常工作。

**Q: 在 Electron 中无法使用**

A: 需要使用 `@electron/rebuild` 重新编译原生模块：
```bash
npm run rebuild:electron
```

**Q: 权限拒绝错误**

A: 某些系统进程需要管理员权限才能捕获，尝试以管理员身份运行。

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发指南

```bash
# 克隆仓库
git clone https://github.com/wujelly701/node-windows-audio-capture.git
cd node-windows-audio-capture

# 安装依赖
npm install

# 编译原生模块
npm run build

# 运行测试
npm test

# 代码格式化
npm run lint
```

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [N-API](https://nodejs.org/api/n-api.html) - Node.js 原生扩展 API
- [WASAPI](https://docs.microsoft.com/en-us/windows/win32/coreaudio/wasapi) - Windows 音频会话 API
- 所有贡献者和用户

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/wujelly701/node-windows-audio-capture/issues)
- **Email**: wujelly701@example.com

## 🗺️ 路线图

- [x] 基础音频捕获功能
- [x] Loopback 模式支持
- [x] 流式 API
- [x] 设备和进程枚举
- [x] 完整的错误处理
- [x] 预构建二进制
- [x] Electron 支持
- [ ] 音频格式转换（PCM、MP3、AAC）
- [ ] 实时音频效果（均衡器、混响）
- [ ] 多通道混音
- [ ] macOS 支持
- [ ] Linux 支持（PulseAudio/PipeWire）

---

**⚠️ 注意**：本模块仅支持 Windows 平台。音频捕获可能受到系统权限和目标应用程序的限制。

**📢 免责声明**：使用本模块捕获音频时，请遵守相关法律法规，尊重版权和隐私。
