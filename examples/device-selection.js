/**
 * Device Selection Example
 * Demonstrates how to use the device selection feature in v2.3.0
 */

const AudioCapture = require('../lib/audio-capture');

async function main() {
  console.log('=== Device Selection Example ===\n');

  try {
    // Step 1: Get all available audio output devices
    console.log('📋 Getting all audio devices...');
    const devices = await AudioCapture.getAudioDevices();
    
    console.log(`Found ${devices.length} audio output device(s):\n`);
    devices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.name}`);
      console.log(`   ID: ${device.id}`);
      console.log(`   Description: ${device.description}`);
      console.log(`   Default: ${device.isDefault ? '✓' : '✗'}`);
      console.log(`   Active: ${device.isActive ? '✓' : '✗'}`);
      console.log('');
    });

    // Step 2: Get the default device ID
    const defaultDeviceId = await AudioCapture.getDefaultDeviceId();
    console.log(`🔊 Default device ID: ${defaultDeviceId}\n`);

    // Step 3: Example 1 - Capture from default device
    console.log('Example 1: Capturing from default device...');
    const capture1 = new AudioCapture({
      processId: 0,  // Capture all system audio
      sampleRate: 48000,
      channels: 2
    });
    
    console.log('✓ AudioCapture created (using default device)');
    console.log(`  Device: ${capture1.getDeviceId() || 'system default'}\n`);

    // Step 4: Example 2 - Capture from specific device
    if (devices.length > 0) {
      console.log('Example 2: Capturing from specific device...');
      
      // Find a non-default device or use the first one
      const targetDevice = devices.find(d => !d.isDefault) || devices[0];
      
      const capture2 = new AudioCapture({
        processId: 0,
        deviceId: targetDevice.id,
        sampleRate: 16000,  // Lower sample rate for ASR
        channels: 1         // Mono for ASR
      });
      
      console.log(`✓ AudioCapture created with device: ${targetDevice.name}`);
      console.log(`  Device ID: ${capture2.getDeviceId()}\n`);
    }

    // Step 5: Example 3 - Capture from specific device and process
    if (devices.length > 0) {
      console.log('Example 3: Capture specific device + process filter...');
      
      // Get running processes with audio
      const processes = await AudioCapture.getProcesses();
      console.log(`Found ${processes.length} processes with audio sessions\n`);
      
      if (processes.length > 0) {
        const targetProcess = processes[0];
        const targetDevice = devices[0];
        
        const capture3 = new AudioCapture({
          processId: targetProcess.pid,
          deviceId: targetDevice.id,
          loopbackMode: 1  // Include only this process
        });
        
        console.log(`✓ AudioCapture created:`);
        console.log(`  Device: ${targetDevice.name}`);
        console.log(`  Process: ${targetProcess.name} (PID: ${targetProcess.pid})\n`);
      }
    }

    // Step 6: Usage with event handlers
    console.log('Example 4: Complete capture with event handlers...');
    
    const capture = new AudioCapture({
      deviceId: defaultDeviceId,
      processId: 0
    });

    // Set up event handlers
    capture.on('data', (audioData) => {
      // Process audio data
      console.log(`Received ${audioData.length} bytes of audio data`);
    });

    capture.on('error', (error) => {
      console.error('Capture error:', error);
    });

    capture.on('started', () => {
      console.log('✓ Capture started');
    });

    capture.on('stopped', () => {
      console.log('✓ Capture stopped');
    });

    // Start capture (commented out to avoid actual capture in example)
    // await capture.start();
    
    // Capture for 5 seconds
    // setTimeout(async () => {
    //   await capture.stop();
    // }, 5000);

    console.log('✓ Event handlers configured (capture not started)\n');

    console.log('=== Example completed successfully! ===\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper function to display device selection menu (for interactive apps)
async function selectDeviceInteractive() {
  const devices = await AudioCapture.getAudioDevices();
  
  console.log('Available audio devices:');
  devices.forEach((device, index) => {
    const marker = device.isDefault ? ' (Default)' : '';
    console.log(`  ${index + 1}. ${device.name}${marker}`);
  });
  
  // In a real app, you would use readline or inquirer to get user input
  // const selectedIndex = await getUserInput('Select device: ');
  // return devices[selectedIndex - 1];
  
  return devices[0]; // Return first device for example
}

// Run the example
if (require.main === module) {
  main();
}

module.exports = { main, selectDeviceInteractive };
