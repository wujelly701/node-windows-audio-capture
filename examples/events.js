/**
 * 示例：事件处理演示
 * 演示如何使用 pause/resume 和所有事件监听器
 */

const { AudioCapture, getDeviceInfo } = require('../index');

async function main() {
    console.log('🎵 Windows Audio Capture - Events Example\n');
    
    // 获取设备信息
    const device = getDeviceInfo();
    console.log('📱 Default Audio Device:', device.name);
    console.log();
    
    // 创建捕获器
    const capture = new AudioCapture({ processId: 0 });
    
    let dataCount = 0;
    
    // 监听所有事件
    capture.on('started', () => {
        console.log('🟢 [EVENT] started - Audio capture is now running');
    });
    
    capture.on('stopped', () => {
        console.log('🔴 [EVENT] stopped - Audio capture has stopped');
    });
    
    capture.on('paused', () => {
        console.log('⏸️  [EVENT] paused - Audio capture is paused (no data events)');
    });
    
    capture.on('resumed', () => {
        console.log('▶️  [EVENT] resumed - Audio capture resumed');
    });
    
    capture.on('data', (event) => {
        dataCount++;
        if (dataCount % 20 === 0) {
            console.log(`📦 [EVENT] data - Packet #${dataCount}, ${event.length} bytes`);
        }
    });
    
    capture.on('error', (error) => {
        console.error('❌ [EVENT] error -', error.message);
    });
    
    // 启动捕获
    console.log('▶️  Starting capture...\n');
    await capture.start();
    
    // 演示事件序列
    console.log('\n⏱️  Demo sequence:');
    console.log('  - 0s: Start capture');
    console.log('  - 3s: Pause capture');
    console.log('  - 6s: Resume capture');
    console.log('  - 9s: Stop capture\n');
    
    // 3 秒后暂停
    setTimeout(() => {
        console.log('\n⏸️  Pausing capture...');
        capture.pause();
        console.log(`   (Captured ${dataCount} packets before pause)\n`);
    }, 3000);
    
    // 6 秒后恢复
    setTimeout(() => {
        console.log('\n▶️  Resuming capture...');
        capture.resume();
        console.log();
    }, 6000);
    
    // 9 秒后停止
    setTimeout(async () => {
        console.log('\n🛑 Stopping capture...');
        await capture.stop();
        console.log(`\n📊 Total packets captured: ${dataCount}`);
        console.log('✅ Demo completed\n');
        process.exit(0);
    }, 9000);
}

// 处理 Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Interrupted by user');
    process.exit(0);
});

main().catch(console.error);
