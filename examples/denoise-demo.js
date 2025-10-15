/**
 * v2.7: RNNoise 降噪演示
 * 对比启用/禁用降噪的音频质量
 */

const { AudioCapture } = require('../index.js');
const fs = require('fs');
const path = require('path');

console.log('=== RNNoise 降噪效果测试 ===\n');

// 测试参数
const TEST_DURATION = 30; // 30 秒
const OUTPUT_DIR = path.join(__dirname, '../test-output');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 写入 WAV 文件头
 */
function writeWavHeader(stream, sampleRate, channels, bitsPerSample, dataSize) {
    const header = Buffer.alloc(44);
    
    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    
    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);  // Sub-chunk size
    header.writeUInt16LE(1, 20);   // Audio format (1 = PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // Byte rate
    header.writeUInt16LE(channels * bitsPerSample / 8, 32); // Block align
    header.writeUInt16LE(bitsPerSample, 34);
    
    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    
    stream.write(header);
}

/**
 * 测试场景 1: 无降噪（baseline）
 */
async function testWithoutDenoise() {
    console.log('测试 1: 无降噪（baseline）...');
    
    const outputFile = path.join(OUTPUT_DIR, 'test-no-denoise.wav');
    const wavStream = fs.createWriteStream(outputFile);
    
    // 预留 WAV 头部位置
    wavStream.write(Buffer.alloc(44));
    
    const capture = new AudioCapture({
        processId: 0,
        useExternalBuffer: true,
        bufferPoolStrategy: 'adaptive',
        bufferPoolSize: 50,
        bufferPoolMin: 50,
        bufferPoolMax: 200
    });
    
    let dataCount = 0;
    let totalBytes = 0;
    let startTime = null;
    
    capture.on('data', (data) => {
        if (!startTime) startTime = Date.now();
        
        dataCount++;
        totalBytes += data.length;
        wavStream.write(data);
        
        if (dataCount % 500 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            process.stdout.write(`\r  进度: ${elapsed}s / ${TEST_DURATION}s`);
        }
    });
    
    await capture.start();
    console.log('  ✅ 捕获已启动\n');
    
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION * 1000));
    
    await capture.stop();
    wavStream.end();
    
    // 写入正确的 WAV 头
    const fd = fs.openSync(outputFile, 'r+');
    const headerBuffer = Buffer.alloc(44);
    writeWavHeader({ write: (buf) => headerBuffer.set(buf) }, 48000, 2, 16, totalBytes);
    fs.writeSync(fd, headerBuffer, 0, 44, 0);
    fs.closeSync(fd);
    
    console.log(`\n  ✅ 无降噪测试完成`);
    console.log(`  - 数据包数: ${dataCount}`);
    console.log(`  - 总字节数: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - 输出文件: ${outputFile}\n`);
    
    const poolStats = capture.getPoolStats();
    return {
        dataCount,
        totalBytes,
        outputFile,
        poolStats
    };
}

/**
 * 测试场景 2: 启用降噪
 */
async function testWithDenoise() {
    console.log('测试 2: 启用 RNNoise 降噪...');
    
    const outputFile = path.join(OUTPUT_DIR, 'test-with-denoise.wav');
    const wavStream = fs.createWriteStream(outputFile);
    
    // 预留 WAV 头部位置
    wavStream.write(Buffer.alloc(44));
    
    const capture = new AudioCapture({
        processId: 0,
        useExternalBuffer: true,
        bufferPoolStrategy: 'adaptive',
        bufferPoolSize: 50,
        bufferPoolMin: 50,
        bufferPoolMax: 200
    });
    
    // 启用降噪
    try {
        capture.setDenoiseEnabled(true);
        console.log('  ✅ 降噪已启用');
    } catch (err) {
        console.error('  ❌ 降噪启用失败:', err.message);
        throw err;
    }
    
    let dataCount = 0;
    let totalBytes = 0;
    let startTime = null;
    const vadSamples = [];
    
    capture.on('data', (data) => {
        if (!startTime) startTime = Date.now();
        
        dataCount++;
        totalBytes += data.length;
        wavStream.write(data);
        
        // 每 100 个数据包收集一次 VAD 统计
        if (dataCount % 100 === 0) {
            try {
                const stats = capture.getDenoiseStats();
                vadSamples.push(stats.vadProbability);
            } catch (err) {
                // Ignore stats errors
            }
        }
        
        if (dataCount % 500 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            process.stdout.write(`\r  进度: ${elapsed}s / ${TEST_DURATION}s`);
        }
    });
    
    await capture.start();
    console.log('  ✅ 捕获已启动\n');
    
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION * 1000));
    
    await capture.stop();
    wavStream.end();
    
    // 写入正确的 WAV 头
    const fd = fs.openSync(outputFile, 'r+');
    const headerBuffer = Buffer.alloc(44);
    writeWavHeader({ write: (buf) => headerBuffer.set(buf) }, 48000, 2, 16, totalBytes);
    fs.writeSync(fd, headerBuffer, 0, 44, 0);
    fs.closeSync(fd);
    
    console.log(`\n  ✅ 降噪测试完成`);
    console.log(`  - 数据包数: ${dataCount}`);
    console.log(`  - 总字节数: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - 输出文件: ${outputFile}\n`);
    
    const poolStats = capture.getPoolStats();
    const denoiseStats = capture.getDenoiseStats();
    
    return {
        dataCount,
        totalBytes,
        outputFile,
        poolStats,
        denoiseStats,
        vadSamples
    };
}

