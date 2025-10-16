/**
 * 示例：进程特定音频捕获（WAV 格式）
 * 演示如何捕获特定进程的音频并保存为可播放的 WAV 文件
 */

const { AudioCapture, enumerateProcesses } = require('../index');
const fs = require('fs');
const path = require('path');

/**
 * 创建 WAV 文件头
 * @param {number} sampleRate - 采样率 (Hz)
 * @param {number} channels - 声道数
 * @param {number} bitsPerSample - 位深度
 * @param {number} dataLength - 数据长度（字节）
 * @returns {Buffer} WAV 文件头
 */
function createWavHeader(sampleRate, channels, bitsPerSample, dataLength) {
    const buffer = Buffer.alloc(44);
    
    // RIFF chunk descriptor
    buffer.write('RIFF', 0);                                    // ChunkID
    buffer.writeUInt32LE(36 + dataLength, 4);                  // ChunkSize
    buffer.write('WAVE', 8);                                    // Format
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);                                   // Subchunk1ID
    buffer.writeUInt32LE(16, 16);                              // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(3, 20);                               // AudioFormat (3 = IEEE Float)
    buffer.writeUInt16LE(channels, 22);                        // NumChannels
    buffer.writeUInt32LE(sampleRate, 24);                      // SampleRate
    buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // ByteRate
    buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);  // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);                   // BitsPerSample
    
    // data sub-chunk
    buffer.write('data', 36);                                   // Subchunk2ID
    buffer.writeUInt32LE(dataLength, 40);                      // Subchunk2Size
    
    return buffer;
}

/**
 * 更新 WAV 文件头中的数据大小
 * @param {string} filePath - WAV 文件路径
 * @param {number} dataLength - 实际数据长度
 */
function updateWavHeader(filePath, dataLength) {
    const fd = fs.openSync(filePath, 'r+');
    
    // 更新 ChunkSize (文件大小 - 8)
    const chunkSizeBuffer = Buffer.alloc(4);
    chunkSizeBuffer.writeUInt32LE(36 + dataLength, 0);
    fs.writeSync(fd, chunkSizeBuffer, 0, 4, 4);
    
    // 更新 Subchunk2Size (数据大小)
    const dataSizeBuffer = Buffer.alloc(4);
    dataSizeBuffer.writeUInt32LE(dataLength, 0);
    fs.writeSync(fd, dataSizeBuffer, 0, 4, 40);
    
    fs.closeSync(fd);
}

