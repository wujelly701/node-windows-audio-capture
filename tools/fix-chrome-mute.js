// 检查并解除 Chrome 静音
const addon = require('./build/Release/audio_addon.node');
const { enumerateProcesses } = require('./index');

console.log('\n=== Chrome 静音状态修复工具 ===\n');

// 1. 查找所有 Chrome 进程
const processes = enumerateProcesses();
const chromeProcesses = processes.filter(p => p.name.toLowerCase() === 'chrome.exe');

if (chromeProcesses.length === 0) {
    console.log('❌ 未找到 Chrome 进程！请启动 Chrome');
    process.exit(1);
}

console.log(`找到 ${chromeProcesses.length} 个 Chrome 进程:\n`);

// 2. 使用系统 loopback 模式创建处理器
const processor = new addon.AudioProcessor({ 
    processId: 0,  // 系统级别
    callback: () => {} 
});

try {
    processor.start('');
    
    console.log('正在检查并解除所有 Chrome 进程的静音状态...\n');
    
    let fixed = 0;
    
    // 3. 尝试为每个 Chrome 进程解除静音
    chromeProcesses.forEach(chrome => {
        console.log(`处理 Chrome PID ${chrome.pid}:`);
        
        // 创建专用处理器
        const chromeProcessor = new addon.AudioProcessor({ 
            processId: chrome.pid, 
            callback: () => {} 
        });
        
        try {
            chromeProcessor.start('chrome.exe');
            
            // 强制解除静音
            chromeProcessor.setMuteOtherProcesses(false);
            
            console.log(`  ✅ 已尝试解除静音\n`);
            fixed++;
            
            chromeProcessor.stop();
        } catch (error) {
            console.log(`  ⚠️  处理失败: ${error.message}\n`);
        }
    });
    
    processor.stop();
    
    console.log(`\n完成！已处理 ${fixed}/${chromeProcesses.length} 个 Chrome 进程\n`);
    console.log('💡 如果仍然听不到声音，请尝试:');
    console.log('   1. 打开 Windows 音量混合器 (右键任务栏音量图标)');
    console.log('   2. 找到 Chrome，确认其音量滑块没有被静音');
    console.log('   3. 如果被静音，手动点击取消静音\n');
    
} catch (error) {
    console.error('处理失败:', error.message);
}
