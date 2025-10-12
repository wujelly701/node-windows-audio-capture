# 故障排查文档

本文档提供常见问题的解决方案、错误码说明和调试技巧，帮助快速解决使用过程中遇到的问题。

## 目录

- [错误码参考](#错误码参考)
- [常见问题 FAQ](#常见问题-faq)
- [调试技巧](#调试技巧)
- [性能问题](#性能问题)
- [Electron 相关问题](#electron-相关问题)
- [获取帮助](#获取帮助)

---

## 错误码参考

### 进程相关错误

#### `PROCESS_NOT_FOUND`

**描述：** 指定的进程 ID 不存在。

**可能原因：**

- 进程已退出或被终止
- 进程 ID 输入错误
- 权限不足，无法查看该进程

**解决方案：**

```javascript
// 1. 重新获取进程列表
const processes = await AudioCapture.getProcesses();
console.log('可用进程:', processes.map(p => `${p.name} (${p.processId})`));

// 2. 使用进程名查找
const targetProcess = processes.find(p => p.name.toLowerCase().includes('chrome'));
if (targetProcess) {
  const capture = new AudioCapture({ processId: targetProcess.processId });
}

// 3. 添加错误处理
capture.on('error', (error) => {
  if (error.code === ERROR_CODES.PROCESS_NOT_FOUND) {
    console.log('进程不存在，停止捕获');
    capture.stop();
  }
});
```

---

#### `PROCESS_TERMINATED`

**描述：** 目标进程在捕获过程中被终止。

**可能原因：**

- 用户手动关闭了目标应用
- 应用崩溃
- 系统强制终止进程

**解决方案：**

```javascript
capture.on('error', async (error) => {
  if (error.code === ERROR_CODES.PROCESS_TERMINATED) {
    console.log('进程已终止，尝试重新连接...');
    
    // 等待进程重新启动
    await new Promise(r => setTimeout(r, 5000));
    
    // 重新查找并连接
    const processes = await AudioCapture.getProcesses();
    const newProcess = processes.find(p => p.name.includes('应用名'));
    
    if (newProcess) {
      capture = new AudioCapture({ processId: newProcess.processId });
      await capture.start();
    }
  }
});
```

---

#### `PROCESS_ACCESS_DENIED`

**描述：** 无法访问目标进程（权限不足）。

**可能原因：**

- 目标进程以管理员权限运行
- 系统保护进程（如 `audiodg.exe`）
- UAC 限制

**解决方案：**

1. **以管理员身份运行应用：**

```powershell
# 右键 PowerShell → "以管理员身份运行"
node your-app.js
```

2. **选择其他进程：**

```javascript
// 过滤掉受保护的系统进程
const processes = await AudioCapture.getProcesses();
const safeProceses = processes.filter(p => 
  !p.name.toLowerCase().includes('system') &&
  !p.name.toLowerCase().includes('audiodg')
);
```

---

### 设备相关错误

#### `DEVICE_NOT_FOUND`

**描述：** 找不到音频设备。

**可能原因：**

- 音频设备未连接
- 驱动程序未安装或损坏
- 设备被禁用

**解决方案：**

1. **检查设备连接：**

```javascript
// 枚举所有设备
const devices = await AudioCapture.getDevices();
console.log('可用设备:', devices);

// 检查是否有激活的设备
const activeDevices = devices.filter(d => d.isActive);
if (activeDevices.length === 0) {
  console.error('没有激活的音频设备');
}
```

2. **检查 Windows 音频服务：**

```powershell
# 检查 Windows Audio 服务状态
Get-Service -Name Audiosrv

# 重启服务
Restart-Service Audiosrv
```

3. **检查设备管理器：**

- 打开设备管理器（`devmgmt.msc`）
- 展开 "声音、视频和游戏控制器"
- 确保设备已启用且无黄色感叹号

---

#### `DEVICE_DISCONNECTED`

**描述：** 音频设备在捕获过程中断开。

**可能原因：**

- USB 设备被拔出
- 蓝牙设备断开连接
- 虚拟音频设备被禁用

**解决方案：**

```javascript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

capture.on('error', async (error) => {
  if (error.code === ERROR_CODES.DEVICE_DISCONNECTED) {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`设备断开，尝试重连 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      
      // 等待设备重新连接
      await new Promise(r => setTimeout(r, 2000));
      
      try {
        await capture.start();
        reconnectAttempts = 0; // 成功后重置计数
        console.log('重连成功');
      } catch (e) {
        console.error('重连失败:', e.message);
      }
    } else {
      console.error('达到最大重连次数，停止捕获');
      capture.stop();
    }
  }
});
```

---

#### `DEVICE_BUSY`

**描述：** 音频设备正被其他应用独占。

**可能原因：**

- 其他音频捕获软件正在运行
- 设备设置为独占模式

**解决方案：**

1. **关闭其他音频应用**（如 OBS、Audacity 等）

2. **检查设备独占设置：**

- 右键任务栏音量图标 → "声音"
- 选择设备 → "属性" → "高级"
- 取消勾选 "允许应用程序独占控制此设备"

---

### 操作相关错误

#### `INITIALIZATION_FAILED`

**描述：** 音频系统初始化失败。

**可能原因：**

- WASAPI 初始化错误
- 配置参数无效
- 系统资源不足

**解决方案：**

```javascript
// 1. 检查配置参数
const config = {
  processId: 1234,
  sampleRate: 48000,  // 使用标准采样率
  channels: 2,        // 使用立体声
  format: 'float32'   // 使用默认格式
};

// 2. 添加重试逻辑
async function startWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const capture = new AudioCapture(config);
      await capture.start();
      return capture;
    } catch (error) {
      console.error(`启动失败 (尝试 ${i + 1}/${maxRetries}):`, error.message);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  throw new Error('初始化失败，已达到最大重试次数');
}
```

3. **检查系统音频服务：**

```powershell
# 重启 Windows Audio 服务
Restart-Service Audiosrv

# 重启 Windows Audio Endpoint Builder 服务
Restart-Service AudioEndpointBuilder
```

---

#### `CAPTURE_FAILED`

**描述：** 音频捕获过程中发生错误。

**可能原因：**

- 缓冲区溢出
- 音频格式不匹配
- 硬件错误

**解决方案：**

```javascript
// 1. 减小缓冲区大小（如果支持）
const capture = new AudioCapture({
  processId: 1234,
  sampleRate: 44100  // 降低采样率
});

// 2. 监控数据流
let lastDataTime = Date.now();
const DATA_TIMEOUT = 5000; // 5 秒超时

capture.on('data', (chunk) => {
  lastDataTime = Date.now();
});

// 检查数据流是否正常
setInterval(() => {
  if (Date.now() - lastDataTime > DATA_TIMEOUT) {
    console.error('数据流中断，重启捕获...');
    capture.stop();
    capture.start();
  }
}, 1000);
```

---

#### `INVALID_STATE`

**描述：** 在无效的状态下执行操作。

**可能原因：**

- 在已运行的捕获上调用 `start()`
- 在已停止的捕获上调用 `stop()`
- 多次初始化

**解决方案：**

```javascript
class AudioCaptureManager {
  constructor(config) {
    this.config = config;
    this.capture = null;
    this.isRunning = false;
  }
  
  async start() {
    if (this.isRunning) {
      console.log('捕获已在运行中');
      return;
    }
    
    this.capture = new AudioCapture(this.config);
    await this.capture.start();
    this.isRunning = true;
  }
  
  stop() {
    if (!this.isRunning) {
      console.log('捕获未运行');
      return;
    }
    
    this.capture.stop();
    this.isRunning = false;
  }
}
```

---

#### `ACCESS_DENIED`

**描述：** 权限不足，无法执行操作。

**可能原因：**

- 未以管理员身份运行
- UAC 限制
- 防病毒软件阻止

**解决方案：**

1. **以管理员身份运行：**

```powershell
# 右键应用 → "以管理员身份运行"
```

2. **检查防病毒软件：**

- 临时禁用防病毒软件
- 将应用添加到白名单

3. **检查 Windows Defender：**

```powershell
# 检查 Windows Defender 是否阻止
Get-MpThreat
```

---

### 配置相关错误

#### `INVALID_CONFIG`

**描述：** 配置参数无效。

**可能原因：**

- 缺少必需参数（`processId`）
- 参数类型错误
- 参数超出有效范围

**解决方案：**

```javascript
// 验证配置
function validateConfig(config) {
  if (!config.processId) {
    throw new Error('缺少必需参数: processId');
  }
  
  if (typeof config.processId !== 'number' || config.processId <= 0) {
    throw new Error('processId 必须是正整数');
  }
  
  if (config.sampleRate && (config.sampleRate < 8000 || config.sampleRate > 192000)) {
    throw new Error('sampleRate 超出有效范围 (8000-192000)');
  }
  
  if (config.channels && (config.channels < 1 || config.channels > 8)) {
    throw new Error('channels 超出有效范围 (1-8)');
  }
}

// 使用
try {
  validateConfig(config);
  const capture = new AudioCapture(config);
} catch (error) {
  console.error('配置错误:', error.message);
}
```

---

#### `INVALID_SAMPLE_RATE`

**描述：** 采样率无效或不被支持。

**解决方案：**

```javascript
// 使用标准采样率
const STANDARD_SAMPLE_RATES = [8000, 11025, 16000, 22050, 44100, 48000, 96000, 192000];

const capture = new AudioCapture({
  processId: 1234,
  sampleRate: 48000  // 推荐使用 48000
});
```

---

#### `INVALID_CHANNELS`

**描述：** 声道数无效。

**解决方案：**

```javascript
// 使用标准声道配置
const capture = new AudioCapture({
  processId: 1234,
  channels: 2  // 1=单声道, 2=立体声, 6=5.1, 8=7.1
});
```

---

## 常见问题 FAQ

### Q1: 无法捕获某个进程的音频

**问题描述：** 捕获特定应用（如 Chrome、Spotify）时没有音频输出。

**可能原因：**

1. 应用当前没有播放音频
2. 应用使用了特殊的音频路由
3. 应用以管理员权限运行

**解决方案：**

```javascript
// 1. 确认进程正在播放音频
const processes = await AudioCapture.getProcesses();
console.log('进程列表:', processes);

// 2. 测试捕获
const capture = new AudioCapture({ processId: targetProcessId });

let receivedData = false;
capture.on('data', (chunk) => {
  receivedData = true;
  console.log(`接收到 ${chunk.length} 字节数据`);
});

await capture.start();

// 3. 等待 5 秒检查是否有数据
setTimeout(() => {
  if (!receivedData) {
    console.error('5 秒内未接收到数据，可能原因：');
    console.error('- 应用未播放音频');
    console.error('- 权限不足');
    console.error('- 应用使用特殊音频路由');
  }
}, 5000);
```

**特殊情况：Chrome 浏览器**

Chrome 可能有多个进程，需要找到正确的渲染进程：

```javascript
const processes = await AudioCapture.getProcesses();
const chromeProcesses = processes.filter(p => 
  p.name.toLowerCase().includes('chrome')
);

console.log('Chrome 进程:', chromeProcesses);
// 尝试主进程（通常 processId 最小）
const mainChrome = chromeProcesses.reduce((min, p) => 
  p.processId < min.processId ? p : min
);
```

---

### Q2: 音频断断续续或有杂音

**问题描述：** 捕获的音频不连贯，有跳帧或杂音。

**可能原因：**

1. CPU 使用率过高
2. 缓冲区处理不及时
3. 采样率不匹配
4. 数据处理过慢

**解决方案：**

```javascript
// 1. 监控性能
let dataCount = 0;
let droppedFrames = 0;
let lastTime = Date.now();

capture.on('data', (chunk) => {
  const now = Date.now();
  const elapsed = now - lastTime;
  
  // 检查数据间隔（正常应该是 20-50ms）
  if (elapsed > 100) {
    droppedFrames++;
    console.warn(`数据间隔过长: ${elapsed}ms，可能丢帧`);
  }
  
  lastTime = now;
  dataCount++;
  
  // 快速处理，避免阻塞
  setImmediate(() => {
    processAudioData(chunk);
  });
});

// 2. 每 10 秒输出统计
setInterval(() => {
  console.log(`数据包: ${dataCount}, 丢帧: ${droppedFrames}`);
  console.log(`丢帧率: ${(droppedFrames / dataCount * 100).toFixed(2)}%`);
}, 10000);

// 3. 优化数据处理
function processAudioData(chunk) {
  // 使用流式处理，避免阻塞
  // 避免在 'data' 回调中执行耗时操作
}
```

**系统优化：**

1. 关闭不必要的后台程序
2. 降低采样率（如从 96000 降到 48000）
3. 使用 `setImmediate` 或 `process.nextTick` 分散处理负载

---

### Q3: 捕获的音频无声

**问题描述：** 数据正常接收，但播放或分析时发现都是静音。

**可能原因：**

1. 应用使用静音输出
2. 系统音量为 0
3. 错误的音频格式解析

**解决方案：**

```javascript
// 1. 检查音频数据是否全为 0
capture.on('data', (chunk) => {
  let hasSound = false;
  
  // Float32 格式检查
  for (let i = 0; i < chunk.length; i += 4) {
    const sample = chunk.readFloatLE(i);
    if (Math.abs(sample) > 0.001) {  // 阈值
      hasSound = true;
      break;
    }
  }
  
  if (!hasSound) {
    console.warn('数据全为静音');
  }
});

// 2. 检查系统音量
console.log('请确保：');
console.log('1. 应用正在播放音频');
console.log('2. 系统音量不为 0');
console.log('3. 应用音量不为 0');
```

---

### Q4: 内存使用持续增长

**问题描述：** 长时间运行后内存占用越来越大。

**可能原因：**

1. 音频数据未及时释放
2. 事件监听器泄漏
3. 缓冲区累积

**解决方案：**

```javascript
// 1. 及时处理数据，不要累积
let audioBuffer = [];

capture.on('data', (chunk) => {
  // 立即处理或写入流，不要累积在内存中
  writeStream.write(chunk);
  
  // 避免这样做：
  // audioBuffer.push(chunk);  // ❌ 会导致内存泄漏
});

// 2. 定期监控内存
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('内存使用:', {
    rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
  });
  
  // 内存超过阈值时重启捕获
  if (memUsage.heapUsed > 500 * 1024 * 1024) {  // 500 MB
    console.warn('内存使用过高，重启捕获...');
    capture.stop();
    global.gc && global.gc();  // 手动 GC（需要 --expose-gc）
    setTimeout(() => capture.start(), 1000);
  }
}, 10000);

