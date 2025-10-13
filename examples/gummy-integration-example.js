/**
 * Gummy 实时语音翻译集成示例
 * 演示如何将 node-windows-audio-capture 与阿里云 Gummy API 集成
 * 
 * 功能：
 * - 捕获特定进程的音频（如 Chrome 浏览器）
 * - 自动静音其他进程（v2.1 动态静音控制）
 * - 转换音频格式（Float32 立体声 → Int16 单声道）
 * - 通过 WebSocket 发送到 Gummy API
 * - 接收实时翻译结果
 * 
 * @requires node-windows-audio-capture
 * @requires ws (WebSocket 库)
 * @requires uuid (生成任务ID)
 * 
 * @author node-windows-audio-capture
 * @version 1.0.0
 * @date 2025-10-14
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { AudioProcessor, enumerateProcesses } = require('node-windows-audio-capture');
const AudioFormatConverter = require('../utils/AudioFormatConverter');

// ============================================================
// 配置参数
// ============================================================

const CONFIG = {
  // Gummy API 配置
  gummy: {
    apiKey: process.env.DASHSCOPE_API_KEY || 'your_api_key_here',
    wsUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
    model: 'gummy-realtime-v1',
    sampleRate: 48000,        // 使用 48kHz（node-windows-audio-capture 默认）
    format: 'pcm',
    sourceLanguage: null,     // auto detect
    translationTargetLanguages: ['en']  // 翻译为英文
  },
  
  // 音频捕获配置
  audio: {
    targetProcessName: 'chrome.exe',  // 目标进程（可修改）
    enableMuteControl: true,           // 启用 v2.1 动态静音控制
    allowSystemAudio: true             // 允许系统音频（如 audiodg.exe）
  },
  
  // 调试选项
  debug: {
    logAudioData: false,      // 记录音频数据包
    logTranslation: true,     // 记录翻译结果
    logTranscription: true    // 记录识别结果
  }
};

// ============================================================
// Gummy WebSocket 客户端
// ============================================================

class GummyClient {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.taskId = null;
    this.isTaskStarted = false;
    this.audioProcessor = null;
    this.converter = new AudioFormatConverter({
      inputChannels: 2,
      outputChannels: 1,
      inputFormat: 'float32',
      outputFormat: 'int16'
    });
    
    this.stats = {
      audioPacketsSent: 0,
      translationResults: 0,
      transcriptionResults: 0,
      bytesProcessed: 0
    };
  }
  
  /**
   * 连接到 Gummy WebSocket API
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔗 连接到 Gummy WebSocket API...');
      
      this.ws = new WebSocket(this.config.gummy.wsUrl, {
        headers: {
          'Authorization': `bearer ${this.config.gummy.apiKey}`,
          'X-DashScope-DataInspection': 'enable'
        }
      });
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket 已连接');
        this._setupMessageHandler();
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket 错误:', error.message);
        reject(error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 WebSocket 已断开');
      });
    });
  }
  
  /**
   * 设置 WebSocket 消息处理器
   */
  _setupMessageHandler() {
    this.ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        this._handleEvent(event);
      } catch (error) {
        console.error('❌ 解析消息失败:', error.message);
      }
    });
  }
  
  /**
   * 处理服务器事件
   */
  _handleEvent(event) {
    const eventType = event.header.event;
    
    switch (eventType) {
      case 'task-started':
        this._handleTaskStarted(event);
        break;
        
      case 'result-generated':
        this._handleResultGenerated(event);
        break;
        
      case 'task-finished':
        this._handleTaskFinished(event);
        break;
        
      case 'task-failed':
        this._handleTaskFailed(event);
        break;
        
      default:
        console.log('⚠️ 未知事件类型:', eventType);
    }
  }
  
  /**
   * 处理任务开启事件
   */
  _handleTaskStarted(event) {
    console.log('✅ 任务已开启, Task ID:', event.header.task_id);
    this.isTaskStarted = true;
    
    // 开始音频捕获
    this._startAudioCapture();
  }
  
  /**
   * 处理识别/翻译结果
   */
  _handleResultGenerated(event) {
    const output = event.payload.output;
    
    // 识别结果
    if (output.transcription && this.config.debug.logTranscription) {
      const trans = output.transcription;
      console.log('\n📝 识别结果:');
      console.log(`   句子ID: ${trans.sentence_id}`);
      console.log(`   文本: ${trans.text}`);
      console.log(`   是否结束: ${trans.sentence_end ? '是' : '否'}`);
      this.stats.transcriptionResults++;
    }
    
    // 翻译结果
    if (output.translations && output.translations.length > 0 && this.config.debug.logTranslation) {
      output.translations.forEach(translation => {
        console.log('\n🌐 翻译结果:');
        console.log(`   句子ID: ${translation.sentence_id}`);
        console.log(`   目标语言: ${translation.lang}`);
        console.log(`   译文: ${translation.text}`);
        console.log(`   是否结束: ${translation.sentence_end ? '是' : '否'}`);
        this.stats.translationResults++;
      });
    }
  }
  
  /**
   * 处理任务完成事件
   */
  _handleTaskFinished(event) {
    console.log('\n✅ 任务已完成');
    this._printStats();
    this._stopAudioCapture();
  }
  
  /**
   * 处理任务失败事件
   */
  _handleTaskFailed(event) {
    console.error('\n❌ 任务失败:');
    console.error(`   错误码: ${event.header.error_code}`);
    console.error(`   错误信息: ${event.header.error_message}`);
    this._stopAudioCapture();
  }
  
  /**
   * 发送 run-task 指令
   */
  async startTask() {
    this.taskId = uuidv4().replace(/-/g, '');
    
    const runTaskCmd = {
      header: {
        action: 'run-task',
        task_id: this.taskId,
        streaming: 'duplex'
      },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        model: this.config.gummy.model,
        parameters: {
          sample_rate: this.config.gummy.sampleRate,
          format: this.config.gummy.format,
          source_language: this.config.gummy.sourceLanguage,
          transcription_enabled: true,
          translation_enabled: true,
          translation_target_languages: this.config.gummy.translationTargetLanguages
        },
        input: {}
      }
    };
    
    console.log('\n📤 发送 run-task 指令...');
    console.log(`   Task ID: ${this.taskId}`);
    console.log(`   采样率: ${this.config.gummy.sampleRate} Hz`);
    console.log(`   格式: ${this.config.gummy.format}`);
    console.log(`   翻译目标: ${this.config.gummy.translationTargetLanguages.join(', ')}`);
    
    this.ws.send(JSON.stringify(runTaskCmd));
  }
  
  /**
   * 开始音频捕获
   */
  _startAudioCapture() {
    console.log('\n🎤 开始音频捕获...');
    
    // 查找目标进程
    const processes = enumerateProcesses();
    const targetProcess = processes.find(p => 
      p.name.toLowerCase() === this.config.audio.targetProcessName.toLowerCase()
    );
    
    if (!targetProcess) {
      console.error(`❌ 未找到目标进程: ${this.config.audio.targetProcessName}`);
      return;
    }
    
    console.log(`   目标进程: ${targetProcess.name} (PID: ${targetProcess.pid})`);
    
    // 创建音频处理器
    this.audioProcessor = new AudioProcessor({
      processId: targetProcess.pid,
      callback: (audioData) => this._onAudioData(audioData)
    });
    
    // 启动捕获
    this.audioProcessor.start();
    
    // v2.1 动态静音控制
    if (this.config.audio.enableMuteControl) {
      console.log('   🔇 启用动态静音控制（v2.1）');
      
      // 保护所有同名进程（多进程应用如 Chrome）
      const sameAppProcesses = processes.filter(p => 
        p.name.toLowerCase() === this.config.audio.targetProcessName.toLowerCase()
      );
      const allowList = sameAppProcesses.map(p => p.pid);
      
      // 可选：添加系统音频进程
      if (this.config.audio.allowSystemAudio) {
        const systemAudio = processes.find(p => p.name === 'audiodg.exe');
        if (systemAudio) {
          allowList.push(systemAudio.pid);
          console.log(`   ✅ 允许系统音频: audiodg.exe (PID: ${systemAudio.pid})`);
        }
      }
      
      this.audioProcessor.setMuteOtherProcesses(true);
      this.audioProcessor.setAllowList(allowList);
      
      console.log(`   ✅ 保护 ${sameAppProcesses.length} 个 ${targetProcess.name} 进程`);
    }
    
    this.audioProcessor.startCapture();
    console.log('   ✅ 音频捕获已启动');
  }
  
  /**
   * 音频数据回调
   */
  _onAudioData(audioData) {
    // 转换格式：Float32 立体声 → Int16 单声道
    const converted = this.converter.convert(audioData);
    
    // 发送到 Gummy API
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(converted);
      this.stats.audioPacketsSent++;
      this.stats.bytesProcessed += converted.length;
      
      if (this.config.debug.logAudioData) {
        console.log(`📦 发送音频: ${converted.length} bytes (原始: ${audioData.length} bytes)`);
      }
    }
  }
  
  /**
   * 停止音频捕获
   */
  _stopAudioCapture() {
    if (this.audioProcessor) {
      console.log('\n⏹️ 停止音频捕获...');
      this.audioProcessor.stopCapture();
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }
  }
  
  /**
   * 发送 finish-task 指令
   */
  async finishTask() {
    const finishTaskCmd = {
      header: {
        action: 'finish-task',
        task_id: this.taskId,
        streaming: 'duplex'
      },
      payload: {
        input: {}
      }
    };
    
    console.log('\n📤 发送 finish-task 指令...');
    this.ws.send(JSON.stringify(finishTaskCmd));
  }
  
  /**
   * 关闭连接
   */
  close() {
    this._stopAudioCapture();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  /**
   * 打印统计信息
   */
  _printStats() {
    console.log('\n📊 统计信息:');
    console.log(`   音频数据包: ${this.stats.audioPacketsSent}`);
    console.log(`   处理字节数: ${(this.stats.bytesProcessed / 1024).toFixed(2)} KB`);
    console.log(`   识别结果数: ${this.stats.transcriptionResults}`);
    console.log(`   翻译结果数: ${this.stats.translationResults}`);
  }
}

