// diagnose-process-loopback.js - 诊断进程隔离问题
const addon = require('./build/Release/audio_addon.node');

console.log('=== 诊断进程隔离功能 ===\n');

// 1. 检测系统支持
console.log('1. 系统支持检测:');
const isSupported = addon.isProcessLoopbackSupported();
console.log(`   Windows 版本: ${process.platform}`);
console.log(`   Node 版本: ${process.version}`);
console.log(`   Process Loopback 支持: ${isSupported ? '✅' : '❌'}`);

if (!isSupported) {
    console.log('\n   当前系统不支持，退出测试');
    process.exit(1);
}

// 2. 枚举进程
console.log('\n2. 枚举进程:');
const processes = addon.enumerateProcesses();
console.log(`   找到 ${processes.length} 个进程`);

// 3. 查找 Chrome
const chrome = processes.find(p => p.name.toLowerCase() === 'chrome.exe');
if (!chrome) {
    console.log('\n   ❌ 未找到 Chrome 进程');
    console.log('   提示: 请打开 Chrome 浏览器');
    process.exit(1);
}

console.log(`   ✅ 找到 Chrome (PID: ${chrome.pid})`);

// 4. 尝试标准 Loopback（v1.0 模式）
console.log('\n3. 测试标准 Loopback（v1.0 - processId=0）:');
try {
    const processor1 = new addon.AudioProcessor({
        sampleRate: 48000,
        bitsPerSample: 16,
        channels: 2,
        processId: 0  // 标准模式
    });
    
    processor1.start();
    console.log('   ✅ 标准 Loopback 启动成功');
    
    setTimeout(() => {
        processor1.stop();
        console.log('   ✅ 标准 Loopback 停止成功');
        
        // 5. 尝试进程隔离模式
        console.log('\n4. 测试进程隔离（v2.0 - processId=' + chrome.pid + '）:');
        try {
            const processor2 = new addon.AudioProcessor({
                sampleRate: 48000,
                bitsPerSample: 16,
                channels: 2,
                processId: chrome.pid  // 进程隔离模式
            });
            
            console.log('   尝试启动...');
            processor2.start();
            console.log('   ✅ 进程隔离启动成功！');
            
            let dataCount = 0;
            processor2.on('data', (data) => {
                dataCount++;
                if (dataCount === 1) {
                    console.log(`   📦 收到第一个音频包: ${data.length} 字节`);
                }
            });
            
            setTimeout(() => {
                processor2.stop();
                console.log(`   ✅ 测试完成！共收到 ${dataCount} 个数据包`);
                
                if (dataCount === 0) {
                    console.log('   ⚠️  未收到音频数据（可能 Chrome 没有播放音频）');
                } else {
                    console.log('\n=== ✅ 进程隔离功能正常！===');
                }
                
                process.exit(0);
            }, 3000);
            
        } catch (err) {
            console.error('   ❌ 进程隔离失败:', err.message);
            console.error('\n可能原因:');
            console.error('  1. Chrome 进程没有音频活动');
            console.error('  2. Chrome 是沙盒进程，需要捕获主进程');
            console.error('  3. Windows IAudioClient3 API 调用失败');
            process.exit(1);
        }
        
    }, 1000);
    
} catch (err) {
    console.error('   ❌ 标准 Loopback 失败:', err.message);
    console.error('   这不应该发生，说明基础音频功能有问题');
    process.exit(1);
}
