# Device Selection API (v2.3.0)

## Overview

The device selection feature allows you to capture audio from specific audio output devices instead of only the default device. This is useful for applications that need to:

- Capture from multiple audio devices simultaneously
- Allow users to choose their preferred audio device
- Monitor specific audio hardware
- Support multi-device audio setups

## API Reference

### Static Methods

#### `AudioCapture.getAudioDevices()`

Gets all available audio output devices on the system.

**Returns:** `Promise<AudioDeviceInfo[]>`

**Example:**
```javascript
const devices = await AudioCapture.getAudioDevices();
console.log('Available devices:', devices);
```

**Return Type:**
```typescript
interface AudioDeviceInfo {
  id: string;           // Unique device identifier
  name: string;         // Device friendly name
  description: string;  // Device description
  isDefault: boolean;   // Whether this is the system default device
  isActive: boolean;    // Whether the device is currently active
}
```

---

#### `AudioCapture.getDefaultDeviceId()`

Gets the ID of the system default audio output device.

**Returns:** `Promise<string | null>`

**Example:**
```javascript
const defaultId = await AudioCapture.getDefaultDeviceId();
if (defaultId) {
  console.log('Default device ID:', defaultId);
}
```

---

### Constructor Options

#### `deviceId` (optional)

Specifies which audio device to capture from.

**Type:** `string`

**Default:** System default device

**Example:**
```javascript
const devices = await AudioCapture.getAudioDevices();

// Capture from specific device
const capture = new AudioCapture({
  deviceId: devices[0].id,
  processId: 0
});
```

**Error Handling:**
```javascript
try {
  const capture = new AudioCapture({
    deviceId: 'invalid-device-id'
  });
} catch (error) {
  // Error: Invalid device ID: invalid-device-id
}
```

---

### Instance Methods

#### `getDeviceId()`

Returns the device ID currently in use, or `undefined` if using the default device.

**Returns:** `string | undefined`

**Example:**
```javascript
const capture = new AudioCapture({ deviceId: '{device-id}' });
console.log('Using device:', capture.getDeviceId());
```

---

## Complete Examples

### Example 1: List All Devices

```javascript
const AudioCapture = require('node-windows-audio-capture');

async function listDevices() {
  const devices = await AudioCapture.getAudioDevices();
  
  devices.forEach((device, index) => {
    console.log(`${index + 1}. ${device.name}`);
    console.log(`   ID: ${device.id}`);
    console.log(`   Default: ${device.isDefault ? 'Yes' : 'No'}`);
    console.log('');
  });
}

listDevices();
```

---

### Example 2: Capture from Default Device

```javascript
const AudioCapture = require('node-windows-audio-capture');

async function captureDefault() {
  // Method 1: Omit deviceId (uses default)
  const capture = new AudioCapture({
    processId: 0
  });

  // Method 2: Explicitly specify default device ID
  const defaultId = await AudioCapture.getDefaultDeviceId();
  const capture2 = new AudioCapture({
    processId: 0,
    deviceId: defaultId
  });

  capture.on('data', (data) => {
    console.log(`Captured ${data.length} bytes`);
  });

  await capture.start();
}

captureDefault();
```

---

### Example 3: Capture from Specific Device

```javascript
const AudioCapture = require('node-windows-audio-capture');

async function captureSpecific() {
  // Get all devices
  const devices = await AudioCapture.getAudioDevices();
  
  // Find a specific device (e.g., by name)
  const targetDevice = devices.find(d => 
    d.name.includes('Realtek')
  );
  
  if (!targetDevice) {
    throw new Error('Target device not found');
  }

  // Create capture with specific device
  const capture = new AudioCapture({
    processId: 0,
    deviceId: targetDevice.id
  });

  console.log(`Capturing from: ${targetDevice.name}`);

  capture.on('data', (data) => {
    // Process audio data
  });

  await capture.start();
}

captureSpecific();
```

---

### Example 4: Device + Process Filter

Combine device selection with process filtering for precise control:

```javascript
const AudioCapture = require('node-windows-audio-capture');

async function captureDeviceAndProcess() {
  // Get available devices
  const devices = await AudioCapture.getAudioDevices();
  const device = devices[0];

  // Get processes with audio
  const processes = await AudioCapture.getProcesses();
  const process = processes.find(p => p.name === 'chrome.exe');

  if (!process) {
    throw new Error('Chrome not found');
  }

  // Capture specific device + specific process
  const capture = new AudioCapture({
    deviceId: device.id,
    processId: process.pid,
    loopbackMode: 1  // Include only this process
  });

  console.log(`Capturing ${process.name} from ${device.name}`);

  await capture.start();
}

captureDeviceAndProcess();
```

