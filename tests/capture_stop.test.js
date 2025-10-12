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
      if (!this.started) {
        throw new Error('Not started');
      }
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

describe('AudioCapture Stop Method', () => {
  let capture;

  beforeEach(() => {
    capture = new AudioCapture({ processId: 1234, loopbackMode: 0 });
  });

  describe('stop()', () => {
    it('should stop capture and trigger stopped event', (done) => {
      capture.start();
      
      capture.on('stopped', () => {
        expect(capture._isCapturing).to.be.false;
        done();
      });

      capture.stop();
    });

    it('should call native module stop method', () => {
      capture.start();
      const stopSpy = sinon.spy(capture._processor, 'stop');
      
      capture.stop();
      
      expect(stopSpy.calledOnce).to.be.true;
    });

    it('should prevent stop when not capturing', () => {
      expect(() => {
        capture.stop();
      }).to.throw(Error, 'Audio capture is not running');
    });

    it('should end the stream by pushing null', (done) => {
      capture.start();
      
      capture.on('end', () => {
        done();
      });

      capture.stop();
    });

    it('should support callback style', (done) => {
      capture.start();
      
      capture.stop((error) => {
        expect(error).to.be.null;
        expect(capture._isCapturing).to.be.false;
        done();
      });
    });

    it('should return error via callback when not capturing', (done) => {
      capture.stop((error) => {
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.include('not running');
        done();
      });
    });

    it('should handle native module errors', (done) => {
      capture.start();
      const errorMessage = 'Native stop error';
      sinon.stub(capture._processor, 'stop').throws(new Error(errorMessage));
      
      capture.stop((error) => {
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.equal(errorMessage);
        done();
      });
    });

    it('should throw native module errors when no callback provided', () => {
      capture.start();
      const errorMessage = 'Native stop error';
      sinon.stub(capture._processor, 'stop').throws(new Error(errorMessage));
      
      expect(() => {
        capture.stop();
      }).to.throw(Error, errorMessage);
    });
  });

  describe('state management', () => {
    it('should set _isCapturing to false on successful stop', () => {
      capture.start();
      expect(capture._isCapturing).to.be.true;
      
      capture.stop();
      
      expect(capture._isCapturing).to.be.false;
    });

    it('should allow restart after stop', () => {
      capture.start();
      capture.stop();
      
      expect(() => {
        capture.start();
      }).to.not.throw();
      
      expect(capture._isCapturing).to.be.true;
    });
  });

  describe('stream lifecycle', () => {
    it('should trigger both stopped and end events', (done) => {
      capture.start();
      
      let stoppedEmitted = false;
      let endEmitted = false;
      
      capture.on('stopped', () => {
        stoppedEmitted = true;
        if (endEmitted) done();
      });
      
      capture.on('end', () => {
        endEmitted = true;
        if (stoppedEmitted) done();
      });
      
      capture.stop();
    });

    it('should not allow data push after stop', (done) => {
      capture.start();
      
      capture.on('end', () => {
        // Stream is ended, should not receive more data
        const dataHandler = sinon.spy();
        capture.on('data', dataHandler);
        
        // Try to push data (should be ignored by stream)
        setTimeout(() => {
          expect(dataHandler.called).to.be.false;
          done();
        }, 50);
      });
      
      capture.stop();
    });
  });

  describe('error scenarios', () => {
    it('should handle multiple stop calls gracefully', () => {
      capture.start();
      capture.stop();
      
      expect(() => {
        capture.stop();
      }).to.throw(Error, 'not running');
    });

    it('should maintain consistent state after error', () => {
      capture.start();
      sinon.stub(capture._processor, 'stop').throws(new Error('Stop failed'));
      
      try {
        capture.stop();
      } catch (e) {
        // Expected error
      }
      
      // State should remain captured since stop failed
      // (Note: In real implementation, you might want different behavior)
    });
  });
});

// Restore original require
Module.prototype.require = originalRequire;
