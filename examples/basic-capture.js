/**
 * 基础音频捕获示例
 * 
 * 本示例演示如何使用 node-windows-audio-capture 捕获指定进程的音频并保存到文件。
 * 
 * 功能特性：
 * - 枚举系统中所有正在运行的进程
 * - 选择目标进程进行音频捕获
 * - 使用流管道将音频数据写入 RAW 文件
 * - 完整的错误处理和优雅退出
 * 
 * 使用方法：
 *   node examples/basic-capture.js [processId]
 * 
 * 参数：
 *   processId - 可选，目标进程 ID。如果未提供，将列出所有进程供选择
 * 
 * 输出：
 *   output.raw - 原始音频数据（PCM 格式，48000Hz，立体声，Float32）
 * 
 * @example
 *   # 列出所有进程并选择
 *   node examples/basic-capture.js
 * 
 *   # 直接指定进程 ID
 *   node examples/basic-capture.js 1234
 */

const { AudioCapture, AudioError, ERROR_CODES } = require('../lib/index');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 配置项
const CONFIG = {
  outputFile: 'output.raw',
  captureDuration: 10000, // 捕获时长（毫秒）
  sampleRate: 48000,
  channels: 2,
  loopbackMode: true
};

/**
 * 创建命令行界面
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 枚举系统进程并显示
 */
async function listProcesses() {
  console.log('\n📋 正在枚举系统进程...\n');
  
  try {
    const processes = await AudioCapture.getProcesses();
    
    if (!processes || processes.length === 0) {
      console.log('❌ 未找到任何进程');
      return null;
    }
    
    console.log(`✅ 找到 ${processes.length} 个进程：\n`);
    
    // 按进程 ID 排序
    processes.sort((a, b) => a.processId - b.processId);
    
    // 显示前 20 个有名称的进程
    const namedProcesses = processes.filter(p => p.name && p.name.trim());
    const displayProcesses = namedProcesses.slice(0, 20);
    
    displayProcesses.forEach((proc, index) => {
      console.log(`  ${index + 1}. [PID: ${proc.processId}] ${proc.name}`);
      if (proc.executablePath) {
        console.log(`     路径: ${proc.executablePath}`);
      }
    });
    
    if (namedProcesses.length > 20) {
      console.log(`\n  ... 还有 ${namedProcesses.length - 20} 个进程未显示\n`);
    }
    
    return processes;
  } catch (error) {
    console.error('❌ 枚举进程失败:', error.message);
    return null;
  }
}

/**
 * 选择目标进程
 */
async function selectProcess(processes) {
  const rl = createInterface();
  
  return new Promise((resolve, reject) => {
    rl.question('\n请输入目标进程的 PID（或输入 q 退出）: ', (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'q') {
        resolve(null);
        return;
      }
      
      const pid = parseInt(answer, 10);
      if (isNaN(pid) || pid <= 0) {
        reject(new Error('无效的进程 ID'));
        return;
      }
      
      const process = processes.find(p => p.processId === pid);
      if (!process) {
        console.log(`\n⚠️  警告: 进程 ${pid} 未在列表中，但仍会尝试捕获\n`);
      } else {
        console.log(`\n✅ 已选择进程: [PID: ${process.processId}] ${process.name}\n`);
      }
      
      resolve(pid);
    });
  });
}

/**
 * 开始音频捕获
 */