async function main() {
    console.log('🎵 Windows Audio Capture - WAV Recording Example\n');
    
    // 1. 枚举所有进程
    console.log('📋 Enumerating processes...');
    const processes = enumerateProcesses();
    
    // 2. 查找目标进程
    const targetNames = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'spotify.exe', 'vlc.exe', 'potplayer.exe'];
    const targetProcesses = processes.filter(p => 
        targetNames.some(name => p.name.toLowerCase().includes(name.toLowerCase()))
    );
    
    if (targetProcesses.length === 0) {
        console.log('❌ No target processes found. Please start a browser or music player.');
        console.log('   Supported: Chrome, Edge, Firefox, Spotify, VLC, PotPlayer\n');
        process.exit(1);
    }
    
    console.log(`\n✅ Found ${targetProcesses.length} target process(es):`);
    targetProcesses.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (PID: ${p.pid})`);
    });
    
    // 3. 选择第一个目标进程
    const targetProcess = targetProcesses[0];
    console.log(`\n🎯 Capturing audio from: ${targetProcess.name} (PID: ${targetProcess.pid})\n`);
    
    // 4. 音频参数
    const sampleRate = 48000;  // 48 kHz
    const channels = 2;        // 立体声
    const bitsPerSample = 32;  // 32-bit float
    
    // 5. 创建音频捕获器
    const capture = new AudioCapture({
        processId: targetProcess.pid,
        sampleRate: sampleRate,
        channels: channels,
        format: 'float32'
    });
    
    let packetCount = 0;
    let totalBytes = 0;
    const audioChunks = [];  // 存储音频数据块
    
    // 输出文件路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputFile = path.join(__dirname, `capture_${targetProcess.name}_${timestamp}.wav`);
    
    console.log('⚙️  Audio Settings:');
    console.log(`   Sample Rate: ${sampleRate} Hz`);
    console.log(`   Channels: ${channels} (Stereo)`);
    console.log(`   Bit Depth: ${bitsPerSample}-bit Float`);
    console.log(`   Format: WAV (IEEE Float PCM)\n`);
    
    // 6. 监听事件
    capture.on('started', () => {
        console.log('✅ Audio capture started');
        console.log(`💾 Will save to: ${outputFile}\n`);
    });
    
    capture.on('data', (event) => {
        packetCount++;
        totalBytes += event.buffer.byteLength;
        
        // 保存音频数据块
        audioChunks.push(Buffer.from(event.buffer.buffer));
        
        // 每 50 个数据包打印一次
        if (packetCount % 50 === 0) {
            const sizeMB = (totalBytes / 1024 / 1024).toFixed(2);
            const durationSec = (totalBytes / (sampleRate * channels * (bitsPerSample / 8))).toFixed(1);
            console.log(`📊 Captured: ${packetCount} packets, ${sizeMB} MB, ${durationSec}s`);
        }
    });
    
    capture.on('error', (error) => {
        console.error('❌ Capture error:', error.message);
    });
    
    capture.on('stopped', () => {
        const sizeMB = (totalBytes / 1024 / 1024).toFixed(2);
        const durationSec = (totalBytes / (sampleRate * channels * (bitsPerSample / 8))).toFixed(1);
        
        console.log(`\n✅ Audio capture stopped`);
        console.log(`📈 Final Stats: ${packetCount} packets, ${sizeMB} MB, ${durationSec}s total\n`);
        
        // 保存为 WAV 文件
        console.log('💾 Saving WAV file...');
        
        try {
            // 创建 WAV 文件头
            const wavHeader = createWavHeader(sampleRate, channels, bitsPerSample, totalBytes);
            
            // 合并所有音频数据
            const audioData = Buffer.concat(audioChunks);
            
            // 写入文件
            fs.writeFileSync(outputFile, Buffer.concat([wavHeader, audioData]));
            
            const fileSizeMB = ((wavHeader.length + totalBytes) / 1024 / 1024).toFixed(2);
            console.log(`✅ WAV file saved: ${outputFile}`);
            console.log(`📁 File size: ${fileSizeMB} MB`);
            console.log(`\n🎧 You can now play this file with any media player!`);
            console.log(`   Windows Media Player: wmplayer.exe "${outputFile}"`);
            console.log(`   VLC: vlc.exe "${outputFile}"`);
        } catch (error) {
            console.error('❌ Failed to save WAV file:', error.message);
        }
    });
    
    // 7. 启动捕获
    try {
        await capture.start();
    } catch (error) {
        console.error('❌ Failed to start capture:', error.message);
        process.exit(1);
    }
    
    // 8. 运行 30 秒后停止
    const duration = 30;
    console.log(`⏱️  Recording for ${duration} seconds...\n`);
    
    setTimeout(async () => {
        try {
            await capture.stop();
            setTimeout(() => process.exit(0), 1000); // 等待 1 秒确保文件写入完成
        } catch (error) {
            console.error('❌ Failed to stop capture:', error.message);
            process.exit(1);
        }
    }, duration * 1000);
}

// 处理 Ctrl+C
let isInterrupted = false;
process.on('SIGINT', async () => {
    if (isInterrupted) return;
    isInterrupted = true;
    
    console.log('\n\n⚠️  Interrupted by user, saving file...');
    // 给一点时间让 'stopped' 事件处理完成
    setTimeout(() => process.exit(0), 2000);
});

main().catch(console.error);
