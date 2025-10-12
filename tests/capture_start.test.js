const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const { EventEmitter } = require('events');

// Mock the native addon
const mockAddon = {
  AudioProcessor: class MockAudioProcessor extends EventEmitter {
    constructor(processId, loopbackMode) {
      super();
      this.processId = processId;
      this.loopbackMode = loopbackMode;
      this.started = false;
    }

    start(callback) {
      if (this.started) {
        throw new Error('Already started');
      }
      this.started = true;
      this.callback = callback;
    }

    stop() {
      this.started = false;
      this.callback = null;
    }
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

describe('AudioCapture Start Method', () => {
  let capture;

  beforeEach(() => {
    capture = new AudioCapture({ processId: 1234, loopbackMode: 0 });
  });

  describe('start()', () => {
    it('should start capture and trigger started event', (done) => {
      capture.on('started', () => {
        expect(capture._isCapturing).to.be.true;
        done();
      });

      capture.start();
    });

    it('should call native module start method', () => {
      const startSpy = sinon.spy(capture._processor, 'start');
      
      capture.start();
      
      expect(startSpy.calledOnce).to.be.true;
      expect(startSpy.firstCall.args[0]).to.be.a('function');
    });

    it('should prevent duplicate start calls', () => {
      capture.start();
      
      expect(() => {
        capture.start();
      }).to.throw(Error, 'Audio capture is already running');
    });

    it('should support callback style', (done) => {
      capture.start((error) => {
        expect(error).to.be.null;
        expect(capture._isCapturing).to.be.true;
        done();
      });
    });

    it('should return error via callback on duplicate start', (done) => {
      capture.start();
      
      capture.start((error) => {
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.include('already running');
        done();
      });
    });

    it('should handle native module errors', (done) => {
      const errorMessage = 'Native module error';
      sinon.stub(capture._processor, 'start').throws(new Error(errorMessage));
      
      capture.start((error) => {
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.equal(errorMessage);
        expect(capture._isCapturing).to.be.false;
        done();
      });
    });

    it('should throw native module errors when no callback provided', () => {
      const errorMessage = 'Native module error';
      sinon.stub(capture._processor, 'start').throws(new Error(errorMessage));
      
      expect(() => {
        capture.start();
      }).to.throw(Error, errorMessage);
      
      expect(capture._isCapturing).to.be.false;
    });

    it('should bind data callback correctly', () => {
      const startSpy = sinon.spy(capture._processor, 'start');
      const onDataSpy = sinon.spy(capture, '_onData');
      
      capture.start();
      
      // Simulate data callback from native module
      const callback = startSpy.firstCall.args[0];
      const testData = Buffer.from([1, 2, 3, 4]);
      callback(testData);
      
      expect(onDataSpy.calledOnce).to.be.true;
      expect(onDataSpy.firstCall.args[0]).to.deep.equal(testData);
    });
  });

  describe('state management', () => {
    it('should set _isCapturing to true on successful start', () => {
      expect(capture._isCapturing).to.be.false;
      
      capture.start();
      
      expect(capture._isCapturing).to.be.true;
    });

    it('should keep _isCapturing false on failed start', () => {
      sinon.stub(capture._processor, 'start').throws(new Error('Start failed'));
      
      try {
        capture.start();
      } catch (e) {
        // Expected error
      }
      
      expect(capture._isCapturing).to.be.false;
    });
  });
});

// Restore original require
Module.prototype.require = originalRequire;
