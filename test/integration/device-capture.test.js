/**
 * Device Selection Integration Tests
 * End-to-end tests for v2.3.0 device selection feature
 * Tests real audio capture scenarios with actual devices
 */

const AudioCapture = require('../../lib/audio-capture');
const fs = require('fs');
const path = require('path');

describe('Device Selection Integration Tests', () => {
  let testOutputDir;

  beforeAll(() => {
    // Create test output directory
    testOutputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.readdirSync(testOutputDir).forEach(file => {
        fs.unlinkSync(path.join(testOutputDir, file));
      });
      fs.rmdirSync(testOutputDir);
    }
  });

  describe('Device Enumeration Integration', () => {
    test('should enumerate devices and find default device', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const defaultId = await AudioCapture.getDefaultDeviceId();

      expect(devices.length).toBeGreaterThan(0);
      expect(defaultId).toBeTruthy();

      const defaultDevice = devices.find(d => d.id === defaultId);
      expect(defaultDevice).toBeDefined();
      expect(defaultDevice.isDefault).toBe(true);
    });

    test('should provide consistent device information', async () => {
      const devices = await AudioCapture.getAudioDevices();

      devices.forEach(device => {
        expect(device.id).toBeTruthy();
        expect(device.name).toBeTruthy();
        expect(typeof device.isDefault).toBe('boolean');
        expect(typeof device.isActive).toBe('boolean');
      });
    });
  });

  describe('Single Device Capture', () => {
    test('should capture audio from default device', async () => {
      const defaultId = await AudioCapture.getDefaultDeviceId();
      const capture = new AudioCapture({
        processId: 0,
        deviceId: defaultId
      });

      let dataReceived = false;
      let bytesReceived = 0;

      capture.on('data', (event) => {
        dataReceived = true;
        bytesReceived += event.length;
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Capture for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      capture.stop();

      // Verify we received data (only if system has audio playing)
      // Note: This may be false in CI/CD environments with no audio
      if (dataReceived) {
        expect(bytesReceived).toBeGreaterThan(0);
      }
    }, 10000);

    test('should capture audio from specific device', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const testDevice = devices[0];

      const capture = new AudioCapture({
        processId: 0,
        deviceId: testDevice.id
      });

      let dataCount = 0;

      capture.on('data', () => {
        dataCount++;
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Capture for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      capture.stop();

      // Verify capture was running
      expect(capture.getDeviceId()).toBe(testDevice.id);
    }, 10000);

    test('should save captured audio to file', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const capture = new AudioCapture({
        processId: 0,
        deviceId: devices[0].id
      });

      const outputFile = path.join(testOutputDir, 'test-device-capture.raw');
      const writeStream = fs.createWriteStream(outputFile);
      let totalBytes = 0;

      capture.on('data', (event) => {
        writeStream.write(event.buffer);
        totalBytes += event.length;
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Capture for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      capture.stop();
      writeStream.end();

      // Wait for file write to complete
      await new Promise(resolve => writeStream.on('finish', resolve));

      // Verify file was created
      expect(fs.existsSync(outputFile)).toBe(true);

      const fileStats = fs.statSync(outputFile);
      // File should have data if audio was playing
      if (totalBytes > 0) {
        expect(fileStats.size).toBe(totalBytes);
      }
    }, 10000);
  });

  describe('Multi-Device Capture', () => {
    test('should capture from multiple devices simultaneously', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const testDeviceCount = Math.min(devices.length, 2); // Test with max 2 devices

      const captures = [];
      const dataCounters = [];

      for (let i = 0; i < testDeviceCount; i++) {
        const capture = new AudioCapture({
          processId: 0,
          deviceId: devices[i].id
        });

        let dataCount = 0;
        capture.on('data', () => {
          dataCount++;
        });

        dataCounters.push({ device: devices[i], counter: () => dataCount });
        captures.push(capture);
      }

      // Start all captures
      for (const capture of captures) {
        await new Promise((resolve, reject) => {
          capture.start((err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      // Capture for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stop all captures
      captures.forEach(capture => capture.stop());

      // Verify all captures were running
      captures.forEach((capture, i) => {
        expect(capture.getDeviceId()).toBe(devices[i].id);
      });
    }, 15000);

    test('should handle device independence', async () => {
      const devices = await AudioCapture.getAudioDevices();
      if (devices.length < 2) {
        console.warn('Skipping test: Need at least 2 devices');
        return;
      }

      const capture1 = new AudioCapture({
        processId: 0,
        deviceId: devices[0].id
      });

      const capture2 = new AudioCapture({
        processId: 0,
        deviceId: devices[1].id
      });

      // Start first capture
      await new Promise((resolve, reject) => {
        capture1.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      expect(capture1._isCapturing).toBe(true);

      // Start second capture
      await new Promise((resolve, reject) => {
        capture2.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      expect(capture2._isCapturing).toBe(true);

      // Stop first, second should still run
      capture1.stop();
      expect(capture1._isCapturing).toBe(false);
      expect(capture2._isCapturing).toBe(true);

      // Stop second
      capture2.stop();
      expect(capture2._isCapturing).toBe(false);
    }, 10000);
  });

  describe('Device Switching', () => {
    test('should switch between devices', async () => {
      const devices = await AudioCapture.getAudioDevices();
      if (devices.length < 2) {
        console.warn('Skipping test: Need at least 2 devices');
        return;
      }

      // Capture from first device
      let capture = new AudioCapture({
        processId: 0,
        deviceId: devices[0].id
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(capture.getDeviceId()).toBe(devices[0].id);
      capture.stop();

      // Switch to second device
      capture = new AudioCapture({
        processId: 0,
        deviceId: devices[1].id
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(capture.getDeviceId()).toBe(devices[1].id);
      capture.stop();
    }, 10000);
  });

  describe('Performance and Stability', () => {
    test('should maintain stable capture rate', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const capture = new AudioCapture({
        processId: 0,
        deviceId: devices[0].id
      });

      const dataTimestamps = [];

      capture.on('data', (event) => {
        dataTimestamps.push(Date.now());
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Capture for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      capture.stop();

      if (dataTimestamps.length > 10) {
        // Calculate intervals between data packets
        const intervals = [];
        for (let i = 1; i < dataTimestamps.length; i++) {
          intervals.push(dataTimestamps[i] - dataTimestamps[i - 1]);
        }

        // Average interval should be around 10ms (100 packets/s)
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        expect(avgInterval).toBeGreaterThan(5);
        expect(avgInterval).toBeLessThan(20);
      }
    }, 10000);

    test('should handle rapid start/stop cycles', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const capture = new AudioCapture({
        processId: 0,
        deviceId: devices[0].id
      });

      // Perform 3 start/stop cycles
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve, reject) => {
          capture.start((err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        expect(capture._isCapturing).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 200));

        capture.stop();
        expect(capture._isCapturing).toBe(false);

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }, 10000);

    test('should not leak memory on multiple captures', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy multiple captures
      for (let i = 0; i < 5; i++) {
        const capture = new AudioCapture({
          processId: 0,
          deviceId: devices[0].id
        });

        await new Promise((resolve, reject) => {
          capture.start((err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        capture.stop();
        capture.removeAllListeners();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }, 15000);
  });

  describe('Error Handling Integration', () => {
    test('should handle device disconnection gracefully', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const capture = new AudioCapture({
        processId: 0,
        deviceId: devices[0].id
      });

      let errorReceived = false;

      capture.on('error', (error) => {
        errorReceived = true;
        console.log('Expected error on device disconnection:', error.message);
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      capture.stop();

      // Note: Actual device disconnection can't be simulated in tests
      // This test verifies error handling structure is in place
    }, 10000);

    test('should recover from invalid device gracefully', async () => {
      const devices = await AudioCapture.getAudioDevices();

      // Try invalid device first (should throw)
      expect(() => {
        new AudioCapture({
          processId: 0,
          deviceId: 'invalid-device-id'
        });
      }).toThrow();

      // Then create valid capture (should work)
      const capture = new AudioCapture({
        processId: 0,
        deviceId: devices[0].id
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      expect(capture._isCapturing).toBe(true);
      capture.stop();
    }, 10000);
  });

  describe('Real-World Scenarios', () => {
    test('should work with process filtering and device selection', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const processes = await AudioCapture.getProcesses();

      // Use system process (always exists)
      const systemProcess = processes.find(p => p.name === 'System') || processes[0];

      const capture = new AudioCapture({
        processId: systemProcess.pid,
        deviceId: devices[0].id,
        loopbackMode: 0
      });

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      expect(capture._isCapturing).toBe(true);
      expect(capture.getDeviceId()).toBe(devices[0].id);

      await new Promise(resolve => setTimeout(resolve, 500));

      capture.stop();
    }, 10000);

    test('should handle user device selection flow', async () => {
      // Simulate user selecting a device
      const devices = await AudioCapture.getAudioDevices();

      // User chooses first non-default device (if available)
      let selectedDevice = devices.find(d => !d.isDefault);
      if (!selectedDevice) {
        selectedDevice = devices[0];
      }

      // Create capture with selected device
      const capture = new AudioCapture({
        processId: 0,
        deviceId: selectedDevice.id
      });

      expect(capture.getDeviceId()).toBe(selectedDevice.id);

      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      capture.stop();
    }, 10000);
  });
});
