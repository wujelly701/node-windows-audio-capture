/**
 * 示例：基础音频捕获
 * 演示如何使用 AudioCapture 捕获系统音频
 */

const { AudioCapture, getDeviceInfo } = require('../index');

async function main() {
    console.log('🎵 Windows Audio Capture - Basic Example\n');
    
    // 1. 获取默认音频设备信息
    try {
        const device = getDeviceInfo();
        console.log('📱 Default Audio Device:');
        console.log(`  Name: ${device.name}`);
        console.log(`  ID: ${device.id}\n`);
    } catch (error) {
        console.error('❌ Failed to get device info:', error.message);
        process.exit(1);
    }
    
    // 2. 创建音频捕获器（捕获所有进程音频）
    const capture = new AudioCapture({
        processId: 0,  // 0 = 捕获所有进程音频
    });
    
    let packetCount = 0;
    let totalBytes = 0;
    
    // 3. 监听事件
    capture.on('started', () => {
        console.log('✅ Audio capture started');
        console.log('🎤 Capturing audio data...\n');
    });
    
    capture.on('data', (event) => {
        packetCount++;
        totalBytes += event.length;
        
        // 每 100 个数据包打印一次统计信息
        if (packetCount % 100 === 0) {
            const avgSize = (totalBytes / packetCount).toFixed(2);
            console.log(`📊 Stats: ${packetCount} packets, ${totalBytes} bytes total, ${avgSize} bytes avg`);
        }
    });
    
    capture.on('error', (error) => {
        console.error('❌ Capture error:', error.message);
    });
    
    capture.on('stopped', () => {
        console.log('\n✅ Audio capture stopped');
        console.log(`📈 Final Stats: ${packetCount} packets, ${totalBytes} bytes total`);
    });
    
    // 4. 启动捕获
    try {
        await capture.start();
    } catch (error) {
        console.error('❌ Failed to start capture:', error.message);
        process.exit(1);
    }
    
    // 5. 运行 10 秒后停止
    console.log('⏱️  Capturing for 10 seconds...\n');
    
    setTimeout(async () => {
        try {
            await capture.stop();
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to stop capture:', error.message);
            process.exit(1);
        }
    }, 10000);
}

// 处理 Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Interrupted by user');
    process.exit(0);
});

main().catch(console.error);
