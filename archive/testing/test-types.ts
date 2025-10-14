/**
 * TypeScript type check test for device selection API (v2.3.0)
 * Run: npx tsc --noEmit test-types.ts
 */

import { AudioCapture, AudioDeviceInfo, AudioCaptureOptions } from './index';

async function testTypes() {
    // Test 1: Get audio devices
    const devices: AudioDeviceInfo[] = await AudioCapture.getAudioDevices();
    
    // Test device info properties
    devices.forEach(device => {
        const id: string = device.id;
        const name: string = device.name;
        const description: string = device.description;
        const isDefault: boolean = device.isDefault;
        const isActive: boolean = device.isActive;
        
        console.log({ id, name, description, isDefault, isActive });
    });
    
    // Test 2: Get default device ID
    const defaultId: string | null = await AudioCapture.getDefaultDeviceId();
    
    // Test 3: Create with default device
    const capture1 = new AudioCapture({
        processId: 0,
        sampleRate: 48000,
        channels: 2
    });
    
    // Test 4: Create with specific device
    if (devices.length > 0) {
        const options: AudioCaptureOptions = {
            processId: 0,
            deviceId: devices[0].id,
            sampleRate: 16000,
            channels: 1,
            loopbackMode: 0
        };
        
        const capture2 = new AudioCapture(options);
        
        // Test getDeviceId method
        const currentDeviceId: string | undefined = capture2.getDeviceId();
        console.log('Current device ID:', currentDeviceId);
    }
    
    // Test 5: Type errors (should not compile if uncommented)
    
    // Error: deviceId must be string
    // const capture3 = new AudioCapture({ deviceId: 123 });
    
    // Error: invalid property
    // const capture4 = new AudioCapture({ invalidProp: true });
    
    // Error: loopbackMode must be 0 or 1
    // const capture5 = new AudioCapture({ loopbackMode: 2 });
    
    // Error: getAudioDevices returns Promise
    // const devicesSync: AudioDeviceInfo[] = AudioCapture.getAudioDevices();
    
    console.log('✓ All TypeScript types are correct!');
}

// Run test
testTypes().catch(console.error);
