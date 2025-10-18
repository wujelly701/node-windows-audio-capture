# API 详细文档

本文档详细说明 `node-windows-audio-capture` 模块的所有 API、配置选项、事件和错误处理。

## 目录

- [AudioCapture 类](#audiocapture-类)
  - [构造函数](#构造函数)
  - [实例方法](#实例方法)
  - [静态方法](#静态方法)
  - [事件](#事件)
- [MicrophoneCapture 类](#microphonecapture-类)
  - [构造函数](#构造函数-1)
  - [实例方法](#实例方法-1)
  - [事件](#事件-1)
- [AudioProcessingPipeline 类](#audioprocessingpipeline-类)
- [配置选项](#配置选项)
- [错误处理](#错误处理)
- [类型定义](#类型定义)

---

## AudioCapture 类

`AudioCapture` 类是音频捕获的主要接口，继承自 Node.js 的 `Readable` 流。

### 构造函数

#### `new AudioCapture(config)`

创建一个新的音频捕获实例。

**参数：**

- `config` (Object) - 配置对象，详见[配置选项](#配置选项)

**返回值：**

- `AudioCapture` - 音频捕获实例

**抛出错误：**

- `TypeError` - 当配置参数无效时
- `AudioError` - 当初始化失败时

**示例：**

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({
  processId: 1234,
  loopbackMode: true,
  sampleRate: 48000,
  channels: 2
});
```

**详细说明：**

构造函数会验证配置参数并初始化内部状态，但不会立即开始捕获。需要调用 `start()` 方法才能开始捕获音频。

---

### 实例方法

#### `start()`

启动音频捕获。

**签名：**

```typescript
start(): Promise<void>
```

**参数：**

- 无

**返回值：**

- `Promise<void>` - 成功时 resolve，失败时 reject

**抛出错误：**

- `AudioError` - 当启动失败时，错误对象包含 `code` 属性

**示例：**

```javascript
try {
  await capture.start();
  console.log('音频捕获已启动');
} catch (error) {
  console.error('启动失败:', error.message);
  console.error('错误码:', error.code);
}
```

**详细说明：**

- 启动后会开始触发 `'data'` 事件
- 如果已经在运行中，会抛出 `INVALID_STATE` 错误
- 异步操作，使用 Promise 或 async/await

**可能的错误码：**

- `PROCESS_NOT_FOUND` - 目标进程不存在
- `DEVICE_NOT_FOUND` - 音频设备不可用
- `INITIALIZATION_FAILED` - 初始化音频系统失败
- `ACCESS_DENIED` - 权限不足
- `INVALID_STATE` - 已经在运行中

---

#### `stop()`

停止音频捕获。

**签名：**

```typescript
stop(): void
```

**参数：**

- 无

**返回值：**

- `void`

**示例：**

```javascript
capture.stop();
console.log('音频捕获已停止');
```

**详细说明：**

- 同步方法，立即停止捕获
- 停止后会触发 `'end'` 事件
- 多次调用是安全的（幂等操作）
- 停止后可以再次调用 `start()` 重新开始

---

#### `enableStats(options)` ⭐ v2.10.0 新增

启用实时音频统计功能。启用后，会定期触发 `'stats'` 事件，提供音频统计数据（峰值、RMS、分贝等）。

**签名：**

```typescript
enableStats(options?: AudioStatsOptions): void
```

**参数：**

- `options` (AudioStatsOptions, 可选) - 统计配置选项
  - `interval` (number, 可选) - 统计触发间隔（毫秒），默认 500ms
  - `silenceThreshold` (number, 可选) - 静音检测阈值（0.0 - 1.0），默认 0.001 ⭐ Phase 2 新增

**返回值：**

- `void`

**示例 1：基础配置**

```javascript
const capture = new AudioCapture({ processId: 0 });

// 启用实时统计（每 500ms 触发一次 'stats' 事件）
capture.enableStats({ interval: 500 });

// 监听统计事件
capture.on('stats', (stats) => {
  console.log('Peak:', stats.peak);                    // 峰值 (0.0 - 1.0)
  console.log('RMS:', stats.rms);                      // 均方根 (0.0 - 1.0)
  console.log('dB:', stats.db);                        // 分贝 (-∞ to 0 dB)
  console.log('Volume:', stats.volumePercent + '%');   // 音量百分比 (0 - 100)
  console.log('Silence:', stats.isSilence);            // 是否静音
  console.log('Timestamp:', stats.timestamp);          // Unix 时间戳（毫秒）
});

await capture.start();
```

**示例 2：配置自定义静音阈值** ⭐ Phase 2

```javascript
// 为嘈杂环境设置更高的阈值
capture.enableStats({ 
  interval: 300,
  silenceThreshold: 0.005  // 高阈值，避免误触发
});

capture.on('stats', (stats) => {
  if (!stats.isSilence) {
    console.log(`🔊 音频: ${stats.volumePercent.toFixed(1)}% (${stats.db.toFixed(1)} dB)`);
  }
});
```

**示例 3：场景化配置** ⭐ Phase 2

```javascript
// 音乐录制场景：捕捉细微动态
capture.enableStats({ 
  interval: 200,
  silenceThreshold: 0.0001  // 超低阈值
});

// 游戏直播场景：过滤背景噪音
capture.enableStats({ 
  interval: 500,
  silenceThreshold: 0.004   // 高阈值
});
```

**详细说明：**

- 启用后会自动收集音频数据并定期计算统计值
- 统计间隔越短，统计频率越高，但 CPU 开销也会增加
- 推荐间隔：200-1000ms（默认 500ms）
- 可以在运行中动态启用/禁用
- 性能开销：< 1% CPU（默认配置）

**应用场景：**

- 实时音量监控和可视化
- 智能静音检测
- 音频质量分析
- 音量阈值告警

---

#### `disableStats()`

禁用实时音频统计功能。

**签名：**

```typescript
disableStats(): void
```

**参数：**

- 无

**返回值：**

- `void`

**示例：**

```javascript
// 禁用统计
capture.disableStats();

// 不再触发 'stats' 事件
```

**详细说明：**

- 停止触发 `'stats'` 事件
- 清空内部统计缓冲区
- 多次调用是安全的（幂等操作）
- 不影响音频捕获（`'data'` 事件继续触发）

---

#### `isStatsEnabled()`

查询实时音频统计是否已启用。

**签名：**

```typescript
isStatsEnabled(): boolean
```

**参数：**

- 无

**返回值：**

- `boolean` - `true` 表示统计已启用，`false` 表示未启用

**示例：**

```javascript
if (capture.isStatsEnabled()) {
  console.log('统计已启用');
} else {
  console.log('统计未启用');
}
```

---

#### `calculateStats(buffer)` ⭐ v2.10.0 新增

对单个音频缓冲区进行一次性统计计算。无需启用持续统计，适用于按需计算场景。

**签名：**

```typescript
calculateStats(buffer: Buffer): AudioStats
```

**参数：**

- `buffer` (Buffer) - 音频数据缓冲区（Float32 PCM 格式）

**返回值：**

- `AudioStats` - 音频统计对象

**AudioStats 结构：**

```typescript
interface AudioStats {
  peak: number;           // 峰值 (0.0 - 1.0)
  rms: number;            // 均方根 (0.0 - 1.0)
  db: number;             // 分贝值 (-∞ to 0 dB)
  volumePercent: number;  // 音量百分比 (0 - 100)
  isSilence: boolean;     // 是否静音（RMS < 0.001）
  timestamp: number;      // Unix 时间戳（毫秒）
}
```

**示例 1：按需计算**

```javascript
const capture = new AudioCapture({ processId: 0 });

let dataCount = 0;

capture.on('data', (data) => {
  dataCount++;
  
  // 每 10 个 data 事件计算一次统计
  if (dataCount % 10 === 0) {
    const stats = capture.calculateStats(data.buffer);
    console.log(`Peak: ${stats.peak.toFixed(4)}, RMS: ${stats.rms.toFixed(4)}`);
  }
});

await capture.start();
```

**示例 2：智能静音检测**

```javascript
capture.on('data', (data) => {
  const stats = capture.calculateStats(data.buffer);
  
  if (stats.isSilence) {
    console.log('🔇 检测到静音');
  } else {
    console.log(`🔊 检测到音频 (Volume: ${stats.volumePercent.toFixed(1)}%)`);
  }
});
```

**详细说明：**

- 同步方法，立即返回统计结果
- 不需要调用 `enableStats()` 就可以使用
- 每次调用都会重新计算（无缓存）
- 适用于按需统计场景，节省 CPU 资源
- 性能：处理 1000 samples < 0.1ms

**计算公式：**

- **Peak（峰值）**: `max(|sample[i]|)` - 音频片段的最大绝对振幅
- **RMS（均方根）**: `sqrt(sum(sample[i]²) / N)` - 音频的平均能量
- **dB（分贝）**: `20 * log10(RMS)` - 对数刻度的音量表示
- **Volume（音量百分比）**: `RMS * 100` - 线性刻度的音量表示
- **Silence（静音检测）**: `RMS < 0.001` - 低于阈值视为静音

**准确度：**

- **Peak**: 100%（精确匹配）
- **RMS**: < 1% 误差
- **dB**: < 0.5 dB 误差

---

#### `setSilenceThreshold(threshold)` ⭐ v2.10.0 Phase 2 新增

设置静音检测的阈值。此方法允许根据不同的音频环境动态调整静音判断标准。

**签名：**

```typescript
setSilenceThreshold(threshold: number): void
```

**参数：**

- `threshold` (number) - 静音检测阈值（范围 0.0 - 1.0）
  - **默认值**: 0.001
  - **安静环境**: 0.0001 - 0.001（如录音棚、深夜录制）
  - **普通环境**: 0.001 - 0.003（如家庭、办公室）
  - **嘈杂环境**: 0.003 - 0.010（如街道、公共场所）

**返回值：**

- `void` - 无返回值

**异常：**

- 如果 `threshold` 不在 [0.0, 1.0] 范围内，抛出 `RangeError`

**示例 1：为嘈杂环境提高阈值**

```javascript
const capture = new AudioCapture({ processId: 0 });

// 在嘈杂的直播环境中，需要更高的阈值
capture.setSilenceThreshold(0.005);

capture.on('stats', (stats) => {
  console.log(`静音: ${stats.isSilence} (阈值: 0.005)`);
});

await capture.enableStats({ interval: 100 });
await capture.start();
```

**示例 2：动态切换环境**

```javascript
// 初始为普通环境
capture.setSilenceThreshold(0.002);

// 切换到安静的录音环境
function switchToStudioMode() {
  capture.setSilenceThreshold(0.0005);
  console.log('切换到录音棚模式（低阈值）');
}

// 切换到嘈杂的户外环境
function switchToOutdoorMode() {
  capture.setSilenceThreshold(0.008);
  console.log('切换到户外模式（高阈值）');
}
```

**示例 3：根据应用场景优化**

```javascript
// 电话会议：过滤键盘噪音
capture.setSilenceThreshold(0.002);

// 音乐录制：捕捉细微动态
capture.setSilenceThreshold(0.0001);

// 游戏直播：避免误触发
capture.setSilenceThreshold(0.004);
```

**详细说明：**

- **实时生效**: 设置后立即影响后续的统计计算
- **线程安全**: 可在捕获过程中动态调整
- **影响范围**: 
  - `enableStats()` 生成的 'stats' 事件中的 `isSilence`
  - `calculateStats()` 返回结果中的 `isSilence`
- **性能**: 零开销（仅修改阈值变量）

**推荐阈值指南：**

| 应用场景 | 推荐阈值 | 说明 |
|---------|---------|------|
| 音乐录制 | 0.0001 - 0.001 | 捕捉细微的乐器呼吸声 |
| 语音通话 | 0.001 - 0.003 | 平衡清晰度与噪音过滤 |
| 会议录音 | 0.002 - 0.004 | 过滤键盘、空调等背景噪音 |
| 游戏直播 | 0.003 - 0.005 | 避免游戏音效误触发 |
| 户外录制 | 0.005 - 0.010 | 过滤风声、交通噪音 |

---

#### `getSilenceThreshold()` ⭐ v2.10.0 Phase 2 新增

获取当前的静音检测阈值。

**签名：**

```typescript
getSilenceThreshold(): number
```

**参数：**

- 无

**返回值：**

- `number` - 当前的静音检测阈值（范围 0.0 - 1.0）

**示例 1：查询当前阈值**

```javascript
const currentThreshold = capture.getSilenceThreshold();
console.log(`当前静音阈值: ${currentThreshold}`); // 0.001（默认值）
```

**示例 2：保存和恢复阈值**

```javascript
// 保存当前阈值
const originalThreshold = capture.getSilenceThreshold();

// 临时调整为高阈值
capture.setSilenceThreshold(0.010);
await processNoisyAudio();

// 恢复原始阈值
capture.setSilenceThreshold(originalThreshold);
```

**示例 3：构建自适应系统**

```javascript
function calibrateThreshold(audioSamples) {
  // 分析音频样本，计算背景噪音水平
  const noiseLevel = analyzeNoiseLevel(audioSamples);
  
  // 根据噪音水平自动调整阈值
  const adaptiveThreshold = Math.max(noiseLevel * 2, 0.001);
  
  console.log(`背景噪音: ${noiseLevel.toFixed(4)}`);
  console.log(`调整阈值: ${capture.getSilenceThreshold()} → ${adaptiveThreshold.toFixed(4)}`);
  
  capture.setSilenceThreshold(adaptiveThreshold);
}

// 每 30 秒重新校准
setInterval(() => {
  const recentSamples = collectRecentAudio();
  calibrateThreshold(recentSamples);
}, 30000);
```

**详细说明：**

- **默认值**: 0.001（如果从未调用过 `setSilenceThreshold`）
- **同步方法**: 立即返回，无 I/O 开销
- **用途**:
  - 调试时检查当前配置
  - 实现阈值的保存/恢复
  - 构建自适应静音检测系统
  - 用户界面显示当前灵敏度

---

### 静态方法

#### `AudioCapture.getDevices()`

枚举系统中所有音频设备。

**签名：**

```typescript
static getDevices(): Promise<Device[]>
```

**参数：**

- 无

**返回值：**

- `Promise<Device[]>` - 设备数组

**设备对象结构：**

```typescript
interface Device {
  id: string;              // 设备唯一标识符
  name: string;            // 设备名称
  isDefault: boolean;      // 是否为默认设备
  isActive: boolean;       // 是否激活
  type: 'render' | 'capture'; // 设备类型
}
```

**示例：**

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const devices = await AudioCapture.getDevices();
devices.forEach(device => {
  console.log(`设备: ${device.name}`);
  console.log(`  ID: ${device.id}`);
  console.log(`  类型: ${device.type}`);
  console.log(`  默认: ${device.isDefault}`);
  console.log(`  激活: ${device.isActive}`);
});
```

**详细说明：**

- 返回所有可用的音频设备（输入和输出）
- 可用于选择特定设备进行捕获
- 设备列表可能在运行时变化（插拔设备）

---

#### `AudioCapture.getProcesses()`

枚举系统中所有正在运行的进程。

**签名：**

```typescript
static getProcesses(): Promise<Process[]>
```

**参数：**

- 无

**返回值：**

- `Promise<Process[]>` - 进程数组

**进程对象结构：**

```typescript
interface Process {
  processId: number;       // 进程 ID
  name: string;            // 进程名称
  executablePath?: string; // 可执行文件路径（可选）
}
```

**示例：**

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const processes = await AudioCapture.getProcesses();

// 查找特定进程
const chromeProcess = processes.find(p => 
  p.name.toLowerCase().includes('chrome')
);

if (chromeProcess) {
  console.log(`Chrome 进程 ID: ${chromeProcess.processId}`);
  console.log(`路径: ${chromeProcess.executablePath}`);
  
  // 使用找到的进程 ID 创建捕获
  const capture = new AudioCapture({
    processId: chromeProcess.processId
  });
}
```

**详细说明：**

- 返回系统中所有进程，包括没有音频输出的进程
- 某些系统进程可能需要管理员权限才能捕获
- 进程列表是快照，不会实时更新

---

### 事件

`AudioCapture` 继承自 `Readable` 流，支持所有标准流事件，以及以下自定义事件：

#### `'data'`

当接收到音频数据时触发。

**回调参数：**

```typescript
(chunk: Buffer) => void
```

- `chunk` (Buffer) - 音频数据缓冲区

**数据格式：**

- **格式**：Float32（默认）或 Int16
- **字节序**：Little-endian
- **交错**：多声道数据交错存储（L-R-L-R...）
- **大小**：通常为几 KB 到几十 KB

**示例：**

```javascript
capture.on('data', (chunk) => {
  console.log(`接收到 ${chunk.length} 字节音频数据`);
  
  // Float32 格式：每个样本 4 字节
  const sampleCount = chunk.length / 4;
  console.log(`样本数: ${sampleCount}`);
  
  // 读取第一个样本
  if (chunk.length >= 4) {
    const firstSample = chunk.readFloatLE(0);
    console.log(`第一个样本值: ${firstSample}`);
  }
});
```

**详细说明：**

- 数据以固定间隔到达（取决于音频缓冲区大小）
- 每个 chunk 包含完整的音频帧
- 可以使用流的 `pipe()` 方法传输到其他流

---

#### `'error'`

当发生错误时触发。

**回调参数：**

```typescript
(error: AudioError) => void
```

- `error` (AudioError) - 错误对象

**AudioError 属性：**

```typescript
class AudioError extends Error {
  code: string;      // 错误码
  message: string;   // 错误消息
  name: string;      // 'AudioError'
}
```

**示例：**

```javascript
const { AudioCapture, ERROR_CODES } = require('node-windows-audio-capture');

capture.on('error', (error) => {
  console.error('音频捕获错误:', error.message);
  console.error('错误码:', error.code);
  
  // 根据错误码执行不同的处理
  switch (error.code) {
    case ERROR_CODES.DEVICE_DISCONNECTED:
      console.log('设备断开，尝试重连...');
      setTimeout(() => capture.start(), 2000);
      break;
      
    case ERROR_CODES.PROCESS_TERMINATED:
      console.log('目标进程已终止');
      break;
      
    case ERROR_CODES.ACCESS_DENIED:
      console.log('权限不足，请以管理员身份运行');
      break;
      
    default:
      console.log('未知错误');
  }
});
```

**详细说明：**

- 错误事件不会停止流（除非是致命错误）
- 某些错误可以通过重试恢复
- 错误码详见[错误处理](#错误处理)章节

---

#### `'end'`

当音频捕获结束时触发。

**回调参数：**

```typescript
() => void
```

**示例：**

```javascript
capture.on('end', () => {
  console.log('音频捕获已结束');
});
```

**详细说明：**

- 调用 `stop()` 后触发
- 流已关闭，不会再有 `'data'` 事件
- 可以重新调用 `start()` 开始新的捕获

---

#### `'stats'` ⭐ v2.10.0 新增

当启用实时统计后（`enableStats()`），定期触发音频统计事件。

**回调参数：**

```typescript
(stats: AudioStats) => void
```

- `stats` (AudioStats) - 音频统计对象

**AudioStats 对象结构：**

```typescript
interface AudioStats {
  peak: number;           // 峰值 (0.0 - 1.0)
  rms: number;            // 均方根 (0.0 - 1.0)
  db: number;             // 分贝值 (-∞ to 0 dB)
  volumePercent: number;  // 音量百分比 (0 - 100)
  isSilence: boolean;     // 是否静音（RMS < 0.001）
  timestamp: number;      // Unix 时间戳（毫秒）
}
```

**示例 1：实时音量监控**

```javascript
const capture = new AudioCapture({ processId: 0 });

// 启用统计（每 500ms 触发一次）
capture.enableStats({ interval: 500 });

capture.on('stats', (stats) => {
  // 音量条可视化
  const volumeBar = '█'.repeat(Math.floor(stats.volumePercent / 2));
  const emptyBar = '░'.repeat(50 - Math.floor(stats.volumePercent / 2));
  
  console.log(`Volume: ${volumeBar}${emptyBar} ${stats.volumePercent.toFixed(1)}%`);
  console.log(`Peak: ${stats.peak.toFixed(4)}, RMS: ${stats.rms.toFixed(4)}, dB: ${stats.db.toFixed(2)}`);
  console.log(`Silence: ${stats.isSilence ? '🔇' : '🔊'}`);
});

await capture.start();
```

**示例 2：智能静音检测**

```javascript
let lastStatus = null;

capture.enableStats({ interval: 300 });

capture.on('stats', (stats) => {
  if (stats.isSilence) {
    if (lastStatus !== 'silence') {
      console.log('🔇 检测到静音');
      lastStatus = 'silence';
    }
  } else {
    if (lastStatus !== 'audio') {
      console.log(`🔊 检测到音频 (Volume: ${stats.volumePercent.toFixed(1)}%)`);
      lastStatus = 'audio';
    }
  }
});
```

**示例 3：音量阈值告警**

```javascript
const VOLUME_THRESHOLD = 20; // 20%
const DB_THRESHOLD = -30;    // -30 dB

capture.enableStats({ interval: 500 });

capture.on('stats', (stats) => {
  if (stats.volumePercent > VOLUME_THRESHOLD) {
    console.log(`⚠️  音量过高！(${stats.volumePercent.toFixed(1)}% > ${VOLUME_THRESHOLD}%)`);
  }
  
  if (stats.db > DB_THRESHOLD) {
    console.log(`⚠️  分贝过高！(${stats.db.toFixed(2)} dB > ${DB_THRESHOLD} dB)`);
  }
});
```

**详细说明：**

- 只有调用 `enableStats()` 后才会触发此事件
- 触发频率由 `interval` 参数控制（默认 500ms）
- 统计基于多个音频 chunk 的累积数据
- 每次触发都会包含最新的时间戳
- 性能开销：< 1% CPU（默认配置）

**统计指标说明：**

- **Peak（峰值）**: 音频片段的最大绝对振幅，范围 0.0-1.0
  - 用于检测音频裁剪（clipping）
  - 接近 1.0 表示音频可能失真
  
- **RMS（均方根）**: 音频的平均能量，范围 0.0-1.0
  - 更接近人耳感知的音量
  - 适用于音量监控
  
- **dB（分贝）**: 对数刻度的音量表示，范围 -∞ to 0 dB
  - 更符合专业音频标准
  - 0 dB 表示最大音量
  - -60 dB 接近静音
  
- **volumePercent（音量百分比）**: 线性刻度的音量，范围 0-100
  - 最直观的音量表示
  - 适用于用户界面展示
  
- **isSilence（静音检测）**: 布尔值，RMS < 0.001 时为 true
  - 用于智能静音检测
  - 阈值基于实践经验调优
  
- **timestamp（时间戳）**: Unix 毫秒时间戳
  - 可用于事件排序和时间同步

---

## MicrophoneCapture 类

**v2.9.0 新增** 🎙️

`MicrophoneCapture` 类提供麦克风音频捕获功能，继承自 `AudioCapture` 类，具有相同的 API 设计。

### 核心特性

- **设备级捕获**: 直接录制麦克风输入（WASAPI 直接捕获模式）
- **设备选择**: 支持 `deviceId` 参数选择特定麦克风
- **音频效果**: 集成 RNNoise 降噪 + AGC + EQ
- **零学习成本**: 与 `AudioCapture` 相同的 API 设计

### 构造函数

#### `new MicrophoneCapture(config)`

创建一个新的麦克风捕获实例。

**参数：**

- `config` (Object) - 配置对象

**配置选项：**

```typescript
interface MicrophoneCaptureConfig {
  deviceId?: string;           // 可选：麦克风设备 ID
  sampleRate?: number;         // 默认 48000 Hz
  channels?: number;           // 默认 2 (立体声)
  
  // 音频效果（可选）
  denoise?: boolean;           // RNNoise 降噪
  denoiseStrength?: number;    // 降噪强度 0-1
  
  agc?: boolean;               // 自动增益控制
  agcTarget?: number;          // 目标音量 (dB)
  
  eq?: boolean;                // 均衡器
  eqLowGain?: number;          // 低频增益 (dB)
  eqMidGain?: number;          // 中频增益 (dB)
  eqHighGain?: number;         // 高频增益 (dB)
  
  // Buffer Pool（可选）
  useExternalBuffer?: boolean;
  bufferPoolStrategy?: 'fixed' | 'adaptive';
  bufferPoolSize?: number;
}
```

**返回值：**

- `MicrophoneCapture` - 麦克风捕获实例

**抛出错误：**

- `TypeError` - 当配置参数无效时
- `AudioError` - 当初始化失败时

**示例 1 - 基本用法**：

```javascript
const { MicrophoneCapture } = require('node-windows-audio-capture');

// 使用默认麦克风
const mic = new MicrophoneCapture();

mic.on('data', (buffer) => {
  console.log('Microphone audio:', buffer.length, 'bytes');
});

await mic.start();
```

**示例 2 - 设备选择**：

```javascript
const { MicrophoneCapture, listDevices } = require('node-windows-audio-capture');

// 列出所有音频设备
const devices = await listDevices();

// 筛选麦克风设备（非 Loopback）
const microphones = devices.filter(d => !d.isLoopback);

console.log('可用麦克风:');
microphones.forEach(mic => {
  console.log(`  ${mic.name} (${mic.id})`);
});

// 选择特定麦克风
const mic = new MicrophoneCapture({
  deviceId: microphones[0].id
});
```

**示例 3 - 完整配置**：

```javascript
const mic = new MicrophoneCapture({
  deviceId: '{0.0.0.00000000}.{12345678-1234-1234-1234-123456789012}',
  sampleRate: 48000,
  channels: 2,
  
  // RNNoise 降噪
  denoise: true,
  denoiseStrength: 0.8,  // 0-1, 默认 0.5
  
  // 自动增益控制
  agc: true,
  agcTarget: -16,        // dB, 默认 -16dB
  agcMaxGain: 30,        // dB, 默认 30dB
  
  // 3-Band 均衡器
  eq: true,
  eqLowGain: -3,         // 低频 -3dB
  eqMidGain: 5,          // 中频 +5dB
  eqHighGain: 2,         // 高频 +2dB
  
  // Buffer Pool
  useExternalBuffer: true,
  bufferPoolStrategy: 'adaptive',
  bufferPoolSize: 50
});

mic.on('data', (buffer) => {
  // 处理降噪 + 增益 + 均衡后的音频
});

await mic.start();
```

**详细说明：**

- `MicrophoneCapture` 内部使用 `AudioCapture` 类实现
- 底层使用 WASAPI 直接捕获模式（`isLoopback = false`）
- 默认捕获系统默认麦克风，可通过 `deviceId` 指定
- 支持所有 `AudioCapture` 的音频效果（降噪、AGC、EQ）

---

### 实例方法

`MicrophoneCapture` 继承所有 `AudioCapture` 的方法：

- `start()` - 启动麦克风捕获
- `stop()` - 停止捕获
- `setDenoiseEnabled(enabled)` - 控制降噪开关
- `setAGCEnabled(enabled)` - 控制 AGC 开关
- `setEQEnabled(enabled)` - 控制均衡器开关
- `getDenoiseStats()` - 获取降噪统计
- `getPoolStats()` - 获取 Buffer Pool 统计

详见 [AudioCapture 实例方法](#实例方法) 章节。

**示例：**

```javascript
const mic = new MicrophoneCapture({
  denoise: true,
  agc: true
});

await mic.start();

// 动态控制音频效果
setTimeout(() => {
  mic.setDenoiseEnabled(false);  // 关闭降噪
}, 5000);

// 获取统计信息
setInterval(() => {
  const denoiseStats = mic.getDenoiseStats();
  console.log(`VAD Probability: ${denoiseStats.vadProbability * 100}%`);
}, 1000);
```

---

### 事件

`MicrophoneCapture` 支持所有 `AudioCapture` 的事件：

- `'data'` - 接收麦克风音频数据
- `'error'` - 错误事件
- `'end'` - 捕获结束

详见 [AudioCapture 事件](#事件) 章节。

**示例：**

```javascript
const mic = new MicrophoneCapture();

mic.on('data', (buffer) => {
  console.log('Microphone data:', buffer.length, 'bytes');
});

mic.on('error', (error) => {
  console.error('Microphone error:', error.message);
});

mic.on('end', () => {
  console.log('Microphone capture ended');
});

await mic.start();
```

---

### 与 AudioCapture 的区别

| 特性 | AudioCapture | MicrophoneCapture |
|------|-------------|-------------------|
| **音频源** | 系统音频（应用播放） | 麦克风输入 |
| **WASAPI 模式** | Loopback（环回捕获） | Direct Capture（直接捕获） |
| **`processId` 参数** | 必需（指定应用） | 不需要（设备级） |
| **`deviceId` 参数** | 可选（音频设备） | 可选（麦克风设备） |
| **音频效果** | 支持（降噪/AGC/EQ） | 支持（相同） |
| **适用场景** | 录屏、翻译、监控 | 语音识别、会议、播客 |

---

### 使用场景

#### 1. 语音识别 (ASR)

```javascript
const { MicrophoneCapture, AudioProcessingPipeline } = require('node-windows-audio-capture');

const mic = new MicrophoneCapture({
  denoise: true,
  agc: true
});

// 转换为 ASR 格式（Int16, 16kHz, Mono）
const asrPipeline = new AudioProcessingPipeline('china-asr');

mic.on('data', (buffer) => {
  const asrData = asrPipeline.process(buffer);
  sendToASR(asrData);  // 发送到百度/腾讯/阿里 ASR
});

await mic.start();
```

#### 2. 实时翻译

```javascript
const mic = new MicrophoneCapture({
  denoise: true,
  agc: true,
  eq: true
});

const pipeline = new AudioProcessingPipeline('openai-whisper');

mic.on('data', async (buffer) => {
  const asrData = pipeline.process(buffer);
  const text = await whisperAPI.recognize(asrData);
  const translation = await translateAPI.translate(text);
  console.log('翻译:', translation);
});

await mic.start();
```

#### 3. 会议录音

```javascript
const fs = require('fs');
const mic = new MicrophoneCapture({
  denoise: true,
  denoiseStrength: 0.8,
  agc: true,
  agcTarget: -16
});

const output = fs.createWriteStream('meeting-recording.pcm');
mic.pipe(output);

await mic.start();
console.log('会议录音中...');
```

#### 4. 播客录制

```javascript
const mic = new MicrophoneCapture({
  denoise: true,
  agc: true,
  eq: true,
  eqLowGain: -3,   // 减少低频噪音
  eqMidGain: 5,    // 增强语音频段
  eqHighGain: 2    // 提升清晰度
});

mic.on('data', (buffer) => {
  // 保存高质量音频
  saveToFile(buffer);
});

await mic.start();
```

---

### 注意事项

#### 1. 设备选择

- **默认麦克风**: 不指定 `deviceId` 时，使用系统默认麦克风
- **设备列表**: 使用 `listDevices()` 获取所有设备，筛选 `isLoopback: false`
- **设备 ID**: 设备 ID 格式为 `{...}.{...}`，需完整复制

#### 2. 物理录音限制

- **空气传播**: 麦克风录制手机扬声器音频时，音质受物理环境影响
- **改善建议**:
  - 使用外置 USB 麦克风（更高灵敏度）
  - 使用音频线直连（手机 3.5mm → 电脑线路输入）
  - 减少环境噪音，靠近音源

#### 3. 权限要求

- **Windows 10/11**: 需要麦克风访问权限
- **隐私设置**: 确保"允许应用访问麦克风"已启用
- **WASAPI**: 设备必须支持 WASAPI 直接捕获模式

#### 4. 音频格式

- **输出格式**: Float32 PCM, 48kHz, 2 channels（默认）
- **ASR 转换**: 需要使用 `AudioProcessingPipeline` 转换为 ASR 格式
- **重采样**: v2.9.0 使用 Sinc 插值，显著提升音质

---

## AudioProcessingPipeline 类

**v2.2.0 引入，v2.9.0 增强**

音频处理管道，用于格式转换和 ASR 预处理。

### v2.9.0 重采样质量提升

**重大改进**: ASR 预设的重采样质量从 `linear` 升级到 `sinc`（Kaiser-windowed Sinc 插值）。

**影响的预设**:
- `china-asr` (百度/腾讯/阿里)
- `openai-whisper`
- `azure`
- `google`

**效果**:
- ✅ 48kHz → 16kHz 降采样音质显著改善
- ✅ 频域保持更好，混叠失真最小化
- ✅ 提高 ASR 识别准确率
- ✅ 性能开销 < 0.2ms

### 使用示例

```javascript
const { AudioProcessingPipeline } = require('node-windows-audio-capture');

// 使用 ASR 预设（自动 Sinc 插值）
const pipeline = new AudioProcessingPipeline('china-asr');

// 自定义配置
const customPipeline = new AudioProcessingPipeline({
  targetSampleRate: 16000,
  targetChannels: 1,
  targetFormat: 'int16',
  resamplingQuality: 'sinc'  // v2.9.0: 'simple' | 'linear' | 'sinc'
});

// 处理音频
const asrData = pipeline.process(microphoneBuffer);
```

详见 [AudioProcessingPipeline 文档](https://github.com/wujelly701/node-windows-audio-capture/blob/main/lib/audio-processing-pipeline.js)。

---

## 配置选项

### AudioCaptureConfig

**完整配置对象：**

```typescript
interface AudioCaptureConfig {
  processId: number;
  loopbackMode?: boolean;
  sampleRate?: number;
  channels?: number;
  // ⚠️ 注意: WASAPI 始终输出 Float32 格式
  // 如需 Int16 格式，请使用 AudioProcessingPipeline 进行转换
}
```

> **⚠️ 重要说明**: AudioCapture 不支持 `format` 参数。WASAPI 音频引擎始终输出 **Float32** 格式的音频数据。如果需要其他格式（如 Int16），请使用 `AudioProcessingPipeline` 进行后处理转换。详见 [格式转换](#格式转换) 章节。

### 配置选项详细说明

| 选项 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `processId` | `number` | ✓ | - | 目标进程的 ID |
| `loopbackMode` | `boolean` | ✗ | `true` | 是否启用 Loopback 模式 |
| `sampleRate` | `number` | ✗ | `48000` | 采样率（Hz）* |
| `channels` | `number` | ✗ | `2` | 声道数* |

\* WASAPI 音频格式固定为 **Float32**，无法通过配置修改。

---

#### `processId`

**类型：** `number`

**必需：** ✓

**说明：** 目标进程的进程 ID。

**有效范围：** 大于 0 的整数

**示例：**

```javascript
// 使用已知的进程 ID
const capture = new AudioCapture({
  processId: 1234
});

// 或从进程列表中获取
const processes = await AudioCapture.getProcesses();
const targetProcess = processes.find(p => p.name.includes('chrome'));
if (targetProcess) {
  const capture = new AudioCapture({
    processId: targetProcess.processId
  });
}
```

**注意事项：**

- 进程必须存在且正在运行
- 某些系统进程可能需要管理员权限
- 进程退出后捕获会自动停止

---

#### `loopbackMode`

**类型：** `boolean`

**必需：** ✗

**默认值：** `true`

**说明：** 是否启用 Loopback 模式（捕获播放音频）。

**可选值：**

- `true` - 捕获进程播放的音频（Loopback）
- `false` - 捕获进程录制的音频（麦克风输入）

**示例：**

```javascript
// Loopback 模式（默认）- 捕获播放音频
const capture1 = new AudioCapture({
  processId: 1234,
  loopbackMode: true
});

// 录制模式 - 捕获麦克风输入
const capture2 = new AudioCapture({
  processId: 1234,
  loopbackMode: false
});
```

**使用场景：**

- `true`: 捕获音乐播放器、视频播放器、游戏等的音频输出
- `false`: 捕获录音软件、语音通话等的麦克风输入

---

#### `sampleRate`

**类型：** `number`

**必需：** ✗

**默认值：** `48000`

**说明：** 音频采样率（每秒样本数）。

**常用值：**

- `44100` - CD 音质
- `48000` - 专业音频标准（推荐）
- `96000` - 高分辨率音频
- `192000` - 超高分辨率音频

**示例：**

```javascript
// CD 音质
const capture = new AudioCapture({
  processId: 1234,
  sampleRate: 44100
});

// 高分辨率
const capture2 = new AudioCapture({
  processId: 1234,
  sampleRate: 96000
});
```

**注意事项：**

- 更高的采样率会增加数据量和 CPU 使用率
- 系统会尝试重采样以匹配指定的采样率
- 建议使用标准采样率

---

#### `channels`

**类型：** `number`

**必需：** ✗

**默认值：** `2`

**说明：** 音频声道数。

**常用值：**

- `1` - 单声道
- `2` - 立体声（推荐）
- `6` - 5.1 环绕声
- `8` - 7.1 环绕声

**示例：**

```javascript
// 单声道
const capture = new AudioCapture({
  processId: 1234,
  channels: 1
});

// 立体声
const capture2 = new AudioCapture({
  processId: 1234,
  channels: 2
});
```

**数据布局：**

- 多声道数据交错存储：`[L0, R0, L1, R1, ...]`
- 每个样本占用 4 字节（Float32 格式）

---

## 格式转换

### ⚠️ 重要：WASAPI 固定输出格式

`AudioCapture` 始终输出 **Float32** 格式的音频数据。这是 Windows WASAPI 音频引擎的固定行为，无法通过配置修改。

**WASAPI 默认格式：**
- **数据类型**: Float32 (32-bit 浮点)
- **取值范围**: -1.0 ~ 1.0
- **采样率**: 48000 Hz (可配置)
- **声道数**: 2 (Stereo, 可配置)

### 使用 AudioProcessingPipeline 转换格式

如果需要其他格式（如 Int16），请使用内置的 `AudioProcessingPipeline`：

```javascript
const { AudioCapture } = require('node-windows-audio-capture');
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

// 创建捕获实例（Float32, 48kHz, Stereo）
const capture = new AudioCapture({ processId: 1234 });

// 创建格式转换管道（转换为 Int16, 16kHz, Mono）
const pipeline = new AudioProcessingPipeline('china-asr', {
  quality: 'sinc'  // 推荐：最高质量的重采样算法
});

// 监听并转换数据
capture.on('data', (event) => {
  // 原始数据：Float32, 48kHz, Stereo
  const float32Buffer = event.buffer;
  
  // 转换后：Int16, 16kHz, Mono
  const int16Buffer = pipeline.process(float32Buffer);
  
  // 使用转换后的数据
  sendToASR(int16Buffer);
});

await capture.start();
```

### 可用的预设配置

| 预设名称 | 目标格式 | 适用场景 |
|----------|----------|----------|
| `'china-asr'` | Int16, 16kHz, Mono | 阿里云/百度/腾讯 ASR |
| `'openai-whisper'` | Float32, 16kHz, Mono | OpenAI Whisper |
| `'azure'` | Int16, 16kHz, Mono | Azure Speech |
| `'google'` | Int16, 16kHz, Mono | Google Cloud Speech |

### 重采样质量选项

```javascript
const pipeline = new AudioProcessingPipeline('china-asr', {
  quality: 'sinc'    // 'simple' | 'linear' | 'sinc'
});
```

| Quality | 算法 | 质量 | CPU占用 | 推荐场景 |
|---------|------|------|---------|----------|
| `'simple'` | 直接采样删除 | 最低 | ~0.5% | 实时预览 |
| `'linear'` | 线性插值 | 中等 | ~2% | 一般应用 |
| `'sinc'` | Kaiser-Sinc 插值 | **最高** | ~5% | **生产环境（推荐）** |

> **推荐**: 使用 `quality: 'sinc'` 获得最佳音质。v2.5.0 优化后性能提升 50%，CPU 占用仅 ~5%。

### 自定义转换配置

```javascript
const pipeline = new AudioProcessingPipeline({
  targetSampleRate: 16000,
  targetChannels: 1,
  targetFormat: 'int16',
  resamplingQuality: 'sinc'
});
```

详见 [AudioProcessingPipeline API](#audioprocessingpipeline)。

---

## 错误处理

### AudioError 类

**继承：** `Error`

**属性：**

```typescript
class AudioError extends Error {
  code: string;      // 错误码
  message: string;   // 错误消息
  name: 'AudioError'; // 固定为 'AudioError'
}
```

### 错误码列表

#### 进程相关错误

| 错误码 | 值 | 说明 | 可恢复 |
|--------|-----|------|--------|
| `PROCESS_NOT_FOUND` | `'PROCESS_NOT_FOUND'` | 进程不存在 | ✗ |
| `PROCESS_TERMINATED` | `'PROCESS_TERMINATED'` | 进程已终止 | ✗ |
| `PROCESS_ACCESS_DENIED` | `'PROCESS_ACCESS_DENIED'` | 无法访问进程 | ✗ |

#### 设备相关错误

| 错误码 | 值 | 说明 | 可恢复 |
|--------|-----|------|--------|
| `DEVICE_NOT_FOUND` | `'DEVICE_NOT_FOUND'` | 音频设备不可用 | ✓ |
| `DEVICE_DISCONNECTED` | `'DEVICE_DISCONNECTED'` | 设备已断开 | ✓ |
| `DEVICE_BUSY` | `'DEVICE_BUSY'` | 设备被占用 | ✓ |

#### 操作相关错误

| 错误码 | 值 | 说明 | 可恢复 |
|--------|-----|------|--------|
| `INITIALIZATION_FAILED` | `'INITIALIZATION_FAILED'` | 初始化失败 | ✓ |
| `CAPTURE_FAILED` | `'CAPTURE_FAILED'` | 捕获失败 | ✓ |
| `INVALID_STATE` | `'INVALID_STATE'` | 无效状态 | ✓ |
| `ACCESS_DENIED` | `'ACCESS_DENIED'` | 权限不足 | ✗ |

#### 配置相关错误

| 错误码 | 值 | 说明 | 可恢复 |
|--------|-----|------|--------|
| `INVALID_CONFIG` | `'INVALID_CONFIG'` | 配置无效 | ✗ |
| `INVALID_SAMPLE_RATE` | `'INVALID_SAMPLE_RATE'` | 采样率无效 | ✗ |
| `INVALID_CHANNELS` | `'INVALID_CHANNELS'` | 声道数无效 | ✗ |

### 错误处理示例

```javascript
const { AudioCapture, ERROR_CODES } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 1234 });

capture.on('error', async (error) => {
  console.error(`错误: ${error.message} (${error.code})`);
  
  // 可恢复的错误 - 尝试重连
  const recoverableErrors = [
    ERROR_CODES.DEVICE_NOT_FOUND,
    ERROR_CODES.DEVICE_DISCONNECTED,
    ERROR_CODES.INITIALIZATION_FAILED,
    ERROR_CODES.INVALID_STATE
  ];
  
  if (recoverableErrors.includes(error.code)) {
    console.log('尝试恢复...');
    await new Promise(r => setTimeout(r, 2000));
    try {
      await capture.start();
      console.log('恢复成功');
    } catch (e) {
      console.error('恢复失败:', e.message);
    }
  } else {
    console.log('不可恢复的错误，停止捕获');
    capture.stop();
  }
});
```

---

## 类型定义

### TypeScript 类型定义

```typescript
// 配置接口
interface AudioCaptureConfig {
  processId: number;
  loopbackMode?: boolean;
  sampleRate?: number;
  channels?: number;
  format?: 'float32' | 'int16';
}

// 设备接口
interface Device {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  type: 'render' | 'capture';
}

// 进程接口
interface Process {
  processId: number;
  name: string;
  executablePath?: string;
}

// 错误类
declare class AudioError extends Error {
  code: string;
  name: 'AudioError';
}

// AudioCapture 类
declare class AudioCapture extends Readable {
  constructor(config: AudioCaptureConfig);
  start(): Promise<void>;
  stop(): void;
  static getDevices(): Promise<Device[]>;
  static getProcesses(): Promise<Process[]>;
  
  // 事件
  on(event: 'data', listener: (chunk: Buffer) => void): this;
  on(event: 'error', listener: (error: AudioError) => void): this;
  on(event: 'end', listener: () => void): this;
}

// 错误码常量
declare const ERROR_CODES: {
  PROCESS_NOT_FOUND: string;
  PROCESS_TERMINATED: string;
  DEVICE_NOT_FOUND: string;
  DEVICE_DISCONNECTED: string;
  INITIALIZATION_FAILED: string;
  CAPTURE_FAILED: string;
  INVALID_STATE: string;
  ACCESS_DENIED: string;
  INVALID_CONFIG: string;
  // ... 更多错误码
};

// 模块导出
export { AudioCapture, AudioError, ERROR_CODES };
export default AudioCapture;
```

---

## 完整使用示例

### 示例 1：完整的错误处理

```javascript
const { AudioCapture, ERROR_CODES } = require('node-windows-audio-capture');
const fs = require('fs');

class AudioCaptureManager {
  constructor(processId) {
    this.processId = processId;
    this.capture = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }
  
  async start() {
    this.capture = new AudioCapture({
      processId: this.processId,
      sampleRate: 48000,
      channels: 2
    });
    
    const writeStream = fs.createWriteStream('output.raw');
    
    this.capture.on('data', (chunk) => {
      writeStream.write(chunk);
    });
    
    this.capture.on('error', async (error) => {
      console.error('错误:', error.message);
      
      if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`重试 ${this.retryCount}/${this.maxRetries}...`);
        await new Promise(r => setTimeout(r, 2000));
        await this.capture.start();
      } else {
        this.stop();
      }
    });
    
    this.capture.on('end', () => {
      writeStream.end();
      console.log('捕获结束');
    });
    
    await this.capture.start();
  }
  
  shouldRetry(error) {
    const retryableCodes = [
      ERROR_CODES.DEVICE_DISCONNECTED,
      ERROR_CODES.INITIALIZATION_FAILED
    ];
    return retryableCodes.includes(error.code);
  }
  
  stop() {
    if (this.capture) {
      this.capture.stop();
    }
  }
}

// 使用
const manager = new AudioCaptureManager(1234);
manager.start();
```

### 示例 2：音频分析

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 1234 });

// 音量分析
let volumeSamples = [];

capture.on('data', (buffer) => {
  // 计算 RMS 音量
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 4) {
    const sample = buffer.readFloatLE(i);
    sumSquares += sample * sample;
  }
  
  const rms = Math.sqrt(sumSquares / (buffer.length / 4));
  const db = 20 * Math.log10(rms);
  
  volumeSamples.push(rms);
  
  // 每秒输出一次统计
  if (volumeSamples.length >= 100) {
    const avg = volumeSamples.reduce((a, b) => a + b) / volumeSamples.length;
    const max = Math.max(...volumeSamples);
    console.log(`平均音量: ${(20 * Math.log10(avg)).toFixed(1)} dB`);
    console.log(`峰值音量: ${(20 * Math.log10(max)).toFixed(1)} dB`);
    volumeSamples = [];
  }
});

await capture.start();
```

---

## v2.1: 音频会话静音控制

v2.1 版本引入了动态音频会话静音控制功能，允许你选择性地静音或取消静音特定进程的音频。这对于只捕获特定应用音频非常有用（如游戏音频录制、语音通话录音等）。

### 核心概念

1. **静音其他进程**: 启用后，除了目标进程（processId）和白名单中的进程外，所有其他音频会话都会被静音
2. **白名单（Allow List）**: 不会被静音的进程列表，即使启用了"静音其他进程"
3. **黑名单（Block List）**: 会被强制静音的进程列表，无论是否启用"静音其他进程"

### `setMuteOtherProcesses(enabled)`

启用或禁用"静音其他进程"功能。

**签名：**

```typescript
setMuteOtherProcesses(enabled: boolean): void
```

**参数：**

- `enabled` (boolean) - true 启用，false 禁用

**抛出错误：**

- `TypeError` - 参数类型错误
- `Error` - AudioProcessor 未初始化

**示例：**

```javascript
const capture = new AudioCapture({ processId: 1234 });

// 启用静音其他进程（只捕获 PID 1234 的音频）
capture.setMuteOtherProcesses(true);

await capture.start();
```

---

### `isMutingOtherProcesses()`

获取"静音其他进程"功能的当前状态。

**签名：**

```typescript
isMutingOtherProcesses(): boolean
```

**返回值：**

- `boolean` - 如果启用了静音其他进程则返回 true

**示例：**

```javascript
const isMuting = capture.isMutingOtherProcesses();
console.log('正在静音其他进程:', isMuting);
```

---

### `setAllowList(processIds)`

设置白名单（允许名单）。白名单中的进程不会被静音。

**签名：**

```typescript
setAllowList(processIds: number[]): void
```

**参数：**

- `processIds` (number[]) - 进程 ID 数组

**抛出错误：**

- `TypeError` - 参数不是数组或包含无效的进程 ID
- `Error` - AudioProcessor 未初始化

**示例：**

```javascript
// 只允许 PID 1234 和 5678 的音频通过
capture.setMuteOtherProcesses(true);
capture.setAllowList([1234, 5678]);

// 清空白名单
capture.setAllowList([]);
```

---

### `getAllowList()`

获取当前的白名单（允许名单）。

**签名：**

```typescript
getAllowList(): number[]
```

**返回值：**

- `number[]` - 进程 ID 数组

**示例：**

```javascript
const allowList = capture.getAllowList();
console.log('白名单进程 ID:', allowList);
```

---

### `setBlockList(processIds)`

设置黑名单（屏蔽名单）。黑名单中的进程会被强制静音。

**签名：**

```typescript
setBlockList(processIds: number[]): void
```

**参数：**

- `processIds` (number[]) - 进程 ID 数组

**抛出错误：**

- `TypeError` - 参数不是数组或包含无效的进程 ID
- `Error` - AudioProcessor 未初始化

**示例：**

```javascript
// 屏蔽 PID 999 和 888 的音频
capture.setBlockList([999, 888]);

// 清空黑名单
capture.setBlockList([]);
```

---

### `getBlockList()`

获取当前的黑名单（屏蔽名单）。

**签名：**

```typescript
getBlockList(): number[]
```

**返回值：**

- `number[]` - 进程 ID 数组

**示例：**

```javascript
const blockList = capture.getBlockList();
console.log('黑名单进程 ID:', blockList);
```

---

### 使用场景

**场景 1: 游戏音频录制** - 只捕获游戏音频，屏蔽其他应用

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// 获取游戏进程 ID（例如通过进程名查找）
const processes = await AudioCapture.getProcesses();
const gamePID = processes.find(p => p.name === 'game.exe').processId;

const capture = new AudioCapture({ processId: gamePID });

// 启用静音其他进程
capture.setMuteOtherProcesses(true);

// 可选：允许某些特定应用（如语音通话软件）
const discordPID = processes.find(p => p.name === 'Discord.exe')?.processId;
if (discordPID) {
  capture.setAllowList([discordPID]);
}

await capture.start();

// 现在只会捕获游戏和 Discord 的音频
```

**场景 2: 语音通话录音** - 只捕获语音软件，屏蔽背景音乐

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// 获取语音通话软件进程 ID
const processes = await AudioCapture.getProcesses();
const voicePID = processes.find(p => p.name === 'Teams.exe').processId;

const capture = new AudioCapture({ processId: voicePID });

// 启用静音其他进程
capture.setMuteOtherProcesses(true);

// 屏蔽特定的音乐播放器
const musicPIDs = processes
  .filter(p => ['Spotify.exe', 'foobar2000.exe'].includes(p.name))
  .map(p => p.processId);

if (musicPIDs.length > 0) {
  capture.setBlockList(musicPIDs);
}

await capture.start();
```

**场景 3: 系统音频监控** - 捕获所有音频，但排除特定应用

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// processId: 0 表示捕获所有音频
const capture = new AudioCapture({ processId: 0 });

// 不启用"静音其他进程"，但使用黑名单排除某些应用
const processes = await AudioCapture.getProcesses();
const noisyApps = processes
  .filter(p => ['notification.exe', 'update.exe'].includes(p.name))
  .map(p => p.processId);

if (noisyApps.length > 0) {
  capture.setBlockList(noisyApps);
}

await capture.start();
```

**场景 4: 动态切换音频源**

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 0 });

// 初始状态：捕获所有音频
await capture.start();

// 5 秒后：只捕获游戏音频
setTimeout(() => {
  capture.setMuteOtherProcesses(true);
  const gamePID = 1234; // 游戏进程 ID
  capture.setAllowList([gamePID]);
  console.log('切换到游戏音频模式');
}, 5000);

// 10 秒后：恢复捕获所有音频
setTimeout(() => {
  capture.setMuteOtherProcesses(false);
  capture.setAllowList([]);
  console.log('恢复捕获所有音频');
}, 10000);
```

### 注意事项

1. **实时生效**: 所有静音控制方法都会立即生效，无需重启捕获
2. **优先级**: 黑名单优先级 > 白名单优先级 > "静音其他进程"设置
3. **目标进程**: 构造函数中指定的 `processId` 始终会被捕获（如果不为 0）
4. **性能影响**: 静音控制操作的性能开销极小（< 0.1% CPU）
5. **进程有效性**: 请确保进程 ID 有效，无效的 ID 会被忽略
6. **Windows 7+**: 此功能需要 Windows 7 或更高版本（WASAPI 会话控制）

---

## v2.6: Buffer Pool (零拷贝内存优化)

### `getPoolStats()`

获取 Buffer Pool 的统计信息（仅在零拷贝模式下有效）。

**签名：**

```typescript
getPoolStats(): BufferPoolStats | null
```

**返回值：**

- `BufferPoolStats` - 统计信息对象（如果启用零拷贝模式）
- `null` - 如果未使用零拷贝模式

**BufferPoolStats 接口：**

```typescript
interface BufferPoolStats {
  poolHits: number;              // 从池中成功获取的次数
  poolMisses: number;            // 池为空需要动态分配的次数
  dynamicAllocations: number;    // 动态分配的总次数
  currentPoolSize: number;       // 当前池大小
  maxPoolSize: number;           // 最大池大小
  hitRate: number;               // 命中率百分比 (0-100)
  strategy?: string;             // v2.7+: 'fixed' | 'adaptive'
  evaluations?: number;          // v2.7+: 自适应策略评估次数
  growths?: number;              // v2.7+: 池扩容次数
  shrinks?: number;              // v2.7+: 池缩小次数
}
```

**示例：**

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// 启用零拷贝模式
const capture = new AudioCapture({
  processId: 0,
  useExternalBuffer: true,         // v2.6: 启用零拷贝
  bufferPoolStrategy: 'adaptive',  // v2.7: 自适应池策略
  bufferPoolSize: 50,              // 初始池大小
  bufferPoolMin: 50,               // 最小池大小
  bufferPoolMax: 200               // 最大池大小
});

await capture.start();

// 定期监控池性能
setInterval(() => {
  const stats = capture.getPoolStats();
  
  if (stats) {
    console.log('📊 Buffer Pool 统计:');
    console.log(`  命中率: ${stats.hitRate.toFixed(2)}%`);
    console.log(`  池命中: ${stats.poolHits.toLocaleString()}`);
    console.log(`  池未命中: ${stats.poolMisses.toLocaleString()}`);
    console.log(`  当前池大小: ${stats.currentPoolSize}`);
    console.log(`  最大池大小: ${stats.maxPoolSize}`);
    
    // v2.7+ 自适应统计
    if (stats.strategy === 'adaptive') {
      console.log(`  策略: 自适应`);
      console.log(`  评估次数: ${stats.evaluations}`);
      console.log(`  扩容次数: ${stats.growths}`);
      console.log(`  缩小次数: ${stats.shrinks}`);
    }
    
    // 性能警告
    if (stats.hitRate < 1.0) {
      console.warn('⚠️  警告: 命中率过低，考虑增加池大小');
    }
    if (stats.poolMisses > stats.poolHits * 0.5) {
      console.warn('⚠️  警告: 未命中率过高，建议使用自适应策略');
    }
  } else {
    console.log('❌ 零拷贝模式未启用');
  }
}, 10000);  // 每 10 秒检查一次
```

**使用场景：**

**1. 固定池策略（v2.6）** - 稳定负载：
```javascript
const capture = new AudioCapture({
  processId: 0,
  useExternalBuffer: true,
  bufferPoolStrategy: 'fixed',  // 固定大小
  bufferPoolSize: 100           // 固定 100 个 buffer
});

// 适用场景: 稳定的音频捕获，负载可预测
```

**2. 自适应池策略（v2.7）** - 动态负载：
```javascript
const capture = new AudioCapture({
  processId: 0,
  useExternalBuffer: true,
  bufferPoolStrategy: 'adaptive',  // 自适应调整
  bufferPoolSize: 50,              // 初始 50 个
  bufferPoolMin: 50,               // 最少 50 个
  bufferPoolMax: 200               // 最多 200 个
});

// 适用场景: 负载波动大，自动优化内存使用
// 效果: 命中率从 0.67% 提升到 3.14%（371.6% 提升！）
```

**性能指标：**

| 策略 | 池大小 | 命中率 | 池命中次数 | 内存占用 | 场景 |
|------|--------|--------|-----------|----------|------|
| 固定 (10) | 10 | 0.67% | 10 | 40 KB | 低负载 |
| 固定 (100) | 100 | ~2% | 100+ | 400 KB | 中等负载 |
| 自适应 (50-200) | 54 (动态) | 3.14% | 110 | 216 KB | **推荐** ⚡ |

**注意事项：**

1. **零拷贝模式必需**：`useExternalBuffer: true` 必须开启
2. **实时监控**：建议每 10 秒检查一次统计信息
3. **命中率目标**：
   - < 1%：池太小，增加 `bufferPoolSize` 或使用自适应策略
   - 1-5%：良好范围
   - \> 5%：可能池太大，浪费内存
4. **自适应策略**（v2.7+）：
   - 每 10 秒评估一次
   - 命中率 < 2%：扩容 20%
   - 命中率 > 5%：缩小 10%
   - 自动在 min-max 范围内调整

**相关 API：**
- `useExternalBuffer` (v2.6) - 启用零拷贝模式
- `bufferPoolStrategy` (v2.7) - 'fixed' | 'adaptive'
- `bufferPoolSize` - 初始/固定池大小
- `bufferPoolMin` (v2.7) - 自适应最小值
- `bufferPoolMax` (v2.7) - 自适应最大值

---

## v2.7: 音频降噪 (RNNoise)

### `setDenoiseEnabled(enabled)`

启用或禁用 AI 降噪功能（基于 RNNoise）。

**签名：**

```typescript
setDenoiseEnabled(enabled: boolean): void
```

**参数：**

- `enabled` (boolean) - true 启用降噪，false 禁用

**抛出错误：**

- `TypeError` - 参数类型错误
- `Error` - 降噪处理器初始化失败

**示例：**

```javascript
const capture = new AudioCapture({ processId: 0 });

// 启用降噪
capture.setDenoiseEnabled(true);

// 或在构造时启用
const captureWithDenoise = new AudioCapture({
  processId: 0,
  effects: { denoise: true }
});
```

**详细说明：**

- 使用 RNNoise 深度学习算法进行实时降噪
- 典型降噪效果：15-25 dB
- CPU 开销：3-5%
- 延迟：< 10ms（480 samples @ 48kHz）
- 适用于去除背景噪音、键盘声、风扇声等

---

### `getDenoiseEnabled()`

获取当前降噪状态。

**签名：**

```typescript
getDenoiseEnabled(): boolean
```

**返回值：**

- `boolean` - true 如果降噪已启用

**示例：**

```javascript
if (capture.getDenoiseEnabled()) {
  console.log('降噪已启用');
}
```

---

### `getDenoiseStats()`

获取降噪处理统计信息。

**签名：**

```typescript
getDenoiseStats(): DenoiseStats | null
```

**返回值：**

- `DenoiseStats` - 统计信息对象
- `null` - 如果降噪未启用

**DenoiseStats 接口：**

```typescript
interface DenoiseStats {
  framesProcessed: number;    // 已处理的音频帧数
  vadProbability: number;     // 语音活动检测概率 (0.0-1.0)
  frameSize: number;          // 帧大小（固定 480）
  enabled: boolean;           // 当前状态
}
```

**示例：**

```javascript
capture.setDenoiseEnabled(true);

// 定期检查统计信息
setInterval(() => {
  const stats = capture.getDenoiseStats();
  if (stats) {
    console.log(`已处理: ${stats.framesProcessed} 帧`);
    console.log(`语音概率: ${(stats.vadProbability * 100).toFixed(1)}%`);
    
    if (stats.vadProbability > 0.5) {
      console.log('✓ 检测到语音');
    } else {
      console.log('✗ 噪声/静音');
    }
  }
}, 1000);
```

---

## v2.8: AGC (自动增益控制)

### `setAGCEnabled(enabled)`

启用或禁用 AGC（自动增益控制）。

**签名：**

```typescript
setAGCEnabled(enabled: boolean): void
```

**参数：**

- `enabled` (boolean) - true 启用 AGC，false 禁用

**抛出错误：**

- `TypeError` - 参数类型错误

**示例：**

```javascript
const capture = new AudioCapture({ processId: 0 });

// 启用 AGC
capture.setAGCEnabled(true);
```

**详细说明：**

- AGC 会动态调整音频增益以保持一致的输出电平
- 适用于音量不稳定的音频源
- 实时处理，延迟 < 5ms
- CPU 开销 < 0.5%

---

### `getAGCEnabled()`

获取当前 AGC 状态。

**签名：**

```typescript
getAGCEnabled(): boolean
```

**返回值：**

- `boolean` - true 如果 AGC 已启用

**示例：**

```javascript
if (capture.getAGCEnabled()) {
  console.log('AGC 已启用');
}
```

---

### `setAGCOptions(options)`

设置 AGC 配置参数。

**签名：**

```typescript
setAGCOptions(options: AGCOptions): void
```

**参数：**

- `options` (AGCOptions) - AGC 配置对象

**AGCOptions 接口：**

```typescript
interface AGCOptions {
  targetLevel?: number;    // 目标输出电平 (dBFS), 默认 -20
  maxGain?: number;        // 最大增益 (dB), 默认 20
  minGain?: number;        // 最小增益 (dB), 默认 -10
  attackTime?: number;     // 攻击时间 (ms), 默认 10
  releaseTime?: number;    // 释放时间 (ms), 默认 100
}
```

**参数说明：**

- `targetLevel`: 目标输出电平，单位 dBFS
  - 推荐范围：-30 到 -10 dBFS
  - 典型值：-20 dBFS
  - 值越大，输出越响亮

- `maxGain`: 最大增益，单位 dB
  - 防止过度放大噪声
  - 推荐范围：10-30 dB
  - 典型值：20 dB

- `minGain`: 最小增益，单位 dB
  - 防止过度衰减
  - 推荐范围：-20 到 0 dB
  - 典型值：-10 dB

- `attackTime`: 攻击时间，单位毫秒
  - 增益增加的速度（信号变小时）
  - 较小值：快速响应，但可能不够平滑
  - 典型值：5-20 ms

- `releaseTime`: 释放时间，单位毫秒
  - 增益减少的速度（信号变大时）
  - 较大值：更平滑，但响应较慢
  - 典型值：50-200 ms

**抛出错误：**

- `TypeError` - 参数类型错误
- `Error` - AGC 未初始化

**示例：**

```javascript
// 配置 AGC 参数
capture.setAGCOptions({
  targetLevel: -18,    // 稍微响亮一些
  maxGain: 25,         // 允许更大增益
  minGain: -5,         // 限制衰减
  attackTime: 15,      // 中等攻击速度
  releaseTime: 120     // 平滑释放
});

// 针对不同场景的预设配置

// 1. 音乐播放（平滑、自然）
capture.setAGCOptions({
  targetLevel: -20,
  maxGain: 15,
  minGain: -8,
  attackTime: 20,
  releaseTime: 150
});

// 2. 语音通话（快速响应）
capture.setAGCOptions({
  targetLevel: -18,
  maxGain: 25,
  minGain: -5,
  attackTime: 8,
  releaseTime: 80
});

// 3. 游戏音效（中等响应）
capture.setAGCOptions({
  targetLevel: -20,
  maxGain: 20,
  minGain: -10,
  attackTime: 12,
  releaseTime: 100
});
```

---

### `getAGCOptions()`

获取当前 AGC 配置参数。

**签名：**

```typescript
getAGCOptions(): AGCOptions | null
```

**返回值：**

- `AGCOptions` - 配置对象
- `null` - 如果 AGC 未初始化

**示例：**

```javascript
const options = capture.getAGCOptions();
if (options) {
  console.log('AGC 配置:');
  console.log(`  目标电平: ${options.targetLevel} dBFS`);
  console.log(`  增益范围: ${options.minGain} 到 ${options.maxGain} dB`);
  console.log(`  攻击时间: ${options.attackTime} ms`);
  console.log(`  释放时间: ${options.releaseTime} ms`);
}
```

---

### `getAGCStats()`

获取 AGC 处理统计信息。

**签名：**

```typescript
getAGCStats(): AGCStats | null
```

**返回值：**

- `AGCStats` - 统计信息对象
- `null` - 如果 AGC 未初始化

**AGCStats 接口：**

```typescript
interface AGCStats {
  enabled: boolean;          // AGC 是否启用
  currentGain: number;       // 当前应用的增益 (dB)
  averageLevel: number;      // 平均输入电平 (dBFS)
  rmsLinear: number;         // 当前 RMS 值（线性）
  clipping: boolean;         // 是否检测到削波
  framesProcessed: number;   // 已处理的帧数
}
```

**示例：**

```javascript
capture.setAGCEnabled(true);

// 定期监控 AGC 状态
setInterval(() => {
  const stats = capture.getAGCStats();
  if (stats) {
    console.log(`当前增益: ${stats.currentGain.toFixed(2)} dB`);
    console.log(`输入电平: ${stats.averageLevel.toFixed(2)} dBFS`);
    console.log(`RMS: ${stats.rmsLinear.toFixed(6)}`);
    
    if (stats.clipping) {
      console.warn('⚠️  警告: 检测到削波! 考虑降低 maxGain');
    }
    
    console.log(`已处理: ${stats.framesProcessed.toLocaleString()} 帧`);
  }
}, 1000);
```

**完整示例：AGC + 降噪组合**

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// 创建捕获实例
const capture = new AudioCapture({
  processId: 0,  // 系统音频
  useExternalBuffer: true,
  bufferPoolStrategy: 'adaptive'
});

// 启用降噪
capture.setDenoiseEnabled(true);

// 启用并配置 AGC
capture.setAGCEnabled(true);
capture.setAGCOptions({
  targetLevel: -18,
  maxGain: 25,
  attackTime: 10,
  releaseTime: 100
});

// 监控处理效果
setInterval(() => {
  const denoiseStats = capture.getDenoiseStats();
  const agcStats = capture.getAGCStats();
  
  console.log('\n=== 音频处理状态 ===');
  
  if (denoiseStats) {
    console.log('降噪:');
    console.log(`  语音概率: ${(denoiseStats.vadProbability * 100).toFixed(1)}%`);
    console.log(`  已处理: ${denoiseStats.framesProcessed} 帧`);
  }
  
  if (agcStats) {
    console.log('AGC:');
    console.log(`  当前增益: ${agcStats.currentGain.toFixed(2)} dB`);
    console.log(`  输入电平: ${agcStats.averageLevel.toFixed(2)} dBFS`);
    console.log(`  削波状态: ${agcStats.clipping ? '⚠️  是' : '✓ 否'}`);
  }
}, 2000);

// 开始捕获
await capture.start();
```

---

## v2.8: 3-Band EQ (均衡器)

3-Band EQ 提供三个频段的独立增益控制，用于调整音频的频率响应。

### 频段划分

- **Low (低频)**: < 500 Hz - 控制低音、鼓声、贝斯
- **Mid (中频)**: 500-4000 Hz - 控制人声、吉他、钢琴
- **High (高频)**: > 4000 Hz - 控制高音、细节、空气感

### `setEQEnabled(enabled)`

启用或禁用 EQ 处理。

**参数**:
- `enabled` (boolean): `true` 启用，`false` 禁用

**示例**:
```javascript
// 启用 EQ
capture.setEQEnabled(true);

// 禁用 EQ
capture.setEQEnabled(false);
```

### `getEQEnabled()`

获取 EQ 启用状态。

**返回**: `boolean` - EQ 是否启用

**示例**:
```javascript
const enabled = capture.getEQEnabled();
console.log(`EQ 状态: ${enabled ? '已启用' : '已禁用'}`);
```

### `setEQBandGain(band, gain)`

设置指定频段的增益。

**参数**:
- `band` (string): 频段名称
  - `'low'`: 低频 (< 500 Hz)
  - `'mid'`: 中频 (500-4000 Hz)
  - `'high'`: 高频 (> 4000 Hz)
- `gain` (number): 增益 (dB)，范围 -20 到 +20
  - 正值：增强该频段
  - 负值：衰减该频段
  - 0：不改变

**示例**:
```javascript
// 增强低音 (+6 dB)
capture.setEQBandGain('low', 6);

// 减少中频 (-3 dB)
capture.setEQBandGain('mid', -3);

// 增强高音 (+8 dB)
capture.setEQBandGain('high', 8);
```

### `getEQBandGain(band)`

获取指定频段的增益。

**参数**:
- `band` (string): 频段名称 (`'low'`, `'mid'`, `'high'`)

**返回**: `number` - 增益 (dB)

**示例**:
```javascript
const lowGain = capture.getEQBandGain('low');
console.log(`低频增益: ${lowGain} dB`);
```

### `getEQStats()`

获取 EQ 处理统计信息。

**返回**: `EQStats | null`

**EQStats 接口**:
```typescript
interface EQStats {
  enabled: boolean;        // EQ 是否启用
  lowGain: number;         // 低频增益 (dB)
  midGain: number;         // 中频增益 (dB)
  highGain: number;        // 高频增益 (dB)
  framesProcessed: number; // 已处理的音频帧数
}
```

**示例**:
```javascript
const stats = capture.getEQStats();

if (stats) {
  console.log('EQ 状态:');
  console.log(`  启用: ${stats.enabled}`);
  console.log(`  低频: ${stats.lowGain.toFixed(1)} dB`);
  console.log(`  中频: ${stats.midGain.toFixed(1)} dB`);
  console.log(`  高频: ${stats.highGain.toFixed(1)} dB`);
  console.log(`  已处理: ${stats.framesProcessed} 帧`);
}
```

### EQ 预设场景

#### 场景 1: 流行音乐（增强低音）
```javascript
capture.setEQEnabled(true);
capture.setEQBandGain('low', 6);   // +6 dB 低音
capture.setEQBandGain('mid', 0);   // 0 dB 中频
capture.setEQBandGain('high', 3);  // +3 dB 高音
```

#### 场景 2: 人声优化（播客/语音）
```javascript
capture.setEQEnabled(true);
capture.setEQBandGain('low', -3);  // -3 dB 减少轰鸣
capture.setEQBandGain('mid', 5);   // +5 dB 突出人声
capture.setEQBandGain('high', 2);  // +2 dB 增强清晰度
```

#### 场景 3: 古典音乐（平衡、自然）
```javascript
capture.setEQEnabled(true);
capture.setEQBandGain('low', 2);   // +2 dB 轻微增强
capture.setEQBandGain('mid', 0);   // 0 dB 保持原样
capture.setEQBandGain('high', 4);  // +4 dB 增强高音
```

#### 场景 4: 电子音乐（强烈低音）
```javascript
capture.setEQEnabled(true);
capture.setEQBandGain('low', 10);  // +10 dB 强烈低音
capture.setEQBandGain('mid', -2);  // -2 dB 减少中频
capture.setEQBandGain('high', 6);  // +6 dB 增强高频
```

### EQ 使用注意事项

1. **增益范围**: -20 dB 到 +20 dB，超出范围会自动限制
2. **避免过度增益**: 过大的增益可能导致失真或削波
3. **配合 AGC 使用**: 建议同时启用 AGC 以防止音量过大
4. **实时调整**: EQ 可以在捕获过程中动态调整
5. **默认状态**: EQ 默认禁用，所有频段增益为 0 dB

### 完整示例：音频处理链

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({
  processId: 0
});

// 启动捕获
await capture.start();

// 1. 启用降噪（去除背景噪声）
capture.setDenoiseEnabled(true);

// 2. 启用 AGC（自动调整音量）
capture.setAGCEnabled(true);
capture.setAGCOptions({
  targetLevel: -16.0,  // 目标电平
  maxGain: 15.0        // 最大增益
});

// 3. 启用 EQ（调整频率响应）
capture.setEQEnabled(true);
capture.setEQBandGain('low', 4);   // 增强低音
capture.setEQBandGain('mid', 2);   // 轻微增强中频
capture.setEQBandGain('high', 5);  // 增强高音

// 监控所有处理效果
setInterval(() => {
  const denoiseStats = capture.getDenoiseStats();
  const agcStats = capture.getAGCStats();
  const eqStats = capture.getEQStats();
  
  console.log('\n=== 音频处理状态 ===');
  
  if (denoiseStats) {
    console.log('降噪:');
    console.log(`  语音概率: ${(denoiseStats.vadProbability * 100).toFixed(1)}%`);
  }
  
  if (agcStats) {
    console.log('AGC:');
    console.log(`  当前增益: ${agcStats.currentGain.toFixed(2)} dB`);
    console.log(`  输入电平: ${agcStats.averageLevel.toFixed(2)} dBFS`);
  }
  
  if (eqStats) {
    console.log('EQ:');
    console.log(`  低频: ${eqStats.lowGain.toFixed(1)} dB`);
    console.log(`  中频: ${eqStats.midGain.toFixed(1)} dB`);
    console.log(`  高频: ${eqStats.highGain.toFixed(1)} dB`);
  }
}, 2000);
```

---

## v2.11.0: 频谱分析器 API

### 概述

v2.11.0 引入了原生 C++ FFT（快速傅里叶变换）频谱分析功能，基于高性能的 **kiss_fft** 库实现。相比 JavaScript 的 fft.js，性能提升 **10-50倍**，非常适合实时音频分析、语音检测和音频可视化场景。

**主要特性：**
- ⚡ **高性能 FFT**: 使用 kiss_fft 库，纯 C 实现，延迟 < 1ms
- 📊 **多频段分析**: 默认 7 频段均衡器配置（Sub-bass 到 Brilliance）
- 🎤 **语音检测**: 自动检测 300-3400Hz 人声频率范围
- 📈 **频谱特征**: 质心、主频率、能量分布
- ⚙️ **可配置**: 自定义 FFT 大小、平滑因子、频段、语音阈值

### enableSpectrum(options)

启用原生 C++ FFT 频谱分析。

**签名：**
```typescript
enableSpectrum(options?: SpectrumAnalyzerOptions): boolean
```

**参数：**
- `options` (Object, 可选) - 频谱分析配置
  - `fftSize` (number, 默认 2048) - FFT 大小，必须是 2 的幂（256-8192）
    - ⚠️ **重要**: 必须小于音频缓冲区的样本数（通常 < 960）
    - 建议值: 512 或 1024
  - `interval` (number, 默认 100) - 频谱更新间隔（毫秒），10-1000
  - `smoothing` (number, 默认 0.8) - 平滑因子，0-1
    - 0 = 无平滑（实时响应）
    - 1 = 最大平滑（稳定但延迟高）
  - `frequencyBands` (Array, 可选) - 自定义频段配置
    ```javascript
    [
      { minFreq: 20, maxFreq: 250, name: 'Bass' },
      { minFreq: 250, maxFreq: 2000, name: 'Midrange' },
      // ...
    ]
    ```
  - `voiceDetection` (Object, 可选) - 语音检测配置
    - `threshold` (number, 默认 0.3) - 语音检测阈值，0-1
    - `minFreq` (number, 默认 300) - 最小语音频率（Hz）
    - `maxFreq` (number, 默认 3400) - 最大语音频率（Hz）

**返回值：**
- `boolean` - 是否成功启用

**抛出错误：**
- `Error` - AudioProcessor 未初始化或配置无效

**示例：**

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture();
await capture.start();

// 启用频谱分析（默认配置）
capture.enableSpectrum();

// 自定义配置
capture.enableSpectrum({
  fftSize: 512,        // FFT 大小（必须 < 音频块样本数）
  interval: 100,       // 100ms 更新一次
  smoothing: 0.8,      // 平滑因子
  frequencyBands: [
    { minFreq: 20, maxFreq: 60, name: 'Sub Bass' },
    { minFreq: 60, maxFreq: 250, name: 'Bass' },
    { minFreq: 250, maxFreq: 500, name: 'Low Midrange' },
    { minFreq: 500, maxFreq: 2000, name: 'Midrange' },
    { minFreq: 2000, maxFreq: 4000, name: 'Upper Midrange' },
    { minFreq: 4000, maxFreq: 6000, name: 'Presence' },
    { minFreq: 6000, maxFreq: 20000, name: 'Brilliance' }
  ],
  voiceDetection: {
    threshold: 0.3,    // 语音概率 > 30% 时认为是语音
    minFreq: 300,      // 人声最低频率
    maxFreq: 3400      // 人声最高频率（电话音质范围）
  }
});

// 监听频谱数据
capture.on('spectrum', (data) => {
  console.log('FFT 大小:', data.magnitudes.length * 2);
  console.log('语音概率:', (data.voiceProbability * 100).toFixed(2) + '%');
  console.log('主频率:', data.dominantFrequency.toFixed(0), 'Hz');
  
  // 显示频段能量
  data.bands.forEach(band => {
    console.log(`${band.name}: ${band.db.toFixed(1)} dB`);
  });
});
```

### disableSpectrum()

禁用频谱分析并释放资源。

**签名：**
```typescript
disableSpectrum(): boolean
```

**返回值：**
- `boolean` - 是否成功禁用

**示例：**
```javascript
capture.disableSpectrum();
```

### isSpectrumEnabled()

检查频谱分析是否已启用。

**签名：**
```typescript
isSpectrumEnabled(): boolean
```

**返回值：**
- `boolean` - 是否已启用

**示例：**
```javascript
if (capture.isSpectrumEnabled()) {
  console.log('频谱分析正在运行');
}
```

### setSpectrumConfig(config)

动态更新频谱分析配置（运行时）。

**注意**: 无法更改 `fftSize` 和 `frequencyBands`，需要先禁用后重新启用。

**签名：**
```typescript
setSpectrumConfig(config: Partial<SpectrumAnalyzerOptions>): boolean
```

**参数：**
- `config` (Object) - 要更新的配置项（部分）
  - `smoothing` (number, 可选) - 新的平滑因子
  - `interval` (number, 可选) - 新的更新间隔
  - `voiceDetection` (Object, 可选) - 新的语音检测配置

**返回值：**
- `boolean` - 是否成功更新

**示例：**
```javascript
// 增加平滑度
capture.setSpectrumConfig({ smoothing: 0.95 });

// 提高更新频率
capture.setSpectrumConfig({ interval: 50 });

// 调整语音检测灵敏度
capture.setSpectrumConfig({
  voiceDetection: { threshold: 0.4 }  // 更严格的语音检测
});
```

### getSpectrumConfig()

获取当前频谱分析配置。

**签名：**
```typescript
getSpectrumConfig(): SpectrumConfig | null
```

**返回值：**
- `SpectrumConfig | null` - 当前配置对象，如果未启用则返回 null

**示例：**
```javascript
const config = capture.getSpectrumConfig();
if (config) {
  console.log('FFT 大小:', config.fftSize);
  console.log('采样率:', config.sampleRate, 'Hz');
  console.log('更新间隔:', config.interval, 'ms');
  console.log('平滑因子:', config.smoothing);
  console.log('频段数量:', config.frequencyBands.length);
}
```

### 'spectrum' 事件

当启用频谱分析后，会定期触发此事件（根据 `interval` 配置）。

**事件数据：**
```typescript
interface SpectrumData {
  magnitudes: Float32Array;     // FFT 幅度谱（长度 = fftSize / 2）
  bands: FrequencyBand[];        // 频段分析结果
  voiceProbability: number;      // 语音概率 (0-1)
  spectralCentroid: number;      // 频谱质心 (Hz)
  dominantFrequency: number;     // 主频率 (Hz)
  isVoice: boolean;              // 是否检测到语音
  timestamp: number;             // 时间戳（毫秒）
}

interface FrequencyBand {
  minFreq: number;               // 最小频率 (Hz)
  maxFreq: number;               // 最大频率 (Hz)
  energy: number;                // 线性能量
  db: number;                    // 分贝值
  name: string;                  // 频段名称
}
```

**示例：**

```javascript
capture.on('spectrum', (data) => {
  // 1. 语音检测
  if (data.isVoice) {
    console.log('🎤 检测到语音!');
    console.log('  概率:', (data.voiceProbability * 100).toFixed(2) + '%');
    console.log('  质心:', data.spectralCentroid.toFixed(0), 'Hz');
  }
  
  // 2. 频段能量显示
  console.log('\n频段能量:');
  data.bands.forEach(band => {
    const barLength = Math.max(0, Math.min(40, Math.floor(band.db + 80)));
    const bar = '█'.repeat(barLength);
    console.log(`${band.name.padEnd(18)} ${bar} ${band.db.toFixed(1)} dB`);
  });
  
  // 3. 频谱特征
  console.log('\n频谱特征:');
  console.log('  主频率:', data.dominantFrequency.toFixed(2), 'Hz');
  console.log('  质心:', data.spectralCentroid.toFixed(2), 'Hz');
  console.log('  时间戳:', data.timestamp, 'ms');
});
```

### 完整示例：实时语音检测

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

async function voiceDetectionDemo() {
  const capture = new AudioCapture({
    processId: 0,  // 捕获系统音频
  });
  
  await capture.start();
  console.log('✅ 音频捕获已启动');
  
  // 启用频谱分析（语音检测优化配置）
  capture.enableSpectrum({
    fftSize: 512,
    interval: 100,        // 100ms 检测一次
    smoothing: 0.7,       // 适中的平滑
    voiceDetection: {
      threshold: 0.35,    // 35% 语音概率阈值
      minFreq: 300,
      maxFreq: 3400
    }
  });
  
  let voiceStartTime = null;
  let totalVoiceDuration = 0;
  
  capture.on('spectrum', (data) => {
    if (data.isVoice && !voiceStartTime) {
      // 语音开始
      voiceStartTime = Date.now();
      console.log(`\n🎤 语音开始 [${new Date().toLocaleTimeString()}]`);
      console.log(`   概率: ${(data.voiceProbability * 100).toFixed(1)}%`);
      console.log(`   主频: ${data.dominantFrequency.toFixed(0)} Hz`);
      
    } else if (!data.isVoice && voiceStartTime) {
      // 语音结束
      const duration = Date.now() - voiceStartTime;
      totalVoiceDuration += duration;
      console.log(`🔇 语音结束 [持续 ${(duration / 1000).toFixed(1)}s]`);
      voiceStartTime = null;
    }
  });
  
  // 10 秒后显示统计
  setTimeout(() => {
    console.log('\n\n=== 统计 ===');
    console.log(`总语音时长: ${(totalVoiceDuration / 1000).toFixed(1)} 秒`);
    
    capture.disableSpectrum();
    capture.stop();
  }, 10000);
}

voiceDetectionDemo();
```

### 完整示例：音频可视化

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

async function visualizeAudio() {
  const capture = new AudioCapture();
  await capture.start();
  
  capture.enableSpectrum({
    fftSize: 512,
    interval: 50,  // 50ms = 20 FPS
    smoothing: 0.85
  });
  
  capture.on('spectrum', (data) => {
    // 清屏（终端）
    console.clear();
    
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║            实时音频频谱可视化                         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    // 显示频段条形图
    data.bands.forEach(band => {
      const energy = Math.max(0, Math.min(50, Math.floor(band.db + 80)));
      const bar = '█'.repeat(Math.floor(energy));
      const empty = '░'.repeat(50 - Math.floor(energy));
      
      console.log(`${band.name.padEnd(18)} │${bar}${empty}│ ${band.db.toFixed(1)} dB`);
    });
    
    // 显示语音状态
    const voiceBar = '█'.repeat(Math.floor(data.voiceProbability * 50));
    const voiceEmpty = '░'.repeat(50 - Math.floor(data.voiceProbability * 50));
    console.log(`\n语音概率          │${voiceBar}${voiceEmpty}│ ${(data.voiceProbability * 100).toFixed(1)}%`);
    
    // 显示特征
    console.log(`\n主频率: ${data.dominantFrequency.toFixed(0)} Hz`);
    console.log(`质心: ${data.spectralCentroid.toFixed(0)} Hz`);
    console.log(`状态: ${data.isVoice ? '🎤 语音' : '🔇 非语音'}`);
  });
  
  // Ctrl+C 退出
  process.on('SIGINT', () => {
    capture.disableSpectrum();
    capture.stop();
    process.exit(0);
  });
}

visualizeAudio();
```

### 性能特性

| 指标 | kiss_fft (C++) | fft.js (JavaScript) |
|------|----------------|---------------------|
| FFT 计算时间 (512 点) | < 0.5 ms | 5-10 ms |
| FFT 计算时间 (2048 点) | < 1 ms | 20-40 ms |
| CPU 占用 | < 2% | 10-15% |
| 内存占用 | 2-4 MB | 10-20 MB |
| 实时性 | 优秀 | 良好 |

### 使用场景

1. **语音检测**: 实时检测音频中的人声（播客、会议、电话）
2. **音乐分析**: 频段能量分析、节奏检测、音调识别
3. **音频可视化**: 实时频谱图、音频波形、均衡器显示
4. **语音识别预处理**: 在 ASR 之前进行语音活动检测（VAD）
5. **音频监控**: 检测特定频率范围的信号（报警、异常声音）

### 技术细节

- **FFT 库**: [kiss_fft](https://github.com/mborgerding/kissfft) (BSD-3-Clause)
- **窗函数**: Hanning 窗（减少频谱泄漏）
- **平滑算法**: 指数移动平均（EMA）
- **语音检测**: 基于 300-3400Hz 频段能量占比
- **频谱质心**: 加权平均频率 `Σ(f[i] * mag[i]) / Σ(mag[i])`

### 注意事项

1. **FFT 大小限制**: `fftSize` 必须小于音频缓冲区的样本数
   - 默认缓冲区约 960 样本（48kHz, 20ms）
   - 建议使用 512 或更小的值
   
2. **频率分辨率**: `Δf = sampleRate / fftSize`
   - FFT 512: 48000 / 512 ≈ 94 Hz
   - FFT 2048: 48000 / 2048 ≈ 23 Hz
   
3. **平滑因子权衡**:
   - 高平滑（0.9-1.0）: 稳定但延迟高
   - 低平滑（0.0-0.5）: 实时但抖动明显
   
4. **语音检测准确性**:
   - 纯音乐: 语音概率通常 < 20%
   - 人声歌曲: 概率 30-70%
   - 纯对话: 概率 > 60%

---

## 参考链接

- [README.md](../README.md) - 项目主文档
- [示例代码](../examples/) - 完整示例
- [N-API 文档](https://nodejs.org/api/n-api.html) - Node.js 原生扩展 API
- [WASAPI 文档](https://docs.microsoft.com/en-us/windows/win32/coreaudio/wasapi) - Windows 音频 API
- [RNNoise 论文](https://arxiv.org/abs/1709.08243) - 深度学习降噪算法
- [AGC 算法](https://en.wikipedia.org/wiki/Automatic_gain_control) - 自动增益控制
- [Audio EQ Cookbook](https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html) - Biquad 滤波器算法
- [kiss_fft](https://github.com/mborgerding/kissfft) - 快速傅里叶变换库

---

**最后更新**: 2025-10-18 (v2.11.0)

