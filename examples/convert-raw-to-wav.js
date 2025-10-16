/**
 * 工具：RAW 音频转 WAV 格式
 * 将现有的 .raw 文件转换为可播放的 .wav 文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 创建 WAV 文件头
 */
function createWavHeader(sampleRate, channels, bitsPerSample, dataLength) {
    const buffer = Buffer.alloc(44);
    
    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(3, 20);  // 3 = IEEE Float
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    
    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    
    return buffer;
}

/**
 * 转换 RAW 文件为 WAV
 */
function convertRawToWav(inputFile, outputFile, options = {}) {
    // 默认参数（与 AudioCapture 默认值一致）
    const sampleRate = options.sampleRate || 48000;
    const channels = options.channels || 2;
    const bitsPerSample = options.bitsPerSample || 32;
    
    console.log('🔄 Converting RAW to WAV...');
    console.log(`   Input:  ${inputFile}`);
    console.log(`   Output: ${outputFile}`);
    console.log(`   Format: ${sampleRate} Hz, ${channels} channels, ${bitsPerSample}-bit\n`);
    
    try {
        // 读取 RAW 数据
        const rawData = fs.readFileSync(inputFile);
        const dataLength = rawData.length;
        
        // 创建 WAV 文件头
        const wavHeader = createWavHeader(sampleRate, channels, bitsPerSample, dataLength);
        
        // 合并头部和数据
        const wavData = Buffer.concat([wavHeader, rawData]);
        
        // 写入 WAV 文件
        fs.writeFileSync(outputFile, wavData);
        
        const sizeMB = (wavData.length / 1024 / 1024).toFixed(2);
        const durationSec = (dataLength / (sampleRate * channels * (bitsPerSample / 8))).toFixed(1);
        
        console.log('✅ Conversion complete!');
        console.log(`   File size: ${sizeMB} MB`);
        console.log(`   Duration: ${durationSec} seconds`);
        console.log(`\n🎧 You can now play: ${outputFile}`);
        
        return true;
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        return false;
    }
}

// 命令行使用
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('📖 Usage: node convert-raw-to-wav.js <input.raw> [output.wav] [options]');
        console.log('\nOptions:');
        console.log('  --sample-rate <Hz>    Sample rate (default: 48000)');
        console.log('  --channels <n>        Number of channels (default: 2)');
        console.log('  --bits <n>            Bits per sample (default: 32)');
        console.log('\nExample:');
        console.log('  node convert-raw-to-wav.js capture_12345.raw');
        console.log('  node convert-raw-to-wav.js capture_12345.raw output.wav');
        console.log('  node convert-raw-to-wav.js capture_12345.raw output.wav --sample-rate 44100 --channels 1\n');
        process.exit(1);
    }
    
    const inputFile = args[0];
    const outputFile = args[1] || inputFile.replace(/\.raw$/i, '.wav');
    
    // 解析选项
    const options = {};
    for (let i = 2; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        const value = parseInt(args[i + 1]);
        
        if (key === 'sample-rate') options.sampleRate = value;
        if (key === 'channels') options.channels = value;
        if (key === 'bits') options.bitsPerSample = value;
    }
    
    // 检查输入文件是否存在
    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${inputFile}`);
        process.exit(1);
    }
    
    // 执行转换
    const success = convertRawToWav(inputFile, outputFile, options);
    process.exit(success ? 0 : 1);
}

module.exports = { convertRawToWav, createWavHeader };
