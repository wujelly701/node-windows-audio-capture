// simple-test-process-filter.js - 简化的进程过滤测试
const addon = require('./build/Release/audio_addon.node');

console.log('=== 简化进程过滤测试 ===\n');

// 1. 检测支持
console.log('1. 系统支持检测:');
const isSupported = addon.isProcessLoopbackSupported();
console.log(`   进程过滤支持: ${isSupported ? '✅ 是' : '❌ 否'}\n`);

// 2. 查找 PotPlayer
console.log('2. 查找 PotPlayer 进程:');
const processes = addon.enumerateProcesses();
const potplayer = processes.find(p => 
    p.name.toLowerCase().includes('potplayer') || 
    p.name.toLowerCase().includes('chrome')
);

if (!potplayer) {
    console.log('   ❌ 未找到播放器\n');
    console.log('   可用进程（前20个）:');
    processes.slice(0, 20).forEach(p => {
        console.log(`     ${p.name} (PID: ${p.pid})`);
    });
    process.exit(1);
}

console.log(`   ✅ 找到: ${potplayer.name} (PID: ${potplayer.pid})\n`);

// 3. 测试标准 Loopback
console.log('3. 测试标准 Loopback:');
try {
    const proc1 = new addon.AudioProcessor({
        sampleRate: 48000,
        bitsPerSample: 16,
        channels: 2,
        processId: 0  // 标准模式
    });
    proc1.start();
    console.log('   ✅ 启动成功');
    proc1.stop();
    console.log('   ✅ 停止成功\n');
} catch (err) {
    console.error('   ❌ 失败:', err.message);
    process.exit(1);
}

// 4. 测试进程过滤
console.log(`4. 测试进程过滤 (PID: ${potplayer.pid}):`);
try {
    const proc2 = new addon.AudioProcessor({
        sampleRate: 48000,
        bitsPerSample: 16,
        channels: 2,
        processId: potplayer.pid  // 进程过滤模式
    });
    
    console.log('   ✅ AudioProcessor 创建成功');
    
    proc2.start();
    console.log('   ✅ 进程过滤启动成功！');
    
    // 等待 2 秒
    setTimeout(() => {
        proc2.stop();
        console.log('   ✅ 进程过滤停止成功');
        console.log('\n🎉 所有测试通过！进程过滤功能正常工作！\n');
    }, 2000);
    
} catch (err) {
    console.error('   ❌ 失败:', err.message);
    console.error('\n详细错误信息:');
    console.error(err);
    process.exit(1);
}
