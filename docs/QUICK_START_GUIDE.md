# 🚀 快速入门指南 - node-windows-audio-capture v2.9.0

**适用版本**: v2.9.0  
**更新日期**: 2025-10-17  
**目标用户**: 所有需要 Windows 音频捕获的开发者

---

## 📋 目录

- [30 秒快速上手](#30-秒快速上手)
- [新功能: 麦克风捕获](#新功能-麦克风捕获)
- [安装](#安装)
- [核心功能概览](#核心功能概览)
- [基础使用](#基础使用)
- [进阶功能](#进阶功能)
- [完整示例](#完整示例)
- [常见问题](#常见问题)
- [更多资源](#更多资源)

---

## 30 秒快速上手

### 系统音频捕获

```javascript
const { AudioCapture, getProcesses } = require('node-windows-audio-capture');

// 1. 枚举进程
const processes = await getProcesses();
console.log('可用进程:', processes);

// 2. 选择 Chrome 进程
const chrome = processes.find(p => p.name.includes('chrome'));

// 3. 创建捕获实例
const capture = new AudioCapture({ processId: chrome.pid });

// 4. 启用音频效果
capture.setDenoiseEnabled(true);  // AI 降噪
capture.setAGCEnabled(true);      // 音量归一化
capture.setEQEnabled(true);       // 人声增强

// 5. 监听音频数据
capture.on('data', (event) => {
  const audioBuffer = event.buffer;  // Float32Array
  console.log('收到音频:', audioBuffer.length, '样本');
});

// 6. 启动捕获
await capture.start();
```

### 麦克风捕获 🎙️ (v2.9.0 新增)

```javascript
const { MicrophoneCapture } = require('node-windows-audio-capture');

// 1. 创建麦克风捕获实例
const mic = new MicrophoneCapture({
  denoise: true,  // RNNoise 降噪
  agc: true,      // 自动增益
  eq: true        // 均衡器
});

// 2. 监听音频数据
mic.on('data', (event) => {
  const audioBuffer = event.buffer;  // Float32Array
  console.log('麦克风音频:', audioBuffer.length, '样本');
});

// 3. 启动捕获
await mic.start();
```

**就这么简单！** 🎉

---

## 新功能: 麦克风捕获

### 🎙️ v2.9.0 新增完整麦克风捕获支持

```javascript
const { MicrophoneCapture, listDevices } = require('node-windows-audio-capture');

// 列出所有音频设备
const devices = await listDevices();
const microphones = devices.filter(d => !d.isLoopback);

console.log('可用麦克风:');
microphones.forEach(mic => {
  console.log(`  ${mic.name} (${mic.id})`);
});

// 选择特定麦克风
const mic = new MicrophoneCapture({
  deviceId: microphones[0].id,
  denoise: true,
  agc: true,
  eq: true
});

mic.on('data', (event) => {
  console.log('麦克风音频:', event.buffer.length, '样本');
});

await mic.start();
```

**适用场景**:
- ✅ 语音识别 (ASR)
- ✅ 实时翻译
- ✅ 会议录音
- ✅ 播客录制
- ✅ 语音助手

---

## 安装

### 方式 1: 从 GitHub Release 安装（推荐）

```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.9.0
```

**优势**:
- ✅ 包含预编译二进制文件（win32-x64）
- ✅ 无需 Visual Studio 或其他编译工具
- ✅ 安装即用

### 方式 2: 从 npm 安装（如已发布）

```bash
npm install node-windows-audio-capture@2.9.0
```

### 方式 3: 从源码安装（开发者）

```bash
git clone https://github.com/wujelly701/node-windows-audio-capture.git
cd node-windows-audio-capture
git checkout v2.9.0
npm install
npm run build
```

**要求**:
- Visual Studio 2017 或更高版本
- Windows SDK
- Python 3.x

---

## 核心功能概览

| 功能 | 版本 | 说明 | 用途 |
|------|-----|------|------|
| **进程级音频捕获** | v1.0 | 捕获指定进程的音频输出 | 精准捕获特定应用 |
| **动态静音控制** | v2.1 | 自动静音非目标进程 | 90%+ 音频纯度 |
| **ASR 格式转换** | v2.2 | Int16, 16kHz, Mono | 直连语音识别 API |
| **设备热插拔** | v2.3 | 自动检测设备变化 | 设备切换无需重启 |
| **高性能采样** | v2.5 | Kaiser 窗 Sinc 插值 | 42% 更快，-70dB 衰减 |
| **自适应缓冲池** | v2.6 | 动态调整内存池 | 371% Hit Rate 提升 |
| **RNNoise 降噪** | v2.7 | AI 深度学习降噪 | VAD + 实时降噪 |
| **AGC + 3-Band EQ** | v2.8 | 音量归一化 + 均衡器 | 专业音频处理 |
| **🎙️ 麦克风捕获** | v2.9 | 设备级麦克风录制 | 语音识别/翻译 |
| **🔊 Sinc 重采样** | v2.9 | 高质量 ASR 转换 | 显著提升音质 |
| **AI 降噪** | v2.7 | RNNoise 深度学习 | 实时消除背景噪音 |
| **AGC 音量归一化** | v2.8 | RMS 自动增益控制 | 稳定输出音量 |
| **3-Band EQ** | v2.8 | 低/中/高频均衡 | 优化音质/人声 |

---

## 基础使用

### 1. 枚举音频进程

```javascript
const { getProcesses } = require('node-windows-audio-capture');

// 获取所有有音频输出的进程
const processes = await getProcesses();

processes.forEach(proc => {
  console.log(`进程: ${proc.name}`);
  console.log(`  PID: ${proc.pid}`);
  console.log(`  音频会话: ${proc.audioSessionCount}`);
});

// 输出示例:
// 进程: chrome.exe
//   PID: 12345
//   音频会话: 2
// 进程: potplayer.exe
//   PID: 6789
//   音频会话: 1
```

### 2. 创建音频捕获实例

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({
  processId: 12345,           // 目标进程 PID
  sampleRate: 48000,          // 采样率 (Hz)
  channels: 2,                // 声道数 (1=单声道, 2=立体声)
  // WASAPI 始终输出 Float32 格式
  useExternalBuffer: true,    // 使用外部缓冲池
  bufferPoolStrategy: 'adaptive'  // 自适应缓冲池策略
});
```

### 3. 监听音频数据

```javascript
capture.on('data', (event) => {
  const audioBuffer = event.buffer;  // Float32Array 或 Int16Array
  const timestamp = event.timestamp; // 时间戳（毫秒）
  const frameCount = event.frameCount; // 帧数
  
  // 处理音频数据
  processAudio(audioBuffer);
});
```

### 4. 启动和停止

```javascript
// 启动捕获
await capture.start();
console.log('✅ 音频捕获已启动');

// 停止捕获
await capture.stop();
console.log('⏹️ 音频捕获已停止');
```

### 5. 错误处理

```javascript
capture.on('error', (error) => {
  console.error('错误:', error.message);
  console.error('错误码:', error.code);
  
  switch (error.code) {
    case 'PROCESS_NOT_FOUND':
      console.log('目标进程已关闭');
      break;
    case 'AUDIO_DEVICE_ERROR':
      console.log('音频设备错误');
      break;
    case 'INVALID_STATE':
      console.log('状态无效');
      break;
    default:
      console.log('未知错误');
  }
});
```

---

## 进阶功能

### v2.1: 动态静音控制

**自动隔离非目标进程，确保 90%+ 音频纯度**

```javascript
// 启用动态静音
capture.setMuteOtherProcesses(true);

// 设置白名单（允许这些进程发声）
const allowList = [12345, 67890];  // 允许的 PID
capture.setAllowList(allowList);

// 设置黑名单（强制静音这些进程）
const blockList = [11111, 22222];  // 要屏蔽的 PID
capture.setBlockList(blockList);

// 查询当前状态
const isMuting = capture.isMutingOtherProcesses();  // true/false
const currentAllowList = capture.getAllowList();     // [12345, 67890]
const currentBlockList = capture.getBlockList();     // [11111, 22222]
```

**使用场景**:
- 🎮 游戏录制 - 只录游戏音，屏蔽 QQ/微信
- 📹 会议录制 - 只录 Zoom 音频，屏蔽音乐播放器
- 🎬 视频翻译 - 只捕获浏览器标签页音频

---

### v2.7: AI 降噪（RNNoise）

**实时消除键盘声、风扇声、背景噪音**

```javascript
// 启用 AI 降噪
capture.setDenoiseEnabled(true);

// 检查降噪状态
const isEnabled = capture.getDenoiseEnabled();  // true

// 获取降噪统计信息
const stats = capture.getDenoiseStats();
console.log('降噪统计:');
console.log('  VAD 概率:', (stats.vadProbability * 100).toFixed(1) + '%');
console.log('  处理帧数:', stats.framesProcessed);

// 输出示例:
// 降噪统计:
//   VAD 概率: 87.3%
//   处理帧数: 48000
```

**VAD (Voice Activity Detection)**:
- **0-30%**: 噪音（风扇、空调）
- **30-70%**: 混合（音乐、环境声）
- **70-100%**: 清晰语音

**性能**:
- 延迟: < 10ms
- CPU: < 5%
- 内存: ~4 KB

---

### v2.8: AGC 音量归一化

**自动调整音量，避免忽大忽小**

```javascript
// 启用 AGC
capture.setAGCEnabled(true);

// 配置 AGC 参数
capture.setAGCOptions({
  targetLevel: -18,    // 目标音量 (dBFS, -30 到 0)
  maxGain: 25,         // 最大增益 (dB, 0 到 50)
  minGain: -5,         // 最小增益 (dB, -20 到 0)
  attackTime: 10,      // 响应时间 (ms, 5 到 200)
  releaseTime: 100     // 释放时间 (ms, 50 到 500)
});

// 获取当前配置
const options = capture.getAGCOptions();
console.log('AGC 配置:', options);

// 获取实时统计
const stats = capture.getAGCStats();
console.log('AGC 统计:');
console.log('  当前增益:', stats.currentGain.toFixed(2), 'dB');
console.log('  平均音量:', stats.averageLevel.toFixed(2), 'dBFS');
console.log('  是否削波:', stats.clipping);

// 输出示例:
// AGC 统计:
//   当前增益: 12.34 dB
//   平均音量: -18.56 dBFS
//   是否削波: false
```

**推荐配置**:

| 场景 | targetLevel | maxGain | attackTime | releaseTime |
|------|-------------|---------|------------|-------------|
| 语音聊天 | -18 | 25 | 8 | 80 |
| 音乐播放 | -20 | 15 | 20 | 150 |
| 游戏音频 | -20 | 20 | 12 | 100 |
| 会议录音 | -18 | 30 | 10 | 100 |

---

### v2.8: 3-Band EQ 均衡器

**调整低/中/高频，优化音质**

```javascript
// 启用 EQ
capture.setEQEnabled(true);

// 设置各频段增益
capture.setEQBandGain('low', 6);    // 低频 +6 dB (< 500 Hz)
capture.setEQBandGain('mid', 0);    // 中频 0 dB (500-4000 Hz)
capture.setEQBandGain('high', 3);   // 高频 +3 dB (> 4000 Hz)

// 获取增益值
const lowGain = capture.getEQBandGain('low');    // 6
const midGain = capture.getEQBandGain('mid');    // 0
const highGain = capture.getEQBandGain('high');  // 3

// 获取 EQ 统计
const stats = capture.getEQStats();
console.log('EQ 统计:', stats);
// 输出: { enabled: true, lowGain: 6, midGain: 0, highGain: 3, framesProcessed: 96000 }
```

**EQ 预设**:

**1. 流行音乐** - 增强低音和高音
```javascript
capture.setEQBandGain('low', 6);
capture.setEQBandGain('mid', 0);
capture.setEQBandGain('high', 3);
```

**2. 人声增强** - 突出中频人声
```javascript
capture.setEQBandGain('low', -3);   // 减少低频噪音
capture.setEQBandGain('mid', 5);    // 增强人声
capture.setEQBandGain('high', 2);   // 轻微增强清晰度
```

**3. 古典音乐** - 平衡加高频细节
```javascript
capture.setEQBandGain('low', 2);
capture.setEQBandGain('mid', 0);
capture.setEQBandGain('high', 4);
```

**4. 电子音乐** - 重低音加高频
```javascript
capture.setEQBandGain('low', 10);
capture.setEQBandGain('mid', -2);
capture.setEQBandGain('high', 6);
```

---

### v2.2: ASR 格式转换

**一行代码转为语音识别友好格式**

```javascript
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

// 创建转换管道（阿里云 ASR 预设）
const pipeline = new AudioProcessingPipeline('china-asr', {
  quality: 'sinc'  // v2.5 高性能 Sinc 插值
});

capture.on('data', (event) => {
  // 原始: Float32, 48kHz, Stereo - 920 KB/秒
  const rawAudio = event.buffer;
  
  // 转换: Int16, 16kHz, Mono - 76.8 KB/秒
  const asrAudio = pipeline.process(rawAudio);
  
  // 直接发送到 ASR API
  sendToASR(asrAudio);
});
```

**性能指标**:
- 压缩比: 12:1 (920 KB → 76.8 KB)
- 延迟: < 3ms (v2.5 优化)
- CPU: < 3%

**支持的 ASR 预设**:
- `china-asr` - 阿里云/百度/腾讯
- `openai-whisper` - OpenAI Whisper
- `azure-speech` - Azure Speech
- `google-cloud` - Google Cloud Speech
- `aws-transcribe` - AWS Transcribe
- `generic-asr` - 通用配置

---

### v2.6: 缓冲池管理

**查询缓冲池统计信息**

```javascript
const stats = capture.getPoolStats();

console.log('缓冲池统计:');
console.log('  分配次数:', stats.allocations);
console.log('  重用次数:', stats.reuses);
console.log('  重用率:', (stats.reuseRate * 100).toFixed(2) + '%');
console.log('  当前池大小:', stats.currentPoolSize);

// 输出示例:
// 缓冲池统计:
//   分配次数: 1000
//   重用次数: 950
//   重用率: 95.00%
//   当前池大小: 120
```

**v2.6 自适应池优势**:
- 自动调整池大小（50-200）
- Hit Rate 提升 371.6% (0.67% → 3.14%)
- 无需手动调参

---

## 完整示例

### 示例 1: 语音识别（Whisper API）

```javascript
const { AudioCapture, getProcesses } = require('node-windows-audio-capture');
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');
const axios = require('axios');

async function startSpeechRecognition() {
  // 1. 枚举进程
  const processes = await getProcesses();
  const chrome = processes.find(p => p.name.includes('chrome'));
  
  if (!chrome) {
    console.error('未找到 Chrome 进程');
    return;
  }

  // 2. 创建捕获实例
  const capture = new AudioCapture({
    processId: chrome.pid,
    useExternalBuffer: true,
    bufferPoolStrategy: 'adaptive'
  });

  // 3. 启用 AI 处理
  capture.setDenoiseEnabled(true);   // AI 降噪
  capture.setAGCEnabled(true);       // 音量归一化
  capture.setAGCOptions({
    targetLevel: -18,
    maxGain: 25,
    attackTime: 10,
    releaseTime: 100
  });
  capture.setEQEnabled(true);        // 人声增强
  capture.setEQBandGain('low', -3);
  capture.setEQBandGain('mid', 5);
  capture.setEQBandGain('high', 2);
  capture.setMuteOtherProcesses(true);  // 隔离其他进程

  // 4. 创建 ASR 转换管道
  const pipeline = new AudioProcessingPipeline('openai-whisper', {
    quality: 'sinc'
  });

  // 5. 音频缓冲
  let audioQueue = [];
  const BATCH_SIZE = 10;  // 累积 10 个音频块再发送

  capture.on('data', (event) => {
    // 转换为 ASR 格式
    const asrAudio = pipeline.process(event.buffer);
    audioQueue.push(asrAudio);

    // 达到批量大小，发送到 Whisper
    if (audioQueue.length >= BATCH_SIZE) {
      const mergedAudio = mergeAudioBuffers(audioQueue);
      sendToWhisper(mergedAudio);
      audioQueue = [];
    }
  });

  // 6. 监听统计
  setInterval(() => {
    const denoiseStats = capture.getDenoiseStats();
    const agcStats = capture.getAGCStats();
    const eqStats = capture.getEQStats();

    console.log(`🔇 降噪 VAD: ${(denoiseStats.vadProbability * 100).toFixed(1)}%`);
    console.log(`⚡ AGC 增益: ${agcStats.currentGain.toFixed(2)} dB`);
    console.log(`🎛️ EQ: Low ${eqStats.lowGain}dB, Mid ${eqStats.midGain}dB, High ${eqStats.highGain}dB`);
  }, 2000);

  // 7. 启动
  await capture.start();
  console.log('✅ 语音识别已启动');

  // 8. 错误处理
  capture.on('error', (error) => {
    console.error('错误:', error.message);
  });
}

// 发送到 Whisper API
async function sendToWhisper(audioBuffer) {
  try {
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', {
      file: audioBuffer,
      model: 'whisper-1'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    const text = response.data.text;
    console.log('识别结果:', text);
  } catch (error) {
    console.error('Whisper API 错误:', error.message);
  }
}

// 合并音频缓冲区
function mergeAudioBuffers(buffers) {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
  const merged = new Int16Array(totalLength);
  let offset = 0;
  
  for (const buffer of buffers) {
    merged.set(buffer, offset);
    offset += buffer.length;
  }
  
  return merged;
}

// 启动
startSpeechRecognition();
```

---

### 示例 2: 实时字幕翻译

```javascript
const { AudioCapture, getProcesses } = require('node-windows-audio-capture');
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

async function startRealtimeSubtitles() {
  // 1. 选择进程
  const processes = await getProcesses();
  console.log('可用进程:');
  processes.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (PID: ${p.pid})`);
  });

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('选择进程编号: ', async (answer) => {
    const index = parseInt(answer) - 1;
    const selectedProcess = processes[index];
    
    if (!selectedProcess) {
      console.error('无效选择');
      process.exit(1);
    }

    // 2. 创建捕获实例
    const capture = new AudioCapture({
      processId: selectedProcess.pid,
      useExternalBuffer: true,
      bufferPoolStrategy: 'adaptive'
    });

    // 3. 完整 AI 处理链
    capture.setDenoiseEnabled(true);
    capture.setAGCEnabled(true);
    capture.setAGCOptions({
      targetLevel: -20,
      maxGain: 20,
      attackTime: 12,
      releaseTime: 100
    });
    capture.setEQEnabled(true);
    capture.setEQBandGain('low', 2);
    capture.setEQBandGain('mid', 0);
    capture.setEQBandGain('high', 3);
    capture.setMuteOtherProcesses(true);

    // 4. ASR 转换
    const pipeline = new AudioProcessingPipeline('china-asr', {
      quality: 'sinc'
    });

    // 5. 音频数据处理
    capture.on('data', (event) => {
      const asrAudio = pipeline.process(event.buffer);
      
      // 发送到 ASR 引擎（这里用阿里云 Gummy）
      sendToGummyEngine(asrAudio);
    });

    // 6. 启动
    await capture.start();
    console.log(`✅ 正在捕获: ${selectedProcess.name} (PID: ${selectedProcess.pid})`);
    console.log('按 Ctrl+C 停止...');

    // 7. 停止处理
    process.on('SIGINT', async () => {
      await capture.stop();
      console.log('\n⏹️ 已停止');
      process.exit(0);
    });

    readline.close();
  });
}

// 发送到阿里云 Gummy（示例）
function sendToGummyEngine(audioBuffer) {
  // 实现 WebSocket 连接和发送逻辑
  // 参考: docs/TRANSLATION_SOFTWARE_INTEGRATION.md
}

startRealtimeSubtitles();
```

---

### 示例 3: 音频录制保存

```javascript
const { AudioCapture, getProcesses } = require('node-windows-audio-capture');
const fs = require('fs');

async function recordAudio(processName, duration = 10) {
  // 1. 查找进程
  const processes = await getProcesses();
  const target = processes.find(p => 
    p.name.toLowerCase().includes(processName.toLowerCase())
  );

  if (!target) {
    console.error(`未找到进程: ${processName}`);
    return;
  }

  // 2. 创建捕获实例
  const capture = new AudioCapture({
    processId: target.pid,
    sampleRate: 48000,
    channels: 2,
    format: 'float32'
  });

  // 3. 启用 AI 处理
  capture.setDenoiseEnabled(true);
  capture.setAGCEnabled(true);
  capture.setEQEnabled(true);

  // 4. 收集音频数据
  const audioChunks = [];
  
  capture.on('data', (event) => {
    audioChunks.push(Buffer.from(event.buffer.buffer));
  });

  // 5. 启动录制
  await capture.start();
  console.log(`✅ 开始录制: ${target.name} (${duration} 秒)`);

  // 6. 定时停止
  setTimeout(async () => {
    await capture.stop();
    
    // 7. 保存为 WAV 文件
    const wavBuffer = createWavFile(audioChunks, 48000, 2);
    fs.writeFileSync('output.wav', wavBuffer);
    
    console.log('✅ 录制完成: output.wav');
  }, duration * 1000);
}

// 创建 WAV 文件
function createWavFile(chunks, sampleRate, channels) {
  const dataLength = chunks.reduce((sum, buf) => sum + buf.length, 0);
  const wavHeader = Buffer.alloc(44);
  
  // RIFF header
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + dataLength, 4);
  wavHeader.write('WAVE', 8);
  
  // fmt chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(3, 20);  // IEEE float
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(sampleRate * channels * 4, 28);
  wavHeader.writeUInt16LE(channels * 4, 32);
  wavHeader.writeUInt16LE(32, 34);
  
  // data chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataLength, 40);
  
  return Buffer.concat([wavHeader, ...chunks]);
}

// 使用示例
recordAudio('chrome', 10);  // 录制 Chrome 音频 10 秒
```

---

## 常见问题

### Q1: 安装时提示需要编译？

**A**: 使用 v2.8.0 GitHub Release，包含预编译二进制：

```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.8.0
```

如果仍然需要编译，确保安装：
- Visual Studio 2017+
- Windows SDK
- Python 3.x

---

### Q2: 无法捕获 Chrome 标签页音频？

**A**: Chrome 使用多进程架构，需要保护所有子进程：

```javascript
const processes = await getProcesses();
const chromePids = processes
  .filter(p => p.name.toLowerCase() === 'chrome.exe')
  .map(p => p.pid);

capture.setAllowList(chromePids);
capture.setMuteOtherProcesses(true);
```

---

### Q3: 音频有杂音或回声？

**A**: 启用 AI 降噪和 EQ：

```javascript
capture.setDenoiseEnabled(true);
capture.setEQEnabled(true);
capture.setEQBandGain('low', -3);  // 减少低频噪音
```

---

### Q4: 音量忽大忽小？

**A**: 启用 AGC 音量归一化：

```javascript
capture.setAGCEnabled(true);
capture.setAGCOptions({
  targetLevel: -18,
  maxGain: 25,
  attackTime: 10,
  releaseTime: 100
});
```

---

### Q5: 如何选择合适的 Buffer Pool 策略？

**A**: 
- **fixed**: 固定大小，适合稳定负载
- **adaptive**: 自动调整，适合变化负载（推荐）

```javascript
const capture = new AudioCapture({
  bufferPoolStrategy: 'adaptive',  // 推荐
  bufferPoolSize: 50,              // 初始大小
  bufferPoolMin: 50,
  bufferPoolMax: 200
});
```

---

### Q6: WASAPI 输出什么格式？如何转换？

**A**: 
WASAPI 音频引擎**始终输出 Float32 格式**，这是 Windows 的固定行为，无法通过配置修改。

**默认格式**:
- **数据类型**: Float32 (32-bit 浮点)
- **取值范围**: -1.0 ~ 1.0
- **采样率**: 48000 Hz (可配置)
- **声道数**: 2 (Stereo, 可配置)

**如需其他格式（如 Int16），使用 AudioProcessingPipeline**:

```javascript
const { AudioCapture } = require('node-windows-audio-capture');
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

// WASAPI 捕获（Float32, 48kHz, Stereo）
const capture = new AudioCapture({ processId: 1234 });

// 格式转换管道（Int16, 16kHz, Mono）
const pipeline = new AudioProcessingPipeline('china-asr', {
  quality: 'sinc'  // 推荐：最高质量
});

capture.on('data', (event) => {
  const int16Buffer = pipeline.process(event.buffer);
  sendToASR(int16Buffer);  // 发送 Int16 数据
});
```

---

### Q7: 如何降低 CPU 占用？

**A**: 
1. 禁用不需要的功能
2. 使用较低的采样率
3. 使用 AudioProcessingPipeline 转换为轻量格式

```javascript
const capture = new AudioCapture({
  sampleRate: 16000,         // 降低采样率
  channels: 1,               // 单声道
  useExternalBuffer: true,
  bufferPoolStrategy: 'adaptive'
});

// 仅启用必要的功能
capture.setDenoiseEnabled(false);  // 如不需要降噪
capture.setAGCEnabled(true);       // AGC 很轻量
capture.setEQEnabled(false);       // 如不需要 EQ

// 如需 Int16 格式，使用 Pipeline 转换
const pipeline = new AudioProcessingPipeline('china-asr', {
  quality: 'linear'  // 使用较快的线性插值（vs sinc）
});
```

---

### Q8: 如何查看性能统计？

**A**: 

```javascript
// 每 2 秒输出统计信息
setInterval(() => {
  const denoiseStats = capture.getDenoiseStats();
  const agcStats = capture.getAGCStats();
  const eqStats = capture.getEQStats();
  const poolStats = capture.getPoolStats();

  console.log('=== 性能统计 ===');
  
  if (denoiseStats) {
    console.log(`降噪 VAD: ${(denoiseStats.vadProbability * 100).toFixed(1)}%`);
    console.log(`降噪帧数: ${denoiseStats.framesProcessed}`);
  }
  
  if (agcStats) {
    console.log(`AGC 增益: ${agcStats.currentGain.toFixed(2)} dB`);
    console.log(`AGC 输入: ${agcStats.averageLevel.toFixed(2)} dBFS`);
  }
  
  if (eqStats) {
    console.log(`EQ 状态: ${eqStats.enabled ? '✅' : '❌'}`);
    console.log(`EQ 帧数: ${eqStats.framesProcessed}`);
  }
  
  if (poolStats) {
    console.log(`缓冲池重用率: ${(poolStats.reuseRate * 100).toFixed(2)}%`);
    console.log(`缓冲池大小: ${poolStats.currentPoolSize}`);
  }
}, 2000);
```

---

## 更多资源

### 📚 文档

- **完整 API 文档**: [docs/api.md](./api.md)
- **翻译软件集成指南**: [docs/TRANSLATION_SOFTWARE_INTEGRATION.md](./TRANSLATION_SOFTWARE_INTEGRATION.md)
- **v2.8 发布说明**: [RELEASE_v2.8.0.md](../RELEASE_v2.8.0.md)
- **v2.7 降噪指南**: [docs/V2.7_RELEASE_NOTES.md](./V2.7_RELEASE_NOTES.md)
- **v2.2 ASR 集成**: [docs/V2.2_RELEASE_NOTES.md](./V2.2_RELEASE_NOTES.md)
- **v2.1 静音控制**: [docs/V2.1_RELEASE_NOTES.md](./V2.1_RELEASE_NOTES.md)

### 💻 示例代码

- [examples/basic-capture.js](../examples/basic-capture.js) - 基础捕获
- [examples/agc-example.js](../examples/agc-example.js) - AGC 示例
- [examples/eq-example.js](../examples/eq-example.js) - EQ 示例
- [examples/format-conversion-example.js](../examples/format-conversion-example.js) - ASR 格式转换
- [examples/process-capture.js](../examples/process-capture.js) - 进程捕获

### 🔗 链接

- **GitHub 仓库**: https://github.com/wujelly701/node-windows-audio-capture
- **Issues**: https://github.com/wujelly701/node-windows-audio-capture/issues
- **Releases**: https://github.com/wujelly701/node-windows-audio-capture/releases

---

## 🎉 总结

**node-windows-audio-capture v2.8.0** 提供：

✅ **进程级音频捕获** - 精准捕获特定应用  
✅ **动态静音控制** - 90%+ 音频纯度  
✅ **AI 降噪** - RNNoise 实时降噪  
✅ **AGC 音量归一化** - 自动稳定音量  
✅ **3-Band EQ** - 优化音质和人声  
✅ **ASR 格式转换** - 一行代码转换  
✅ **零配置安装** - 预编译二进制  

**完整音频处理链**:
```
Process Capture → Dynamic Mute (v2.1) → 
Denoise (v2.7) → AGC (v2.8) → EQ (v2.8) → 
ASR Format (v2.2) → Your Application
```

**性能指标**:
- 音频延迟: < 100ms
- 格式转换: < 3ms
- CPU 占用: < 6%
- 内存占用: ~5 KB
- 音频纯度: 90%+

**开始使用**:
```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.8.0
```

祝开发顺利！🚀
