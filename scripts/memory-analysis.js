/**
 * V8 GC Memory Analysis Script for v2.6
 * 
 * 目的：
 * 1. 分析长时间运行下的 GC 行为
 * 2. 检测内存泄漏
 * 3. 评估缓冲区分配模式
 * 4. 收集性能数据用于优化决策
 */

const profiler = require('v8-profiler-next');
const fs = require('fs');
const path = require('path');
const { AudioCapture } = require('../index');

// 配置
const CONFIG = {
  captureDuration: 60000,      // 60秒捕获
  samplingInterval: 1000,       // 每秒采样
  snapshotInterval: 15000,      // 每15秒生成堆快照
  outputDir: path.join(__dirname, '../analysis-results')
};

// 内存统计
class MemoryStats {
  constructor() {
    this.samples = [];
    this.startTime = Date.now();
  }

  sample() {
    const mem = process.memoryUsage();
    const sample = {
      timestamp: Date.now() - this.startTime,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
      arrayBuffers: mem.arrayBuffers
    };
    this.samples.push(sample);
    return sample;
  }

  report() {
    if (this.samples.length === 0) return {};

    const heapUsedValues = this.samples.map(s => s.heapUsed);
    const externalValues = this.samples.map(s => s.external);

    return {
      totalSamples: this.samples.length,
      duration: this.samples[this.samples.length - 1].timestamp,
      heapUsed: {
        min: Math.min(...heapUsedValues),
        max: Math.max(...heapUsedValues),
        avg: heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length,
        final: heapUsedValues[heapUsedValues.length - 1]
      },
      external: {
        min: Math.min(...externalValues),
        max: Math.max(...externalValues),
        avg: externalValues.reduce((a, b) => a + b, 0) / externalValues.length,
        final: externalValues[externalValues.length - 1]
      },
      growthRate: this.calculateGrowthRate(heapUsedValues)
    };
  }

  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    const start = values[0];
    const end = values[values.length - 1];
    return ((end - start) / start) * 100;
  }
}

// GC 事件监听
class GCMonitor {
  constructor() {
    this.gcEvents = [];
    this.setupGCObserver();
  }

  setupGCObserver() {
    // 使用 PerformanceObserver 监听 GC
    const { PerformanceObserver, performance } = require('perf_hooks');
    
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'gc') {
          this.gcEvents.push({
            timestamp: entry.startTime,
            duration: entry.duration,
            kind: this.getGCKind(entry.detail?.kind || entry.kind)
          });
        }
      }
    });

    obs.observe({ entryTypes: ['gc'] });
  }

  getGCKind(kind) {
    const kinds = {
      1: 'Scavenge',      // 新生代 GC
      2: 'MarkSweep',     // 老生代 GC
      4: 'Incremental',   // 增量 GC
      8: 'ProcessWeakCallbacks'
    };
    return kinds[kind] || `Unknown(${kind})`;
  }

  report() {
    if (this.gcEvents.length === 0) {
      return { totalGCs: 0, message: 'No GC events captured' };
    }

    const durations = this.gcEvents.map(e => e.duration);
    const kinds = {};
    this.gcEvents.forEach(e => {
      kinds[e.kind] = (kinds[e.kind] || 0) + 1;
    });

    return {
      totalGCs: this.gcEvents.length,
      kinds,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        total: durations.reduce((a, b) => a + b, 0)
      }
    };
  }
}

