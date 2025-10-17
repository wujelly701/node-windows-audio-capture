/**
 * v2.10.0: 实时音频统计示例（Phase 1 + Phase 2）
 * 
 * Phase 1: 实时统计 API（enableStats, calculateStats）
 * Phase 2: 自定义静音阈值（setSilenceThreshold, getSilenceThreshold）
 * 
 * 演示：
 * - 示例 1-4: Phase 1 基础功能
 * - 示例 5-6: Phase 2 阈值配置和动态调整
 */

const { AudioCapture } = require('../index');

console.log('=== v2.10.0 实时音频统计示例 ===\n');

// 示例 1: 实时统计（自动触发）
async function example1_AutoStats() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('示例 1: 启用自动统计（每 500ms）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const capture = new AudioCapture({ processId: 0 });
  
  // 启用实时统计（每 500ms 触发一次）
  capture.enableStats({ interval: 500 });
  
  capture.on('stats', (stats) => {
    // 构建音量条可视化
    const volumeBar = '█'.repeat(Math.floor(stats.volumePercent / 2));
    const emptyBar = '░'.repeat(50 - Math.floor(stats.volumePercent / 2));
    
    console.log(`[${new Date(stats.timestamp).toLocaleTimeString()}]`);
    console.log(`  Peak:   ${stats.peak.toFixed(4)}`);
    console.log(`  RMS:    ${stats.rms.toFixed(4)}`);
    console.log(`  dB:     ${stats.db.toFixed(2)} dB`);
    console.log(`  Volume: ${volumeBar}${emptyBar} ${stats.volumePercent.toFixed(1)}%`);
    console.log(`  Status: ${stats.isSilence ? '🔇 静音' : '🔊 有声音'}\n`);
  });
  
  capture.on('error', (err) => {
    console.error('❌ 错误:', err.message);
  });
  
  await capture.start();
  
  // 运行 10 秒
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await capture.stop();
  console.log('✅ 示例 1 完成\n');
}

// 示例 2: 手动统计（按需计算）
async function example2_ManualStats() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('示例 2: 手动计算统计（按需）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const capture = new AudioCapture({ processId: 0 });
  
  let dataCount = 0;
  const MAX_COUNT = 10;
  
  capture.on('data', (data) => {
    dataCount++;
    
    // 每 5 个 data 事件手动计算一次统计
    if (dataCount % 5 === 0) {
      const stats = capture.calculateStats(data.buffer);
      
      console.log(`[Data #${dataCount}] 手动统计:`);
      console.log(`  Peak:   ${stats.peak.toFixed(4)}`);
      console.log(`  RMS:    ${stats.rms.toFixed(4)}`);
      console.log(`  dB:     ${stats.db.toFixed(2)} dB`);
      console.log(`  Status: ${stats.isSilence ? '🔇' : '🔊'}\n`);
    }
    
    if (dataCount >= MAX_COUNT) {
      capture.stop();
    }
  });
  
  capture.on('error', (err) => {
    console.error('❌ 错误:', err.message);
  });
  
  await capture.start();
  
  // 等待完成
  await new Promise(resolve => {
    capture.on('stopped', resolve);
  });
  
  console.log('✅ 示例 2 完成\n');
}

// 示例 3: 智能静音检测
async function example3_SilenceDetection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('示例 3: 智能静音检测');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const capture = new AudioCapture({ processId: 0 });
  
  let silenceCount = 0;
  let audioCount = 0;
  let lastStatus = null;
  
  capture.enableStats({ interval: 200 }); // 200ms 检测一次
  
  capture.on('stats', (stats) => {
    if (stats.isSilence) {
      silenceCount++;
      if (lastStatus !== 'silence') {
        console.log('🔇 检测到静音');
        lastStatus = 'silence';
      }
    } else {
      audioCount++;
      if (lastStatus !== 'audio') {
        console.log(`🔊 检测到音频 (Volume: ${stats.volumePercent.toFixed(1)}%, dB: ${stats.db.toFixed(2)})`);
        lastStatus = 'audio';
      }
    }
  });
  
  capture.on('error', (err) => {
    console.error('❌ 错误:', err.message);
  });
  
  await capture.start();
  
  // 运行 10 秒
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await capture.stop();
  
  console.log('\n统计结果:');
  console.log(`  静音次数: ${silenceCount}`);
  console.log(`  音频次数: ${audioCount}`);
  console.log(`  总检测次数: ${silenceCount + audioCount}`);
  console.log('✅ 示例 3 完成\n');
}

