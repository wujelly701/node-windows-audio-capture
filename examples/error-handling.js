/**
 * 错误处理示例
 * 
 * 本示例演示如何处理音频捕获过程中的各种错误场景，
 * 包括设备断开、进程终止、权限拒绝等。
 * 
 * 功能特性：
 * - 监听并处理各种错误事件
 * - 根据错误码执行不同的处理逻辑
 * - 实现自动重试机制
 * - 演示优雅降级和恢复策略
 * 
 * 使用方法：
 *   node examples/error-handling.js <processId>
 * 
 * 参数：
 *   processId - 目标进程 ID（必需）
 * 
 * @example
 *   node examples/error-handling.js 1234
 */

const { AudioCapture, AudioError, ERROR_CODES } = require('../lib/index');
const fs = require('fs');
const path = require('path');

// 配置项
const CONFIG = {
  captureDuration: 60000, // 捕获时长（毫秒）
  sampleRate: 48000,
  channels: 2,
  loopbackMode: true,
  
  // 重试配置
  maxRetries: 3,
  retryDelay: 2000, // 重试延迟（毫秒）
  retryBackoff: 1.5, // 退避倍数
  
  // 自动重连配置
  autoReconnect: true,
  reconnectInterval: 5000, // 重连间隔（毫秒）
  
  // 输出配置
  outputFile: 'output_with_recovery.raw'
};

/**
 * 错误处理器类
 */
class ErrorHandler {
  constructor(processId, config = {}) {
    this.processId = processId;
    this.config = { ...CONFIG, ...config };
    this.capture = null;
    this.writeStream = null;
    
    // 状态跟踪
    this.retryCount = 0;
    this.isRunning = false;
    this.shouldStop = false;
    this.errorHistory = [];
    this.captureStartTime = null;
    this.bytesReceived = 0;
    this.reconnectTimer = null;
  }
  
  /**
   * 启动音频捕获
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  捕获已在运行中');
      return;
    }
    
    console.log('\n🎙️  正在启动音频捕获...');
    console.log(`   进程 ID: ${this.processId}`);
    console.log(`   自动重连: ${this.config.autoReconnect ? '启用' : '禁用'}`);
    console.log(`   最大重试次数: ${this.config.maxRetries}\n`);
    
    await this._startCapture();
  }
  
  /**
   * 内部启动捕获方法
   */
  async _startCapture() {
    try {
      // 创建输出文件流
      const outputPath = path.resolve(this.config.outputFile);
      this.writeStream = fs.createWriteStream(outputPath, {
        flags: this.bytesReceived > 0 ? 'a' : 'w' // 如果是重连，追加模式
      });
      
      // 创建音频捕获实例
      this.capture = new AudioCapture({
        processId: this.processId,
        loopbackMode: this.config.loopbackMode,
        sampleRate: this.config.sampleRate,
        channels: this.config.channels
      });
      
      // 注册事件监听器
      this._attachEventHandlers();
      
      // 启动捕获
      await this.capture.start();
      
      this.isRunning = true;
      this.captureStartTime = Date.now();
      this.retryCount = 0; // 成功启动后重置重试计数
      
      console.log('✅ 音频捕获已启动');
      console.log(`   输出文件: ${outputPath}\n`);
      
    } catch (error) {
      console.error('❌ 启动捕获失败:', error.message);
      await this._handleStartupError(error);
    }
  }
  
  /**
   * 附加事件处理器
   */
  _attachEventHandlers() {
    // 数据事件
    this.capture.on('data', (chunk) => {
      this.bytesReceived += chunk.length;
      
      // 每 10MB 显示一次进度
      if (this.bytesReceived % (10 * 1024 * 1024) < chunk.length) {
        const elapsed = (Date.now() - this.captureStartTime) / 1000;
        console.log(`📊 已接收: ${(this.bytesReceived / 1024 / 1024).toFixed(2)} MB | ` +
                    `时长: ${elapsed.toFixed(1)} 秒`);
      }
    });
    
    // 管道到文件流
    this.capture.pipe(this.writeStream);
    
    // 错误事件 - 核心错误处理逻辑
    this.capture.on('error', (error) => {
      this._handleCaptureError(error);
    });
    
    // 结束事件
    this.capture.on('end', () => {
      console.log('📝 捕获流已结束');
      this._handleCaptureEnd();
    });
    
    // 文件流错误
    this.writeStream.on('error', (error) => {
      console.error('💾 文件写入错误:', error.message);
      this._handleFileError(error);
    });
  }
  
