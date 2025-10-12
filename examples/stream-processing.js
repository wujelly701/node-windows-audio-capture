/**
 * 流处理示例 - 实时音量检测
 * 
 * 本示例演示如何在音频捕获过程中实时处理音频数据流，
 * 通过计算 RMS（均方根）音量值来监测音频响度变化。
 * 
 * 功能特性：
 * - 监听 'data' 事件进行实时音频处理
 * - 计算音频块的 RMS 音量值
 * - 转换为分贝（dB）单位
 * - 可视化音量条显示
 * - 实时输出音量统计信息
 * 
 * 使用方法：
 *   node examples/stream-processing.js <processId>
 * 
 * 参数：
 *   processId - 目标进程 ID（必需）
 * 
 * 输出：
 *   控制台实时显示音量变化和可视化音量条
 * 
 * @example
 *   node examples/stream-processing.js 1234
 */

const { AudioCapture, AudioError, ERROR_CODES } = require('../lib/index');

// 配置项
const CONFIG = {
  captureDuration: 30000, // 捕获时长（毫秒）
  sampleRate: 48000,
  channels: 2,
  loopbackMode: true,
  updateInterval: 100, // 更新间隔（毫秒）
  volumeBarWidth: 50 // 音量条宽度
};

/**
 * 计算音频块的 RMS（均方根）音量值
 * 
 * @param {Buffer} buffer - 音频数据缓冲区（Float32 PCM）
 * @returns {number} - RMS 值（0.0 - 1.0）
 */
function calculateRMS(buffer) {
  if (!buffer || buffer.length === 0) {
    return 0;
  }
  
  // Float32 数组，每个样本 4 字节
  const samples = buffer.length / 4;
  let sumSquares = 0;
  
  for (let i = 0; i < buffer.length; i += 4) {
    // 读取 Float32 样本值（little-endian）
    const sample = buffer.readFloatLE(i);
    sumSquares += sample * sample;
  }
  
  const rms = Math.sqrt(sumSquares / samples);
  return rms;
}

/**
 * 将 RMS 值转换为分贝（dB）
 * 
 * @param {number} rms - RMS 值（0.0 - 1.0）
 * @returns {number} - 分贝值（dBFS，参考电平 1.0）
 */
function rmsToDb(rms) {
  if (rms === 0) {
    return -Infinity;
  }
  return 20 * Math.log10(rms);
}

/**
 * 生成音量可视化条
 * 
 * @param {number} rms - RMS 值（0.0 - 1.0）
 * @param {number} width - 条宽度
 * @returns {string} - 可视化字符串
 */
function generateVolumeBar(rms, width = 50) {
  const filled = Math.round(rms * width);
  const empty = width - filled;
  
  // 根据音量大小选择颜色（使用 ANSI 颜色码）
  let color;
  if (rms < 0.1) {
    color = '\x1b[90m'; // 灰色（静音）
  } else if (rms < 0.3) {
    color = '\x1b[32m'; // 绿色（低音量）
  } else if (rms < 0.7) {
    color = '\x1b[33m'; // 黄色（中音量）
  } else {
    color = '\x1b[31m'; // 红色（高音量）
  }
  
  const reset = '\x1b[0m';
  const bar = color + '█'.repeat(filled) + reset + '░'.repeat(empty);
  
  return bar;
}

/**
 * 格式化音量统计信息
 * 
 * @param {object} stats - 统计数据
 * @returns {string} - 格式化字符串
 */
function formatStats(stats) {
  return [
    `当前: ${stats.current.toFixed(3)}`,
    `平均: ${stats.average.toFixed(3)}`,
    `峰值: ${stats.peak.toFixed(3)}`,
    `最小: ${stats.min.toFixed(3)}`
  ].join(' | ');
}

/**
 * 音量处理器类
 */
