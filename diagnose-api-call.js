// 诊断 ActivateAudioInterfaceAsync 调用问题

const addon = require('./build/Release/audio_addon.node');
const os = require('os');

console.log('=== 诊断 ActivateAudioInterfaceAsync 调用问题 ===\n');

// 1. 系统信息
console.log('1. 系统信息:');
console.log(`   Windows 版本: ${os.release()} (Build ${os.version()})`);
console.log(`   Node.js: ${process.version}`);

// 2. 权限检查
console.log('\n2. 权限检查:');
const isAdmin = () => {
    try {
        const { execSync } = require('child_process');
        execSync('net session', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
};
console.log(`   管理员权限: ${isAdmin() ? '✅ 是' : '❌ 否'}`);

// 3. API 支持
console.log('\n3. Process Loopback API 支持:');
console.log(`   系统支持: ${addon.isProcessLoopbackSupported() ? '✅ 支持' : '❌ 不支持'}`);

// 4. 测试标准 Loopback
console.log('\n4. 测试标准 Loopback (基准测试):');
try {
    const processor1 = new addon.AudioProcessor();
    processor1.configure({
        sampleRate: 48000,
        channels: 2,
        bitsPerSample: 16,
        bufferDuration: 100
    });
    processor1.start(0);  // processId=0
    console.log('   ✅ 标准 Loopback 工作正常');
    processor1.stop();
} catch (err) {
    console.log(`   ❌ 标准 Loopback 失败: ${err.message}`);
}

// 5. 测试进程隔离（使用自身进程）
console.log('\n5. 测试进程隔离 (使用自身进程):');
console.log(`   目标: node.exe (PID=${process.pid})`);
try {
    const processor2 = new addon.AudioProcessor();
    processor2.configure({
        sampleRate: 48000,
        channels: 2,
        bitsPerSample: 16,
        bufferDuration: 100
    });
    processor2.start(process.pid);  // 使用自身进程
    console.log('   ✅ 进程隔离成功！');
    processor2.stop();
} catch (err) {
    console.log(`   ❌ 进程隔离失败: ${err.message}`);
}

console.log('\n=== 诊断完成 ===');
console.log('\n建议:');
console.log('  1. 如果没有管理员权限，请尝试以管理员身份运行');
console.log('  2. 确保目标进程正在播放音频');
console.log('  3. 查看 DEBUG 输出（使用 DebugView 工具）');
