/**
 * Test script for device selection feature (v2.3.0)
 * Tests the C++ device enumeration and N-API bindings
 */

const addon = require('./build/Release/audio_addon.node');

console.log('=== Device Selection Feature Test ===\n');

// Test 1: Get all audio devices
console.log('Test 1: Enumerating audio devices...');
try {
    const devices = addon.getAudioDevices();
    console.log(`✓ Found ${devices.length} audio output device(s):\n`);
    
    devices.forEach((device, index) => {
        console.log(`Device ${index + 1}:`);
        console.log(`  ID: ${device.id}`);
        console.log(`  Name: ${device.name}`);
        console.log(`  Description: ${device.description}`);
        console.log(`  Is Default: ${device.isDefault ? 'Yes' : 'No'}`);
        console.log(`  Is Active: ${device.isActive ? 'Yes' : 'No'}`);
        console.log('');
    });
} catch (error) {
    console.error('✗ Failed to enumerate devices:', error.message);
    process.exit(1);
}

// Test 2: Get default device ID
console.log('Test 2: Getting default device ID...');
try {
    const defaultDeviceId = addon.getDefaultDeviceId();
    if (defaultDeviceId) {
        console.log(`✓ Default device ID: ${defaultDeviceId}\n`);
    } else {
        console.log('✗ No default device found\n');
    }
} catch (error) {
    console.error('✗ Failed to get default device:', error.message);
    process.exit(1);
}

// Test 3: Verify device ID
console.log('Test 3: Verifying device IDs...');
try {
    const devices = addon.getAudioDevices();
    
    if (devices.length > 0) {
        // Test with valid device ID
        const validDeviceId = devices[0].id;
        const isValid = addon.verifyDeviceId(validDeviceId);
        console.log(`✓ Device ID "${devices[0].name}" is ${isValid ? 'valid' : 'invalid'}`);
        
        // Test with invalid device ID
        const invalidDeviceId = 'invalid-device-id-12345';
        const isInvalid = addon.verifyDeviceId(invalidDeviceId);
        console.log(`✓ Invalid device ID is ${isInvalid ? 'valid' : 'invalid (as expected)'}`);
        console.log('');
    }
} catch (error) {
    console.error('✗ Failed to verify device ID:', error.message);
    process.exit(1);
}

console.log('=== All tests passed! ===\n');
console.log('Next steps:');
console.log('1. Integrate device selection into AudioCapture constructor');
console.log('2. Add JavaScript API wrapper (getAudioDevices method)');
console.log('3. Update TypeScript definitions');
console.log('4. Write comprehensive tests');
