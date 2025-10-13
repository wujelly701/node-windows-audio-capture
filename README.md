# node-windows-audio-capture

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.x-brightgreen.svg)](https://nodejs.org/)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue.svg)](https://www.microsoft.com/windows)

Production-ready Windows 音频捕获 Node.js Native Addon，基于 WASAPI 标准 Loopback 模式实现。

## ✨ 特性

- � **系统音频捕获**：使用 WASAPI Loopback 模式捕获所有系统音频输出
- 🔄 **事件驱动架构**：基于 EventEmitter，支持 data、error、started、stopped 等事件
- ⚡ **高性能**：低延迟（< 50ms）、低 CPU 占用（< 5%）、高吞吐量（~100 packets/s）
- 🎛️ **状态管理**：支持 start、stop、pause、resume 操作，完整的状态跟踪
- 📊 **设备和进程枚举**：获取默认音频设备信息和系统进程列表
- 🛡️ **完善的错误处理**：详细的错误消息和异常处理
- 🧪 **完整测试覆盖**：42 个测试用例，83.63% 代码覆盖率
- 📝 **TypeScript 支持**：完整的 .d.ts 类型定义
- � **丰富文档**：API 文档、示例代码、测试文档

## 📋 系统要求

- **操作系统**：Windows 10/11（需要 WASAPI 支持）
- **Node.js**：>= 16.x
- **编译工具**（从源码构建时）：
  - Visual Studio 2022 (MSVC v143)
  - Windows SDK
  - Python 3.x
  - node-gyp

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
const { AudioCapture, getDeviceInfo } = require('node-windows-audio-capture');

// 获取默认音频设备信息（可选）
const device = getDeviceInfo();
console.log(`默认音频设备: ${device.name}`);

// 创建捕获实例（processId: 0 表示捕获所有系统音频）
const capture = new AudioCapture({
  processId: 0  // 必需：0=所有系统音频，其他值=特定进程（未来功能）
});

// 监听音频数据
capture.on('data', (event) => {
  console.log(`接收到音频数据: ${event.length} bytes, timestamp: ${event.timestamp}`);
  // event.buffer 包含实际的音频数据（Buffer）
});

// 监听其他事件
capture.on('started', () => console.log('✅ 音频捕获已启动'));
capture.on('stopped', () => console.log('⏹️ 音频捕获已停止'));
capture.on('error', (error) => console.error('❌ 错误:', error));

// 启动捕获
await capture.start();

// 10秒后停止
setTimeout(() => capture.stop(), 10000);
```

### 保存到文件

```javascript
const fs = require('fs');
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 0 });
const writeStream = fs.createWriteStream('output.raw');

let totalBytes = 0;

capture.on('data', (event) => {
  writeStream.write(event.buffer);
  totalBytes += event.length;
});

capture.on('stopped', () => {
  writeStream.end();
  console.log(`✅ 音频已保存到 output.raw (${totalBytes} bytes)`);
});

await capture.start();
setTimeout(() => capture.stop(), 30000);  // 30秒录制
```

### 暂停和恢复

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 0 });

capture.on('data', (event) => console.log(`Data: ${event.length} bytes`));
capture.on('paused', () => console.log('⏸️ 已暂停'));
capture.on('resumed', () => console.log('▶️ 已恢复'));

await capture.start();

setTimeout(() => capture.pause(), 3000);   // 3秒后暂停
setTimeout(() => capture.resume(), 6000);  // 6秒后恢复
setTimeout(() => capture.stop(), 9000);    // 9秒后停止
```

### 枚举进程

```javascript
const { enumerateProcesses } = require('node-windows-audio-capture');

// 获取所有运行的进程
const processes = enumerateProcesses();
console.log(`找到 ${processes.length} 个进程:`);

processes.slice(0, 10).forEach(proc => {
  console.log(`  [PID: ${proc.pid}] ${proc.name}`);
});

// 查找特定进程
const targetProcess = processes.find(p => p.name.includes('Chrome'));
if (targetProcess) {
  console.log(`找到 Chrome: PID=${targetProcess.pid}`);
}
```

## 📚 API 文档

### AudioCapture 类

音频捕获类，继承自 `EventEmitter`。

#### 构造函数

```typescript
new AudioCapture(options: AudioCaptureOptions)
```

**参数：**

