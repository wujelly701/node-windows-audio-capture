/**
 * 3-Band EQ (均衡器) 使用示例
 * 
 * 本示例演示如何使用 3-Band EQ 功能来调整音频频率响应
 * - 低频 (Low): < 500 Hz (低音)
 * - 中频 (Mid): 500-4000 Hz (人声、乐器)
 * - 高频 (High): > 4000 Hz (高音、细节)
 */

const { AudioCapture } = require('..');

// 创建音频捕获实例（捕获所有系统音频）
const capture = new AudioCapture({
    processId: 0,
    sampleRate: 48000,
    channels: 2
});

// 音频数据计数器
let frameCount = 0;
let lastStatsTime = Date.now();

console.log('=== 3-Band EQ 示例 ===\n');

// 监听音频数据
capture.on('data', (audioData) => {
    frameCount++;
    
    // 每 1 秒显示一次统计信息
    const now = Date.now();
    if (now - lastStatsTime >= 1000) {
        const stats = capture.getEQStats();
        console.log('\nEQ 统计信息:');
        console.log(`  状态: ${stats.enabled ? '已启用' : '已禁用'}`);
        console.log(`  低频增益: ${stats.lowGain.toFixed(1)} dB`);
        console.log(`  中频增益: ${stats.midGain.toFixed(1)} dB`);
        console.log(`  高频增益: ${stats.highGain.toFixed(1)} dB`);
        console.log(`  已处理帧数: ${stats.framesProcessed}`);
        console.log(`  JS 接收帧数: ${frameCount}`);
        
        lastStatsTime = now;
    }
});

// 错误处理
capture.on('error', (error) => {
    console.error('捕获错误:', error);
});

// 捕获停止事件
capture.on('stopped', () => {
    console.log('\n音频捕获已停止');
});

// 主程序
async function main() {
    try {
        console.log('1. 启动音频捕获...');
        await capture.start();
        console.log('✓ 捕获已启动\n');
        
        // 等待 2 秒，不使用 EQ
        console.log('2. 播放原始音频 (无 EQ) - 2 秒...');
        await sleep(2000);
        
        // 场景 1: 增强低音 (适合流行音乐)
        console.log('\n3. 场景 1: 增强低音 (流行音乐)');
        console.log('   - 低频: +6 dB (增强低音)');
        console.log('   - 中频: +0 dB (保持原样)');
        console.log('   - 高频: +3 dB (增强细节)');
        capture.setEQEnabled(true);
        capture.setEQBandGain('low', 6);
        capture.setEQBandGain('mid', 0);
        capture.setEQBandGain('high', 3);
        await sleep(3000);
        
        // 场景 2: 人声优化 (适合播客/语音)
        console.log('\n4. 场景 2: 人声优化 (播客/语音)');
        console.log('   - 低频: -3 dB (减少轰鸣声)');
        console.log('   - 中频: +5 dB (突出人声)');
        console.log('   - 高频: +2 dB (增强清晰度)');
        capture.setEQBandGain('low', -3);
        capture.setEQBandGain('mid', 5);
        capture.setEQBandGain('high', 2);
        await sleep(3000);
        
        // 场景 3: 古典音乐 (平衡、自然)
        console.log('\n5. 场景 3: 古典音乐 (平衡、自然)');
        console.log('   - 低频: +2 dB (轻微增强)');
        console.log('   - 中频: +0 dB (保持原样)');
        console.log('   - 高频: +4 dB (增强高音)');
        capture.setEQBandGain('low', 2);
        capture.setEQBandGain('mid', 0);
        capture.setEQBandGain('high', 4);
        await sleep(3000);
        
        // 场景 4: 电子音乐 (强烈低音)
        console.log('\n6. 场景 4: 电子音乐 (强烈低音)');
        console.log('   - 低频: +10 dB (强烈低音)');
        console.log('   - 中频: -2 dB (减少中频)');
        console.log('   - 高频: +6 dB (增强高频)');
        capture.setEQBandGain('low', 10);
        capture.setEQBandGain('mid', -2);
        capture.setEQBandGain('high', 6);
        await sleep(3000);
        
        // 禁用 EQ
        console.log('\n7. 禁用 EQ，回到原始音频...');
        capture.setEQEnabled(false);
        await sleep(2000);
        
        // 停止捕获
        console.log('\n8. 停止捕获...');
        await capture.stop();
        console.log('✓ 示例完成');
        
    } catch (error) {
        console.error('错误:', error.message);
        process.exit(1);
    }
}

// 辅助函数：sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// EQ 使用提示
console.log('💡 EQ 使用提示:');
console.log('  1. 增益范围: -20 dB 到 +20 dB');
console.log('  2. 低频 (Low): < 500 Hz - 控制低音、鼓声');
console.log('  3. 中频 (Mid): 500-4000 Hz - 控制人声、吉他、钢琴');
console.log('  4. 高频 (High): > 4000 Hz - 控制高音、细节、空气感');
console.log('  5. 过度增益可能导致失真或削波');
console.log('  6. 建议配合 AGC 使用，防止音量过大\n');

console.log('按 Ctrl+C 可随时停止\n');

// 运行示例
main().catch(console.error);

// 优雅退出
process.on('SIGINT', async () => {
    console.log('\n\n接收到退出信号，正在停止...');
    try {
        await capture.stop();
    } catch (error) {
        // 忽略停止错误
    }
    process.exit(0);
});
