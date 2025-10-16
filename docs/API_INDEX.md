# 📖 API 索引 - node-windows-audio-capture v2.8.0

**快速查找所有 API 方法、属性和事件**

---

## 🗂️ 快速导航

- [构造函数](#构造函数)
- [基础方法](#基础方法)
- [v2.1 静音控制](#v21-静音控制)
- [v2.7 AI 降噪](#v27-ai-降噪)
- [v2.8 AGC 音量归一化](#v28-agc-音量归一化)
- [v2.8 3-Band EQ](#v28-3-band-eq)
- [v2.6 缓冲池](#v26-缓冲池)
- [事件](#事件)
- [静态方法](#静态方法)
- [类型定义](#类型定义)

---

## 构造函数

### `new AudioCapture(config)`

创建音频捕获实例

**参数**:
```typescript
{
  processId: number;                    // 目标进程 PID
  sampleRate?: number;                  // 采样率 (默认: 48000)
  channels?: number;                    // 声道数 (默认: 2)
  format?: 'float32' | 'int16';        // 数据格式 (默认: 'float32')
  useExternalBuffer?: boolean;          // 使用外部缓冲池 (默认: false)
  bufferPoolStrategy?: 'fixed' | 'adaptive';  // 缓冲池策略 (默认: 'fixed')
  bufferPoolSize?: number;              // 初始池大小 (默认: 10)
  bufferPoolMin?: number;               // 最小池大小 (默认: 50, adaptive 模式)
  bufferPoolMax?: number;               // 最大池大小 (默认: 200, adaptive 模式)
}
```

**示例**:
```javascript
const capture = new AudioCapture({
  processId: 12345,
  sampleRate: 48000,
  channels: 2,
  format: 'float32',
  useExternalBuffer: true,
  bufferPoolStrategy: 'adaptive'
});
```

**详细文档**: [docs/api.md#构造函数](./api.md#构造函数)

---

## 基础方法

### `start()`

启动音频捕获

**签名**: `start(): Promise<void>`

**示例**:
```javascript
await capture.start();
console.log('✅ 音频捕获已启动');
```

**详细文档**: [docs/api.md#start](./api.md#start)

---

### `stop()`

停止音频捕获

**签名**: `stop(): Promise<void>`

**示例**:
```javascript
await capture.stop();
console.log('⏹️ 音频捕获已停止');
```

**详细文档**: [docs/api.md#stop](./api.md#stop)

---

### `pause()`

暂停音频捕获

**签名**: `pause(): Promise<void>`

**示例**:
```javascript
await capture.pause();
console.log('⏸️ 音频捕获已暂停');
```

---

### `resume()`

恢复音频捕获

**签名**: `resume(): Promise<void>`

**示例**:
```javascript
await capture.resume();
console.log('▶️ 音频捕获已恢复');
```

---

## v2.1 静音控制

### `setMuteOtherProcesses(enabled)`

启用/禁用其他进程静音

**签名**: `setMuteOtherProcesses(enabled: boolean): void`

**参数**:
- `enabled` (boolean) - true 启用静音，false 禁用

**示例**:
```javascript
capture.setMuteOtherProcesses(true);
console.log('✅ 已启用动态静音控制');
```

**详细文档**: [docs/api.md#v21-音频会话静音控制](./api.md#v21-音频会话静音控制)

---

### `isMutingOtherProcesses()`

检查是否正在静音其他进程

**签名**: `isMutingOtherProcesses(): boolean`

**返回值**: boolean - true 表示正在静音

**示例**:
```javascript
const isMuting = capture.isMutingOtherProcesses();
console.log('静音状态:', isMuting);
```

---

### `setAllowList(processIds)`

设置允许列表（白名单）

**签名**: `setAllowList(processIds: number[]): void`

**参数**:
- `processIds` (number[]) - 允许的进程 PID 数组

**示例**:
```javascript
const allowList = [12345, 67890];
capture.setAllowList(allowList);
console.log('✅ 白名单已设置');
```

---

### `getAllowList()`

获取当前允许列表

**签名**: `getAllowList(): number[]`

**返回值**: number[] - PID 数组

**示例**:
```javascript
const allowList = capture.getAllowList();
console.log('当前白名单:', allowList);
```

---

### `setBlockList(processIds)`

设置阻止列表（黑名单）

**签名**: `setBlockList(processIds: number[]): void`

**参数**:
- `processIds` (number[]) - 要阻止的进程 PID 数组

**示例**:
```javascript
const blockList = [11111, 22222];
capture.setBlockList(blockList);
console.log('✅ 黑名单已设置');
```

---

### `getBlockList()`

获取当前阻止列表

**签名**: `getBlockList(): number[]`

**返回值**: number[] - PID 数组

**示例**:
```javascript
const blockList = capture.getBlockList();
console.log('当前黑名单:', blockList);
```

---

## v2.7 AI 降噪

### `setDenoiseEnabled(enabled)`

启用/禁用 AI 降噪

**签名**: `setDenoiseEnabled(enabled: boolean): void`

**参数**:
- `enabled` (boolean) - true 启用降噪，false 禁用

**示例**:
```javascript
capture.setDenoiseEnabled(true);
console.log('✅ AI 降噪已启用');
```

**详细文档**: [docs/api.md#v27-rnnoise-降噪](./api.md#v27-rnnoise-降噪)

---

### `getDenoiseEnabled()`

获取降噪启用状态

**签名**: `getDenoiseEnabled(): boolean`

**返回值**: boolean - true 表示已启用

**示例**:
```javascript
const enabled = capture.getDenoiseEnabled();
console.log('降噪状态:', enabled);
```

---

### `getDenoiseStats()`

获取降噪统计信息

**签名**: `getDenoiseStats(): DenoiseStats | null`

**返回值**: 
```typescript
{
  vadProbability: number;      // 语音活动概率 (0-1)
  framesProcessed: number;     // 已处理帧数
}
```

**示例**:
```javascript
const stats = capture.getDenoiseStats();
console.log(`VAD 概率: ${(stats.vadProbability * 100).toFixed(1)}%`);
console.log(`已处理帧数: ${stats.framesProcessed}`);
```

---

## v2.8 AGC 音量归一化

### `setAGCEnabled(enabled)`

启用/禁用 AGC

**签名**: `setAGCEnabled(enabled: boolean): void`

**参数**:
- `enabled` (boolean) - true 启用 AGC，false 禁用

**示例**:
```javascript
capture.setAGCEnabled(true);
console.log('✅ AGC 已启用');
```

**详细文档**: [docs/api.md#v28-agc-自动增益控制](./api.md#v28-agc-自动增益控制)

---

### `getAGCEnabled()`

获取 AGC 启用状态

**签名**: `getAGCEnabled(): boolean`

**返回值**: boolean - true 表示已启用

**示例**:
```javascript
const enabled = capture.getAGCEnabled();
console.log('AGC 状态:', enabled);
```

---

### `setAGCOptions(options)`

设置 AGC 参数

**签名**: `setAGCOptions(options: AGCOptions): void`

**参数**:
```typescript
{
  targetLevel?: number;    // 目标音量 (dBFS, -30 到 0, 默认: -20)
  maxGain?: number;        // 最大增益 (dB, 0 到 50, 默认: 30)
  minGain?: number;        // 最小增益 (dB, -20 到 0, 默认: -10)
  attackTime?: number;     // 响应时间 (ms, 5 到 200, 默认: 10)
  releaseTime?: number;    // 释放时间 (ms, 50 到 500, 默认: 100)
}
```

**示例**:
```javascript
capture.setAGCOptions({
  targetLevel: -18,
  maxGain: 25,
  minGain: -5,
  attackTime: 10,
  releaseTime: 100
});
console.log('✅ AGC 参数已更新');
```

---

### `getAGCOptions()`

获取当前 AGC 参数

**签名**: `getAGCOptions(): AGCOptions`

**返回值**: AGCOptions 对象

**示例**:
```javascript
const options = capture.getAGCOptions();
console.log('AGC 配置:', options);
```

---

### `getAGCStats()`

获取 AGC 统计信息

**签名**: `getAGCStats(): AGCStats | null`

**返回值**:
```typescript
{
  currentGain: number;     // 当前增益 (dB)
  averageLevel: number;    // 平均输入音量 (dBFS)
  clipping: boolean;       // 是否削波
  framesProcessed: number; // 已处理帧数
}
```

**示例**:
```javascript
const stats = capture.getAGCStats();
console.log(`当前增益: ${stats.currentGain.toFixed(2)} dB`);
console.log(`平均音量: ${stats.averageLevel.toFixed(2)} dBFS`);
console.log(`是否削波: ${stats.clipping}`);
```

---

## v2.8 3-Band EQ

### `setEQEnabled(enabled)`

启用/禁用 EQ

**签名**: `setEQEnabled(enabled: boolean): void`

**参数**:
- `enabled` (boolean) - true 启用 EQ，false 禁用

**示例**:
```javascript
capture.setEQEnabled(true);
console.log('✅ EQ 已启用');
```

**详细文档**: [docs/api.md#v28-3-band-eq-均衡器](./api.md#v28-3-band-eq-均衡器)

---

### `getEQEnabled()`

获取 EQ 启用状态

**签名**: `getEQEnabled(): boolean`

**返回值**: boolean - true 表示已启用

**示例**:
```javascript
const enabled = capture.getEQEnabled();
console.log('EQ 状态:', enabled);
```

---

### `setEQBandGain(band, gain)`

设置 EQ 频段增益

**签名**: `setEQBandGain(band: 'low' | 'mid' | 'high', gain: number): void`

**参数**:
- `band` (string) - 频段名称
  - `'low'` - 低频 (< 500 Hz)
  - `'mid'` - 中频 (500-4000 Hz)
  - `'high'` - 高频 (> 4000 Hz)
- `gain` (number) - 增益 (dB, -20 到 20)

**示例**:
```javascript
capture.setEQBandGain('low', 6);    // 低频 +6 dB
capture.setEQBandGain('mid', 0);    // 中频 0 dB
capture.setEQBandGain('high', 3);   // 高频 +3 dB
```

---

### `getEQBandGain(band)`

获取 EQ 频段增益

**签名**: `getEQBandGain(band: 'low' | 'mid' | 'high'): number`

**参数**:
- `band` (string) - 频段名称

**返回值**: number - 增益值 (dB)

**示例**:
```javascript
const lowGain = capture.getEQBandGain('low');
const midGain = capture.getEQBandGain('mid');
const highGain = capture.getEQBandGain('high');
console.log(`EQ: Low ${lowGain}dB, Mid ${midGain}dB, High ${highGain}dB`);
```

---

### `getEQStats()`

获取 EQ 统计信息

**签名**: `getEQStats(): EQStats | null`

**返回值**:
```typescript
{
  enabled: boolean;        // 是否启用
  lowGain: number;         // 低频增益 (dB)
  midGain: number;         // 中频增益 (dB)
  highGain: number;        // 高频增益 (dB)
  framesProcessed: number; // 已处理帧数
}
```

**示例**:
```javascript
const stats = capture.getEQStats();
console.log('EQ 统计:', stats);
```

---

## v2.6 缓冲池

### `getPoolStats()`

获取缓冲池统计信息

**签名**: `getPoolStats(): BufferPoolStats | null`

**返回值**:
```typescript
{
  allocations: number;      // 总分配次数
  reuses: number;           // 重用次数
  reuseRate: number;        // 重用率 (0-1)
  currentPoolSize: number;  // 当前池大小
}
```

**示例**:
```javascript
const stats = capture.getPoolStats();
console.log(`缓冲池重用率: ${(stats.reuseRate * 100).toFixed(2)}%`);
console.log(`当前池大小: ${stats.currentPoolSize}`);
```

**详细文档**: [docs/api.md#v26-buffer-pool-缓冲池管理](./api.md#v26-buffer-pool-缓冲池管理)

---

## 事件

### `'data'`

音频数据事件

**监听器签名**:
```typescript
(event: AudioDataEvent) => void
```

**事件对象**:
```typescript
{
  buffer: Float32Array | Int16Array;  // 音频数据
  timestamp: number;                  // 时间戳 (ms)
  frameCount: number;                 // 帧数
  channels: number;                   // 声道数
  sampleRate: number;                 // 采样率
}
```

**示例**:
```javascript
capture.on('data', (event) => {
  console.log('收到音频:', event.buffer.length, '样本');
  console.log('时间戳:', event.timestamp);
  console.log('帧数:', event.frameCount);
});
```

---

### `'error'`

错误事件

**监听器签名**:
```typescript
(error: AudioError) => void
```

**错误对象**:
```typescript
{
  message: string;    // 错误消息
  code: string;       // 错误码
  details?: any;      // 详细信息
}
```

**常见错误码**:
- `PROCESS_NOT_FOUND` - 进程未找到
- `AUDIO_DEVICE_ERROR` - 音频设备错误
- `INVALID_STATE` - 状态无效
- `BUFFER_OVERFLOW` - 缓冲区溢出

**示例**:
```javascript
capture.on('error', (error) => {
  console.error('错误:', error.message);
  console.error('错误码:', error.code);
  
  if (error.code === 'PROCESS_NOT_FOUND') {
    console.log('目标进程已关闭');
  }
});
```

---

### `'end'`

捕获结束事件

**监听器签名**:
```typescript
() => void
```

**示例**:
```javascript
capture.on('end', () => {
  console.log('⏹️ 音频捕获已结束');
});
```

---

### `'device-change'`

音频设备变化事件（v2.3+）

**监听器签名**:
```typescript
(event: DeviceChangeEvent) => void
```

**事件对象**:
```typescript
{
  type: 'added' | 'removed' | 'default-changed';  // 变化类型
  deviceId?: string;                              // 设备 ID
  deviceName?: string;                            // 设备名称
}
```

**示例**:
```javascript
capture.on('device-change', (event) => {
  console.log('设备变化:', event.type);
  if (event.deviceName) {
    console.log('设备:', event.deviceName);
  }
});
```

---

## 静态方法

### `getProcesses()`

枚举所有有音频输出的进程

**签名**: `getProcesses(): Promise<ProcessInfo[]>`

**返回值**:
```typescript
ProcessInfo[] = {
  pid: number;              // 进程 ID
  name: string;             // 进程名称
  audioSessionCount: number; // 音频会话数量
}[]
```

**示例**:
```javascript
const { getProcesses } = require('node-windows-audio-capture');

const processes = await getProcesses();
processes.forEach(proc => {
  console.log(`${proc.name} (PID: ${proc.pid}, 会话: ${proc.audioSessionCount})`);
});
```

---

### `getDevices()`

枚举所有音频设备（v2.3+）

**签名**: `getDevices(): Promise<DeviceInfo[]>`

**返回值**:
```typescript
DeviceInfo[] = {
  id: string;        // 设备 ID
  name: string;      // 设备名称
  isDefault: boolean; // 是否为默认设备
}[]
```

**示例**:
```javascript
const { getDevices } = require('node-windows-audio-capture');

const devices = await getDevices();
devices.forEach(dev => {
  console.log(`${dev.name} ${dev.isDefault ? '(默认)' : ''}`);
});
```

---

## 类型定义

### AudioCaptureConfig

```typescript
interface AudioCaptureConfig {
  processId: number;                          // 必需
  sampleRate?: number;                        // 默认: 48000
  channels?: number;                          // 默认: 2
  format?: 'float32' | 'int16';              // 默认: 'float32'
  useExternalBuffer?: boolean;                // 默认: false
  bufferPoolStrategy?: 'fixed' | 'adaptive'; // 默认: 'fixed'
  bufferPoolSize?: number;                    // 默认: 10
  bufferPoolMin?: number;                     // 默认: 50
  bufferPoolMax?: number;                     // 默认: 200
}
```

---

### AGCOptions

```typescript
interface AGCOptions {
  targetLevel?: number;    // -30 到 0 dBFS, 默认: -20
  maxGain?: number;        // 0 到 50 dB, 默认: 30
  minGain?: number;        // -20 到 0 dB, 默认: -10
  attackTime?: number;     // 5 到 200 ms, 默认: 10
  releaseTime?: number;    // 50 到 500 ms, 默认: 100
}
```

---

### AGCStats

```typescript
interface AGCStats {
  currentGain: number;     // 当前增益 (dB)
  averageLevel: number;    // 平均音量 (dBFS)
  clipping: boolean;       // 是否削波
  framesProcessed: number; // 已处理帧数
}
```

---

### EQStats

```typescript
interface EQStats {
  enabled: boolean;        // 是否启用
  lowGain: number;         // 低频增益 (dB)
  midGain: number;         // 中频增益 (dB)
  highGain: number;        // 高频增益 (dB)
  framesProcessed: number; // 已处理帧数
}
```

---

### DenoiseStats

```typescript
interface DenoiseStats {
  vadProbability: number;  // 语音活动概率 (0-1)
  framesProcessed: number; // 已处理帧数
}
```

---

### BufferPoolStats

```typescript
interface BufferPoolStats {
  allocations: number;      // 总分配次数
  reuses: number;           // 重用次数
  reuseRate: number;        // 重用率 (0-1)
  currentPoolSize: number;  // 当前池大小
}
```

---

### AudioDataEvent

```typescript
interface AudioDataEvent {
  buffer: Float32Array | Int16Array;  // 音频数据
  timestamp: number;                  // 时间戳 (ms)
  frameCount: number;                 // 帧数
  channels: number;                   // 声道数
  sampleRate: number;                 // 采样率
}
```

---

### ProcessInfo

```typescript
interface ProcessInfo {
  pid: number;              // 进程 ID
  name: string;             // 进程名称
  audioSessionCount: number; // 音频会话数量
}
```

---

### DeviceInfo

```typescript
interface DeviceInfo {
  id: string;        // 设备 ID
  name: string;      // 设备名称
  isDefault: boolean; // 是否为默认设备
}
```

---

## 📚 更多文档

- **完整 API 文档**: [docs/api.md](./api.md)
- **快速入门指南**: [docs/QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
- **翻译软件集成**: [docs/TRANSLATION_SOFTWARE_INTEGRATION.md](./TRANSLATION_SOFTWARE_INTEGRATION.md)
- **v2.8 发布说明**: [RELEASE_v2.8.0.md](../RELEASE_v2.8.0.md)

---

## 🔗 链接

- **GitHub**: https://github.com/wujelly701/node-windows-audio-capture
- **Issues**: https://github.com/wujelly701/node-windows-audio-capture/issues
- **Releases**: https://github.com/wujelly701/node-windows-audio-capture/releases

---

**v2.8.0** - 2025-10-16