```typescript
interface AudioCaptureOptions {
  processId: number;        // 目标进程 ID（必需）
                            // 0 = 捕获所有系统音频（Loopback 模式）
                            // 其他值 = 特定进程（未来功能）
  
  sampleRate?: number;      // 采样率（可选，默认由系统决定）
  channels?: number;        // 声道数（可选，默认由系统决定）
  bitDepth?: number;        // 位深度（可选，默认由系统决定）
}
```

**示例：**
```javascript
const capture = new AudioCapture({ processId: 0 });
```

#### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `start()` | `Promise<void>` | 启动音频捕获，返回 Promise |
| `stop()` | `void` | 停止音频捕获 |
| `pause()` | `void` | 暂停音频数据流（不停止捕获线程）|
| `resume()` | `void` | 恢复音频数据流 |
| `isRunning()` | `boolean` | 检查是否正在捕获 |
| `isPaused()` | `boolean` | 检查是否已暂停 |
| `getOptions()` | `AudioCaptureOptions` | 获取当前配置选项 |

#### 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `'data'` | `AudioDataEvent` | 接收到音频数据 |
| `'error'` | `Error` | 发生错误 |
| `'started'` | - | 捕获已启动 |
| `'stopped'` | - | 捕获已停止 |
| `'paused'` | - | 数据流已暂停 |
| `'resumed'` | - | 数据流已恢复 |

**AudioDataEvent 接口：**
```typescript
interface AudioDataEvent {
  buffer: Buffer;      // 音频数据缓冲区
  length: number;      // 数据长度（字节）
  timestamp: number;   // 时间戳（毫秒）
}
```

**示例：**
```javascript
capture.on('data', (event) => {
  console.log(`Received ${event.length} bytes at ${event.timestamp}ms`);
  // 处理 event.buffer
});

capture.on('error', (error) => {
  console.error('Capture error:', error.message);
});
```

### 全局函数

#### getDeviceInfo()

获取默认音频渲染设备信息。

```typescript
function getDeviceInfo(): DeviceInfo
```

**返回值：**
```typescript
interface DeviceInfo {
  name: string;  // 设备友好名称
  id: string;    // 设备 ID
}
```

**示例：**
```javascript
const { getDeviceInfo } = require('node-windows-audio-capture');
const device = getDeviceInfo();
console.log(`Default device: ${device.name}`);
```

#### enumerateProcesses()

枚举所有运行的进程。

```typescript
function enumerateProcesses(): ProcessInfo[]
```

**返回值：**
```typescript
interface ProcessInfo {
  pid: number;   // 进程 ID
  name: string;  // 进程名称（可执行文件名）
}
```

**示例：**
```javascript
const { enumerateProcesses } = require('node-windows-audio-capture');
const processes = enumerateProcesses();
console.log(`Total processes: ${processes.length}`);
```

## 📖 示例代码

### 示例 1：基础音频捕获 ([examples/basic.js](examples/basic.js))

10秒音频捕获，统计数据包数量和总字节数。

```javascript
const { AudioCapture, getDeviceInfo } = require('node-windows-audio-capture');

const device = getDeviceInfo();
console.log(`📱 默认音频设备: ${device.name}`);

const capture = new AudioCapture({ processId: 0 });

let packetCount = 0;
let totalBytes = 0;

capture.on('data', (event) => {
  packetCount++;
  totalBytes += event.length;
  
  if (packetCount % 100 === 0) {
    console.log(`📊 Stats: ${packetCount} packets, ${totalBytes} bytes`);
  }
});

capture.on('started', () => console.log('✅ Audio capture started'));
capture.on('stopped', () => {
  console.log('⏹️ Audio capture stopped');
  console.log(`📈 Final: ${packetCount} packets, ${totalBytes} bytes`);
});

await capture.start();
setTimeout(() => capture.stop(), 10000);
```

### 示例 2：进程特定捕获 ([examples/process-capture.js](examples/process-capture.js))

查找并捕获特定进程的音频（如 Chrome、Spotify 等）。