// 示例 4: 实时音量监控（带阈值告警）
async function example4_VolumeMonitoring() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('示例 4: 实时音量监控（带阈值告警）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const capture = new AudioCapture({ processId: 0 });
  
  const VOLUME_THRESHOLD = 20; // 音量阈值 20%
  const DB_THRESHOLD = -30;    // dB 阈值 -30 dB
  
  capture.enableStats({ interval: 300 });
  
  capture.on('stats', (stats) => {
    let alert = '';
    
    // 音量过高告警
    if (stats.volumePercent > VOLUME_THRESHOLD) {
      alert = `⚠️  音量过高！(${stats.volumePercent.toFixed(1)}% > ${VOLUME_THRESHOLD}%)`;
    }
    
    // dB 过高告警
    if (stats.db > DB_THRESHOLD) {
      alert = `⚠️  分贝过高！(${stats.db.toFixed(2)} dB > ${DB_THRESHOLD} dB)`;
    }
    
    if (alert) {
      console.log(`[${new Date(stats.timestamp).toLocaleTimeString()}] ${alert}`);
      console.log(`  Peak: ${stats.peak.toFixed(4)}, RMS: ${stats.rms.toFixed(4)}\n`);
    }
  });
  
  capture.on('error', (err) => {
    console.error('❌ 错误:', err.message);
  });
  
  await capture.start();
  
  console.log(`监控中... (音量阈值: ${VOLUME_THRESHOLD}%, dB 阈值: ${DB_THRESHOLD} dB)`);
  console.log('如果没有告警，说明音量在正常范围内\n');
  
  // 运行 10 秒
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await capture.stop();
  console.log('✅ 示例 4 完成\n');
}

// 示例 5: 自定义静音阈值（Phase 2）
async function example5_CustomThreshold() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('示例 5: 自定义静音阈值（Phase 2）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const capture = new AudioCapture({ processId: 0 });
  
  // 测试不同的阈值
  const thresholds = [
    { value: 0.0001, desc: '超低阈值（录音棚）' },
    { value: 0.001,  desc: '默认阈值（普通）' },
    { value: 0.005,  desc: '高阈值（嘈杂环境）' }
  ];
  
  for (const { value, desc } of thresholds) {
    console.log(`\n测试阈值: ${value} - ${desc}`);
    
    // 设置阈值
    capture.setSilenceThreshold(value);
    console.log(`当前阈值: ${capture.getSilenceThreshold()}`);
    
    // 启用统计
    capture.enableStats({ interval: 200 });
    
    let silenceCount = 0;
    let soundCount = 0;
    
    const statsHandler = (stats) => {
      if (stats.isSilence) {
        silenceCount++;
      } else {
        soundCount++;
        console.log(`  🔊 音频: RMS=${stats.rms.toFixed(4)} (阈值=${value})`);
      }
    };
    
    capture.on('stats', statsHandler);
    
    if (!capture.isCapturing()) {
      await capture.start();
    }
    
    // 测试 3 秒
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    capture.removeListener('stats', statsHandler);
    capture.disableStats();
    
    console.log(`  结果: 静音=${silenceCount}, 有声=${soundCount}`);
  }
  
  await capture.stop();
  console.log('\n✅ 示例 5 完成\n');
}

// 示例 6: 动态调整阈值（Phase 2）
async function example6_DynamicThreshold() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('示例 6: 运行时动态调整阈值（Phase 2）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const capture = new AudioCapture({ processId: 0 });
  
  capture.enableStats({ interval: 300 });
  
  capture.on('stats', (stats) => {
    const threshold = capture.getSilenceThreshold();
    const status = stats.isSilence ? '🔇 静音' : '🔊 有声';
    console.log(`[阈值=${threshold.toFixed(4)}] ${status} - RMS=${stats.rms.toFixed(4)}`);
  });
  
  await capture.start();
  
  // 场景 1: 录音棚模式（2秒）
  console.log('\n切换到录音棚模式（超低阈值）...');
  capture.setSilenceThreshold(0.0002);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 场景 2: 普通模式（2秒）
  console.log('\n切换到普通模式（默认阈值）...');
  capture.setSilenceThreshold(0.001);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 场景 3: 户外模式（2秒）
  console.log('\n切换到户外模式（高阈值）...');
  capture.setSilenceThreshold(0.008);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await capture.stop();
  console.log('\n✅ 示例 6 完成\n');
}

// 主函数
async function main() {
  console.log('⚠️  请播放一些音频（YouTube、PotPlayer 等）\n');
  
  try {
    await example1_AutoStats();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await example2_ManualStats();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await example3_SilenceDetection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await example4_VolumeMonitoring();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await example5_CustomThreshold();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await example6_DynamicThreshold();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 所有示例完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 正常退出
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ 示例运行失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n⚠️  示例被中断');
  process.exit(0);
});

main();
