# 大模型LLM实时桌面翻译软件 - 音频捕获集成指南

## 📋 文档信息

**版本**: v1.0  
**创建日期**: 2025-10-16  
**适用库版本**: node-windows-audio-capture v2.8.0  
**目标软件**: 大模型LLM实时桌面翻译软件

---

## 🎯 核心优势

使用 `node-windows-audio-capture` v2.8.0 为您的翻译软件提供：

| 功能特性 | v2.8.0 能力 | 翻译软件应用场景 |
|---------|-----------|---------------|
| **精准音频捕获** | 进程级 PID 捕获 | 精准捕获 Chrome/Zoom/PotPlayer 音频 |
| **动态静音控制** | v2.1 自动隔离 | 90%+ 音频纯度，消除背景噪音 |
| **AI 降噪** | RNNoise v2.7 | 消除键盘声、风扇声、环境噪音 |
| **AGC 音量归一化** | v2.8 自动增益 | 稳定音量输入，避免翻译中断 |
| **3-Band EQ** | v2.8 频率均衡 | 增强人声清晰度，优化 ASR 识别 |
| **ASR 格式转换** | v2.2 一行代码 | Int16 16kHz Mono，直连阿里 Gummy |
| **零配置安装** | 预编译二进制 | 无需 Visual Studio，npm install 即用 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 从 GitHub Release 安装（推荐，包含预编译二进制）
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.8.0

# 或从 npm（如已发布）
npm install node-windows-audio-capture@2.8.0
```

**无需 Visual Studio！** v2.8.0 包含预编译的 win32-x64 二进制文件。

---

### 2. 核心代码架构

#### 2.1 音频捕获模块 (`audio-capture-module.js`)

```javascript
const { AudioCapture, getProcesses } = require('node-windows-audio-capture');
const EventEmitter = require('events');

/**
 * 翻译软件音频捕获管理器
 * 负责：进程选择、音频捕获、格式转换、AI 处理
 */
class TranslationAudioCapture extends EventEmitter {
  constructor() {
    super();
    this.capture = null;
    this.currentProcessId = null;
    this.isCapturing = false;
    
    // 音频处理配置
    this.audioConfig = {
      sampleRate: 48000,
      channels: 2,
      format: 'float32',
      
      // v2.7 AI 降噪
      denoiseEnabled: true,
      
      // v2.8 AGC 音量归一化（针对翻译场景优化）
      agcEnabled: true,
      agcOptions: {
        targetLevel: -18,   // 目标音量 (dBFS)
        maxGain: 25,        // 最大增益 (dB)
        minGain: -5,        // 最小增益 (dB)
        attackTime: 10,     // 快速响应
        releaseTime: 100    // 平滑释放
      },
      
      // v2.8 EQ 人声增强（优化 ASR 识别率）
      eqEnabled: true,
      eqPreset: 'voice',  // 人声预设
      
      // v2.1 动态静音控制
      muteOtherProcesses: true
    };
  }

  /**
   * 枚举所有可用的音频进程
   * 用于窗口选择器显示
   */
  async getAvailableProcesses() {
    try {
      const processes = await getProcesses();
      
      // 过滤并排序（正在播放音频的优先）
      return processes
        .filter(p => p.audioSessionCount > 0)  // 只显示有音频的进程
        .sort((a, b) => {
          // 常见应用优先
          const priority = ['chrome', 'firefox', 'edge', 'potplayer', 'zoom', 'teams'];
          const aPriority = priority.findIndex(name => a.name.toLowerCase().includes(name));
          const bPriority = priority.findIndex(name => b.name.toLowerCase().includes(name));
          
          if (aPriority !== -1 && bPriority === -1) return -1;
          if (aPriority === -1 && bPriority !== -1) return 1;
          if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
          
          return 0;
        })
        .map(p => ({
          pid: p.pid,
          name: p.name,
          audioSessionCount: p.audioSessionCount,
          isPlayingAudio: p.audioSessionCount > 0,
          // 添加友好名称
          displayName: this.getProcessDisplayName(p.name)
        }));
    } catch (error) {
      console.error('枚举进程失败:', error);
      this.emit('error', { code: 'ENUM_PROCESS_FAILED', message: error.message });
      return [];
    }
  }

