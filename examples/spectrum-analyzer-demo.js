/**
 * 频谱分析器演示
 * 展示如何使用 v2.11.0 原生 C++ FFT 频谱分析功能
 */

const { AudioCapture } = require('../index');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     频谱分析器演示 - v2.11.0                            ║');
console.log('║     Native C++ FFT Spectrum Analyzer                   ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

async function runDemo() {
    // 创建音频捕获实例
    const capture = new AudioCapture({
        processId: 0,      // 捕获所有系统音频
        sampleRate: 48000,
        channels: 2
    });
    
    // 启动捕获
    await capture.start();
    console.log('✅ 音频捕获已启动\n');
    
    // 启用频谱分析
    capture.enableSpectrum({
        fftSize: 512,            // FFT 大小
        interval: 100,            // 100ms 更新一次
        smoothing: 0.8,          // 平滑因子
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
            minFreq: 300,
            maxFreq: 3400
        }
    });
    
    console.log('✅ 频谱分析器已启用\n');
    
    // 显示配置
    const config = capture.getSpectrumConfig();
    console.log('配置信息:');
    console.log(`  FFT 大小: ${config.fftSize}`);
    console.log(`  采样率: ${config.sampleRate} Hz`);
    console.log(`  更新间隔: ${config.interval} ms`);
    console.log(`  平滑因子: ${config.smoothing}`);
    console.log(`  频段数量: ${config.frequencyBands.length}`);
    console.log(`  语音范围: ${config.voiceDetection.minFreq}-${config.voiceDetection.maxFreq} Hz`);
    console.log(`  语音阈值: ${config.voiceDetection.threshold}\n`);
    
    console.log('💡 提示：播放音乐或说话以查看频谱分析效果\n');
    console.log('═'.repeat(60));
    
    let spectrumCount = 0;
    let voiceCount = 0;
    
    // 监听频谱数据
    capture.on('spectrum', (data) => {
        spectrumCount++;
        
        // 每 10 个频谱显示一次详细信息
        if (spectrumCount % 10 === 0) {
            console.log(`\n[频谱 #${spectrumCount}]`);
            
            // 显示频段能量
            data.bands.forEach(band => {
                const barLength = Math.max(0, Math.min(40, Math.floor(band.db + 80)));
                const bar = '█'.repeat(barLength);
                console.log(`  ${band.name.padEnd(18)} ${bar.padEnd(40)} ${band.db.toFixed(1)} dB`);
            });
            
            // 语音检测
            const voiceIcon = data.isVoice ? '🎤' : '🔇';
            console.log(`\n  ${voiceIcon} 语音概率: ${(data.voiceProbability * 100).toFixed(1)}%`);
            console.log(`  📊 质心: ${data.spectralCentroid.toFixed(0)} Hz`);
            console.log(`  🎵 主频: ${data.dominantFrequency.toFixed(0)} Hz`);
            
            if (data.isVoice) {
                voiceCount++;
            }
        }
    });
    
    // 错误处理
    capture.on('error', (error) => {
        console.error('❌ 错误:', error.message);
    });
    
    // 运行 30 秒
    setTimeout(() => {
        console.log('\n\n' + '═'.repeat(60));
        console.log('统计总结:');
        console.log(`  总频谱数: ${spectrumCount}`);
        console.log(`  检测到语音: ${voiceCount} 次 (${(voiceCount / spectrumCount * 100).toFixed(1)}%)`);
        console.log('\n✅ 演示完成！');
        
        capture.disableSpectrum();
        capture.stop();
        process.exit(0);
    }, 30000);
    
    // Ctrl+C 处理
    process.on('SIGINT', () => {
        console.log('\n\n收到中断信号，正在清理...');
        capture.disableSpectrum();
        capture.stop();
        process.exit(0);
    });
}

runDemo().catch(error => {
    console.error('演示失败:', error);
    process.exit(1);
});
