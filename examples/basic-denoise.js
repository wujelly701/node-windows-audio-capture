/**
 * v2.7: 基础降噪示例
 * 演示如何启用 RNNoise 降噪功能
 */

const { AudioCapture } = require('../index.js');

console.log('=== RNNoise 降噪基础示例 ===\n');

async function main() {
    // 创建音频捕获实例
    const capture = new AudioCapture({
        processId: 0,  // 捕获系统所有音频
        useExternalBuffer: true,  // 启用零拷贝
        bufferPoolStrategy: 'adaptive',  // 自适应池
        bufferPoolSize: 50,
        bufferPoolMin: 50,
        bufferPoolMax: 200
    });
    
    // 启用降噪
    console.log('✅ 启用 RNNoise 降噪');
    capture.setDenoiseEnabled(true);
    
    let dataCount = 0;
    const startTime = Date.now();
    
    capture.on('data', (audioData) => {
        dataCount++;
        
        // 每 500 个数据包显示一次统计
        if (dataCount % 500 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            
            // 获取降噪统计
            const denoiseStats = capture.getDenoiseStats();
            const poolStats = capture.getPoolStats();
            
            console.log(`\n[${elapsed}s] 统计信息:`);
            console.log(`  降噪:`);
            console.log(`    - 已处理帧数: ${denoiseStats.framesProcessed}`);
            console.log(`    - VAD 概率: ${(denoiseStats.vadProbability * 100).toFixed(2)}%`);
            console.log(`  Buffer Pool:`);
            console.log(`    - Hit Rate: ${poolStats.hitRate.toFixed(2)}%`);
            console.log(`    - Pool Size: ${poolStats.maxPoolSize}`);
        }
    });
    
    capture.on('error', (err) => {
        console.error('❌ 错误:', err);
    });
    
    // 启动捕获
    await capture.start();
    console.log('✅ 音频捕获已启动\n');
    console.log('📊 统计信息将每 5 秒显示一次...\n');
    
    // 捕获 30 秒
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 停止捕获
    await capture.stop();
    console.log('\n✅ 音频捕获已停止');
    
    // 最终统计
    const finalDenoiseStats = capture.getDenoiseStats();
    const finalPoolStats = capture.getPoolStats();
    
    console.log('\n=== 最终统计 ===');
    console.log('降噪:');
    console.log(`  - 总处理帧数: ${finalDenoiseStats.framesProcessed}`);
    console.log(`  - 最终 VAD 概率: ${(finalDenoiseStats.vadProbability * 100).toFixed(2)}%`);
    console.log('\nBuffer Pool:');
    console.log(`  - 总数据包: ${dataCount}`);
    console.log(`  - Hit Rate: ${finalPoolStats.hitRate.toFixed(2)}%`);
    console.log(`  - 最终 Pool Size: ${finalPoolStats.maxPoolSize}`);
    console.log(`  - Pool Hits: ${finalPoolStats.poolHits}`);
    console.log(`  - Pool Misses: ${finalPoolStats.poolMisses}`);
    
    process.exit(0);
}

main().catch(err => {
    console.error('程序异常:', err);
    process.exit(1);
});