  /**
   * 获取进程的友好显示名称
   */
  getProcessDisplayName(processName) {
    const nameMap = {
      'chrome.exe': 'Google Chrome',
      'firefox.exe': 'Mozilla Firefox',
      'msedge.exe': 'Microsoft Edge',
      'potplayermini64.exe': 'PotPlayer',
      'zoom.exe': 'Zoom Meeting',
      'teams.exe': 'Microsoft Teams',
      'vlc.exe': 'VLC Media Player',
      'spotify.exe': 'Spotify'
    };
    
    return nameMap[processName.toLowerCase()] || processName;
  }

  /**
   * 启动音频捕获
   * @param {number} processId - 目标进程 PID
   * @param {Object} options - 可选配置
   */
  async startCapture(processId, options = {}) {
    if (this.isCapturing) {
      console.warn('音频捕获已在运行，先停止当前捕获');
      await this.stopCapture();
    }

    try {
      // 合并配置
      const config = { ...this.audioConfig, ...options };

      // 创建音频捕获实例
      this.capture = new AudioCapture({
        processId: processId,
        sampleRate: config.sampleRate,
        channels: config.channels,
        format: config.format,
        useExternalBuffer: true,
        bufferPoolStrategy: 'adaptive'  // v2.6 自适应缓冲池
      });

      // 配置 v2.7 AI 降噪
      if (config.denoiseEnabled) {
        this.capture.setDenoiseEnabled(true);
        console.log('✅ AI 降噪已启用');
      }

      // 配置 v2.8 AGC 音量归一化
      if (config.agcEnabled) {
        this.capture.setAGCEnabled(true);
        this.capture.setAGCOptions(config.agcOptions);
        console.log('✅ AGC 音量归一化已启用');
      }

      // 配置 v2.8 EQ 人声增强
      if (config.eqEnabled) {
        this.setupVoiceEQ();
        console.log('✅ EQ 人声增强已启用');
      }

      // 配置 v2.1 动态静音控制
      if (config.muteOtherProcesses) {
        this.capture.setMuteOtherProcesses(true);
        
        // 保护目标进程的所有子进程（如 Chrome）
        const processes = await getProcesses();
        const targetProcess = processes.find(p => p.pid === processId);
        
        if (targetProcess) {
          const sameNameProcesses = processes
            .filter(p => p.name.toLowerCase() === targetProcess.name.toLowerCase())
            .map(p => p.pid);
          
          this.capture.setAllowList(sameNameProcesses);
          console.log(`✅ 保护进程: ${targetProcess.name} (${sameNameProcesses.length} 个)`);
        }
      }

      // 监听音频数据
      this.capture.on('data', this.handleAudioData.bind(this));

      // 监听错误
      this.capture.on('error', (error) => {
        console.error('音频捕获错误:', error);
        this.emit('error', error);
      });

      // 启动捕获
      await this.capture.start();
      
      this.currentProcessId = processId;
      this.isCapturing = true;

      console.log(`✅ 音频捕获已启动 (PID: ${processId})`);
      this.emit('capture-started', { processId });

      // 定期输出统计信息
      this.startStatsMonitoring();

    } catch (error) {
      console.error('启动音频捕获失败:', error);
      this.emit('error', { code: 'CAPTURE_START_FAILED', message: error.message });
      throw error;
    }
  }

  /**
   * 配置 EQ 人声增强预设
   * 优化 ASR 识别率
   */
  setupVoiceEQ() {
    this.capture.setEQEnabled(true);
    
    // 人声优化 EQ 设置
    this.capture.setEQBandGain('low', -3);   // 减少低频噪音（空调、风扇）
    this.capture.setEQBandGain('mid', 5);    // 增强人声频段 (500-4000 Hz)
    this.capture.setEQBandGain('high', 2);   // 轻微增强清晰度
  }