// 主分析函数
async function runMemoryAnalysis() {
  console.log('🚀 Starting V8 GC Memory Analysis for v2.6\n');
  console.log(`Configuration:`);
  console.log(`  - Capture Duration: ${CONFIG.captureDuration}ms`);
  console.log(`  - Sampling Interval: ${CONFIG.samplingInterval}ms`);
  console.log(`  - Snapshot Interval: ${CONFIG.snapshotInterval}ms\n`);

  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const memStats = new MemoryStats();
  const gcMonitor = new GCMonitor();
  
  let dataPackets = 0;
  let totalBytes = 0;

  // 创建音频捕获实例
  const capture = new AudioCapture({ processId: 0 });

  capture.on('data', (event) => {
    dataPackets++;
    totalBytes += event.length;
  });

  capture.on('error', (error) => {
    console.error('❌ Capture error:', error.message);
  });

  // 初始堆快照
  console.log('📸 Taking initial heap snapshot...');
  profiler.takeSnapshot('initial').export()
    .pipe(fs.createWriteStream(path.join(CONFIG.outputDir, 'heap-initial.heapsnapshot')))
    .on('finish', () => {
      profiler.deleteAllSnapshots();
      console.log('✅ Initial snapshot saved\n');
    });

  // 定期采样
  const samplingTimer = setInterval(() => {
    const sample = memStats.sample();
    console.log(`📊 [${Math.floor(sample.timestamp / 1000)}s] Heap: ${formatBytes(sample.heapUsed)} | External: ${formatBytes(sample.external)} | Packets: ${dataPackets}`);
  }, CONFIG.samplingInterval);

  // 定期堆快照
  let snapshotCount = 1;
  const snapshotTimer = setInterval(() => {
    console.log(`\n📸 Taking heap snapshot #${snapshotCount}...`);
    const snapshot = profiler.takeSnapshot(`snapshot-${snapshotCount}`);
    snapshot.export()
      .pipe(fs.createWriteStream(path.join(CONFIG.outputDir, `heap-snapshot-${snapshotCount}.heapsnapshot`)))
      .on('finish', () => {
        snapshot.delete();
        console.log(`✅ Snapshot #${snapshotCount} saved\n`);
      });
    snapshotCount++;
  }, CONFIG.snapshotInterval);

  // 启动捕获
  console.log('🎵 Starting audio capture...\n');
  await capture.start();

  // 等待捕获完成
  await new Promise(resolve => setTimeout(resolve, CONFIG.captureDuration));

  // 停止
  console.log('\n⏹️  Stopping capture...');
  capture.stop();
  clearInterval(samplingTimer);
  clearInterval(snapshotTimer);

  // 最终堆快照
  console.log('📸 Taking final heap snapshot...');
  profiler.takeSnapshot('final').export()
    .pipe(fs.createWriteStream(path.join(CONFIG.outputDir, 'heap-final.heapsnapshot')))
    .on('finish', () => {
      profiler.deleteAllSnapshots();
      console.log('✅ Final snapshot saved\n');
      
      // 生成报告
      generateReport();
    });

  function generateReport() {
    console.log('📝 Generating analysis report...\n');

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        config: CONFIG
      },
      audioCapture: {
        duration: CONFIG.captureDuration,
        totalPackets: dataPackets,
        totalBytes: totalBytes,
        avgPacketsPerSecond: (dataPackets / (CONFIG.captureDuration / 1000)).toFixed(2),
        avgBytesPerSecond: formatBytes(totalBytes / (CONFIG.captureDuration / 1000))
      },
      memory: memStats.report(),
      gc: gcMonitor.report()
    };

    // 保存 JSON 报告
    const reportPath = path.join(CONFIG.outputDir, 'analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 打印摘要
    console.log('═══════════════════════════════════════════════════════');
    console.log('                  ANALYSIS SUMMARY                     ');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📦 Audio Capture:');
    console.log(`   Total Packets: ${report.audioCapture.totalPackets}`);
    console.log(`   Total Bytes: ${formatBytes(totalBytes)}`);
    console.log(`   Avg Rate: ${report.audioCapture.avgPacketsPerSecond} packets/s\n`);

    console.log('💾 Memory Usage:');
    console.log(`   Heap Used (Min/Avg/Max): ${formatBytes(report.memory.heapUsed.min)} / ${formatBytes(report.memory.heapUsed.avg)} / ${formatBytes(report.memory.heapUsed.max)}`);
    console.log(`   External (Min/Avg/Max): ${formatBytes(report.memory.external.min)} / ${formatBytes(report.memory.external.avg)} / ${formatBytes(report.memory.external.max)}`);
    console.log(`   Growth Rate: ${report.memory.growthRate.toFixed(2)}%\n`);

    console.log('♻️  Garbage Collection:');
    console.log(`   Total GC Events: ${report.gc.totalGCs}`);
    if (report.gc.duration) {
      console.log(`   GC Time (Min/Avg/Max): ${report.gc.duration.min.toFixed(2)}ms / ${report.gc.duration.avg.toFixed(2)}ms / ${report.gc.duration.max.toFixed(2)}ms`);
      console.log(`   Total GC Time: ${report.gc.duration.total.toFixed(2)}ms (${((report.gc.duration.total / CONFIG.captureDuration) * 100).toFixed(2)}%)`);
      console.log(`   GC Types:`, report.gc.kinds);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`📁 Full report saved to: ${reportPath}`);
    console.log(`📸 Heap snapshots saved to: ${CONFIG.outputDir}\n`);
    console.log('✅ Analysis complete!');
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 运行分析
runMemoryAnalysis().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