class VolumeProcessor {
  constructor() {
    this.samples = [];
    this.peak = 0;
    this.min = Infinity;
    this.lastUpdate = Date.now();
    this.chunkCount = 0;
  }
  
  /**
   * 处理音频数据块
   * 
   * @param {Buffer} chunk - 音频数据
   */
  process(chunk) {
    const rms = calculateRMS(chunk);
    const db = rmsToDb(rms);
    
    this.samples.push(rms);
    this.chunkCount++;
    
    // 更新峰值和最小值
    if (rms > this.peak) {
      this.peak = rms;
    }
    if (rms < this.min) {
      this.min = rms;
    }
    
    // 限制样本数量（保留最近 1000 个）
    if (this.samples.length > 1000) {
      this.samples.shift();
    }
    
    // 检查是否需要更新显示
    const now = Date.now();
    if (now - this.lastUpdate >= CONFIG.updateInterval) {
      this.updateDisplay(rms, db);
      this.lastUpdate = now;
    }
  }
  
  /**
   * 更新显示
   * 
   * @param {number} currentRMS - 当前 RMS 值
   * @param {number} currentDB - 当前分贝值
   */
  updateDisplay(currentRMS, currentDB) {
    const average = this.getAverage();
    const stats = {
      current: currentRMS,
      average: average,
      peak: this.peak,
      min: this.min === Infinity ? 0 : this.min
    };
    
    // 清除当前行并重新绘制
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    
    // 显示音量条
    const bar = generateVolumeBar(currentRMS, CONFIG.volumeBarWidth);
    
    // 显示详细信息
    const dbStr = currentDB === -Infinity ? '-∞ dB' : `${currentDB.toFixed(1)} dB`;
    const info = `${bar} ${dbStr} | ${formatStats(stats)} | 块数: ${this.chunkCount}`;
    
    process.stdout.write(info);
  }
  
  /**
   * 计算平均 RMS 值
   * 
   * @returns {number} - 平均值
   */
  getAverage() {
    if (this.samples.length === 0) {
      return 0;
    }
    const sum = this.samples.reduce((acc, val) => acc + val, 0);
    return sum / this.samples.length;
  }
  
  /**
   * 获取最终统计信息
   * 
   * @returns {object} - 统计数据
   */
  getStats() {
    return {
      totalChunks: this.chunkCount,
      totalSamples: this.samples.length,
      average: this.getAverage(),
      peak: this.peak,
      min: this.min === Infinity ? 0 : this.min,
      peakDb: rmsToDb(this.peak),
      averageDb: rmsToDb(this.getAverage())
    };
  }
}

/**
 * 开始音频捕获和处理
 * 
 * @param {number} processId - 进程 ID
 */