async function startCapture(processId) {
  console.log('🎙️  正在初始化音频捕获...\n');
  
  // 创建输出文件流
  const outputPath = path.resolve(CONFIG.outputFile);
  const writeStream = fs.createWriteStream(outputPath);
  
  // 创建音频捕获实例
  const capture = new AudioCapture({
    processId: processId,
    loopbackMode: CONFIG.loopbackMode,
    sampleRate: CONFIG.sampleRate,
    channels: CONFIG.channels
  });
  
  // 统计信息
  let bytesReceived = 0;
  let chunksReceived = 0;
  const startTime = Date.now();
  
  // 监听数据事件
  capture.on('data', (chunk) => {
    bytesReceived += chunk.length;
    chunksReceived++;
    
    // 每 100 个块显示一次进度
    if (chunksReceived % 100 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const bytesPerSec = bytesReceived / elapsed;
      console.log(`📊 已接收: ${(bytesReceived / 1024).toFixed(2)} KB | ` +
                  `速率: ${(bytesPerSec / 1024).toFixed(2)} KB/s | ` +
                  `块数: ${chunksReceived}`);
    }
  });
  
  // 监听结束事件
  capture.on('end', () => {
    console.log('\n✅ 音频捕获已完成');
    displaySummary(startTime, bytesReceived, chunksReceived, outputPath);
  });
  
  // 监听错误事件
  capture.on('error', (error) => {
    console.error('\n❌ 捕获过程中发生错误:', error.message);
    if (error instanceof AudioError) {
      console.error(`   错误码: ${error.code}`);
    }
  });
  
  // 管道到文件流
  capture.pipe(writeStream);
  
  // 处理文件流错误
  writeStream.on('error', (error) => {
    console.error('\n❌ 文件写入错误:', error.message);
    capture.stop();
  });
  
  // 启动捕获
  console.log(`📡 开始捕获音频 (${CONFIG.captureDuration / 1000} 秒)...`);
  console.log(`   进程 ID: ${processId}`);
  console.log(`   输出文件: ${outputPath}`);
  console.log(`   采样率: ${CONFIG.sampleRate} Hz`);
  console.log(`   声道数: ${CONFIG.channels}\n`);
  
  try {
    await capture.start();
    
    // 设置定时器停止捕获
    setTimeout(() => {
      console.log('\n⏱️  捕获时间到，正在停止...');
      capture.stop();
    }, CONFIG.captureDuration);
    
  } catch (error) {
    console.error('\n❌ 启动捕获失败:', error.message);
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
 * 显示捕获摘要
 */
function displaySummary(startTime, bytesReceived, chunksReceived, outputPath) {
  const duration = (Date.now() - startTime) / 1000;
  const avgBytesPerSec = bytesReceived / duration;
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 捕获摘要');
  console.log('='.repeat(60));
  console.log(`  持续时间: ${duration.toFixed(2)} 秒`);
  console.log(`  总字节数: ${bytesReceived.toLocaleString()} bytes (${(bytesReceived / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  数据块数: ${chunksReceived.toLocaleString()}`);
  console.log(`  平均速率: ${(avgBytesPerSec / 1024).toFixed(2)} KB/s`);
  console.log(`  输出文件: ${outputPath}`);
  
  // 验证文件
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`  文件大小: ${stats.size.toLocaleString()} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // 计算音频时长（假设 Float32 PCM）
    const bytesPerSample = 4; // Float32
    const totalSamples = stats.size / bytesPerSample / CONFIG.channels;
    const audioDuration = totalSamples / CONFIG.sampleRate;
    console.log(`  音频时长: ${audioDuration.toFixed(2)} 秒`);
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * 清理资源
 */
function cleanup() {
  console.log('\n🧹 正在清理资源...');
  // 这里可以添加清理逻辑
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Windows 音频捕获示例 - 基础捕获                     ║');
  console.log('║       node-windows-audio-capture                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // 检查命令行参数
    let processId = parseInt(process.argv[2], 10);
    
    if (isNaN(processId) || processId <= 0) {
      // 未提供或无效的进程 ID，需要枚举
      const processes = await listProcesses();
      if (!processes || processes.length === 0) {
        console.error('\n❌ 无法枚举进程，程序退出');
        process.exit(1);
      }
      
      processId = await selectProcess(processes);
      if (!processId) {
        console.log('\n👋 已取消，程序退出');
        process.exit(0);
      }
    } else {
      console.log(`\n✅ 使用命令行参数指定的进程 ID: ${processId}\n`);
    }
    
    // 开始捕获
    await startCapture(processId);
    
    console.log('\n✨ 程序执行完成！\n');
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
  cleanup();
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 未处理的 Promise 拒绝:', reason);
  cleanup();
  process.exit(1);
});

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  收到中断信号 (Ctrl+C)');
  cleanup();
  process.exit(0);
});

// 处理终止信号
process.on('SIGTERM', () => {
  console.log('\n\n⚠️  收到终止信号 (SIGTERM)');
  cleanup();
  process.exit(0);
});

// 启动程序
if (require.main === module) {
  main();
}

module.exports = { main, listProcesses, selectProcess, startCapture };