```javascript
const fs = require('fs');
const { AudioCapture, enumerateProcesses } = require('node-windows-audio-capture');

// 查找目标进程
const processes = enumerateProcesses();
const targets = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'spotify.exe'];

const targetProcess = processes.find(p => 
  targets.some(t => p.name.toLowerCase().includes(t.toLowerCase()))
);

if (!targetProcess) {
  console.log('❌ 未找到目标进程');
  process.exit(1);
}

console.log(`🎯 目标进程: ${targetProcess.name} (PID: ${targetProcess.pid})`);

// 注意：当前版本只支持 processId=0（所有系统音频）
// 进程隔离功能将在未来版本实现
const capture = new AudioCapture({ processId: 0 });
const writeStream = fs.createWriteStream('output.raw');

capture.on('data', (event) => writeStream.write(event.buffer));
capture.on('stopped', () => {
  writeStream.end();
  console.log('✅ Audio saved to output.raw');
});

await capture.start();
setTimeout(() => capture.stop(), 30000);
```

### 示例 3：事件演示 ([examples/events.js](examples/events.js))

演示所有事件和 pause/resume 功能。

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 0 });

let dataCount = 0;

capture.on('started', () => console.log('🟢 [Event] started'));
capture.on('stopped', () => console.log('🔴 [Event] stopped'));
capture.on('paused', () => console.log('⏸️  [Event] paused'));
capture.on('resumed', () => console.log('▶️  [Event] resumed'));

capture.on('data', (event) => {
  dataCount++;
  if (dataCount % 50 === 0) {
    console.log(`📦 [Event] data: ${event.length} bytes (count: ${dataCount})`);
  }
});

capture.on('error', (error) => console.error('❌ [Event] error:', error));

await capture.start();

setTimeout(() => {
  console.log('⏸️  Pausing...');
  capture.pause();
}, 3000);

setTimeout(() => {
  console.log('▶️  Resuming...');
  capture.resume();
}, 6000);

setTimeout(() => {
  console.log('⏹️  Stopping...');
  capture.stop();
}, 9000);
```

### 示例 4：实时音量监测

计算并显示实时音频音量（dB）。

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 0 });

capture.on('data', (event) => {
  // 假设音频格式为 Float32（每个样本 4 字节）
  const samples = event.length / 4;
  let sum = 0;
  
  for (let i = 0; i < event.length; i += 4) {
    const sample = event.buffer.readFloatLE(i);
    sum += sample * sample;
  }
  
  const rms = Math.sqrt(sum / samples);
  const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
  
  console.log(`🔊 音量: ${db.toFixed(1)} dB (RMS: ${rms.toFixed(4)})`);
});

await capture.start();
```

### 示例 5：多实例并发捕获

同时运行多个捕获实例（虽然当前只支持 processId=0）。

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const instance1 = new AudioCapture({ processId: 0 });
const instance2 = new AudioCapture({ processId: 0 });

instance1.on('data', (event) => console.log(`Instance 1: ${event.length} bytes`));
instance2.on('data', (event) => console.log(`Instance 2: ${event.length} bytes`));

await Promise.all([
  instance1.start(),
  instance2.start()
]);

setTimeout(() => {
  instance1.stop();
  instance2.stop();
}, 5000);
```

## 🔧 音频格式信息

### 默认音频格式

本模块使用 WASAPI `GetMixFormat()` 获取系统默认音频格式，通常为：

- **采样率**: 48000 Hz (或 44100 Hz)
- **声道数**: 2 (立体声)
- **格式**: IEEE Float 32-bit (每个样本 4 字节)
- **字节序**: Little Endian (小端)

### RAW 音频数据

`data` 事件返回的 `buffer` 是原始 PCM 音频数据，没有文件头。

**格式示例（Float32, 48kHz, 2声道）：**
- 每秒数据量: 48000 samples/s × 2 channels × 4 bytes = 384000 bytes/s (~375 KB/s)
- 每个数据包: ~3500 bytes (~9ms 音频)
- 数据包频率: ~100 packets/s

### 转换为 WAV 文件

如需转换为标准 WAV 文件，可以使用第三方库如 `wav`、`node-wav` 等，或手动添加 WAV 文件头：

```javascript
// WAV 文件头（Float32 格式）
function createWavHeader(sampleRate, channels, dataSize) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);             // fmt chunk size
  header.writeUInt16LE(3, 20);              // format = IEEE Float
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 4, 28);  // byte rate
  header.writeUInt16LE(channels * 4, 32);   // block align
  header.writeUInt16LE(32, 34);             // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return header;
}

// 使用示例
const fs = require('fs');
const capture = new AudioCapture({ processId: 0 });

let dataSize = 0;
const chunks = [];