/**
 * 性能对比分析
 */
function analyzeResults(noDenoiseResult, withDenoiseResult) {
    console.log('=== 性能对比分析 ===\n');
    
    // Buffer Pool 对比
    console.log('Buffer Pool 统计:');
    console.log('  无降噪:');
    console.log(`    - Hit Rate: ${noDenoiseResult.poolStats.hitRate.toFixed(2)}%`);
    console.log(`    - Pool Size: ${noDenoiseResult.poolStats.maxPoolSize}`);
    console.log(`    - Hits: ${noDenoiseResult.poolStats.poolHits}`);
    console.log(`    - Misses: ${noDenoiseResult.poolStats.poolMisses}`);
    
    console.log('  有降噪:');
    console.log(`    - Hit Rate: ${withDenoiseResult.poolStats.hitRate.toFixed(2)}%`);
    console.log(`    - Pool Size: ${withDenoiseResult.poolStats.maxPoolSize}`);
    console.log(`    - Hits: ${withDenoiseResult.poolStats.poolHits}`);
    console.log(`    - Misses: ${withDenoiseResult.poolStats.poolMisses}`);
    
    // 降噪统计
    if (withDenoiseResult.denoiseStats) {
        console.log('\nRNNoise 统计:');
        console.log(`  - 处理的帧数: ${withDenoiseResult.denoiseStats.framesProcessed}`);
        console.log(`  - VAD 概率 (最终): ${(withDenoiseResult.denoiseStats.vadProbability * 100).toFixed(2)}%`);
        
        if (withDenoiseResult.vadSamples.length > 0) {
            const avgVad = withDenoiseResult.vadSamples.reduce((a, b) => a + b, 0) / withDenoiseResult.vadSamples.length;
            const maxVad = Math.max(...withDenoiseResult.vadSamples);
            const minVad = Math.min(...withDenoiseResult.vadSamples);
            
            console.log(`  - VAD 概率 (平均): ${(avgVad * 100).toFixed(2)}%`);
            console.log(`  - VAD 概率 (范围): ${(minVad * 100).toFixed(2)}% - ${(maxVad * 100).toFixed(2)}%`);
        }
    }
    
    // CPU 开销估算
    const overhead = ((withDenoiseResult.totalBytes - noDenoiseResult.totalBytes) / noDenoiseResult.totalBytes * 100);
    console.log('\n吞吐量对比:');
    console.log(`  - 无降噪: ${(noDenoiseResult.totalBytes / 1024 / TEST_DURATION).toFixed(2)} KB/s`);
    console.log(`  - 有降噪: ${(withDenoiseResult.totalBytes / 1024 / TEST_DURATION).toFixed(2)} KB/s`);
    console.log(`  - 差异: ${Math.abs(overhead).toFixed(2)}%`);
    
    // 文件大小
    console.log('\n输出文件:');
    console.log(`  - 无降噪: ${noDenoiseResult.outputFile}`);
    console.log(`  - 有降噪: ${withDenoiseResult.outputFile}`);
    console.log('\n💡 提示: 可以使用音频播放器对比两个文件的音质差异');
}

/**
 * 主函数
 */
(async () => {
    try {
        console.log('⚠️  请确保有音频正在播放（音乐、视频等），以便测试降噪效果\n');
        
        // 等待 3 秒让用户准备
        console.log('3 秒后开始测试...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('');
        
        // 测试 1: 无降噪
        const noDenoiseResult = await testWithoutDenoise();
        
        // 间隔 2 秒
        console.log('等待 2 秒后开始第二个测试...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 测试 2: 有降噪
        const withDenoiseResult = await testWithDenoise();
        
        // 分析结果
        analyzeResults(noDenoiseResult, withDenoiseResult);
        
        console.log('\n=== ✅ 测试完成 ===\n');
        process.exit(0);
        
    } catch (err) {
        console.error('\n❌ 测试失败:', err);
        console.error(err.stack);
        process.exit(1);
    }
})();
