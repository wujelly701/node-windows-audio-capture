/**
 * v2.11.0 C++ 频谱分析器完整演示
 * 展示实时频谱分析和语音检测功能
 */

const { AudioCapture } = require('./index');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     Node Windows Audio Capture v2.11.0                  ║');
console.log('║     原生 C++ FFT 频谱分析器演示                         ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 创建音频捕获实例
const capture = new AudioCapture({
    sampleRate: 48000,
    channels: 2,
    bitDepth: 16,
    processLoopback: false  // 捕获系统声音
});

let spectrumCount = 0;
let voiceStartTime = null;
let lastVoiceState = false;
let peakFrequencies = [];

// 监听频谱数据
capture.on('spectrum', (data) => {
    spectrumCount++;
    
    // 显示前 10 个频谱数据的详细信息
    if (spectrumCount <= 10) {
        console.log(`\n═══ 频谱 #${spectrumCount} ═══`);
        console.log(`时间戳: ${data.timestamp}ms`);
        console.log(`FFT 大小: ${data.magnitudes.length * 2}`);
        
        // 显示频段能量
        console.log('\n频段分析:');
        data.bands.forEach(band => {
            const barLength = Math.max(0, Math.min(40, Math.floor(band.db + 80)));
            const bar = '█'.repeat(barLength);
            console.log(`  ${band.name.padEnd(18)} ${band.minFreq.toString().padStart(5)}-${band.maxFreq.toString().padEnd(5)} Hz: ${bar} ${band.db.toFixed(1)} dB`);
        });
        
        // 语音检测
        console.log(`\n语音检测:`);
        console.log(`  概率: ${(data.voiceProbability * 100).toFixed(2)}%`);
        console.log(`  状态: ${data.isVoice ? '🎤 检测到语音' : '🔇 无语音'}`);
        console.log(`  频谱质心: ${data.spectralCentroid.toFixed(2)} Hz`);
        console.log(`  主频率: ${data.dominantFrequency.toFixed(2)} Hz`);
    }
    
    // 检测语音状态变化
    if (data.isVoice !== lastVoiceState) {
        if (data.isVoice) {
            voiceStartTime = Date.now();
            console.log(`\n\n🎤 【语音开始】`);
            console.log(`   概率: ${(data.voiceProbability * 100).toFixed(2)}%`);
            console.log(`   质心: ${data.spectralCentroid.toFixed(0)} Hz`);
            console.log(`   主频: ${data.dominantFrequency.toFixed(0)} Hz`);
        } else if (voiceStartTime) {
            const duration = Date.now() - voiceStartTime;
            console.log(`\n🔇 【语音结束】 持续时间: ${duration}ms`);
            voiceStartTime = null;
        }
        lastVoiceState = data.isVoice;
    }
    
    // 记录主频率
    if (data.isVoice) {
        peakFrequencies.push(data.dominantFrequency);
    }
    
    // 简洁模式：每 5 个频谱显示一次状态
    if (spectrumCount > 10 && spectrumCount % 5 === 0) {
        const voiceIcon = data.isVoice ? '🎤' : '🔇';
        const voicePercent = (data.voiceProbability * 100).toFixed(0).padStart(3);
        const centroid = data.spectralCentroid.toFixed(0).padStart(5);
        console.log(`[${spectrumCount.toString().padStart(3)}] ${voiceIcon} 语音:${voicePercent}% 质心:${centroid}Hz 主频:${data.dominantFrequency.toFixed(0)}Hz`);
    }
});

// 监听错误
capture.on('error', (error) => {
    console.error('\n❌ 错误:', error.message);
});

// 启动捕获
(async () => {
    console.log('正在启动音频捕获...');
    await capture.start();
    console.log('✅ 音频捕获已启动\n');
    
    // 启用频谱分析
    console.log('正在启用频谱分析器...');
    capture.enableSpectrum({
        fftSize: 512,            // FFT 大小（必须小于每个音频块的样本数）
        interval: 100,            // 100ms 更新一次
        smoothing: 0.8,          // 平滑因子 0-1
        frequencyBands: [
            { minFreq: 20, maxFreq: 60, name: 'Sub Bass' },
            { minFreq: 60, maxFreq: 250, name: 'Bass' },
            { minFreq: 250, maxFreq: 500, name: 'Low Midrange' },
            { minFreq: 500, maxFreq: 2000, name: 'Midrange' },
            { minFreq: 2000, maxFreq: 4000, name: 'Upper Midrange' },
            { minFreq: 4000, maxFreq: 6000, name: 'Presence' },
            { minFreq: 6000, maxFreq: 20000, name: 'Brilliance' }
        ],
        voiceDetection: {
            threshold: 0.3,      // 语音检测阈值
            minFreq: 300,        // 最小语音频率
            maxFreq: 3400        // 最大语音频率
        }
    });
    console.log('✅ 频谱分析器已启用\n');
    
    const config = capture.getSpectrumConfig();
    console.log('配置:');
    console.log(`  FFT 大小: ${config.fftSize}`);
    console.log(`  采样率: ${config.sampleRate} Hz`);
    console.log(`  更新间隔: ${config.interval} ms`);
    console.log(`  平滑因子: ${config.smoothing}`);
    console.log(`  语音频率范围: ${config.voiceDetection.minFreq}-${config.voiceDetection.maxFreq} Hz`);
    console.log(`  语音阈值: ${config.voiceDetection.threshold}\n`);
    
    console.log('📊 开始实时分析（运行 30 秒）...\n');
    console.log('💡 提示：播放音乐或说话以查看频谱分析和语音检测效果\n');
    
    // 运行 30 秒
    setTimeout(() => {
        console.log('\n\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                     统计总结                             ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log(`\n接收到的频谱数据包: ${spectrumCount}`);
        console.log(`检测到语音次数: ${peakFrequencies.length}`);
        
        if (peakFrequencies.length > 0) {
            const avgFreq = peakFrequencies.reduce((a, b) => a + b, 0) / peakFrequencies.length;
            const minFreq = Math.min(...peakFrequencies);
            const maxFreq = Math.max(...peakFrequencies);
            
            console.log(`\n语音频率统计:`);
            console.log(`  平均主频: ${avgFreq.toFixed(2)} Hz`);
            console.log(`  最低频率: ${minFreq.toFixed(2)} Hz`);
            console.log(`  最高频率: ${maxFreq.toFixed(2)} Hz`);
            console.log(`  频率范围: ${(maxFreq - minFreq).toFixed(2)} Hz`);
        }
        
        console.log('\n✅ 测试完成！\n');
        
        // 清理
        capture.disableSpectrum();
        capture.stop();
        process.exit(0);
    }, 30000);
})();

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n\n收到中断信号，正在清理...');
    capture.disableSpectrum();
    capture.stop();
    process.exit(0);
});