capture.on('data', (event) => {
  chunks.push(event.buffer);
  dataSize += event.length;
});

capture.on('stopped', () => {
  const header = createWavHeader(48000, 2, dataSize);
  const wavData = Buffer.concat([header, ...chunks]);
  fs.writeFileSync('output.wav', wavData);
  console.log('✅ WAV file saved');
});

await capture.start();
setTimeout(() => capture.stop(), 10000);
```

## 🧪 测试

项目包含完整的测试套件，涵盖基础功能、集成、性能和错误处理。

### 测试统计

- **测试数量**: 42 个
- **测试覆盖率**: 83.63%
  - 语句覆盖: 83.63%
  - 分支覆盖: 91.3%
  - 函数覆盖: 100%
  - 行覆盖: 83.63%

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test test/basic.test.js
npm test test/integration.test.js
npm test test/performance.test.js
npm test test/error-handling.test.js

# 生成覆盖率报告
npm test -- --coverage

# 详细输出
npm test -- --verbose

# 强制退出（长时间测试后）
npm test -- --forceExit
```

### 测试分类

**基础测试 (12 个)**
- Native addon 加载和函数存在性
- 构造函数和选项验证
- EventEmitter 接口
- 状态管理（isRunning, isPaused）

**集成测试 (7 个)**
- 完整捕获流程（start → data → stop）
- Pause/Resume 功能
- 多实例并发
- 数据统计

**性能测试 (7 个)**
- 长时间运行（30秒）
- 快速启停循环
- 快速暂停恢复循环
- 内存泄漏检测
- 数据率稳定性
- 大量事件监听器
- 缓冲区处理

**错误处理测试 (16 个)**
- 无效参数验证
- 重复操作保护
- 错误事件 emit
- 边界情况（零长度、极短捕获）
- 并发操作

更多测试信息，请参阅 [TESTING.md](TESTING.md)。

## 🏗️ 构建

### 从源码构建

```bash
# 安装依赖
npm install

# 配置
npx node-gyp configure

# 编译
npx node-gyp build

# 或者一步完成
npx node-gyp rebuild
```

### 清理构建产物

```bash
npx node-gyp clean
```

## 📊 性能指标

基于测试套件的实际测量结果：

### 吞吐量
- **数据包频率**: 85-100 packets/s
- **数据传输率**: 295-345 KB/s
- **30秒捕获**: 2569-3001 packets, 8.64-10.10 MB

### 延迟
- **事件响应**: < 50ms（事件驱动架构）
- **数据包间隔**: ~10ms

### CPU 和内存
- **CPU 占用**: < 5%（单核）
- **内存占用**: ~30 MB（稳定运行）
- **内存泄漏**: 无（测试显示 -0.32 MB，负增长）

### 稳定性
- **数据率变异系数 (CV)**: < 1%（非常稳定）
- **标准差**: ~0.5 packets/s
- **长时间运行**: 30秒稳定捕获，无错误

### 压力测试
- **快速启停**: 5 次循环 ✅
- **快速暂停恢复**: 10 次循环 ✅
- **100 个事件监听器**: ✅ 成功处理
- **缓冲区处理**: 100 个缓冲区 ✅

## 🛠️ 故障排除

### 常见问题

**Q: 报错 "Cannot find module 'build/Release/audio_addon.node'"**

A: 原生模块未编译。请运行：
```bash
npx node-gyp rebuild
```

**Q: 编译失败，找不到 Visual Studio**