// 3. 正确清理资源
function cleanup() {
  capture.stop();
  capture.removeAllListeners();
  writeStream.end();
}

process.on('SIGINT', cleanup);
process.on('exit', cleanup);
```

---

### Q5: Electron 应用中无法加载模块

**问题描述：** 在 Electron 中使用时报错 "Error: The module was compiled against a different Node.js version"。

**解决方案：**

```powershell
# 1. 安装 electron-rebuild
npm install --save-dev electron-rebuild

# 2. 重新构建
.\node_modules\.bin\electron-rebuild.cmd

# 3. 或配置自动重构建
# 在 package.json 中添加：
# "postinstall": "electron-rebuild"

# 4. 验证
npm install
electron .
```

详细说明见 [Electron 相关问题](#electron-相关问题)。

---

### Q6: 如何捕获系统总输出？

**问题描述：** 想捕获所有应用的混合音频，而不是单个进程。

**回答：** 本模块设计为按进程捕获，不支持系统总输出。如需捕获系统总输出，请考虑：

1. **使用虚拟音频设备**（如 VB-Audio Virtual Cable）
2. **使用系统 Loopback 捕获**（需要其他库或工具）
3. **捕获特定的音频服务进程**（如 `audiodg.exe`，需要管理员权限）

---

## 调试技巧

### 启用详细日志

```javascript
// 方法 1: 环境变量
process.env.DEBUG = 'audio-capture:*';

