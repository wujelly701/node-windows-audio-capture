// v2.1 修复测试 - 允许所有 Chrome 进程
const { enumerateProcesses } = require('./index');
const addon = require('./build/Release/audio_addon.node');

async function testWithAllowList() {
    console.log('\n=== 测试：使用允许列表保护所有Chrome进程 ===\n');
    
    // 1. 获取所有 Chrome 进程
    console.log('1. 枚举所有进程...');
    const processes = enumerateProcesses();
    const chromeProcesses = processes.filter(p => p.name.toLowerCase() === 'chrome.exe');
    const chromePids = chromeProcesses.map(p => p.pid);
    
    console.log(`   ✓ 找到 ${chromeProcesses.length} 个 Chrome 进程`);
    console.log(`   PIDs: ${chromePids.slice(0, 5).join(', ')}...`);
    
    // 2. 创建捕获器（使用第一个Chrome进程作为目标）
    if (chromeProcesses.length === 0) {
        console.error('   ✗ 未找到Chrome进程！');
        return;
    }
    
    const targetPid = chromeProcesses[0].pid;
    console.log(`\n2. 创建捕获器（目标PID: ${targetPid}）...`);
    
    const processor = new addon.AudioProcessor({ 
        processId: targetPid, 
        callback: () => {} 
    });
    
    try {
        // 3. 启动捕获
        console.log('3. 启动捕获...');
        processor.start('chrome.exe');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 4. 设置允许列表（包含所有Chrome进程）
        console.log(`\n4. 设置允许列表（${chromeProcesses.length}个Chrome进程）...`);
        processor.setAllowList(chromePids);
        
        // 5. 启用静音控制
        console.log('5. 启用静音控制...');
        processor.setMuteOtherProcesses(true);
        
        console.log('\n   ✅ 静音控制已启用');
        console.log('   ℹ️  目标进程: Chrome (不会静音)');
        console.log('   ℹ️  允许列表: 所有Chrome进程 (不会静音)');
        console.log('   ℹ️  其他进程: PotPlayer等 (会被静音)');
        console.log('\n   👂 请检查: 现在应该能听到Chrome，听不到PotPlayer\n');
        
        // 6. 等待5秒
        console.log('6. 等待5秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 7. 停止捕获
        console.log('7. 停止捕获（应自动恢复所有音量）...');
        processor.stop();
        
        console.log('\n   ✅ 捕获已停止');
        console.log('   👂 请检查: 现在应该能同时听到Chrome和PotPlayer\n');
        
        console.log('=== 测试完成 ===\n');
        
        if (await askUser('Chrome声音是否正常？(y/n) ')) {
            console.log('✅ 修复成功！');
        } else {
            console.log('❌ 仍有问题，需要进一步诊断');
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

function askUser(question) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

testWithAllowList();
