// 诊断 Chrome 音频进程
const { enumerateProcesses } = require('./index');

console.log('\n=== Chrome 进程诊断 ===\n');

const processes = enumerateProcesses();
const chromeProcesses = processes.filter(p => p.name.toLowerCase() === 'chrome.exe');

console.log(`找到 ${chromeProcesses.length} 个 Chrome 进程:\n`);

chromeProcesses.forEach((proc, index) => {
    console.log(`${index + 1}. PID=${proc.pid}, Playing=${proc.isPlayingAudio ? '✅ 播放中' : '❌ 无音频'}`);
});

console.log('\n=== 音频会话枚举 ===\n');

const addon = require('./build/Release/audio_addon.node');

// 尝试枚举所有音频会话
chromeProcesses.forEach(proc => {
    console.log(`检查 Chrome PID ${proc.pid}:`);
    
    const processor = new addon.AudioProcessor({ 
        processId: proc.pid, 
        callback: () => {} 
    });
    
    try {
        processor.start('chrome.exe');
        console.log(`  ✓ 可以为此 PID 启动捕获\n`);
        processor.stop();
    } catch (error) {
        console.log(`  ✗ 无法为此 PID 启动捕获: ${error.message}\n`);
    }
});

console.log('=== 诊断完成 ===\n');
console.log('💡 提示: 请在 Chrome 播放音频时运行此脚本');
console.log('💡 如果有多个 Chrome 进程，请尝试使用 isPlayingAudio=true 的那个\n');