// 方法 2: 自定义日志
const { AudioCapture } = require('node-windows-audio-capture');

AudioCapture.setLogLevel('debug');  // 如果支持
```

---

### 使用调试构建

```powershell
# 构建调试版本（包含调试符号）
node-gyp rebuild --debug

# 使用 node-inspector 调试
node --inspect-brk your-app.js
```

---

### 捕获详细错误信息

```javascript
capture.on('error', (error) => {
  console.error('错误详情:', {
    code: error.code,
    message: error.message,
    stack: error.stack
  });
  
  // 系统信息
  console.error('系统信息:', {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage()
  });
});
```

---

### 测试音频设备

```javascript
async function testAudioSetup() {
  console.log('=== 音频环境检测 ===\n');
  
  // 1. 检查设备
  const devices = await AudioCapture.getDevices();
  console.log(`检测到 ${devices.length} 个音频设备:`);
  devices.forEach(d => {
    console.log(`  - ${d.name} (${d.type})${d.isDefault ? ' [默认]' : ''}`);
  });
  
  // 2. 检查进程
  const processes = await AudioCapture.getProcesses();
  console.log(`\n检测到 ${processes.length} 个进程`);
  
  // 3. 测试捕获
  const testProcess = processes.find(p => p.name.includes('chrome'));
  if (testProcess) {
    console.log(`\n测试捕获: ${testProcess.name} (${testProcess.processId})`);
    
    const capture = new AudioCapture({ processId: testProcess.processId });
    
    let dataReceived = false;
    capture.on('data', () => { dataReceived = true; });
    
    await capture.start();
    await new Promise(r => setTimeout(r, 3000));
    capture.stop();
    
    console.log(`结果: ${dataReceived ? '✓ 成功' : '✗ 失败'}`);
  }
}

