// 基础功能测试脚本
const addon = require('./build/Release/audio_addon.node');

console.log('✅ Native addon loaded successfully');
console.log('Available exports:', Object.keys(addon));

// 测试 getDeviceInfo 静态方法
try {
    const deviceInfo = addon.getDeviceInfo();
    console.log('\n📱 Default Audio Device:');
    console.log('  Name:', deviceInfo.name);
    console.log('  ID:', deviceInfo.id);
} catch (error) {
    console.error('❌ Error getting device info:', error.message);
}

// 测试 AudioProcessor 构造
try {
    console.log('\n🎵 Creating AudioProcessor instance...');
    const processor = new addon.AudioProcessor({
        processId: 0,  // 捕获所有进程音频
        callback: (buffer) => {
            console.log(`  Received audio data: ${buffer.length} bytes`);
        }
    });
    console.log('✅ AudioProcessor created successfully');
    
    // 测试方法调用（不实际启动，避免需要管理员权限）
    console.log('\n🧪 Testing method existence:');
    console.log('  start:', typeof processor.start);
    console.log('  stop:', typeof processor.stop);
    console.log('  startCapture:', typeof processor.startCapture);
    console.log('  stopCapture:', typeof processor.stopCapture);
    
} catch (error) {
    console.error('❌ Error creating AudioProcessor:', error.message);
}

console.log('\n✅ Basic tests completed');
