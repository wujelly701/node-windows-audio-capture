// test-potplayer.js - 测试 PotPlayer 进程隔离
const addon = require('./build/Release/audio_addon.node');

console.log('=== 测试 PotPlayer 进程隔离 ===\n');

// 1. 检测系统支持
console.log('1. 检测系统支持:');
const isSupported = addon.isProcessLoopbackSupported();
console.log(`   Process Loopback 支持: ${isSupported ? '✅ 支持' : '❌ 不支持'}`);

if (!isSupported) {
    console.log('\n❌ 当前系统不支持进程隔离功能');
    process.exit(1);
}

// 2. 枚举进程
console.log('\n2. 枚举进程:');
const processes = addon.enumerateProcesses();
console.log(`   找到 ${processes.length} 个进程`);

// 3. 查找播放器进程
console.log('\n3. 查找播放器进程:');
const players = ['PotPlayerMini64.exe', 'PotPlayerMini.exe', 'PotPlayer64.exe', 'PotPlayer.exe', 
                 'chrome.exe', 'msedge.exe', 'firefox.exe'];

let foundPlayer = null;
for (const playerName of players) {
    const player = processes.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (player) {
        foundPlayer = player;
        console.log(`   ✅ 找到 ${player.name} (PID: ${player.pid})`);
        break;
    }
}

if (!foundPlayer) {
    console.log('   ❌ 未找到播放器进程');
    console.log('\n   所有进程（前30个）:');
    processes.slice(0, 30).forEach(p => {
        console.log(`     - ${p.name} (PID: ${p.pid})`);
    });
    process.exit(1);
}

// 4. 测试标准 Loopback（确保基础功能正常）
console.log('\n4. 测试标准 Loopback (processId=0):');
try {
    const processor1 = new addon.AudioProcessor({
        sampleRate: 48000,
        bitsPerSample: 16,
        channels: 2,
        processId: 0
    });
    
    processor1.start();
    console.log('   ✅ 标准 Loopback 启动成功');
    
    setTimeout(() => {
        processor1.stop();
        console.log('   ✅ 标准 Loopback 停止成功');
        
        // 5. 测试进程隔离
        console.log(`\n5. 测试进程隔离 (${foundPlayer.name} PID=${foundPlayer.pid}):`);
        
        try {
            console.log('   创建 AudioProcessor...');
            const processor2 = new addon.AudioProcessor({
                sampleRate: 48000,
                bitsPerSample: 16,
                channels: 2,
                processId: foundPlayer.pid
            });
            
            console.log('   启动捕获...');
            processor2.start();
            console.log('   ✅ 进程隔离启动成功！');
            
            let dataCount = 0;
            let totalBytes = 0;
            
            processor2.on('data', (data) => {
                dataCount++;
                totalBytes += data.length;
                if (dataCount === 1) {
                    console.log(`   📦 收到第一个音频包: ${data.length} 字节`);
                } else if (dataCount % 50 === 0) {
                    console.log(`   📊 已收到 ${dataCount} 个包，总计 ${totalBytes} 字节`);
                }
            });
            
            processor2.on('error', (error) => {
                console.error('   ❌ 捕获错误:', error);
            });
            
            // 运行 5 秒
            setTimeout(() => {
                processor2.stop();
                console.log(`\n   ✅ 测试完成！`);
                console.log(`   📊 统计: ${dataCount} 个包，${totalBytes} 字节`);
                
                if (dataCount === 0) {
                    console.log('\n   ⚠️  未收到音频数据');
                    console.log(`   提示: 确保 ${foundPlayer.name} 正在播放音频`);
                } else {
                    console.log('\n=== ✅ 进程隔离功能正常！===');
                    console.log(`成功捕获 ${foundPlayer.name} 的音频数据`);
                }
                
                process.exit(0);
            }, 5000);
            
        } catch (err) {
            console.error('   ❌ 进程隔离失败:', err.message);
            console.error('\n可能原因:');
            console.error('  1. ActivateAudioInterfaceAsync 调用失败');
            console.error('  2. 目标进程没有音频活动');
            console.error('  3. 需要管理员权限');
            console.error(`  4. ${foundPlayer.name} 可能不支持进程隔离捕获`);
            process.exit(1);
        }
        
    }, 1000);
    
} catch (err) {
    console.error('   ❌ 标准 Loopback 失败:', err.message);
    console.error('   这不应该发生，说明基础音频功能有问题');
    process.exit(1);
}