async function startStreamProcessing(processId) {
  console.log('🎙️  正在初始化流处理...\n');
  
  // 创建音频捕获实例
  const capture = new AudioCapture({
    processId: processId,
    loopbackMode: CONFIG.loopbackMode,
    sampleRate: CONFIG.sampleRate,
    channels: CONFIG.channels
  });
  
  // 创建音量处理器
  const processor = new VolumeProcessor();
  
  // 统计信息
  let bytesReceived = 0;
  const startTime = Date.now();
  
  // 监听数据事件进行实时处理
  capture.on('data', (chunk) => {
    bytesReceived += chunk.length;
    
    // 处理音频数据
    processor.process(chunk);
  });
  
  // 监听结束事件
  capture.on('end', () => {
    console.log('\n\n✅ 音频处理已完成');
    displayFinalStats(startTime, bytesReceived, processor);
  });
  
  // 监听错误事件
  capture.on('error', (error) => {
    console.error('\n\n❌ 处理过程中发生错误:', error.message);
    if (error instanceof AudioError) {
      console.error(`   错误码: ${error.code}`);
    }
  });
  
  // 启动捕获
  console.log(`📡 开始捕获和处理音频流 (${CONFIG.captureDuration / 1000} 秒)...`);
  console.log(`   进程 ID: ${processId}`);
  console.log(`   采样率: ${CONFIG.sampleRate} Hz`);
  console.log(`   声道数: ${CONFIG.channels}`);
  console.log(`   更新间隔: ${CONFIG.updateInterval} ms\n`);
  console.log('实时音量监测：\n');
  
  try {
    await capture.start();
    
    // 设置定时器停止捕获
    setTimeout(() => {
      console.log('\n\n⏱️  处理时间到，正在停止...');
      capture.stop();
    }, CONFIG.captureDuration);
    
  } catch (error) {
    console.error('\n\n❌ 启动捕获失败:', error.message);
    if (error instanceof AudioError) {
      console.error(`   错误码: ${error.code}`);
      
      // 提供针对性建议
      if (error.code === ERROR_CODES.PROCESS_NOT_FOUND) {
        console.error('   建议: 请检查进程 ID 是否正确，或进程是否已退出');
      } else if (error.code === ERROR_CODES.DEVICE_NOT_FOUND) {
        console.error('   建议: 请检查音频设备是否正常工作');
      } else if (error.code === ERROR_CODES.ACCESS_DENIED) {
        console.error('   建议: 请以管理员权限运行');
      }
    }
    throw error;
  }
  
  return new Promise((resolve) => {
    capture.on('end', resolve);
  });
}

/**
 * 显示最终统计信息
 * 
 * @param {number} startTime - 开始时间
 * @param {number} bytesReceived - 接收字节数
 * @param {VolumeProcessor} processor - 音量处理器
 */
function displayFinalStats(startTime, bytesReceived, processor) {
  const duration = (Date.now() - startTime) / 1000;
  const stats = processor.getStats();
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 处理统计');
  console.log('='.repeat(70));
  console.log(`  持续时间: ${duration.toFixed(2)} 秒`);
  console.log(`  总字节数: ${bytesReceived.toLocaleString()} bytes (${(bytesReceived / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  数据块数: ${stats.totalChunks.toLocaleString()}`);
  console.log(`  平均速率: ${(bytesReceived / duration / 1024).toFixed(2)} KB/s`);
  console.log('');
  console.log('音量统计：');
  console.log(`  平均 RMS: ${stats.average.toFixed(4)} (${stats.averageDb.toFixed(1)} dB)`);
  console.log(`  峰值 RMS: ${stats.peak.toFixed(4)} (${stats.peakDb.toFixed(1)} dB)`);
  console.log(`  最小 RMS: ${stats.min.toFixed(4)} (${rmsToDb(stats.min).toFixed(1)} dB)`);
  console.log(`  动态范围: ${(stats.peakDb - rmsToDb(stats.min)).toFixed(1)} dB`);
  console.log('='.repeat(70) + '\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       Windows 音频捕获示例 - 流处理与音量检测                 ║');
  console.log('║       node-windows-audio-capture                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // 检查命令行参数
    const processId = parseInt(process.argv[2], 10);
    
    if (isNaN(processId) || processId <= 0) {
      console.error('❌ 错误：请提供有效的进程 ID\n');
      console.log('使用方法：');
      console.log('  node examples/stream-processing.js <processId>\n');
      console.log('示例：');
      console.log('  node examples/stream-processing.js 1234\n');
      process.exit(1);
    }
    
    // 开始流处理
    await startStreamProcessing(processId);
    
    console.log('✨ 程序执行完成！\n');
    process.exit(0);
    
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

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  收到中断信号 (Ctrl+C)');
  process.exit(0);
});

// 处理终止信号
process.on('SIGTERM', () => {
  console.log('\n\n⚠️  收到终止信号 (SIGTERM)');
  process.exit(0);
});

// 启动程序
if (require.main === module) {
  main();
}

module.exports = {
  main,
  startStreamProcessing,
  calculateRMS,
  rmsToDb,
  generateVolumeBar,
  VolumeProcessor
};