---

### Example 5: User Device Selection

```javascript
const AudioCapture = require('node-windows-audio-capture');
const readline = require('readline');

async function interactiveDeviceSelection() {
  const devices = await AudioCapture.getAudioDevices();
  
  // Display devices
  console.log('Available audio devices:');
  devices.forEach((device, index) => {
    const defaultMarker = device.isDefault ? ' (Default)' : '';
    console.log(`  ${index + 1}. ${device.name}${defaultMarker}`);
  });

  // Get user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Select device (1-' + devices.length + '): ', (answer) => {
    const index = parseInt(answer) - 1;
    
    if (index >= 0 && index < devices.length) {
      const selectedDevice = devices[index];
      
      const capture = new AudioCapture({
        deviceId: selectedDevice.id,
        processId: 0
      });

      console.log(`\nCapturing from: ${selectedDevice.name}`);
      capture.start();
    }
    
    rl.close();
  });
}

interactiveDeviceSelection();
```

---

## Device ID Format

Device IDs follow the Windows audio device endpoint format:

```
{0.0.0.00000000}.{GUID}
```

Example:
```
{0.0.0.00000000}.{442acc96-3e92-4570-9165-b858c1635ffe}
```

- The device ID is persistent across reboots
- Different for each physical/virtual audio device
- Can be stored and reused in configuration files

---

## Error Handling

### Invalid Device ID

```javascript
try {
  const capture = new AudioCapture({
    deviceId: 'invalid-id'
  });
} catch (error) {
  console.error('Device validation failed:', error.message);
  // Error: Invalid device ID: invalid-id
}
```

### Device Not Found

If a previously valid device ID becomes invalid (device removed):

```javascript
const capture = new AudioCapture({
  deviceId: storedDeviceId
});

capture.on('error', (error) => {
  console.error('Capture error:', error);
  // Handle device disconnection
});
```

---

## Best Practices

### 1. Always Validate Device IDs

```javascript
const devices = await AudioCapture.getAudioDevices();
const validIds = devices.map(d => d.id);

if (validIds.includes(userSelectedId)) {
  // Safe to use
}
```

### 2. Handle Device Changes

```javascript
// Re-enumerate devices if capture fails
capture.on('error', async (error) => {
  console.log('Re-enumerating devices...');
  const devices = await AudioCapture.getAudioDevices();
  // Update UI or fallback to default
});
```

### 3. Store Device Preferences

```javascript
// Save user preference
const config = {
  preferredDeviceId: selectedDevice.id
};
fs.writeFileSync('config.json', JSON.stringify(config));

// Load and validate on startup
const config = JSON.parse(fs.readFileSync('config.json'));
const devices = await AudioCapture.getAudioDevices();

if (devices.some(d => d.id === config.preferredDeviceId)) {
  // Use saved preference
} else {
  // Fallback to default
}
```

### 4. Provide Fallback to Default

```javascript
async function createCaptureWithFallback(preferredDeviceId) {
  try {
    return new AudioCapture({
      deviceId: preferredDeviceId,
      processId: 0
    });
  } catch (error) {
    console.warn('Preferred device unavailable, using default');
    return new AudioCapture({ processId: 0 });
  }
}
```

---

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { AudioCapture, AudioDeviceInfo } from 'node-windows-audio-capture';

const devices: AudioDeviceInfo[] = await AudioCapture.getAudioDevices();

const capture = new AudioCapture({
  deviceId: devices[0].id,
  processId: 0,
  sampleRate: 16000
});
```

---

## Compatibility

- **Minimum Version:** v2.3.0
- **Operating System:** Windows 7 or later
- **Node.js:** 16.x or later
- **Backward Compatible:** Yes (deviceId is optional)

---

## Migration Guide

### From v2.2.x to v2.3.0

**No breaking changes!** The device selection feature is additive.

Existing code continues to work:
```javascript
// v2.2.x - Still works in v2.3.0
const capture = new AudioCapture({ processId: 0 });
```

To add device selection:
```javascript
// v2.3.0 - New feature
const devices = await AudioCapture.getAudioDevices();
const capture = new AudioCapture({
  processId: 0,
  deviceId: devices[0].id
});
```

---

## See Also

- [Basic Audio Capture](./basic-capture.md)
- [Process Filtering](./process-filtering.md)
- [Audio Processing Pipeline](./audio-processing.md)
- [API Reference](../docs/api.md)
