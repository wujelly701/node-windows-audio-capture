# API 详细文档

本文档详细说明 `node-windows-audio-capture` 模块的所有 API、配置选项、事件和错误处理。

## 目录

- [AudioCapture 类](#audiocapture-类)
  - [构造函数](#构造函数)
  - [实例方法](#实例方法)
  - [静态方法](#静态方法)
  - [事件](#事件)
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

## 配置选项

### AudioCaptureConfig

**完整配置对象：**

```typescript
interface AudioCaptureConfig {
  processId: number;
  loopbackMode?: boolean;
  sampleRate?: number;
  channels?: number;
  format?: 'float32' | 'int16';
}
```

### 配置选项详细说明

| 选项 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `processId` | `number` | ✓ | - | 目标进程的 ID |
| `loopbackMode` | `boolean` | ✗ | `true` | 是否启用 Loopback 模式 |
| `sampleRate` | `number` | ✗ | `48000` | 采样率（Hz） |
| `channels` | `number` | ✗ | `2` | 声道数 |
| `format` | `string` | ✗ | `'float32'` | 音频数据格式 |

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
- 每个样本占用 4 字节（Float32）或 2 字节（Int16）

---

#### `format`

**类型：** `'float32' | 'int16'`

**必需：** ✗

**默认值：** `'float32'`

**说明：** 音频数据格式。

**可选值：**

- `'float32'` - 32 位浮点数（-1.0 到 1.0）
- `'int16'` - 16 位整数（-32768 到 32767）

**示例：**

```javascript
// Float32 格式（默认，推荐）
const capture = new AudioCapture({
  processId: 1234,
  format: 'float32'
});

// Int16 格式（节省空间）
const capture2 = new AudioCapture({
  processId: 1234,
  format: 'int16'
});
```

**格式对比：**

| 格式 | 范围 | 精度 | 大小 | 使用场景 |
|------|------|------|------|----------|
| Float32 | -1.0 ~ 1.0 | 高 | 4 字节/样本 | 音频处理、分析 |
| Int16 | -32768 ~ 32767 | 中 | 2 字节/样本 | 存储、传输 |

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

## 参考链接

- [README.md](../README.md) - 项目主文档
- [示例代码](../examples/) - 完整示例
- [N-API 文档](https://nodejs.org/api/n-api.html) - Node.js 原生扩展 API
- [WASAPI 文档](https://docs.microsoft.com/en-us/windows/win32/coreaudio/wasapi) - Windows 音频 API
- [RNNoise 论文](https://arxiv.org/abs/1709.08243) - 深度学习降噪算法
- [AGC 算法](https://en.wikipedia.org/wiki/Automatic_gain_control) - 自动增益控制
- [Audio EQ Cookbook](https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html) - Biquad 滤波器算法

---

**最后更新**: 2025-10-16 (v2.8.0)
