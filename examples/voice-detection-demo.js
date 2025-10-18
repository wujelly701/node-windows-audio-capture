/**
 * 语音检测演示
 * 使用 v2.11.0 频谱分析器进行实时语音活动检测（VAD）
 */

const { AudioCapture } = require('../index');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     语音活动检测演示 - Voice Activity Detection        ║');
console.log('║     基于 C++ FFT 频谱分析                               ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

async function voiceDetectionDemo() {
    const capture = new AudioCapture({
        processId: 0
    });
    
    await capture.start();
    console.log('✅ 音频捕获已启动\n');
    
    // 启用频谱分析（语音检测优化配置）
    capture.enableSpectrum({
        fftSize: 512,
        interval: 100,        // 100ms 检测一次
        smoothing: 0.7,       // 适中的平滑，平衡响应速度和稳定性
        voiceDetection: {
            threshold: 0.35,  // 35% 语音概率阈值
            minFreq: 300,     // 人声最低频率
            maxFreq: 3400     // 人声最高频率（电话音质范围）
        }
    });
    
    console.log('✅ 语音检测已启用\n');
    console.log('配置:');
    console.log('  频率范围: 300-3400 Hz');
    console.log('  检测阈值: 35%');
    console.log('  检测间隔: 100 ms\n');
    console.log('💡 提示：说话或播放包含人声的内容以触发检测\n');
    console.log('═'.repeat(60));
    
    let voiceSegments = [];
    let currentSegment = null;
    let totalDetections = 0;
    let voiceDetections = 0;
    
    capture.on('spectrum', (data) => {
        totalDetections++;
        
        if (data.isVoice && !currentSegment) {
            // 语音开始
            currentSegment = {
                startTime: Date.now(),
                startTimestamp: data.timestamp,
                maxProbability: data.voiceProbability,
                avgProbability: data.voiceProbability,
                peakFrequency: data.dominantFrequency,
                samples: 1
            };
            
            console.log(`\n🎤 语音开始 [${new Date().toLocaleTimeString()}]`);
            console.log(`   概率: ${(data.voiceProbability * 100).toFixed(1)}%`);
            console.log(`   主频: ${data.dominantFrequency.toFixed(0)} Hz`);
            console.log(`   质心: ${data.spectralCentroid.toFixed(0)} Hz`);
            
        } else if (data.isVoice && currentSegment) {
            // 语音持续
            currentSegment.samples++;
            currentSegment.maxProbability = Math.max(currentSegment.maxProbability, data.voiceProbability);
            currentSegment.avgProbability = (currentSegment.avgProbability * (currentSegment.samples - 1) + data.voiceProbability) / currentSegment.samples;
            voiceDetections++;
            
        } else if (!data.isVoice && currentSegment) {
            // 语音结束
            currentSegment.endTime = Date.now();
            currentSegment.endTimestamp = data.timestamp;
            currentSegment.duration = currentSegment.endTime - currentSegment.startTime;
            
            voiceSegments.push(currentSegment);
            
            console.log(`🔇 语音结束`);
            console.log(`   持续时间: ${(currentSegment.duration / 1000).toFixed(2)}s`);
            console.log(`   平均概率: ${(currentSegment.avgProbability * 100).toFixed(1)}%`);
            console.log(`   峰值概率: ${(currentSegment.maxProbability * 100).toFixed(1)}%`);
            console.log(`   主频率: ${currentSegment.peakFrequency.toFixed(0)} Hz`);
            
            currentSegment = null;
        }
        
        // 每 20 次检测显示一次状态（每 2 秒）
        if (totalDetections % 20 === 0) {
            const voicePercent = (voiceDetections / totalDetections * 100).toFixed(1);
            const statusIcon = data.isVoice ? '🎤' : '🔇';
            console.log(`[${totalDetections.toString().padStart(4)}] ${statusIcon} 语音占比: ${voicePercent}%`);
        }
    });
    
    capture.on('error', (error) => {
        console.error('❌ 错误:', error.message);
    });
    
    // 运行 30 秒
    setTimeout(() => {
        // 如果当前有未结束的语音段，关闭它
        if (currentSegment) {
            currentSegment.endTime = Date.now();
            currentSegment.duration = currentSegment.endTime - currentSegment.startTime;
            voiceSegments.push(currentSegment);
        }
        
        console.log('\n\n' + '═'.repeat(60));
        console.log('统计总结:');
        console.log(`  总检测次数: ${totalDetections}`);
        console.log(`  语音检测次数: ${voiceDetections} (${(voiceDetections / totalDetections * 100).toFixed(1)}%)`);
        console.log(`  语音段数量: ${voiceSegments.length}`);
        
        if (voiceSegments.length > 0) {
            const totalVoiceDuration = voiceSegments.reduce((sum, seg) => sum + seg.duration, 0);
            const avgDuration = totalVoiceDuration / voiceSegments.length;
            const avgProbability = voiceSegments.reduce((sum, seg) => sum + seg.avgProbability, 0) / voiceSegments.length;
            const maxDuration = Math.max(...voiceSegments.map(seg => seg.duration));
            const minDuration = Math.min(...voiceSegments.map(seg => seg.duration));
            
            console.log(`\n语音段统计:`);
            console.log(`  总时长: ${(totalVoiceDuration / 1000).toFixed(2)}s`);
            console.log(`  平均时长: ${(avgDuration / 1000).toFixed(2)}s`);
            console.log(`  最长段: ${(maxDuration / 1000).toFixed(2)}s`);
            console.log(`  最短段: ${(minDuration / 1000).toFixed(2)}s`);
            console.log(`  平均概率: ${(avgProbability * 100).toFixed(1)}%`);
            
            console.log(`\n前 5 个语音段:`);
            voiceSegments.slice(0, 5).forEach((seg, idx) => {
                console.log(`  ${idx + 1}. 时长: ${(seg.duration / 1000).toFixed(2)}s, ` +
                    `概率: ${(seg.avgProbability * 100).toFixed(1)}%, ` +
                    `主频: ${seg.peakFrequency.toFixed(0)} Hz`);
            });
        }
        
        console.log('\n✅ 演示完成！');
        
        capture.disableSpectrum();
        capture.stop();
        process.exit(0);
    }, 30000);
    
    process.on('SIGINT', () => {
        console.log('\n\n收到中断信号，正在清理...');
        capture.disableSpectrum();
        capture.stop();
        process.exit(0);
    });
}

voiceDetectionDemo().catch(error => {
    console.error('演示失败:', error);
    process.exit(1);
});