// ============================================================
// 主程序
// ============================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Gummy 实时语音翻译集成示例                       ║');
  console.log('║   node-windows-audio-capture + 阿里云 Gummy       ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  // 检查 API Key
  if (CONFIG.gummy.apiKey === 'your_api_key_here') {
    console.error('❌ 错误: 请设置 DASHSCOPE_API_KEY 环境变量');
    console.log('\n设置方法:');
    console.log('  Windows PowerShell:');
    console.log('    $env:DASHSCOPE_API_KEY="your_api_key"');
    console.log('    node gummy-integration-example.js\n');
    process.exit(1);
  }
  
  const client = new GummyClient(CONFIG);
  
  try {
    // 1. 连接 WebSocket
    await client.connect();
    
    // 2. 开启任务
    await client.startTask();
    
    // 3. 运行 30 秒后结束任务
    setTimeout(async () => {
      await client.finishTask();
      
      // 等待服务器返回 task-finished 事件
      setTimeout(() => {
        client.close();
        console.log('\n✅ 示例程序结束');
        process.exit(0);
      }, 2000);
    }, 30000);
    
    console.log('\n⏱️ 将运行 30 秒...');
    console.log('💡 提示: 播放音频以测试实时翻译功能\n');
    
  } catch (error) {
    console.error('❌ 程序错误:', error.message);
    client.close();
    process.exit(1);
  }
}

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️ 收到中断信号，正在清理...');
  process.exit(0);
});

// 启动程序
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 未捕获的错误:', error);
    process.exit(1);
  });
}

module.exports = GummyClient;
