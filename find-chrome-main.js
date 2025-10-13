// find-chrome-main.js - 查找 Chrome 主进程
const addon = require('./build/Release/audio_addon.node');

console.log('=== 查找 Chrome 主进程 ===\n');

const processes = addon.enumerateProcesses();
const chromeProcesses = processes.filter(p => p.name.toLowerCase() === 'chrome.exe');

console.log(`找到 ${chromeProcesses.length} 个 Chrome 进程:\n`);

chromeProcesses.forEach((p, index) => {
    console.log(`${index + 1}. PID: ${p.pid}`);
});

console.log('\n提示: Chrome 使用多进程架构');
console.log('- 第一个通常是主进程（Browser Process）');
console.log('- 其他是渲染进程/扩展进程/GPU进程等');
console.log('\n建议尝试第一个进程（最小的 PID）');

if (chromeProcesses.length > 0) {
    const mainProcess = chromeProcesses.sort((a, b) => a.pid - b.pid)[0];
    console.log(`\n推荐 PID: ${mainProcess.pid}`);
    
    // 尝试捕获
    console.log('\n尝试捕获此进程...');
    try {
        const processor = new addon.AudioProcessor({
            sampleRate: 48000,
            bitsPerSample: 16,
            channels: 2,
            processId: mainProcess.pid
        });
        
        processor.start();
        console.log('✅ 启动成功！');
        
        let dataCount = 0;
        processor.on('data', (data) => {
            dataCount++;
            if (dataCount === 1) {
                console.log(`📦 收到音频数据: ${data.length} 字节`);
            }
        });
        
        setTimeout(() => {
            processor.stop();
            console.log(`测试完成！共收到 ${dataCount} 个数据包`);
            
            if (dataCount > 0) {
                console.log('\n✅ 进程隔离功能正常！');
            } else {
                console.log('\n⚠️  未收到音频数据（Chrome 可能未播放音频）');
            }
        }, 3000);
        
    } catch (err) {
        console.error('❌ 失败:', err.message);
    }
}
