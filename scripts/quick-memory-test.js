/**
 * 快速内存压力测试
 * 用于快速验证内存泄漏问题
 */

const { AudioCapture } = require('../index');

async function quickMemoryTest() {
  console.log('🔬 Quick Memory Pressure Test\n');
  
  const iterations = 5;
  const duration = 10000; // 10秒每次
  
  for (let i = 1; i <= iterations; i++) {
    console.log(`\n📍 Iteration ${i}/${iterations}`);
    
    // 记录初始内存
    global.gc && global.gc(); // 强制 GC（需要 --expose-gc）
    const startMem = process.memoryUsage();
    
    // 创建捕获实例
    const capture = new AudioCapture({ processId: 0 });
    let packets = 0;
    
    capture.on('data', () => packets++);
    
    // 捕获音频
    await capture.start();
    await new Promise(resolve => setTimeout(resolve, duration));
    capture.stop();
    
    // 清理并强制 GC
    capture.removeAllListeners();
    global.gc && global.gc();
    
    const endMem = process.memoryUsage();
    
    // 报告
    console.log(`   Packets: ${packets}`);
    console.log(`   Heap: ${formatMB(startMem.heapUsed)} → ${formatMB(endMem.heapUsed)} (Δ ${formatDelta(endMem.heapUsed - startMem.heapUsed)})`);
    console.log(`   External: ${formatMB(startMem.external)} → ${formatMB(endMem.external)} (Δ ${formatDelta(endMem.external - startMem.external)})`);
  }
  
  console.log('\n✅ Test complete');
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDelta(bytes) {
  const sign = bytes >= 0 ? '+' : '';
  return `${sign}${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

quickMemoryTest().catch(console.error);
