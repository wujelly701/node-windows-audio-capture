// v2.1 Bug Fix Test - 验证Stop()恢复静音状态
const { enumerateProcesses } = require('./index');

async function testUnmuteOnStop() {
    console.log('\n=== 测试 Stop() 恢复静音状态 ===\n');
    
    // 查找Chrome进程
    console.log('0. 查找Chrome进程...');
    const processes = enumerateProcesses();
    const chromeProcess = processes.find(p => p.name.toLowerCase() === 'chrome.exe');
    
    if (!chromeProcess) {
        console.error('   ✗ 未找到chrome.exe进程！请启动Chrome并播放音频');
        return;
    }
    
    console.log(`   ✓ 找到Chrome进程: PID=${chromeProcess.pid}\n`);
    
    const addon = require('./build/Release/audio_addon.node');
    const processor = new addon.AudioProcessor({ 
        processId: chromeProcess.pid, 
        callback: () => {} 
    });
    
    try {
        // 启动捕获并启用静音
        console.log('1. 启动捕获，启用静音控制...');
        processor.start('chrome.exe');
        
        // 等待1秒让捕获稳定
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        processor.setMuteOtherProcesses(true);
        
        console.log('   ✓ 已静音非目标进程（chrome.exe除外）');
        console.log('   ℹ️ 请检查：现在应该只能听到Chrome的声音\n');
        
        // 等待5秒
        console.log('2. 等待5秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 停止捕获
        console.log('3. 停止捕获...');
        processor.stop();
        
        console.log('   ✓ 捕获已停止');
        console.log('   ℹ️ 请检查：现在应该能听到所有应用的声音（PotPlayer、Chrome等）\n');
        
        console.log('=== 测试完成 ===');
        console.log('如果能听到PotPlayer和Chrome的声音，说明修复成功！\n');
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testUnmuteOnStop();