  /**
   * 处理音频数据
   * 转换为 ASR 友好格式并发送给翻译引擎
   */
  handleAudioData(event) {
    try {
      // 原始音频：Float32, 48kHz, Stereo
      const rawAudio = event.buffer;
      
      // 转换为 ASR 格式：Int16, 16kHz, Mono
      const asrAudio = this.convertToASRFormat(rawAudio);
      
      // 发送给翻译引擎
      this.emit('audio-data', {
        raw: rawAudio,        // 原始数据（如需录制）
        asr: asrAudio,        // ASR 就绪数据（发送给 Gummy）
        timestamp: Date.now(),
        processId: this.currentProcessId
      });
      
    } catch (error) {
      console.error('音频数据处理失败:', error);
      this.emit('error', { code: 'AUDIO_PROCESS_FAILED', message: error.message });
    }
  }

  /**
   * 转换音频格式为 ASR 友好格式
   * Float32 48kHz Stereo → Int16 16kHz Mono
   */
  convertToASRFormat(float32Buffer) {
    // 假设输入: Float32Array, 48kHz, Stereo
    const samplesPerChannel = float32Buffer.length / 2;
    
    // 1. 立体声转单声道（平均左右声道）
    const mono48k = new Float32Array(samplesPerChannel);
    for (let i = 0; i < samplesPerChannel; i++) {
      mono48k[i] = (float32Buffer[i * 2] + float32Buffer[i * 2 + 1]) / 2;
    }
    
    // 2. 降采样 48kHz → 16kHz（3:1）
    const mono16k = this.downsample(mono48k, 48000, 16000);
    
    // 3. Float32 → Int16
    const int16Buffer = new Int16Array(mono16k.length);
    for (let i = 0; i < mono16k.length; i++) {
      // 限幅并转换
      const clamped = Math.max(-1, Math.min(1, mono16k[i]));
      int16Buffer[i] = Math.round(clamped * 32767);
    }
    
    return int16Buffer;
  }

  /**
   * 简单降采样（线性插值）
   * 生产环境建议使用 v2.2 AudioProcessingPipeline 的 Sinc 插值
   */
  downsample(input, inputRate, outputRate) {
    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = Math.min(srcFloor + 1, input.length - 1);
      const t = srcIndex - srcFloor;
      
      // 线性插值
      output[i] = input[srcFloor] * (1 - t) + input[srcCeil] * t;
    }
    
    return output;
  }

  /**
   * 停止音频捕获
   */
  async stopCapture() {
    if (!this.isCapturing) {
      console.warn('音频捕获未运行');
      return;
    }

    try {
      if (this.capture) {
        await this.capture.stop();
        this.capture = null;
      }

      this.isCapturing = false;
      this.currentProcessId = null;

      // 停止统计监控
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }

      console.log('✅ 音频捕获已停止');
      this.emit('capture-stopped');

    } catch (error) {
      console.error('停止音频捕获失败:', error);
      this.emit('error', { code: 'CAPTURE_STOP_FAILED', message: error.message });
    }
  }

  /**
   * 启动统计监控
   * 定期输出 Denoise/AGC/EQ 统计信息
   */
  startStatsMonitoring() {
    this.statsInterval = setInterval(() => {
      if (!this.capture || !this.isCapturing) return;

      try {
        // v2.7 降噪统计
        const denoiseStats = this.capture.getDenoiseStats();
        
        // v2.8 AGC 统计
        const agcStats = this.capture.getAGCStats();
        
        // v2.8 EQ 统计
        const eqStats = this.capture.getEQStats();

        // 发送统计事件
        this.emit('stats', {
          denoise: denoiseStats,
          agc: agcStats,
          eq: eqStats,
          timestamp: Date.now()
        });

        // 控制台输出（调试用）
        if (denoiseStats) {
          console.log(`🔇 降噪 - VAD: ${(denoiseStats.vadProbability * 100).toFixed(1)}%`);
        }
        if (agcStats) {
          console.log(`⚡ AGC - 增益: ${agcStats.currentGain.toFixed(2)} dB, 输入: ${agcStats.averageLevel.toFixed(2)} dBFS`);
        }
        if (eqStats) {
          console.log(`🎛️ EQ - Low: ${eqStats.lowGain} dB, Mid: ${eqStats.midGain} dB, High: ${eqStats.highGain} dB`);
        }

      } catch (error) {
        console.error('获取统计信息失败:', error);
      }

    }, 2000);  // 每 2 秒输出一次
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.audioConfig };
  }

  /**
   * 更新配置（运行时动态调整）
   */
  async updateConfig(newConfig) {
    Object.assign(this.audioConfig, newConfig);

    // 如果正在运行，应用新配置
    if (this.isCapturing && this.capture) {
      // 动态更新 Denoise
      if ('denoiseEnabled' in newConfig) {
        this.capture.setDenoiseEnabled(newConfig.denoiseEnabled);
      }

      // 动态更新 AGC
      if ('agcEnabled' in newConfig) {
        this.capture.setAGCEnabled(newConfig.agcEnabled);
      }
      if ('agcOptions' in newConfig) {
        this.capture.setAGCOptions(newConfig.agcOptions);
      }

      // 动态更新 EQ
      if ('eqEnabled' in newConfig) {
        this.capture.setEQEnabled(newConfig.eqEnabled);
      }

      console.log('✅ 配置已更新');
      this.emit('config-updated', newConfig);
    }
  }
}

