/**
 * 麦克风捕获示例
 * 演示如何使用 MicrophoneCapture API
 * 
 * @since v2.9.0
 */

const { MicrophoneCapture } = require('..');
const fs = require('fs');
const path = require('path');

// 示例 1: 最简单的用法
async function example1_basic() {
  console.log('\n===== 示例 1: 基础麦克风捕获 =====\n');
  
  const mic = new MicrophoneCapture({
    sampleRate: 48000,
    channels: 1
  });
  
  // 保存音频到文件
  const outputPath = path.join(__dirname, 'microphone-output.pcm');
  const outputStream = fs.createWriteStream(outputPath);
  
  let totalBytes = 0;
  
  mic.on('data', (chunk) => {
    totalBytes += chunk.length;
    process.stdout.write(`\r已捕获: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    outputStream.write(chunk);
  });
  
  mic.on('error', (error) => {
    console.error('\n错误:', error.message);
  });
  
  console.log('开始录音（5秒）...');
  await mic.start();
  
  // 录制 5 秒
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  mic.stop();
  outputStream.end();
  
  console.log('\n录音完成！');
  console.log(`文件保存至: ${outputPath}`);
  console.log(`采样率: 48000 Hz, 声道: 1, 格式: Float32 PCM\n`);
}

// 示例 2: 列出所有麦克风并选择
async function example2_device_selection() {
  console.log('\n===== 示例 2: 麦克风设备选择 =====\n');
  
  // 列出所有麦克风
  const microphones = await MicrophoneCapture.getMicrophones();
  
  console.log(`找到 ${microphones.length} 个麦克风设备:\n`);
  
  microphones.forEach((mic, index) => {
    console.log(`[${index + 1}] ${mic.name}`);
    console.log(`    ID: ${mic.id}`);
    console.log(`    默认: ${mic.isDefault ? '是' : '否'}`);
    console.log(`    激活: ${mic.isActive ? '是' : '否'}`);
    console.log(`    声道数: ${mic.channelCount}`);
    console.log(`    采样率: ${mic.sampleRate} Hz`);
    if (mic.manufacturer) {
      console.log(`    制造商: ${mic.manufacturer}`);
    }
    console.log('');
  });
  
  // 获取默认麦克风
  const defaultMic = await MicrophoneCapture.getDefaultMicrophone();
  if (defaultMic) {
    console.log(`系统默认麦克风: ${defaultMic.name}\n`);
    
    // 使用默认麦克风
    const mic = new MicrophoneCapture({ deviceId: defaultMic.id });
    
    let chunkCount = 0;
    mic.on('data', () => {
      chunkCount++;
      process.stdout.write(`\r已接收 ${chunkCount} 个数据块`);
    });
    
    console.log('使用默认麦克风录音（3秒）...');
    await mic.start();
    await new Promise(resolve => setTimeout(resolve, 3000));
    mic.stop();
    console.log('\n');
  }
}

// 示例 3: 启用音频效果
async function example3_audio_effects() {
  console.log('\n===== 示例 3: 音频效果 =====\n');
  
  const mic = new MicrophoneCapture({
    sampleRate: 48000,
    channels: 1,
    denoise: true,      // 启用降噪
    agc: true,          // 启用 AGC
    eq: true,           // 启用 EQ
    eqPreset: 'voice'   // 人声预设
  });
  
  let statsCount = 0;
  
  mic.on('data', () => {
    statsCount++;
    
    // 每秒显示一次统计信息
    if (statsCount % 100 === 0) {
      console.log('\n当前音频效果状态:');
      
      // 降噪统计
      const denoiseStats = mic.getDenoiseStats();
      if (denoiseStats) {
        console.log(`  降噪: VAD 概率 = ${(denoiseStats.vadProbability * 100).toFixed(1)}%`);
      }
      
      // AGC 统计
      const agcStats = mic.getAGCStats();
      if (agcStats) {
        console.log(`  AGC: 当前增益 = ${agcStats.currentGain.toFixed(2)} dB, 峰值 = ${agcStats.peakLevel.toFixed(2)} dBFS`);
      }
      
      // EQ 统计
      const eqStats = mic.getEQStats();
      if (eqStats) {
        console.log(`  EQ: Low=${eqStats.lowGain}dB, Mid=${eqStats.midGain}dB, High=${eqStats.highGain}dB`);
      }
    }
  });
  
  console.log('启用音频效果录音（5秒）...\n');
  await mic.start();
  
  // 3秒后动态调整 EQ
  setTimeout(() => {
    console.log('\n动态调整 EQ...');
    mic.setEQBandGain('low', -5);
    mic.setEQBandGain('mid', 8);
    mic.setEQBandGain('high', 4);
    console.log('EQ 已调整为自定义设置\n');
  }, 3000);
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  mic.stop();
  console.log('\n录音完成！\n');
}

// 示例 4: 实时翻译场景（模拟）
async function example4_realtime_translation() {
  console.log('\n===== 示例 4: 实时翻译场景 =====\n');
  
  const mic = new MicrophoneCapture({
    sampleRate: 16000,  // ASR 常用采样率
    channels: 1,
    denoise: true,
    agc: true,
    agcOptions: {
      targetLevel: -18,
      maxGain: 30
    },
    eq: true,
    eqPreset: 'voice'
  });
  
  let buffer = [];
  const CHUNK_SIZE = 16000 * 2;  // 1秒的音频（16000 samples * 2 bytes）
  
  mic.on('data', (chunk) => {
    buffer.push(chunk);
    const totalBytes = buffer.reduce((sum, b) => sum + b.length, 0);
    
    if (totalBytes >= CHUNK_SIZE) {
      // 合并缓冲区
      const audioData = Buffer.concat(buffer);
      buffer = [];
      
      // 模拟 ASR 处理
      console.log(`[ASR] 处理 ${(audioData.length / 1024).toFixed(2)} KB 音频数据...`);
      
      // 这里应该调用实际的 ASR API
      // 例如: const text = await asr.recognize(audioData);
      // console.log(`[翻译] ${text} -> ${translated}`);
    }
  });
  
  mic.on('error', (error) => {
    console.error('错误:', error.message);
  });
  
  console.log('开始实时语音识别（10秒）...');
  console.log('配置: 16kHz, 降噪+AGC+人声EQ\n');
  
  await mic.start();
  await new Promise(resolve => setTimeout(resolve, 10000));
  mic.stop();
  
  console.log('\n实时翻译演示结束\n');
}

// 示例 5: 动态切换麦克风
async function example5_switch_device() {
  console.log('\n===== 示例 5: 动态切换麦克风 =====\n');
  
  const microphones = await MicrophoneCapture.getMicrophones();
  
  if (microphones.length < 2) {
    console.log('系统只有 1 个麦克风，无法演示动态切换\n');
    return;
  }
  
  console.log(`找到 ${microphones.length} 个麦克风，演示动态切换...\n`);
  
  // 使用第一个麦克风
  let mic = new MicrophoneCapture({ deviceId: microphones[0].id });
  
  console.log(`[1] 使用麦克风: ${microphones[0].name}`);
  await mic.start();
  await new Promise(resolve => setTimeout(resolve, 3000));
  mic.stop();
  console.log('[1] 已停止\n');
  
  // 切换到第二个麦克风
  mic = new MicrophoneCapture({ deviceId: microphones[1].id });
  
  console.log(`[2] 切换到麦克风: ${microphones[1].name}`);
  await mic.start();
  await new Promise(resolve => setTimeout(resolve, 3000));
  mic.stop();
  console.log('[2] 已停止\n');
  
  console.log('动态切换演示完成\n');
}

// 主函数
async function main() {
  console.log('=================================================');
  console.log('  MicrophoneCapture API 示例');
  console.log('  node-windows-audio-capture v2.9.0');
  console.log('=================================================');
  
  try {
    // 运行所有示例
    await example1_basic();
    await example2_device_selection();
    await example3_audio_effects();
    await example4_realtime_translation();
    await example5_switch_device();
    
    console.log('=================================================');
    console.log('  所有示例运行完成！');
    console.log('=================================================\n');
    
  } catch (error) {
    console.error('\n运行示例时出错:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  example1_basic,
  example2_device_selection,
  example3_audio_effects,
  example4_realtime_translation,
  example5_switch_device
};
