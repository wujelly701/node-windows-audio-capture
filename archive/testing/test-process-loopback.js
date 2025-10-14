// test-process-loopback.js - 测试 v2.0 进程隔离功能
const addon = require('./build/Release/audio_addon.node');

console.log('=== v2.0 进程隔离功能测试 ===\n');

// 1. 检测系统支持
console.log('1. 检测 Process Loopback 支持:');
const isSupported = addon.isProcessLoopbackSupported ? addon.isProcessLoopbackSupported() : false;
console.log(`   支持状态: ${isSupported ? '✅ 支持' : '❌ 不支持 (需要 Windows 10 19H1+)'}`);

if (!isSupported) {
    console.log('\n❌ 当前系统不支持进程隔离功能');
    console.log('需要 Windows 10 版本 1903 (Build 18362) 或更高');
    process.exit(1);
}

// 2. 枚举进程
console.log('\n2. 枚举活动进程:');
const processes = addon.enumerateProcesses();
console.log(`   找到 ${processes.length} 个进程`);

// 3. 查找常见音频应用
console.log('\n3. 查找常见音频应用:');
const audioApps = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'spotify.exe', 'discord.exe'];
const foundApps = [];

for (const appName of audioApps) {
    const app = processes.find(p => p.name.toLowerCase() === appName.toLowerCase());
    if (app) {
        foundApps.push(app);
        console.log(`   ✅ 找到 ${app.name} (PID: ${app.pid})`);
    }
}

if (foundApps.length === 0) {
    console.log('   ⚠️ 未找到常见音频应用');
    console.log('   提示: 请打开 Chrome、Edge 或其他浏览器播放音频');
    
    // 显示所有进程供参考
    console.log('\n   所有进程列表（前20个）:');
    processes.slice(0, 20).forEach(p => {
        console.log(`     - ${p.name} (PID: ${p.pid})`);
    });
} else {
    // 4. 测试进程隔离捕获
    console.log('\n4. 测试进程隔离捕获:');
    const targetApp = foundApps[0];
    console.log(`   目标进程: ${targetApp.name} (PID: ${targetApp.pid})`);
    
    try {
        console.log('   创建 AudioProcessor...');
        const processor = new addon.AudioProcessor({
            sampleRate: 48000,
            bitsPerSample: 16,
            channels: 2,
            processId: targetApp.pid  // v2.0: 指定进程 ID
        });
        
        console.log('   启动捕获...');
        processor.start();
        
        console.log('   ✅ 进程隔离捕获启动成功！');
        console.log('   📊 如果 %s 正在播放音频，应该能捕获到', targetApp.name);
        
        // 监听数据事件
        let dataCount = 0;
        processor.on('data', (data) => {
            dataCount++;
            if (dataCount <= 3) {
                console.log(`   📦 收到音频数据: ${data.length} 字节`);
            } else if (dataCount === 4) {
                console.log('   ... (后续数据省略)');
            }
        });
        
        processor.on('error', (error) => {
            console.error('   ❌ 错误:', error);
        });
        
        // 运行5秒后停止
        setTimeout(() => {
            console.log('\n   停止捕获...');
            processor.stop();
            console.log(`   ✅ 测试完成！共捕获 ${dataCount} 个数据包`);
            
            if (dataCount === 0) {
                console.log('   ⚠️ 未捕获到音频数据');
                console.log('   可能原因: 目标进程未播放音频');
            }
            
            process.exit(0);
        }, 5000);
        
    } catch (error) {
        console.error('   ❌ 捕获失败:', error.message);
        process.exit(1);
    }
}