module.exports = TranslationAudioCapture;
```

---

#### 2.2 窗口选择器集成 (`window-selector.js`)

```javascript
const TranslationAudioCapture = require('./audio-capture-module');

/**
 * 窗口选择器 UI 控制器
 */
class WindowSelector {
  constructor() {
    this.audioCapture = new TranslationAudioCapture();
    this.selectedProcess = null;
  }

  /**
   * 初始化窗口选择器
   */
  async initialize() {
    // 加载可用进程列表
    await this.loadProcessList();

    // 绑定 UI 事件
    this.bindEvents();
  }

  /**
   * 加载并显示进程列表
   */
  async loadProcessList() {
    try {
      const processes = await this.audioCapture.getAvailableProcesses();

      // 渲染到 UI
      this.renderProcessList(processes);

    } catch (error) {
      console.error('加载进程列表失败:', error);
      this.showError('无法获取音频进程列表，请检查权限');
    }
  }

  /**
   * 渲染进程列表到 UI
   */
  renderProcessList(processes) {
    const container = document.getElementById('process-list-container');
    container.innerHTML = '';

    if (processes.length === 0) {
      container.innerHTML = '<div class="no-processes">未检测到正在播放音频的应用</div>';
      return;
    }

    processes.forEach(proc => {
      const card = document.createElement('div');
      card.className = 'process-card';
      card.dataset.pid = proc.pid;

      card.innerHTML = `
        <div class="process-icon">🔊</div>
        <div class="process-info">
          <div class="process-name">${proc.displayName}</div>
          <div class="process-details">
            进程: ${proc.name} (PID: ${proc.pid})
          </div>
          <div class="audio-status">
            ${proc.isPlayingAudio ? '🎵 正在播放' : '🔇 静音'}
          </div>
        </div>
      `;

      // 点击选择
      card.addEventListener('click', () => {
        this.selectProcess(proc);
      });

      container.appendChild(card);
    });
  }

  /**
   * 选择进程
   */
  selectProcess(process) {
    this.selectedProcess = process;

    // 高亮显示选中的卡片
    document.querySelectorAll('.process-card').forEach(card => {
      card.classList.remove('selected');
    });
    document.querySelector(`[data-pid="${process.pid}"]`).classList.add('selected');

    // 显示确认按钮
    document.getElementById('confirm-button').disabled = false;

    console.log('选中进程:', process);
  }

