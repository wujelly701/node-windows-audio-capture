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
  GetDeviceInfo: () => [],
  enumerateProcesses: () => {
    return [
      { pid: 1234, name: 'chrome.exe' },
      { pid: 5678, name: 'spotify.exe' },
      { pid: 9012, name: 'discord.exe' },
      { pid: process.pid, name: 'node.exe' }
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

describe('AudioCapture Process Enumeration', () => {
  describe('getProcesses()', () => {
    it('should be a static method', () => {
      expect(AudioCapture.getProcesses).to.be.a('function');
      expect(new AudioCapture().getProcesses).to.be.undefined;
    });

    it('should return an array', () => {
      const processes = AudioCapture.getProcesses();
      expect(processes).to.be.an('array');
    });

    it('should return processes with correct structure', () => {
      const processes = AudioCapture.getProcesses();
      
      expect(processes.length).to.be.greaterThan(0);
      
      processes.forEach(proc => {
        expect(proc).to.be.an('object');
        expect(proc).to.have.property('pid').that.is.a('number');
        expect(proc).to.have.property('name').that.is.a('string');
        expect(proc.pid).to.be.at.least(0);
        expect(proc.name).to.have.length.greaterThan(0);
      });
    });

    it('should call native enumerateProcesses', () => {
      const spy = sinon.spy(mockAddon, 'enumerateProcesses');
      
      AudioCapture.getProcesses();
      
      expect(spy.calledOnce).to.be.true;
      spy.restore();
    });

    it('should return expected process data', () => {
      const processes = AudioCapture.getProcesses();
      
      expect(processes).to.have.length.greaterThan(0);
      
      // Verify expected processes are in the list
      const chromeProcess = processes.find(p => p.pid === 1234);
      expect(chromeProcess).to.exist;
      expect(chromeProcess.name).to.equal('chrome.exe');
      
      const spotifyProcess = processes.find(p => p.pid === 5678);
      expect(spotifyProcess).to.exist;
      expect(spotifyProcess.name).to.equal('spotify.exe');
    });

    it('should include current Node.js process', () => {
      const processes = AudioCapture.getProcesses();
      
      const currentProcess = processes.find(p => p.pid === process.pid);
      expect(currentProcess).to.exist;
      expect(currentProcess.name).to.equal('node.exe');
    });

    it('should handle empty process list', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([]);
      
      const processes = AudioCapture.getProcesses();
      
      expect(processes).to.be.an('array');
      expect(processes).to.have.lengthOf(0);
      
      stub.restore();
    });

    it('should throw error if native method returns non-array', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns('not an array');
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes');
      
      stub.restore();
    });

    it('should throw error if process object is invalid', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 1234, name: 'valid.exe' },
        'invalid process object'
      ]);
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes');
      
      stub.restore();
    });

    it('should throw error if process is missing pid property', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { name: 'process-without-pid.exe' }
      ]);
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes');
      
      stub.restore();
    });

    it('should throw error if process is missing name property', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 1234 }
      ]);
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes');
      
      stub.restore();
    });

    it('should throw error if pid is not a number', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: '1234', name: 'process.exe' }
      ]);
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes');
      
      stub.restore();
    });

    it('should throw error if pid is negative', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: -1, name: 'invalid.exe' }
      ]);
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes');
      
      stub.restore();
    });

    it('should throw error if name is not a string', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 1234, name: 12345 }
      ]);
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes');
      
      stub.restore();
    });

    it('should sanitize process data', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 1234, name: 'process.exe', extraProperty: 'should be removed' }
      ]);
      
      const processes = AudioCapture.getProcesses();
      
      expect(processes[0]).to.deep.equal({
        pid: 1234,
        name: 'process.exe'
      });
      expect(processes[0]).to.not.have.property('extraProperty');
      
      stub.restore();
    });

    it('should handle processes with special characters in names', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 1234, name: 'my-app (x64).exe' },
        { pid: 5678, name: 'app with spaces.exe' }
      ]);
      
      const processes = AudioCapture.getProcesses();
      
      expect(processes).to.have.lengthOf(2);
      expect(processes[0].name).to.equal('my-app (x64).exe');
      expect(processes[1].name).to.equal('app with spaces.exe');
      
      stub.restore();
    });

    it('should handle system process (PID 0)', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 0, name: 'System Idle Process' }
      ]);
      
      const processes = AudioCapture.getProcesses();
      
      expect(processes[0].pid).to.equal(0);
      
      stub.restore();
    });

    it('should handle large PIDs', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 999999, name: 'high-pid.exe' }
      ]);
      
      const processes = AudioCapture.getProcesses();
      
      expect(processes[0].pid).to.equal(999999);
      
      stub.restore();
    });

    it('should handle native module errors gracefully', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').throws(new Error('Native error'));
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error, 'Failed to enumerate processes: Native error');
      
      stub.restore();
    });

    it('should be callable multiple times', () => {
      const processes1 = AudioCapture.getProcesses();
      const processes2 = AudioCapture.getProcesses();
      
      expect(processes1).to.deep.equal(processes2);
    });

    it('should return new array instance each time', () => {
      const processes1 = AudioCapture.getProcesses();
      const processes2 = AudioCapture.getProcesses();
      
      expect(processes1).to.not.equal(processes2); // Different array instances
      expect(processes1).to.deep.equal(processes2); // But same content
    });
  });

  describe('process list validation', () => {
    it('should validate all processes before returning', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 1234, name: 'valid1.exe' },
        { pid: 5678, name: 'valid2.exe' },
        { pid: 9012 } // Missing name - should fail
      ]);
      
      expect(() => {
        AudioCapture.getProcesses();
      }).to.throw(Error);
      
      stub.restore();
    });

    it('should provide helpful error messages', () => {
      const stub = sinon.stub(mockAddon, 'enumerateProcesses').returns([
        { pid: 1234, name: 'valid.exe' },
        { pid: '5678', name: 'invalid-pid-type.exe' } // Invalid pid type
      ]);
      
      try {
        AudioCapture.getProcesses();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to enumerate processes');
        expect(error.message).to.match(/index 1|number 'pid'/);
      }
      
      stub.restore();
    });
  });

  describe('process filtering', () => {
    it('should allow filtering by process name', () => {
      const processes = AudioCapture.getProcesses();
      const chromeProcesses = processes.filter(p => p.name.includes('chrome'));
      
      expect(chromeProcesses).to.be.an('array');
      chromeProcesses.forEach(p => {
        expect(p.name).to.include('chrome');
      });
    });

    it('should allow finding process by PID', () => {
      const processes = AudioCapture.getProcesses();
      const process = processes.find(p => p.pid === 1234);
      
      expect(process).to.exist;
      expect(process.pid).to.equal(1234);
      expect(process.name).to.equal('chrome.exe');
    });
  });
});

// Restore original require
Module.prototype.require = originalRequire;