testAudioSetup();
```

---

## 性能问题

### CPU 使用率过高

**症状：** Node.js 进程 CPU 使用率超过 50%。

**诊断：**

```javascript
// 1. 性能分析
const startUsage = process.cpuUsage();

capture.on('data', (chunk) => {
  processAudioData(chunk);
  
  // 每 100 个数据包统计一次
  if (++count % 100 === 0) {
    const usage = process.cpuUsage(startUsage);
    const cpuPercent = (usage.user + usage.system) / 1000000 / 10 * 100;
    console.log(`CPU 使用率: ${cpuPercent.toFixed(2)}%`);
  }
});
```

**优化方案：**

1. 降低采样率
2. 使用 Worker Threads 处理音频
3. 减少不必要的数据复制

---

### 内存泄漏检测

```powershell
# 使用 --expose-gc 启动
node --expose-gc your-app.js
```

```javascript
// 内存泄漏检测
function checkMemoryLeak() {
  global.gc && global.gc();
  const before = process.memoryUsage().heapUsed;
  
  // 运行一段时间
  setTimeout(() => {
    global.gc && global.gc();
    const after = process.memoryUsage().heapUsed;
    const leak = after - before;
    
    if (leak > 10 * 1024 * 1024) {  // 10 MB
      console.warn(`可能存在内存泄漏: ${(leak / 1024 / 1024).toFixed(2)} MB`);
    }
  }, 60000);  // 1 分钟
}
```

---

## Electron 相关问题

### 问题 1: 模块版本不匹配

**错误：**

```
Error: The module was compiled against a different Node.js version
```

**解决：**

```powershell
# 重新构建
npm install --save-dev electron-rebuild
.\node_modules\.bin\electron-rebuild.cmd
```

---

### 问题 2: 渲染进程中使用

**错误：**

```
Error: Module did not self-register
```

**解决：**

原生模块只能在主进程中使用。如需在渲染进程中使用，需要通过 IPC 通信。

**主进程 (main.js)：**

```javascript
const { ipcMain } = require('electron');
const { AudioCapture } = require('node-windows-audio-capture');