  /**
   * 确认选择并启动捕获
   */
  async confirmSelection() {
    if (!this.selectedProcess) {
      this.showError('请先选择一个应用');
      return;
    }

    try {
      // 启动音频捕获
      await this.audioCapture.startCapture(this.selectedProcess.pid);

      // 监听音频数据
      this.audioCapture.on('audio-data', (data) => {
        // 发送给翻译引擎
        this.sendToTranslationEngine(data.asr);
      });

      // 监听统计信息
      this.audioCapture.on('stats', (stats) => {
        this.updateStatsUI(stats);
      });

      // 监听错误
      this.audioCapture.on('error', (error) => {
        this.showError(error.message);
      });

      // 关闭选择器窗口
      this.closeSelector();

      // 通知主窗口
      window.postMessage({
        type: 'audio-capture-started',
        process: this.selectedProcess
      }, '*');

    } catch (error) {
      console.error('启动音频捕获失败:', error);
      this.showError('无法启动音频捕获: ' + error.message);
    }
  }

  /**
   * 发送音频数据到翻译引擎
   */
  sendToTranslationEngine(asrBuffer) {
    // 这里集成阿里 Gummy 或其他 ASR 引擎
    // asrBuffer 已经是 Int16, 16kHz, Mono 格式
    
    // 示例：发送到 Gummy
    window.gummyEngine.processAudio(asrBuffer);
  }

  /**
   * 更新统计信息 UI
   */
  updateStatsUI(stats) {
    // 更新降噪 VAD 概率
    if (stats.denoise) {
      const vadPercent = (stats.denoise.vadProbability * 100).toFixed(1);
      document.getElementById('vad-value').textContent = vadPercent + '%';
    }

    // 更新 AGC 增益
    if (stats.agc) {
      const gainDb = stats.agc.currentGain.toFixed(2);
      document.getElementById('agc-gain').textContent = gainDb + ' dB';
    }

    // 更新 EQ 状态
    if (stats.eq) {
      document.getElementById('eq-enabled').textContent = stats.eq.enabled ? '✅' : '❌';
    }
  }

  /**
   * 绑定 UI 事件
   */
  bindEvents() {
    // 刷新按钮
    document.getElementById('refresh-button').addEventListener('click', () => {
      this.loadProcessList();
    });

    // 确认按钮
    document.getElementById('confirm-button').addEventListener('click', () => {
      this.confirmSelection();
    });

    // 取消按钮
    document.getElementById('cancel-button').addEventListener('click', () => {
      this.closeSelector();
    });
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    // TODO: 实现错误提示 UI
    alert(message);
  }

  /**
   * 关闭选择器窗口
   */
  closeSelector() {
    window.close();
  }
}

// 初始化
const selector = new WindowSelector();
selector.initialize();
```

---

### 3. 阿里 Gummy 引擎集成

#### 3.1 Gummy WebSocket 连接

```javascript
const WebSocket = require('ws');

/**
 * 阿里 Gummy 实时语音识别引擎
 */
