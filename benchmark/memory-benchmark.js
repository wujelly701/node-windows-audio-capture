/**
 * 内存使用基准测试
 * 测试长时间运行的内存稳定性和泄漏检测
 */

const { AudioCapture } = require('../index');
const AudioProcessingPipeline = require('../lib/audio-processing-pipeline');
const fs = require('fs');
const path = require('path');

// 记录内存快照
function takeMemorySnapshot() {
  const usage = process.memoryUsage();
  return {
    timestamp: Date.now(),
    rss: usage.rss / 1024 / 1024, // MB
    heapTotal: usage.heapTotal / 1024 / 1024,
    heapUsed: usage.heapUsed / 1024 / 1024,
    external: usage.external / 1024 / 1024,
    arrayBuffers: usage.arrayBuffers / 1024 / 1024
  };
}

// 强制垃圾回收（需要 --expose-gc 标志）
function forceGC() {
  if (global.gc) {
    global.gc();
  }
}

// 内存压力测试
async function runMemoryStressTest(duration = 30) {
  console.log(`\n=== 内存压力测试 (${duration}秒) ===`);
  
  const snapshots = [];
  const pipeline = new AudioProcessingPipeline('china-asr');
  
  let packetCount = 0;
  let totalBytes = 0;
  
  // 模拟音频数据流
  const testData = Buffer.alloc(3840); // 10ms @ 48kHz stereo float32
  for (let i = 0; i < testData.length; i += 4) {
    testData.writeFloatLE(Math.sin(i / 100), i);
  }
  
  // 初始快照
  forceGC();
  await new Promise(resolve => setTimeout(resolve, 100));
  snapshots.push(takeMemorySnapshot());
  
  const startTime = Date.now();
  const interval = setInterval(() => {
    // 处理音频数据
    const output = pipeline.process(testData);
    packetCount++;
    totalBytes += output.length;
    
    // 每秒记录一次内存快照
    if (packetCount % 100 === 0) {
      forceGC();
      snapshots.push(takeMemorySnapshot());
      
      const current = snapshots[snapshots.length - 1];
      const elapsed = ((current.timestamp - snapshots[0].timestamp) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Heap: ${current.heapUsed.toFixed(2)}MB, ` +
        `RSS: ${current.rss.toFixed(2)}MB, ` +
        `Packets: ${packetCount}`
      );
    }
  }, 10); // 100 packets/sec
  
  // 等待测试完成
  await new Promise(resolve => setTimeout(resolve, duration * 1000));
  clearInterval(interval);
  
  // 最终快照
  forceGC();
  await new Promise(resolve => setTimeout(resolve, 100));
  snapshots.push(takeMemorySnapshot());
  
  // 分析结果
  const initial = snapshots[0];
  const final = snapshots[snapshots.length - 1];
  
  const heapGrowth = final.heapUsed - initial.heapUsed;
  const rssGrowth = final.rss - initial.rss;
  
  // 计算线性回归斜率（内存增长率）
  const n = snapshots.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  snapshots.forEach((snap, i) => {
    sumX += i;
    sumY += snap.heapUsed;
    sumXY += i * snap.heapUsed;
    sumX2 += i * i;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const growthRate = slope * 3600; // MB/hour
  
  const results = {
    duration,
    packetCount,
    totalBytes: (totalBytes / 1024 / 1024).toFixed(2),
    initial: {
      heapUsed: initial.heapUsed.toFixed(2),
      rss: initial.rss.toFixed(2)
    },
    final: {
      heapUsed: final.heapUsed.toFixed(2),
      rss: final.rss.toFixed(2)
    },
    growth: {
      heap: heapGrowth.toFixed(2),
      rss: rssGrowth.toFixed(2)
    },
    growthRate: {
      heap: growthRate.toFixed(4),
      rss: ((rssGrowth / duration) * 3600).toFixed(4)
    },
    snapshots
  };
  
  console.log(`\n📊 内存分析结果:`);
  console.log(`总处理: ${results.totalBytes}MB 音频数据`);
  console.log(`内存增长: Heap ${results.growth.heap}MB, RSS ${results.growth.rss}MB`);
  console.log(`增长率: ${results.growthRate.heap}MB/hour (heap)`);
  console.log(`泄漏判定: ${Math.abs(growthRate) < 1 ? '✅ 正常' : '⚠️ 可能存在泄漏'}`);
  
  return results;
}

// Buffer 池性能测试
async function runBufferPoolTest() {
  console.log('\n=== Buffer 池性能测试 ===');
  
  const iterations = 10000;
  
  // 测试 1: 不使用池（每次分配新 Buffer）
  console.log('\n测试 1: 不使用 Buffer 池');
  forceGC();
  const nopoolBefore = process.memoryUsage();
  const nopoolStart = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    const buffer = Buffer.alloc(8192);
    // 模拟使用
    buffer.writeUInt32LE(i, 0);
  }
  
  const nopoolEnd = process.hrtime.bigint();
  const nopoolAfter = process.memoryUsage();
  const nopoolTime = Number(nopoolEnd - nopoolStart) / 1000000;
  const nopoolMemory = (nopoolAfter.heapUsed - nopoolBefore.heapUsed) / 1024 / 1024;
  
  console.log(`时间: ${nopoolTime.toFixed(2)}ms`);
  console.log(`内存: ${nopoolMemory.toFixed(2)}MB`);
  console.log(`速率: ${(iterations / nopoolTime * 1000).toFixed(0)} ops/sec`);
  
  // 测试 2: 使用简单的池（待实现）
  console.log('\n测试 2: 使用 Buffer 池（待实现）');
  console.log('ℹ️  Buffer 池将在 Phase 2 实现');
  
  return {
    nopool: {
      time: nopoolTime.toFixed(2),
      memory: nopoolMemory.toFixed(2),
      opsPerSec: (iterations / nopoolTime * 1000).toFixed(0)
    }
  };
}

// 主函数
async function main() {
  console.log('🚀 内存使用基准测试');
  console.log('===================================');
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Memory: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB`);
  console.log(`GC exposed: ${global.gc ? 'Yes' : 'No (run with --expose-gc)'}`);
  console.log('===================================');
  
  const results = {
    stressTest: await runMemoryStressTest(30),
    bufferPool: await runBufferPoolTest()
  };
  
  // 保存结果
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, `baseline-memory-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ 结果已保存到: ${outputPath}`);
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { takeMemorySnapshot, runMemoryStressTest, runBufferPoolTest };
