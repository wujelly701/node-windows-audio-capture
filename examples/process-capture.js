/**
 * 示例：进程特定音频捕获
 * 演示如何捕获特定进程的音频（如浏览器、音乐播放器）
 */

const { AudioCapture, enumerateProcesses } = require('../index');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🎵 Windows Audio Capture - Process-Specific Example\n');
    
    // 1. 枚举所有进程
    console.log('📋 Enumerating processes...');
    const processes = enumerateProcesses();
    
    // 2. 查找目标进程（例如：chrome.exe, spotify.exe, vlc.exe）
    const targetNames = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'spotify.exe', 'vlc.exe'];
    const targetProcesses = processes.filter(p => 
        targetNames.some(name => p.name.toLowerCase().includes(name.toLowerCase()))
    );
    
    if (targetProcesses.length === 0) {
        console.log('❌ No target processes found. Please start a browser or music player.');
        console.log('   Supported: Chrome, Edge, Firefox, Spotify, VLC\n');
        process.exit(1);
    }
    
    console.log(`\n✅ Found ${targetProcesses.length} target process(es):`);
    targetProcesses.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (PID: ${p.pid})`);
    });
    
    // 3. 选择第一个目标进程
    const targetProcess = targetProcesses[0];
    console.log(`\n🎯 Capturing audio from: ${targetProcess.name} (PID: ${targetProcess.pid})\n`);
    
    // 4. 创建音频捕获器
    const capture = new AudioCapture({
        processId: targetProcess.pid
    });
    
    let packetCount = 0;
    let totalBytes = 0;
    const outputFile = path.join(__dirname, `capture_${targetProcess.pid}.raw`);
    const writeStream = fs.createWriteStream(outputFile);
    
    // 5. 监听事件
    capture.on('started', () => {
        console.log('✅ Audio capture started');
        console.log(`💾 Saving to: ${outputFile}\n`);
    });
    
    capture.on('data', (event) => {
        packetCount++;
        totalBytes += event.length;
        
        // 写入文件
        writeStream.write(event.buffer);
        
        // 每 50 个数据包打印一次
        if (packetCount % 50 === 0) {
            const sizeMB = (totalBytes / 1024 / 1024).toFixed(2);
            console.log(`📊 Captured: ${packetCount} packets, ${sizeMB} MB`);
        }
    });
    
    capture.on('error', (error) => {
        console.error('❌ Capture error:', error.message);
        writeStream.end();
    });
    
    capture.on('stopped', () => {
        writeStream.end();
        const sizeMB = (totalBytes / 1024 / 1024).toFixed(2);
        console.log(`\n✅ Audio capture stopped`);
        console.log(`📈 Final Stats: ${packetCount} packets, ${sizeMB} MB total`);
        console.log(`💾 Saved to: ${outputFile}`);
    });
    
    // 6. 启动捕获
    try {
        await capture.start();
    } catch (error) {
        console.error('❌ Failed to start capture:', error.message);
        writeStream.end();
        process.exit(1);
    }
    
    // 7. 运行 30 秒后停止
    console.log('⏱️  Capturing for 30 seconds...\n');
    
    setTimeout(async () => {
        try {
            await capture.stop();
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to stop capture:', error.message);
            process.exit(1);
        }
    }, 30000);
}

// 处理 Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Interrupted by user');
    process.exit(0);
});

main().catch(console.error);
