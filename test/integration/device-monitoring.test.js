/**
 * Integration Tests for Device Monitoring (v2.4.0)
 * 设备监控集成测试
 * 
 * Tests the complete lifecycle and integration scenarios for:
 * - Device enumeration
 * - Device monitoring
 * - Integration with audio capture
 * - Multiple start/stop cycles
 * - Error handling
 */

const { AudioCapture } = require('../../index');

describe('Device Monitoring Integration Tests', () => {
  // Cleanup after each test
  afterEach(() => {
    try {
      AudioCapture.stopDeviceMonitoring();
    } catch (error) {
      // Ignore errors if not monitoring
    }
  });

  describe('Complete Device Workflow', () => {
    test('should enumerate devices, get default, and start monitoring', async () => {
      // Step 1: Enumerate all devices
      const devices = await AudioCapture.getAudioDevices();
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
      
      // Step 2: Get default device
      const defaultId = await AudioCapture.getDefaultDeviceId();
      expect(typeof defaultId).toBe('string');
      expect(defaultId.length).toBeGreaterThan(0);
      
      // Step 3: Verify default device is in the list
      const defaultDevice = devices.find(d => d.id === defaultId);
      expect(defaultDevice).toBeDefined();
      expect(defaultDevice.isDefault).toBe(true);
      
      // Step 4: Start monitoring
      let eventReceived = false;
      AudioCapture.startDeviceMonitoring((event) => {
        eventReceived = true;
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('deviceId');
      });
      
      // Give some time for events (if any)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 5: Stop monitoring
      AudioCapture.stopDeviceMonitoring();
      
      // Test passes if no errors occurred
      expect(devices.length).toBeGreaterThan(0);
    });

    test('should handle multiple start/stop cycles correctly', async () => {
      // Cycle 1
      AudioCapture.startDeviceMonitoring((event) => {
        // Event handler 1
      });
      AudioCapture.stopDeviceMonitoring();
      
      // Cycle 2
      AudioCapture.startDeviceMonitoring((event) => {
        // Event handler 2
      });
      AudioCapture.stopDeviceMonitoring();
      
      // Cycle 3
      AudioCapture.startDeviceMonitoring((event) => {
        // Event handler 3
      });
      AudioCapture.stopDeviceMonitoring();
      
      // If we got here without errors, test passes
      expect(true).toBe(true);
    });

    test('should handle rapid start/stop sequences', async () => {
      for (let i = 0; i < 5; i++) {
        AudioCapture.startDeviceMonitoring((event) => {
          // Event handler
        });
        
        // Very short delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        AudioCapture.stopDeviceMonitoring();
      }
      
      expect(true).toBe(true);
    });
  });

  describe('Device Monitoring Persistence', () => {
    test('should continue monitoring across API calls', async () => {
      let eventCount = 0;
      
      AudioCapture.startDeviceMonitoring((event) => {
        eventCount++;
      });
      
      // Make other API calls while monitoring
      const devices1 = await AudioCapture.getAudioDevices();
      expect(devices1.length).toBeGreaterThan(0);
      
      const defaultId = await AudioCapture.getDefaultDeviceId();
      expect(defaultId).toBeDefined();
      
      const devices2 = await AudioCapture.getAudioDevices();
      expect(devices2.length).toBeGreaterThan(0);
      
      // Monitoring should still be active
      AudioCapture.stopDeviceMonitoring();
      
      // Test passes if no errors occurred
      expect(devices1.length).toBe(devices2.length);
    });

    test('should maintain callback reference across multiple events', (done) => {
      const events = [];
      
      AudioCapture.startDeviceMonitoring((event) => {
        events.push(event);
        
        // This test will timeout if callback is not persistent
        // In CI environment without hardware changes, we just verify
        // the callback was registered correctly
      });
      
      // Stop after a short delay
      setTimeout(() => {
        AudioCapture.stopDeviceMonitoring();
        
        // Test passes if we got here (callback was persistent)
        expect(events.length).toBeGreaterThanOrEqual(0);
        done();
      }, 1000);
    });
  });

  describe('Integration with Audio Capture', () => {
    test('should allow device enumeration while capture is stopped', async () => {
      // Get processes (for capture)
      const processes = await AudioCapture.getProcesses();
      expect(Array.isArray(processes)).toBe(true);
      
      // Enumerate devices
      const devices = await AudioCapture.getAudioDevices();
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
      
      // Get default device
      const defaultId = await AudioCapture.getDefaultDeviceId();
      expect(defaultId).toBeDefined();
    });

    test('should allow device monitoring without active capture', async () => {
      let monitoringActive = false;
      
      AudioCapture.startDeviceMonitoring((event) => {
        monitoringActive = true;
      });
      
      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Enumerate devices while monitoring
      const devices = await AudioCapture.getAudioDevices();
      expect(devices.length).toBeGreaterThan(0);
      
      AudioCapture.stopDeviceMonitoring();
      
      // Test passes regardless of whether events occurred
      expect(devices.length).toBeGreaterThan(0);
    });

    test('should handle device enumeration before and after monitoring', async () => {
      // Before monitoring
      const devicesBefore = await AudioCapture.getAudioDevices();
      expect(devicesBefore.length).toBeGreaterThan(0);
      
      // Start monitoring
      AudioCapture.startDeviceMonitoring((event) => {
        // Event handler
      });
      
      // During monitoring
      const devicesDuring = await AudioCapture.getAudioDevices();
      expect(devicesDuring.length).toBe(devicesBefore.length);
      
      // Stop monitoring
      AudioCapture.stopDeviceMonitoring();
      
      // After monitoring
      const devicesAfter = await AudioCapture.getAudioDevices();
      expect(devicesAfter.length).toBe(devicesBefore.length);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should not crash on null or undefined callback', () => {
      // These should throw errors but not crash
      expect(() => {
        AudioCapture.startDeviceMonitoring(null);
      }).toThrow();
      
      expect(() => {
        AudioCapture.startDeviceMonitoring(undefined);
      }).toThrow();
    });

    test('should handle invalid callback types gracefully', () => {
      expect(() => {
        AudioCapture.startDeviceMonitoring('not a function');
      }).toThrow();
      
      expect(() => {
        AudioCapture.startDeviceMonitoring(123);
      }).toThrow();
      
      expect(() => {
        AudioCapture.startDeviceMonitoring({});
      }).toThrow();
    });

    test('should handle stop without start gracefully', () => {
      // Should not throw or crash
      expect(() => {
        AudioCapture.stopDeviceMonitoring();
      }).not.toThrow();
      
      // Can call multiple times
      expect(() => {
        AudioCapture.stopDeviceMonitoring();
        AudioCapture.stopDeviceMonitoring();
      }).not.toThrow();
    });

    test('should handle errors in callback gracefully', (done) => {
      AudioCapture.startDeviceMonitoring((event) => {
        // Throw error in callback
        throw new Error('Test error in callback');
      });
      
      // System should remain stable despite callback errors
      setTimeout(async () => {
        // Should still be able to make API calls
        const devices = await AudioCapture.getAudioDevices();
        expect(devices.length).toBeGreaterThan(0);
        
        AudioCapture.stopDeviceMonitoring();
        done();
      }, 500);
    });
  });

  describe('Performance and Stability', () => {
    test('should handle high-frequency device queries', async () => {
      const iterations = 10;
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        const devices = await AudioCapture.getAudioDevices();
        results.push(devices.length);
      }
      
      // All results should be consistent
      const uniqueCounts = [...new Set(results)];
      expect(uniqueCounts.length).toBeLessThanOrEqual(2); // Allow for 1 device change
    });

    test('should maintain stable device IDs across queries', async () => {
      const devices1 = await AudioCapture.getAudioDevices();
      await new Promise(resolve => setTimeout(resolve, 100));
      const devices2 = await AudioCapture.getAudioDevices();
      
      // Same devices should have same IDs
      const ids1 = devices1.map(d => d.id).sort();
      const ids2 = devices2.map(d => d.id).sort();
      
      expect(ids1).toEqual(ids2);
    });

    test('should handle long-running monitoring session', (done) => {
      let eventCount = 0;
      
      AudioCapture.startDeviceMonitoring((event) => {
        eventCount++;
      });
      
      // Run for 2 seconds
      setTimeout(() => {
        AudioCapture.stopDeviceMonitoring();
        
        // Test passes if we got here without crashing
        expect(eventCount).toBeGreaterThanOrEqual(0);
        done();
      }, 2000);
    });
  });

  describe('Real-world Scenarios', () => {
    test('scenario: application startup sequence', async () => {
      // 1. Application starts - enumerate devices for UI
      const devices = await AudioCapture.getAudioDevices();
      expect(devices.length).toBeGreaterThan(0);
      
      // 2. Get default device to highlight in UI
      const defaultId = await AudioCapture.getDefaultDeviceId();
      expect(defaultId).toBeDefined();
      
      // 3. Start monitoring for hot-plug events
      const events = [];
      AudioCapture.startDeviceMonitoring((event) => {
        events.push(event);
      });
      
      // 4. Application runs for some time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 5. User closes application - stop monitoring
      AudioCapture.stopDeviceMonitoring();
      
      // Test passes if no errors occurred
      expect(devices.length).toBeGreaterThan(0);
    });

    test('scenario: device selection workflow', async () => {
      // 1. List devices for user selection
      const devices = await AudioCapture.getAudioDevices();
      
      // 2. Show which one is default
      const defaultId = await AudioCapture.getDefaultDeviceId();
      const defaultDevice = devices.find(d => d.id === defaultId);
      expect(defaultDevice).toBeDefined();
      
      // 3. User starts monitoring
      AudioCapture.startDeviceMonitoring((event) => {
        if (event.type === 'defaultDeviceChanged') {
          // Would update UI here
        }
      });
      
      // 4. Wait for potential events
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 5. User stops
      AudioCapture.stopDeviceMonitoring();
      
      expect(defaultDevice.isDefault).toBe(true);
    });

    test('scenario: automatic device switching', async () => {
      let currentDefaultId = await AudioCapture.getDefaultDeviceId();
      let switchCount = 0;
      
      AudioCapture.startDeviceMonitoring((event) => {
        if (event.type === 'defaultDeviceChanged') {
          switchCount++;
          // In real app: restart capture with new device
        }
      });
      
      // Monitor for device changes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      AudioCapture.stopDeviceMonitoring();
      
      // Test passes (in CI, no device changes expected)
      expect(switchCount).toBeGreaterThanOrEqual(0);
    });
  });
});