A: 需要安装 Visual Studio 2022（或 VS Build Tools）和 Windows SDK：
- 下载 [Visual Studio Community](https://visualstudio.microsoft.com/)
- 安装时选择"使用 C++ 的桌面开发"工作负载

**Q: 捕获不到音频数据（0 packets）**

A: 可能的原因：
1. 系统正在静音或没有音频播放
2. 音频设备未正确初始化
3. 检查默认音频设备是否正常工作

解决方案：
```javascript
// 检查设备信息
const { getDeviceInfo } = require('node-windows-audio-capture');
const device = getDeviceInfo();
console.log('Device:', device.name);
```

**Q: 测试失败或超时**

A: 音频捕获测试依赖实际的系统音频：
- 确保测试期间有音频播放（或接受静音结果）
- 增加测试超时时间：`npm test -- --testTimeout=60000`
- 串行运行测试（避免设备冲突）：已配置 `maxWorkers: 1`

**Q: 内存使用持续增长**

A: 检查事件监听器是否正确移除：
```javascript
// 使用 once() 而不是 on()
capture.once('data', handleData);

// 或手动移除监听器
capture.removeListener('data', handleData);

// 停止时移除所有监听器
capture.removeAllListeners();
```

**Q: 在 Electron 中无法使用**

A: 需要重新编译以匹配 Electron 的 Node.js 版本：
```bash
npm install @electron/rebuild
npx electron-rebuild
```

**Q: 权限错误或访问被拒绝**

A: 某些系统服务或受保护的进程需要管理员权限。以管理员身份运行 Node.js 进程。

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

### 已完成 ✅

- [x] 基础音频捕获功能（WASAPI Loopback 模式）
- [x] 事件驱动架构（EventEmitter）
- [x] Pause/Resume 功能
- [x] 设备和进程枚举
- [x] 完整的错误处理
- [x] TypeScript 类型定义
- [x] 完整测试套件（42 个测试，83.63% 覆盖率）
- [x] 性能优化（低延迟、低 CPU、高稳定性）
- [x] 详细文档和示例

### 计划中 🚀

#### 短期（v2.x）
- [ ] IAudioClient3 进程隔离模式（捕获特定进程音频）
- [ ] 设备选择（不仅限于默认设备）
- [ ] 音频格式配置（采样率、声道、位深度）
- [ ] WAV 文件导出助手
- [ ] 更多音频格式支持（PCM16、PCM24）
- [ ] npm 发布和 CI/CD 配置

#### 中期（v3.x）
- [ ] 音频可视化工具（波形、频谱）
- [ ] 实时音频处理（音量调节、均衡器）
- [ ] 音频流传输（WebSocket/HTTP）
- [ ] CLI 工具
- [ ] Electron 示例应用
- [ ] 更多编解码器支持（MP3、AAC、FLAC）

#### 长期（v4.x+）
- [ ] macOS 支持（Core Audio）
- [ ] Linux 支持（PulseAudio/PipeWire）
- [ ] 多通道混音
- [ ] 插件系统
- [ ] GUI 应用（Electron）

## 🔒 已知限制

- **仅 Windows 平台**：目前只支持 Windows 10/11
- **仅 Loopback 模式**：捕获所有系统音频（processId=0），进程隔离功能将在 v2.x 实现
- **固定音频格式**：使用系统默认格式（通常是 Float32, 48kHz, 2声道）
- **需要编译环境**：从源码安装需要 Visual Studio 和 Windows SDK

## 📋 技术细节

### WASAPI 架构

本模块使用 Windows Audio Session API (WASAPI) 的 Loopback 模式：

- **IAudioClient**: 标准音频客户端接口
- **IAudioCaptureClient**: 音频捕获缓冲区管理
- **事件驱动**: 使用 `SetEventHandle` + `WaitForSingleObject`
- **MMCSS**: 线程优先级提升（Pro Audio）
- **GetMixFormat**: 自动协商音频格式

### N-API 绑定

- **ThreadSafeFunction**: 异步音频回调（捕获线程 → 主线程）
- **ObjectWrap**: C++ 类封装为 JavaScript 对象
- **COM 生命周期管理**: 自动初始化和清理
- **错误处理**: HRESULT → JavaScript Error 转换

### 性能优化

- **事件驱动架构**: 避免轮询，降低 CPU 占用
- **缓冲区重用**: 减少内存分配
- **智能指针**: 使用 `ComPtr` 自动管理 COM 对象生命周期
- **原子操作**: 线程安全的状态管理（`std::atomic<bool>`）

---

## ⚠️ 重要说明

### 使用限制

本模块仅供合法用途使用。请确保：

- ✅ 您有权捕获音频内容
- ✅ 遵守适用的版权法和隐私法
- ✅ 不用于未经授权的录音或监听
- ✅ 尊重他人的知识产权

### 技术限制

- **Windows Only**: 仅支持 Windows 10/11
- **Native Module**: 需要与 Node.js 版本匹配
- **系统依赖**: 依赖 Windows WASAPI（无法在 Wine/虚拟机中使用）
- **进程隔离**: 当前版本只支持捕获所有系统音频

---

**📢 免责声明**：作者不对使用本软件导致的任何直接或间接损失负责。使用者需自行承担使用本软件的风险，并确保遵守所有适用的法律法规。
