/**
 * Test JavaScript API for device selection (v2.3.0)
 */

const AudioCapture = require('./lib/audio-capture');

console.log('=== Testing JavaScript Device Selection API ===\n');

async function testDeviceSelection() {
  try {
    // Test 1: Get all audio devices
    console.log('Test 1: AudioCapture.getAudioDevices()');
    const devices = await AudioCapture.getAudioDevices();
    console.log(`✓ Found ${devices.length} audio device(s)\n`);
    
    devices.forEach((device, index) => {
      console.log(`Device ${index + 1}:`);
      console.log(`  ID: ${device.id}`);
      console.log(`  Name: ${device.name}`);
      console.log(`  Description: ${device.description}`);
      console.log(`  Is Default: ${device.isDefault}`);
      console.log(`  Is Active: ${device.isActive}`);
      console.log('');
    });
    
    // Test 2: Get default device ID
    console.log('Test 2: AudioCapture.getDefaultDeviceId()');
    const defaultDeviceId = await AudioCapture.getDefaultDeviceId();
    if (defaultDeviceId) {
      console.log(`✓ Default device ID: ${defaultDeviceId}\n`);
      
      // Find the default device name
      const defaultDevice = devices.find(d => d.id === defaultDeviceId);
      if (defaultDevice) {
        console.log(`✓ Default device name: ${defaultDevice.name}\n`);
      }
    } else {
      console.log('✗ No default device found\n');
    }
    
    // Test 3: Create AudioCapture with default device (no deviceId)
    console.log('Test 3: Create AudioCapture with default device');
    const capture1 = new AudioCapture({
      processId: 0
    });
    console.log(`✓ Created AudioCapture instance (using default device)`);
    console.log(`  Device ID: ${capture1.getDeviceId() || 'default'}\n`);
    
    // Test 4: Create AudioCapture with specific device
    if (devices.length > 0) {
      console.log('Test 4: Create AudioCapture with specific device');
      const testDevice = devices[0];
      const capture2 = new AudioCapture({
        processId: 0,
        deviceId: testDevice.id
      });
      console.log(`✓ Created AudioCapture instance with device: ${testDevice.name}`);
      console.log(`  Device ID: ${capture2.getDeviceId()}\n`);
    }
    
    // Test 5: Test with invalid device ID
    console.log('Test 5: Test with invalid device ID');
    try {
      const capture3 = new AudioCapture({
        processId: 0,
        deviceId: 'invalid-device-id-12345'
      });
      console.log('✗ Should have thrown an error for invalid device ID\n');
    } catch (error) {
      console.log(`✓ Correctly rejected invalid device ID: ${error.message}\n`);
    }
    
    console.log('=== All JavaScript API tests passed! ===\n');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDeviceSelection();
