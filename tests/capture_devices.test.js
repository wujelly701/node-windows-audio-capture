const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

// Mock the native addon
const mockAddon = {
  AudioProcessor: class MockAudioProcessor {
    constructor(processId, loopbackMode) {
      this.processId = processId;
      this.loopbackMode = loopbackMode;
    }
    start(callback) {}
    stop() {}
  },
  GetDeviceInfo: () => {
    return [
      { id: 'device-1', name: 'Speakers (Realtek High Definition Audio)' },
      { id: 'device-2', name: 'Headphones (USB Audio Device)' },
      { id: 'device-3', name: 'Digital Audio (HDMI)' }
    ];
  }
};

// Mock require for the addon
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === '../build/Release/node_windows_audio_capture') {
    return mockAddon;
  }
  return originalRequire.apply(this, arguments);
};

const AudioCapture = require('../lib/audio-capture');

describe('AudioCapture Device Enumeration', () => {
  describe('getDevices()', () => {
    it('should be a static method', () => {
      expect(AudioCapture.getDevices).to.be.a('function');
      expect(new AudioCapture().getDevices).to.be.undefined;
    });

    it('should return an array', () => {
      const devices = AudioCapture.getDevices();
      expect(devices).to.be.an('array');
    });

    it('should return devices with correct structure', () => {
      const devices = AudioCapture.getDevices();
      
      expect(devices.length).to.be.greaterThan(0);
      
      devices.forEach(device => {
        expect(device).to.be.an('object');
        expect(device).to.have.property('id').that.is.a('string');
        expect(device).to.have.property('name').that.is.a('string');
        expect(device.id).to.have.length.greaterThan(0);
        expect(device.name).to.have.length.greaterThan(0);
      });
    });

    it('should call native GetDeviceInfo', () => {
      const spy = sinon.spy(mockAddon, 'GetDeviceInfo');
      
      AudioCapture.getDevices();
      
      expect(spy.calledOnce).to.be.true;
      spy.restore();
    });

    it('should return expected device data', () => {
      const devices = AudioCapture.getDevices();
      
      expect(devices).to.have.lengthOf(3);
      expect(devices[0]).to.deep.equal({
        id: 'device-1',
        name: 'Speakers (Realtek High Definition Audio)'
      });
      expect(devices[1]).to.deep.equal({
        id: 'device-2',
        name: 'Headphones (USB Audio Device)'
      });
      expect(devices[2]).to.deep.equal({
        id: 'device-3',
        name: 'Digital Audio (HDMI)'
      });
    });

    it('should handle empty device list', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([]);
      
      const devices = AudioCapture.getDevices();
      
      expect(devices).to.be.an('array');
      expect(devices).to.have.lengthOf(0);
      
      stub.restore();
    });

    it('should throw error if native method returns non-array', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns('not an array');
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error, 'Failed to get audio devices');
      
      stub.restore();
    });

    it('should throw error if device object is invalid', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 'valid-device', name: 'Valid Device' },
        'invalid device object'
      ]);
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error, 'Failed to get audio devices');
      
      stub.restore();
    });

    it('should throw error if device is missing id property', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { name: 'Device without ID' }
      ]);
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error, 'Failed to get audio devices');
      
      stub.restore();
    });

    it('should throw error if device is missing name property', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 'device-1' }
      ]);
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error, 'Failed to get audio devices');
      
      stub.restore();
    });

    it('should throw error if device id is not a string', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 12345, name: 'Device with numeric ID' }
      ]);
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error, 'Failed to get audio devices');
      
      stub.restore();
    });

    it('should throw error if device name is not a string', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 'device-1', name: 12345 }
      ]);
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error, 'Failed to get audio devices');
      
      stub.restore();
    });

    it('should sanitize device data', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 'device-1', name: 'Test Device', extraProperty: 'should be removed' }
      ]);
      
      const devices = AudioCapture.getDevices();
      
      expect(devices[0]).to.deep.equal({
        id: 'device-1',
        name: 'Test Device'
      });
      expect(devices[0]).to.not.have.property('extraProperty');
      
      stub.restore();
    });

    it('should handle devices with special characters in names', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 'device-1', name: 'Device (Test) [Audio] {Special}' },
        { id: 'device-2', name: 'Device with émojis 🎵🔊' }
      ]);
      
      const devices = AudioCapture.getDevices();
      
      expect(devices).to.have.lengthOf(2);
      expect(devices[0].name).to.include('(Test)');
      expect(devices[1].name).to.include('émojis');
      
      stub.restore();
    });

    it('should handle native module errors gracefully', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').throws(new Error('Native error'));
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error, 'Failed to get audio devices: Native error');
      
      stub.restore();
    });

    it('should be callable multiple times', () => {
      const devices1 = AudioCapture.getDevices();
      const devices2 = AudioCapture.getDevices();
      
      expect(devices1).to.deep.equal(devices2);
    });

    it('should return new array instance each time', () => {
      const devices1 = AudioCapture.getDevices();
      const devices2 = AudioCapture.getDevices();
      
      expect(devices1).to.not.equal(devices2); // Different array instances
      expect(devices1).to.deep.equal(devices2); // But same content
    });
  });

  describe('device list validation', () => {
    it('should validate all devices before returning', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 'device-1', name: 'Valid Device 1' },
        { id: 'device-2', name: 'Valid Device 2' },
        { id: 'invalid' } // Missing name - should fail
      ]);
      
      expect(() => {
        AudioCapture.getDevices();
      }).to.throw(Error);
      
      stub.restore();
    });

    it('should provide helpful error messages', () => {
      const stub = sinon.stub(mockAddon, 'GetDeviceInfo').returns([
        { id: 'device-1', name: 'Valid Device' },
        { id: 123, name: 'Invalid ID type' } // Invalid id type
      ]);
      
      try {
        AudioCapture.getDevices();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get audio devices');
        expect(error.message).to.match(/index 1|string 'id'/);
      }
      
      stub.restore();
    });
  });
});

// Restore original require
Module.prototype.require = originalRequire;