  /**
   * 处理捕获错误
   */
  _handleCaptureError(error) {
    console.error('\n🚨 捕获错误:', error.message);
    
    // 记录错误历史
    this.errorHistory.push({
      timestamp: new Date().toISOString(),
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
    
    if (error instanceof AudioError) {
      console.error(`   错误码: ${error.code}`);
      
      // 根据错误码执行不同的处理逻辑
      switch (error.code) {
        case ERROR_CODES.PROCESS_NOT_FOUND:
          this._handleProcessNotFound(error);
          break;
          
        case ERROR_CODES.PROCESS_TERMINATED:
          this._handleProcessTerminated(error);
          break;
          
        case ERROR_CODES.DEVICE_NOT_FOUND:
          this._handleDeviceNotFound(error);
          break;
          
        case ERROR_CODES.DEVICE_DISCONNECTED:
          this._handleDeviceDisconnected(error);
          break;
          
        case ERROR_CODES.ACCESS_DENIED:
          this._handleAccessDenied(error);
          break;
          
        case ERROR_CODES.INVALID_STATE:
          this._handleInvalidState(error);
          break;
          
        case ERROR_CODES.INITIALIZATION_FAILED:
          this._handleInitializationFailed(error);
          break;
          
        default:
          this._handleUnknownError(error);
      }
    } else {
      this._handleUnknownError(error);
    }
  }
  
  /**
   * 处理进程未找到错误
   */
  _handleProcessNotFound(error) {
    console.error('   📌 建议: 请检查进程 ID 是否正确');
    console.error('   📌 进程可能未启动或已退出');
    
    // 这种错误通常不可恢复，不尝试重连
    this._stop(false);
  }
  
  /**
   * 处理进程终止错误
   */
  _handleProcessTerminated(error) {
    console.error('   📌 目标进程已终止');
    console.error('   📌 正在停止捕获...');
    
    // 进程终止是正常情况，不尝试重连
    this._stop(false);
  }
  
  /**
   * 处理设备未找到错误
   */
  _handleDeviceNotFound(error) {
    console.error('   📌 建议: 请检查音频设备是否已插入');
    console.error('   📌 请确认设备驱动已正确安装');
    
    if (this.config.autoReconnect) {
      console.log('   🔄 将在设备可用时自动重连...');
      this._scheduleReconnect();
    } else {
      this._stop(false);
    }
  }
  
  /**
   * 处理设备断开错误
   */
  _handleDeviceDisconnected(error) {
    console.error('   📌 音频设备已断开连接');
    
    if (this.config.autoReconnect) {
      console.log('   🔄 正在尝试重新连接...');
      this._scheduleReconnect();
    } else {
      this._stop(false);
    }
  }
  
  /**
   * 处理权限拒绝错误
   */
  _handleAccessDenied(error) {
    console.error('   📌 建议: 请以管理员权限运行程序');
    console.error('   📌 或检查应用权限设置');
    
    // 权限问题通常不会自动解决，不尝试重连
    this._stop(false);
  }
  
  /**
   * 处理无效状态错误
   */
  _handleInvalidState(error) {
    console.error('   📌 捕获器处于无效状态');
    
    if (this.config.autoReconnect && this.retryCount < this.config.maxRetries) {
      console.log('   🔄 正在尝试重置并重连...');
      this._scheduleReconnect();
    } else {
      this._stop(false);
    }
  }
  
  /**
   * 处理初始化失败错误
   */
  _handleInitializationFailed(error) {
    console.error('   📌 音频捕获器初始化失败');
    
    if (this.retryCount < this.config.maxRetries) {
      console.log('   🔄 正在尝试重新初始化...');
      this._scheduleReconnect();
    } else {
      console.error('   ❌ 已达到最大重试次数，停止捕获');
      this._stop(false);
    }
  }
  
  /**
   * 处理未知错误
   */
  _handleUnknownError(error) {
    console.error('   📌 遇到未知错误');
    
    if (this.config.autoReconnect && this.retryCount < this.config.maxRetries) {
      console.log('   🔄 正在尝试恢复...');
      this._scheduleReconnect();
    } else {
      this._stop(false);
    }
  }
  
  /**
   * 处理启动错误
   */
  async _handleStartupError(error) {
    if (error instanceof AudioError) {
      console.error(`   错误码: ${error.code}`);
    }
    
    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      const delay = this.config.retryDelay * Math.pow(this.config.retryBackoff, this.retryCount - 1);
      
      console.log(`   🔄 将在 ${(delay / 1000).toFixed(1)} 秒后进行第 ${this.retryCount} 次重试...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (!this.shouldStop) {
        await this._startCapture();
      }
    } else {
      console.error('   ❌ 已达到最大重试次数，停止尝试');
      this._stop(false);
    }
  }
  
  /**
   * 安排重连
   */
  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.isRunning = false;
    
    if (this.retryCount >= this.config.maxRetries) {
      console.error('   ❌ 已达到最大重试次数');
      this._stop(false);
      return;
    }
    
    this.retryCount++;
    const delay = this.config.reconnectInterval * Math.pow(this.config.retryBackoff, this.retryCount - 1);
    
    console.log(`   ⏱️  将在 ${(delay / 1000).toFixed(1)} 秒后尝试重连（第 ${this.retryCount} 次）...`);
    
    this.reconnectTimer = setTimeout(async () => {
      if (!this.shouldStop) {
        console.log('\n🔄 正在尝试重新连接...\n');
        await this._startCapture();
      }
    }, delay);
  }
  
  /**
   * 处理捕获结束
   */
  _handleCaptureEnd() {
    this.isRunning = false;
    
    if (this.writeStream) {
      this.writeStream.end();
    }
    
    if (!this.shouldStop && this.config.autoReconnect) {
      console.log('   🔄 捕获意外结束，尝试重连...');
      this._scheduleReconnect();
    }
  }
  
  /**
   * 处理文件错误
   */
  _handleFileError(error) {
    console.error('   💾 无法写入输出文件，停止捕获');
    this._stop(false);
  }
  
  /**
   * 停止捕获
   */
  _stop(graceful = true) {
    this.shouldStop = true;
    this.isRunning = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.capture) {
      try {
        this.capture.stop();
      } catch (error) {
        console.error('停止捕获时出错:', error.message);
      }
    }
    
    if (this.writeStream) {
      this.writeStream.end();
    }
    
    if (graceful) {
      console.log('\n✅ 捕获已停止');
    }
    
    this._displaySummary();
  }
  
  /**
   * 显示摘要
   */
  _displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 错误处理摘要');
    console.log('='.repeat(60));
    console.log(`  总接收字节: ${this.bytesReceived.toLocaleString()} bytes (${(this.bytesReceived / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  重试次数: ${this.retryCount}`);
    console.log(`  错误总数: ${this.errorHistory.length}`);
    
    if (this.errorHistory.length > 0) {
      console.log('\n错误历史：');
      this.errorHistory.forEach((entry, index) => {
        console.log(`  ${index + 1}. [${entry.timestamp}] ${entry.code}: ${entry.error}`);
      });
    }
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Windows 音频捕获示例 - 错误处理与自动恢复           ║');
  console.log('║       node-windows-audio-capture                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // 检查命令行参数
    const processId = parseInt(process.argv[2], 10);
    
    if (isNaN(processId) || processId <= 0) {
      console.error('\n❌ 错误：请提供有效的进程 ID\n');
      console.log('使用方法：');
      console.log('  node examples/error-handling.js <processId>\n');
      console.log('示例：');
      console.log('  node examples/error-handling.js 1234\n');
      process.exit(1);
    }
    
    // 创建错误处理器
    const handler = new ErrorHandler(processId, CONFIG);
    
    // 启动捕获
    await handler.start();
    
    // 设置定时器停止捕获
    setTimeout(() => {
      console.log('\n⏱️  捕获时间到，正在停止...');
      handler._stop(true);
      process.exit(0);
    }, CONFIG.captureDuration);
    
    // 处理 Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n⚠️  收到中断信号 (Ctrl+C)');
      handler._stop(true);
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n💥 程序执行失败:', error.message);
    if (error.stack) {
      console.error('\n堆栈跟踪:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('\n💥 未捕获的异常:', error.message);
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 启动程序
if (require.main === module) {
  main();
}

module.exports = { ErrorHandler, main };
