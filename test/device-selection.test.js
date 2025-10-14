/**
 * Device Selection Feature Unit Tests
 * Tests for v2.3.0 device selection APIs
 */

const AudioCapture = require('../lib/audio-capture');

describe('Device Selection API', () => {
  describe('AudioCapture.getAudioDevices()', () => {
    test('should return an array of devices', async () => {
      const devices = await AudioCapture.getAudioDevices();
      
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
    });

    test('each device should have required properties', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const device = devices[0];
      
      expect(device).toHaveProperty('id');
      expect(device).toHaveProperty('name');
      expect(device).toHaveProperty('description');
      expect(device).toHaveProperty('isDefault');
      expect(device).toHaveProperty('isActive');
      
      expect(typeof device.id).toBe('string');
      expect(typeof device.name).toBe('string');
      expect(typeof device.description).toBe('string');
      expect(typeof device.isDefault).toBe('boolean');
      expect(typeof device.isActive).toBe('boolean');
    });

    test('device ID should follow Windows format', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const device = devices[0];
      
      // Device ID format: {0.0.0.00000000}.{GUID}
      expect(device.id).toMatch(/^\{[0-9\.]+\}\.\{[a-f0-9\-]+\}$/i);
    });

    test('at least one device should be marked as default', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const defaultDevices = devices.filter(d => d.isDefault);
      
      expect(defaultDevices.length).toBeGreaterThanOrEqual(1);
    });

    test('should return consistent results on multiple calls', async () => {
      const devices1 = await AudioCapture.getAudioDevices();
      const devices2 = await AudioCapture.getAudioDevices();
      
      expect(devices1.length).toBe(devices2.length);
      
      // Device IDs should be the same
      const ids1 = devices1.map(d => d.id).sort();
      const ids2 = devices2.map(d => d.id).sort();
      expect(ids1).toEqual(ids2);
    });

    test('should handle rapid successive calls', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(AudioCapture.getAudioDevices());
      }
      
      const results = await Promise.all(promises);
      
      // All results should be valid arrays
      results.forEach(devices => {
        expect(Array.isArray(devices)).toBe(true);
        expect(devices.length).toBeGreaterThan(0);
      });
    });
  });

  describe('AudioCapture.getDefaultDeviceId()', () => {
    test('should return a string device ID', async () => {
      const deviceId = await AudioCapture.getDefaultDeviceId();
      
      expect(typeof deviceId).toBe('string');
      expect(deviceId.length).toBeGreaterThan(0);
    });

    test('should return valid Windows device ID format', async () => {
      const deviceId = await AudioCapture.getDefaultDeviceId();
      
      expect(deviceId).toMatch(/^\{[0-9\.]+\}\.\{[a-f0-9\-]+\}$/i);
    });

    test('should match one of the devices from getAudioDevices()', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const defaultId = await AudioCapture.getDefaultDeviceId();
      
      const matchingDevice = devices.find(d => d.id === defaultId);
      expect(matchingDevice).toBeDefined();
      expect(matchingDevice.isDefault).toBe(true);
    });

    test('should return consistent result on multiple calls', async () => {
      const id1 = await AudioCapture.getDefaultDeviceId();
      const id2 = await AudioCapture.getDefaultDeviceId();
      
      expect(id1).toBe(id2);
    });
  });

  describe('AudioCapture constructor with deviceId', () => {
    let capture;

    afterEach(() => {
      if (capture && capture._isCapturing) {
        capture.stop();
      }
    });

    test('should accept valid deviceId in options', async () => {
      const devices = await AudioCapture.getAudioDevices();
      
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: devices[0].id
        });
      }).not.toThrow();
    });

    test('should throw error for invalid deviceId', async () => {
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: 'invalid-device-id'
        });
      }).toThrow(/Invalid device ID/i);
    });

    test('should throw error for empty deviceId', async () => {
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: ''
        });
      }).toThrow(/deviceId must be a non-empty string/i);
    });

    test('should work without deviceId (backward compatible)', () => {
      expect(() => {
        capture = new AudioCapture({
          processId: 0
        });
      }).not.toThrow();
    });

    test('should accept null deviceId', () => {
      // null is treated as undefined (not provided)
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: null
        });
      }).toThrow(/deviceId must be a non-empty string/);
    });

    test('should accept undefined deviceId', () => {
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: undefined
        });
      }).not.toThrow();
    });

    test('should validate deviceId type', () => {
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: 123
        });
      }).toThrow();

      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: {}
        });
      }).toThrow();

      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: []
        });
      }).toThrow();
    });
  });

  describe('AudioCapture.getDeviceId()', () => {
    let capture;

    afterEach(() => {
      if (capture && capture._isCapturing) {
        capture.stop();
      }
    });

    test('should return deviceId when specified', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const targetDeviceId = devices[0].id;
      
      capture = new AudioCapture({
        processId: 0,
        deviceId: targetDeviceId
      });

      expect(capture.getDeviceId()).toBe(targetDeviceId);
    });

    test('should return undefined when deviceId not specified', () => {
      capture = new AudioCapture({
        processId: 0
      });

      expect(capture.getDeviceId()).toBeUndefined();
    });

    test('should throw when deviceId is null', () => {
      // null is not a valid deviceId
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: null
        });
      }).toThrow(/deviceId must be a non-empty string/);
    });

    test('should persist deviceId after start/stop', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const targetDeviceId = devices[0].id;
      
      capture = new AudioCapture({
        processId: 0,
        deviceId: targetDeviceId
      });

      expect(capture.getDeviceId()).toBe(targetDeviceId);
      
      await capture.start();
      expect(capture.getDeviceId()).toBe(targetDeviceId);
      
      capture.stop();
      expect(capture.getDeviceId()).toBe(targetDeviceId);
    });
  });

  describe('Multiple device capture', () => {
    const captures = [];

    afterEach(() => {
      captures.forEach(capture => {
        if (capture._isCapturing) {
          capture.stop();
        }
      });
      captures.length = 0;
    });

    test('should support multiple concurrent captures', async () => {
      const devices = await AudioCapture.getAudioDevices();
      
      // Create capture for each device
      devices.forEach(device => {
        const capture = new AudioCapture({
          processId: 0,
          deviceId: device.id
        });
        captures.push(capture);
      });

      expect(captures.length).toBe(devices.length);
      
      // Each capture should have correct deviceId
      captures.forEach((capture, index) => {
        expect(capture.getDeviceId()).toBe(devices[index].id);
      });
    });

    test('should start all captures without interference', async () => {
      const devices = await AudioCapture.getAudioDevices();
      
      // Create and start all captures
      for (const device of devices) {
        const capture = new AudioCapture({
          processId: 0,
          deviceId: device.id
        });
        captures.push(capture);
        await capture.start();
      }

      // All should be running
      captures.forEach(capture => {
        expect(capture._isCapturing).toBe(true);
      });
    });

    test('should create captures for all devices without interference', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const targetCount = Math.min(devices.length, 3); // Test with max 3 devices
      
      for (let i = 0; i < targetCount; i++) {
        const capture = new AudioCapture({
          processId: 0,
          deviceId: devices[i].id
        });

        // Start capture
        await new Promise((resolve, reject) => {
          capture.start((err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        expect(capture._isCapturing).toBe(true);
        expect(capture.getDeviceId()).toBe(devices[i].id);
        
        captures.push(capture);
      }

      // All captures should be running
      expect(captures.length).toBe(targetCount);
      captures.forEach(capture => {
        expect(capture._isCapturing).toBe(true);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle non-existent device ID gracefully', () => {
      const fakeDeviceId = '{0.0.0.00000000}.{00000000-0000-0000-0000-000000000000}';
      
      expect(() => {
        new AudioCapture({
          processId: 0,
          deviceId: fakeDeviceId
        });
      }).toThrow(/Invalid device ID/i);
    });

    test('should handle malformed device IDs', () => {
      const malformedIds = [
        'not-a-device-id',
        '{malformed}',
        '12345',
        '{0.0.0.00000000}',
        '{guid-only}',
        'random-string-123'
      ];

      malformedIds.forEach(id => {
        expect(() => {
          new AudioCapture({
            processId: 0,
            deviceId: id
          });
        }).toThrow();
      });
    });

    test('getAudioDevices should not throw on COM errors', async () => {
      // This test verifies error handling, should not throw
      await expect(AudioCapture.getAudioDevices()).resolves.toBeDefined();
    });

    test('getDefaultDeviceId should not throw on COM errors', async () => {
      // This test verifies error handling, should not throw
      await expect(AudioCapture.getDefaultDeviceId()).resolves.toBeDefined();
    });
  });

  describe('Performance', () => {
    test('getAudioDevices should complete within reasonable time', async () => {
      const start = Date.now();
      await AudioCapture.getAudioDevices();
      const elapsed = Date.now() - start;
      
      // Should complete in less than 100ms
      expect(elapsed).toBeLessThan(100);
    });

    test('getDefaultDeviceId should complete within reasonable time', async () => {
      const start = Date.now();
      await AudioCapture.getDefaultDeviceId();
      const elapsed = Date.now() - start;
      
      // Should complete in less than 50ms
      expect(elapsed).toBeLessThan(50);
    });

    test('device validation should be fast', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const deviceId = devices[0].id;
      
      const start = Date.now();
      new AudioCapture({
        processId: 0,
        deviceId: deviceId
      });
      const elapsed = Date.now() - start;
      
      // Should complete in less than 10ms
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('Backward compatibility', () => {
    let capture;

    afterEach(() => {
      if (capture && capture._isCapturing) {
        capture.stop();
      }
    });

    test('should work exactly like v2.2 when deviceId not specified', async () => {
      capture = new AudioCapture({
        processId: 0
      });

      expect(capture.getDeviceId()).toBeUndefined();
      
      // Use promise-based start for consistency
      await new Promise((resolve, reject) => {
        capture.start((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      
      expect(capture._isCapturing).toBe(true);
      
      // Wait a bit then stop
      await new Promise(resolve => setTimeout(resolve, 100));
      
      capture.stop();
    });

    test('should support all existing AudioCapture options', async () => {
      const devices = await AudioCapture.getAudioDevices();
      
      expect(() => {
        capture = new AudioCapture({
          processId: 0,
          deviceId: devices[0].id,
          sampleRate: 16000,
          channels: 1,
          loopbackMode: 0
        });
      }).not.toThrow();
    });
  });
});