class GummyASREngine {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.ws = null;
    this.isConnected = false;
  }

  /**
   * 连接 Gummy WebSocket
   */
  async connect() {
    const url = this.buildWebSocketURL();

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('✅ Gummy WebSocket 已连接');
      this.isConnected = true;
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      const result = JSON.parse(data);
      this.handleASRResult(result);
    });

    this.ws.on('error', (error) => {
      console.error('❌ Gummy WebSocket 错误:', error);
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      console.log('🔌 Gummy WebSocket 已断开');
      this.isConnected = false;
      this.emit('disconnected');
    });
  }

  /**
   * 发送音频数据到 Gummy
   * @param {Int16Array} audioBuffer - Int16, 16kHz, Mono
   */
  sendAudio(audioBuffer) {
    if (!this.isConnected) {
      console.warn('Gummy 未连接，跳过音频数据');
      return;
    }

    // 将 Int16Array 转换为 Base64
    const base64Audio = this.int16ArrayToBase64(audioBuffer);

    const payload = {
      header: {
        message_id: Date.now().toString(),
        task_id: this.taskId,
        namespace: 'SpeechTranscription',
        name: 'RecognitionAudio',
        appkey: this.apiKey
      },
      payload: {
        audio: base64Audio,
        format: 'pcm',
        sample_rate: 16000,
        enable_intermediate_result: true,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true
      }
    };

    this.ws.send(JSON.stringify(payload));
  }

  /**
   * 处理 ASR 识别结果
   */
  handleASRResult(result) {
    if (result.header.name === 'RecognitionResultChanged') {
      // 中间结果（实时显示）
      const text = result.payload.result;
      this.emit('partial-result', text);
    } else if (result.header.name === 'RecognitionCompleted') {
      // 最终结果
      const text = result.payload.result;
      this.emit('final-result', text);
    }
  }

  /**
   * Int16Array 转 Base64
   */
  int16ArrayToBase64(int16Array) {
    const buffer = Buffer.from(int16Array.buffer);
    return buffer.toString('base64');
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

---

## 📊 完整集成流程

```javascript
const TranslationAudioCapture = require('./audio-capture-module');
const GummyASREngine = require('./gummy-asr-engine');

// 1. 初始化音频捕获
const audioCapture = new TranslationAudioCapture();

// 2. 初始化 Gummy 引擎
const gummy = new GummyASREngine('YOUR_API_KEY', 'YOUR_API_SECRET');
await gummy.connect();

// 3. 枚举进程并选择
const processes = await audioCapture.getAvailableProcesses();
console.log('可用进程:', processes);

const chromeProcess = processes.find(p => p.name.includes('chrome'));

// 4. 启动音频捕获
await audioCapture.startCapture(chromeProcess.pid, {
  denoiseEnabled: true,   // AI 降噪
  agcEnabled: true,       // 音量归一化
  eqEnabled: true,        // 人声增强
  muteOtherProcesses: true  // 隔离其他进程
});

// 5. 连接音频数据到 Gummy
audioCapture.on('audio-data', (data) => {
  // data.asr 已经是 Int16, 16kHz, Mono 格式
  gummy.sendAudio(data.asr);
});

// 6. 监听 ASR 识别结果
gummy.on('partial-result', (text) => {
  console.log('实时识别:', text);
  updateSubtitleUI(text, false);  // 更新字幕（灰色）
});

gummy.on('final-result', (text) => {
  console.log('最终识别:', text);
  updateSubtitleUI(text, true);  // 更新字幕（黑色）
  
  // 发送给 LLM 翻译
  translateText(text);
});

// 7. 监听统计信息
audioCapture.on('stats', (stats) => {
  if (stats.denoise) {
    console.log(`降噪 VAD: ${(stats.denoise.vadProbability * 100).toFixed(1)}%`);
  }
  if (stats.agc) {
    console.log(`AGC 增益: ${stats.agc.currentGain.toFixed(2)} dB`);
  }
});

// 8. 错误处理
audioCapture.on('error', (error) => {
  console.error('音频捕获错误:', error);
  showNotification('音频捕获出错: ' + error.message);
});

// 9. 停止捕获
process.on('SIGINT', async () => {
  await audioCapture.stopCapture();
  gummy.disconnect();
  process.exit(0);
});
```

---

## 🎨 UI 集成建议

### 音频配置面板

```html
<div class="audio-config-panel">
  <h3>🔊 音频捕获配置</h3>
  
  <!-- 音频源选择 -->
  <div class="audio-source-selector">
    <label>选择音频源:</label>
    <div class="selected-source">
      <span id="source-name">Chrome - YouTube</span>
      <button id="change-source-btn">🔄 更改</button>
    </div>
  </div>

  <!-- 实时音频预览 -->
  <div class="audio-preview">
    <label>音频预览:</label>
    <div class="waveform">
      <canvas id="waveform-canvas" width="300" height="60"></canvas>
    </div>
    <div class="volume-meter">
      音量: <span id="volume-value">80%</span>
    </div>
  </div>

  <!-- AI 处理开关 -->
  <div class="ai-processing-controls">
    <h4>🤖 AI 音频处理 (v2.7 & v2.8)</h4>
    
    <label>
      <input type="checkbox" id="denoise-toggle" checked>
      🔇 AI 降噪 (RNNoise)
      <span class="vad-indicator">VAD: <span id="vad-value">95%</span></span>
    </label>

    <label>
      <input type="checkbox" id="agc-toggle" checked>
      ⚡ AGC 音量归一化
      <span class="gain-indicator">增益: <span id="agc-gain">+3.2 dB</span></span>
    </label>

    <label>
      <input type="checkbox" id="eq-toggle" checked>
      🎛️ EQ 人声增强
      <span class="eq-indicator">状态: <span id="eq-enabled">✅</span></span>
    </label>

    <label>
      <input type="checkbox" id="mute-others-toggle" checked>
      🔇 隔离其他应用音频 (v2.1)
    </label>
  </div>

  <!-- 高级设置 -->
  <details>
    <summary>⚙️ 高级设置</summary>
    <div class="advanced-settings">
      <label>
        采样率:
        <select id="sample-rate">
          <option value="48000" selected>48 kHz (推荐)</option>
          <option value="44100">44.1 kHz</option>
          <option value="16000">16 kHz (仅 ASR)</option>
        </select>
      </label>

      <label>
        AGC 目标音量:
        <input type="range" id="agc-target" min="-30" max="0" value="-18">
        <span id="agc-target-value">-18 dBFS</span>
      </label>

      <label>
        EQ 预设:
        <select id="eq-preset">
          <option value="voice" selected>人声增强</option>
          <option value="music">音乐</option>
          <option value="flat">平坦响应</option>
        </select>
      </label>
    </div>
  </details>
</div>
```

---

## 🎯 推荐配置场景

### 场景 1: YouTube 视频翻译

```javascript
await audioCapture.startCapture(chromePid, {
  denoiseEnabled: true,       // 消除视频背景噪音
  agcEnabled: true,           // 稳定音量
  agcOptions: {
    targetLevel: -20,
    maxGain: 20,
    attackTime: 15,
    releaseTime: 120
  },
  eqEnabled: true,            // 增强人声清晰度
  muteOtherProcesses: true    // 隔离其他应用音频
});
```

### 场景 2: Zoom 会议实时翻译

```javascript
await audioCapture.startCapture(zoomPid, {
  denoiseEnabled: true,       // 消除键盘声、风扇声
  agcEnabled: true,           // 平衡多人发言音量
  agcOptions: {
    targetLevel: -18,
    maxGain: 25,
    attackTime: 8,            // 快速响应
    releaseTime: 80
  },
  eqEnabled: true,            // 优化语音清晰度
  muteOtherProcesses: true    // 只捕获 Zoom 音频
});
```

### 场景 3: 本地视频播放器

```javascript
await audioCapture.startCapture(potplayerPid, {
  denoiseEnabled: false,      // 视频音轨通常很干净
  agcEnabled: true,           // 防止音量突变
  agcOptions: {
    targetLevel: -20,
    maxGain: 15,
    attackTime: 20,           // 平滑响应
    releaseTime: 150
  },
  eqEnabled: false,           // 保持原始音质
  muteOtherProcesses: true
});
```

---

## 📝 性能优化建议

### 1. 使用 v2.6 自适应缓冲池

```javascript
const capture = new AudioCapture({
  processId: pid,
  useExternalBuffer: true,
  bufferPoolStrategy: 'adaptive'  // 自动优化内存分配
});

// 监控缓冲池统计
const poolStats = capture.getPoolStats();
console.log('缓冲池统计:', poolStats);
// {
//   allocations: 100,
//   reuses: 95,
//   reuseRate: 0.95,
//   currentPoolSize: 10
// }
```

### 2. 使用 v2.5 Kaiser 窗 Sinc 插值

如需高质量降采样，使用内置的 AudioProcessingPipeline:

```javascript
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

const pipeline = new AudioProcessingPipeline('china-asr', {
  quality: 'sinc'  // 使用 v2.5 优化的 Kaiser 窗 Sinc
});

capture.on('data', (event) => {
  const asrAudio = pipeline.process(event.buffer);
  gummy.sendAudio(asrAudio);
});
```

性能对比：
- **v2.4**: 4.89ms/秒
- **v2.5**: 2.83ms/秒 ⚡ **42% 更快**

### 3. 批量发送音频数据

```javascript
let audioQueue = [];
const BATCH_SIZE = 10;  // 每 10 个音频块发送一次

capture.on('data', (event) => {
  const asrAudio = pipeline.process(event.buffer);
  audioQueue.push(asrAudio);

  if (audioQueue.length >= BATCH_SIZE) {
    // 合并音频块
    const mergedAudio = mergeAudioBuffers(audioQueue);
    gummy.sendAudio(mergedAudio);
    audioQueue = [];
  }
});
```

---

## 🐛 常见问题

### Q1: 无法捕获 Chrome 标签页音频？

**A**: Chrome 使用多进程架构，音频可能由不同的子进程播放。使用 v2.1 允许列表保护所有 Chrome 进程：

```javascript
const processes = await getProcesses();
const chromePids = processes
  .filter(p => p.name.toLowerCase() === 'chrome.exe')
  .map(p => p.pid);

capture.setAllowList(chromePids);
capture.setMuteOtherProcesses(true);
```

### Q2: 音频有杂音或回声？

**A**: 启用 v2.7 AI 降噪和 v2.8 EQ 人声增强：

```javascript
capture.setDenoiseEnabled(true);   // AI 降噪
capture.setEQEnabled(true);        // EQ 人声增强
capture.setEQBandGain('low', -3);  // 减少低频噪音
```

### Q3: 音量忽大忽小？

**A**: 启用 v2.8 AGC 音量归一化：

```javascript
capture.setAGCEnabled(true);
capture.setAGCOptions({
  targetLevel: -18,
  maxGain: 25,
  attackTime: 10,
  releaseTime: 100
});
```

### Q4: 安装时提示需要编译？

**A**: 使用 v2.8.0 GitHub Release，包含预编译二进制：

```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.8.0
```

---

## 📚 相关文档

- **完整 API 文档**: [docs/api.md](./api.md)
- **v2.8 发布说明**: [RELEASE_v2.8.0.md](../RELEASE_v2.8.0.md)
- **v2.2 ASR 集成指南**: [docs/V2.2_RELEASE_NOTES.md](./V2.2_RELEASE_NOTES.md)
- **v2.1 静音控制**: [docs/V2.1_RELEASE_NOTES.md](./V2.1_RELEASE_NOTES.md)
- **示例代码**: [examples/](../examples/)

---

## 🎉 总结

通过 `node-windows-audio-capture` v2.8.0，您的翻译软件可以实现：

1. ✅ **精准音频捕获** - 进程级捕获，90%+ 音频纯度
2. ✅ **AI 降噪** - RNNoise 自动消除背景噪音
3. ✅ **音量归一化** - AGC 自动稳定音量，避免翻译中断
4. ✅ **人声增强** - 3-Band EQ 优化 ASR 识别率
5. ✅ **极简集成** - 一行代码完成 ASR 格式转换
6. ✅ **零配置安装** - 预编译二进制，无需 Visual Studio

**完整音频处理链**：
```
Window Selection → Process Capture (v2.1 Dynamic Mute) → 
Denoise (v2.7 RNNoise) → AGC (v2.8) → EQ (v2.8) → 
ASR Format Conversion (v2.2/v2.5) → Gummy Engine → 
LLM Translation → Real-time Subtitles
```

**性能指标**：
- 音频延迟: < 100ms
- 格式转换: < 3ms (v2.5 优化)
- CPU 占用: < 6% (Denoise + AGC + EQ)
- 内存占用: ~5 KB

**开始使用**：
```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.8.0
```

祝您的翻译软件开发顺利！🎉
