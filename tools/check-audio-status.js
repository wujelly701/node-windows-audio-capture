// 手动检查当前音频状态
const addon = require('./build/Release/audio_addon.node');

console.log('\n=== 手动检查音频状态 ===\n');
console.log('1. 请先确保以下应用正在播放音频:');
console.log('   - Chrome: 播放YouTube/音乐');
console.log('   - PotPlayer: 播放视频/音频');
console.log('\n2. 然后按任意键继续检查...\n');

const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.once('keypress', async () => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    
    console.log('\n正在检查音频会话...\n');
    
    // 使用系统 Loopback 模式枚举所有音频会话
    const processor = new addon.AudioProcessor({ 
        processId: 0,  // 0 = 系统音频
        callback: () => {} 
    });
    
    try {
        processor.start('');
        
        // 等待1秒让系统稳定
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('当前正在播放音频的进程:\n');
        
        const { enumerateProcesses } = require('./index');
        const processes = enumerateProcesses();
        
        const playingProcesses = processes.filter(p => p.isPlayingAudio);
        
        if (playingProcesses.length === 0) {
            console.log('❌ 未检测到任何进程正在播放音频！');
            console.log('   请确保Chrome和PotPlayer正在播放音频后重试\n');
        } else {
            playingProcesses.forEach((p, i) => {
                console.log(`${i + 1}. ${p.name} (PID: ${p.pid})`);
            });
            
            console.log(`\n✅ 检测到 ${playingProcesses.length} 个进程正在播放音频\n`);
            
            // 检查 Chrome
            const chromeCount = playingProcesses.filter(p => 
                p.name.toLowerCase() === 'chrome.exe').length;
            
            if (chromeCount === 0) {
                console.log('⚠️  Chrome 未在播放音频列表中！');
                console.log('   这可能解释了为什么听不到Chrome的声音\n');
            } else {
                console.log(`✅ 检测到 ${chromeCount} 个 Chrome 进程在播放音频\n`);
            }
        }
        
        processor.stop();
        
    } catch (error) {
        console.error('检查失败:', error.message);
    }
    
    process.exit(0);
});

console.log('(按任意键继续...)');