ipcMain.handle('start-capture', async (event, processId) => {
  const capture = new AudioCapture({ processId });
  await capture.start();
  return 'started';
});
```

**渲染进程 (renderer.js)：**

```javascript
const { ipcRenderer } = require('electron');

async function startCapture(processId) {
  const result = await ipcRenderer.invoke('start-capture', processId);
  console.log(result);
}
```

---

## 获取帮助

### 提交 Issue

如果以上方案无法解决问题，请提交 Issue：

**GitHub Issues**: https://github.com/wujelly701/node-windows-audio-capture/issues

**提交时请包含：**

1. **错误信息**（完整的错误日志）
2. **系统信息**：
   ```javascript
   console.log({
     platform: process.platform,
     arch: process.arch,
     nodeVersion: process.version,
     electronVersion: process.versions.electron  // 如果使用 Electron
   });
   ```
3. **重现步骤**（最小化的可重现代码）
4. **已尝试的解决方案**

---

### 社区支持

- **GitHub Discussions**: https://github.com/wujelly701/node-windows-audio-capture/discussions
- **Stack Overflow**: 使用标签 `node-windows-audio-capture`

---

### 贡献

如果您解决了一个未记录的问题，欢迎提交 PR 更新本文档！

---

**最后更新**: 2025-10-13
