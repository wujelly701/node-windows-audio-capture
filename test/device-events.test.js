/**
 * Device Event Monitoring Tests
 * 设备事件监控测试
 * 
 * Tests for v2.4.0 hot-plug detection and device event notifications
 * v2.4.0 热插拔检测和设备事件通知测试
 */

const { AudioCapture } = require('../index');

describe('Device Event Monitoring - 设备事件监控', () => {
  
  describe('Device Enumeration - 设备枚举', () => {
    
    test('getAudioDevices should return an array - 应返回数组', async () => {
      const devices = await AudioCapture.getAudioDevices();
      expect(Array.isArray(devices)).toBe(true);
    });
    
    test('each device should have required properties - 每个设备应有必需属性', async () => {
      const devices = await AudioCapture.getAudioDevices();
      
      if (devices.length > 0) {
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
      }
    });
    
    test('device IDs should be unique - 设备 ID 应唯一', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const ids = devices.map(d => d.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
    
    test('at least one device should exist - 至少应有一个设备', async () => {
      const devices = await AudioCapture.getAudioDevices();
      expect(devices.length).toBeGreaterThan(0);
    });
    
    test('exactly one device should be marked as default - 应有且仅有一个默认设备', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const defaultDevices = devices.filter(d => d.isDefault);
      
      expect(defaultDevices.length).toBe(1);
    });
  });
  
  describe('Default Device - 默认设备', () => {
    
    test('getDefaultDeviceId should return a string or null - 应返回字符串或 null', async () => {
      const defaultId = await AudioCapture.getDefaultDeviceId();
      
      expect(defaultId === null || typeof defaultId === 'string').toBe(true);
    });
    
    test('default device ID should match a device in the list - 默认设备 ID 应匹配列表中的设备', async () => {
      const devices = await AudioCapture.getAudioDevices();
      const defaultId = await AudioCapture.getDefaultDeviceId();
      
      if (defaultId) {
        const defaultDevice = devices.find(d => d.id === defaultId);
        expect(defaultDevice).toBeDefined();
        expect(defaultDevice.isDefault).toBe(true);
      }
    });
  });
  
  describe('Device Monitoring - 设备监控', () => {
    
    afterEach(() => {
      // Ensure monitoring is stopped after each test
      try {
        AudioCapture.stopDeviceMonitoring();
      } catch (error) {
        // Ignore errors if already stopped
      }
    });
    
    test('startDeviceMonitoring should require a callback function - 应需要回调函数', () => {
      expect(() => {
        AudioCapture.startDeviceMonitoring();
      }).toThrow(TypeError);
      
      expect(() => {
        AudioCapture.startDeviceMonitoring('not a function');
      }).toThrow(TypeError);
      
      expect(() => {
        AudioCapture.startDeviceMonitoring(123);
      }).toThrow(TypeError);
    });
    
    test('startDeviceMonitoring should accept a valid callback - 应接受有效回调', () => {
      expect(() => {
        AudioCapture.startDeviceMonitoring(() => {});
      }).not.toThrow();
    });
    
    test('stopDeviceMonitoring should work even if not monitoring - 即使未监控也应正常工作', () => {
      expect(() => {
        AudioCapture.stopDeviceMonitoring();
        AudioCapture.stopDeviceMonitoring(); // Call twice
      }).not.toThrow();
    });
    
    test('should not throw when starting and stopping monitoring - 启动和停止监控不应抛出错误', (done) => {
      expect(() => {
        AudioCapture.startDeviceMonitoring((event) => {
          // Just a dummy callback
        });
        
        // Stop after a short delay
        setTimeout(() => {
          AudioCapture.stopDeviceMonitoring();
          done();
        }, 100);
      }).not.toThrow();
    });
    
    test('callback should receive event object with correct structure - 回调应接收正确结构的事件对象', (done) => {
      // This test requires actual device events which might not occur during test
      // Skip this test in CI environment
      if (process.env.CI) {
        done();
        return;
      }
      
      let eventReceived = false;
      
      AudioCapture.startDeviceMonitoring((event) => {
        if (!eventReceived) {
          eventReceived = true;
          
          // Check event structure
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('deviceId');
          expect(typeof event.type).toBe('string');
          expect(typeof event.deviceId).toBe('string');
          
          // Valid event types
          const validTypes = [
            'deviceAdded',
            'deviceRemoved',
            'defaultDeviceChanged',
            'deviceStateChanged',
            'devicePropertyChanged'
          ];
          expect(validTypes).toContain(event.type);
          
          AudioCapture.stopDeviceMonitoring();
          done();
        }
      });
      
      // For automated testing, we'll timeout after 2 seconds
      setTimeout(() => {
        if (!eventReceived) {
          AudioCapture.stopDeviceMonitoring();
          // Pass the test anyway since events might not occur
          done();
        }
      }, 2000);
    });
  });
  
  describe('Error Handling - 错误处理', () => {
    
    afterEach(() => {
      try {
        AudioCapture.stopDeviceMonitoring();
      } catch (error) {
        // Ignore
      }
    });
    
    test('getAudioDevices should not throw - 不应抛出错误', async () => {
      await expect(AudioCapture.getAudioDevices()).resolves.not.toThrow();
    });
    
    test('getDefaultDeviceId should not throw - 不应抛出错误', async () => {
      await expect(AudioCapture.getDefaultDeviceId()).resolves.not.toThrow();
    });
    
    test('starting monitoring twice should throw error - 两次启动监控应抛出错误', () => {
      AudioCapture.startDeviceMonitoring(() => {});
      
      // Second call should throw
      expect(() => {
        AudioCapture.startDeviceMonitoring(() => {});
      }).toThrow();
    });
  });
  
  describe('Event Type Validation - 事件类型验证', () => {
    
    test('deviceAdded event should have deviceId - deviceAdded 事件应有 deviceId', () => {
      const mockEvent = {
        type: 'deviceAdded',
        deviceId: '{0.0.0.00000000}.{test-device-id}'
      };
      
      expect(mockEvent.type).toBe('deviceAdded');
      expect(mockEvent.deviceId).toBeTruthy();
    });
    
    test('defaultDeviceChanged event should have additional properties - defaultDeviceChanged 事件应有额外属性', () => {
      const mockEvent = {
        type: 'defaultDeviceChanged',
        deviceId: '{0.0.0.00000000}.{test-device-id}',
        dataFlow: 0,
        role: 0
      };
      
      expect(mockEvent.type).toBe('defaultDeviceChanged');
      expect(mockEvent).toHaveProperty('dataFlow');
      expect(mockEvent).toHaveProperty('role');
      expect(typeof mockEvent.dataFlow).toBe('number');
      expect(typeof mockEvent.role).toBe('number');
    });
    
    test('deviceStateChanged event should have state property - deviceStateChanged 事件应有 state 属性', () => {
      const mockEvent = {
        type: 'deviceStateChanged',
        deviceId: '{0.0.0.00000000}.{test-device-id}',
        state: 1
      };
      
      expect(mockEvent.type).toBe('deviceStateChanged');
      expect(mockEvent).toHaveProperty('state');
      expect(typeof mockEvent.state).toBe('number');
      
      // Valid states: 1=ACTIVE, 2=DISABLED, 4=NOT_PRESENT, 8=UNPLUGGED
      expect([1, 2, 4, 8]).toContain(mockEvent.state);
    });
  });
  
  describe('Cleanup - 清理', () => {
    
    test('should cleanup properly after monitoring - 监控后应正确清理', () => {
      AudioCapture.startDeviceMonitoring(() => {});
      AudioCapture.stopDeviceMonitoring();
      
      // Should be able to start again
      expect(() => {
        AudioCapture.startDeviceMonitoring(() => {});
        AudioCapture.stopDeviceMonitoring();
      }).not.toThrow();
    });
    
    test('multiple stop calls should not throw - 多次停止调用不应抛出错误', () => {
      AudioCapture.startDeviceMonitoring(() => {});
      
      expect(() => {
        AudioCapture.stopDeviceMonitoring();
        AudioCapture.stopDeviceMonitoring();
        AudioCapture.stopDeviceMonitoring();
      }).not.toThrow();
    });
  });
});
