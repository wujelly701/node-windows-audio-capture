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

    // Simulate sending audio data
    simulateData(buffer) {
      if (this.callback && this.started) {
        this.callback(buffer);
      }
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

describe('AudioCapture Data Handling', () => {
  let capture;

  beforeEach(() => {
    capture = new AudioCapture({ processId: 1234, loopbackMode: 0 });
  });

  describe('_onData()', () => {
    it('should receive Buffer data from native module', (done) => {
      const testData = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
      
      capture.on('data', (data) => {
        expect(Buffer.isBuffer(data)).to.be.true;
        expect(data).to.deep.equal(testData);
        done();
      });

      capture.start();
      capture._processor.simulateData(testData);
    });

    it('should push data to the readable stream', (done) => {
      const testData = Buffer.allocUnsafe(1024);
      const pushSpy = sinon.spy(capture, 'push');

      capture.on('data', () => {
        expect(pushSpy.calledOnce).to.be.true;
        expect(pushSpy.firstCall.args[0]).to.equal(testData);
        done();
      });

      capture.start();
      capture._processor.simulateData(testData);
    });

    it('should handle multiple data chunks', (done) => {
      const chunks = [
        Buffer.from([1, 2, 3, 4]),
        Buffer.from([5, 6, 7, 8]),
        Buffer.from([9, 10, 11, 12])
      ];
      const receivedChunks = [];

      capture.on('data', (data) => {
        receivedChunks.push(data);
        
        if (receivedChunks.length === 3) {
          expect(receivedChunks).to.have.lengthOf(3);
          expect(receivedChunks[0]).to.deep.equal(chunks[0]);
          expect(receivedChunks[1]).to.deep.equal(chunks[1]);
          expect(receivedChunks[2]).to.deep.equal(chunks[2]);
          done();
        }
      });

      capture.start();
      chunks.forEach(chunk => capture._processor.simulateData(chunk));
    });

    it('should validate data is a Buffer', (done) => {
      capture.on('error', (error) => {
        expect(error).to.be.instanceOf(TypeError);
        expect(error.message).to.include('Buffer');
        done();
      });

      capture.start();
      // Simulate invalid data (not a Buffer)
      capture._onData('not a buffer');
    });

    it('should emit error for invalid data without stopping capture', (done) => {
      let errorEmitted = false;
      
      capture.on('error', (error) => {
        errorEmitted = true;
        expect(error).to.be.instanceOf(TypeError);
      });

      capture.start();
      capture._onData('invalid');
      
      // Capture should still be running
      expect(capture._isCapturing).to.be.true;
      
      // Should still accept valid data after error
      capture.on('data', (data) => {
        expect(errorEmitted).to.be.true;
        expect(Buffer.isBuffer(data)).to.be.true;
        done();
      });
      
      const validData = Buffer.from([1, 2, 3, 4]);
      capture._processor.simulateData(validData);
    });

    it('should emit backpressure event when stream buffer is full', (done) => {
      // Stub push to return false (indicating buffer is full)
      sinon.stub(capture, 'push').returns(false);
      
      capture.on('backpressure', () => {
        done();
      });

      capture.start();
      const testData = Buffer.from([1, 2, 3, 4]);
      capture._processor.simulateData(testData);
    });

    it('should handle large data buffers', (done) => {
      // Create a 1MB buffer
      const largeBuffer = Buffer.allocUnsafe(1024 * 1024);
      largeBuffer.fill(0xAB);

      capture.on('data', (data) => {
        expect(data).to.equal(largeBuffer);
        expect(data.length).to.equal(1024 * 1024);
        done();
      });

      capture.start();
      capture._processor.simulateData(largeBuffer);
    });

    it('should handle empty buffers', (done) => {
      const emptyBuffer = Buffer.alloc(0);

      capture.on('data', (data) => {
        expect(Buffer.isBuffer(data)).to.be.true;
        expect(data.length).to.equal(0);
        done();
      });

      capture.start();
      capture._processor.simulateData(emptyBuffer);
    });
  });

  describe('stream integration', () => {
    it('should work with stream pipe', (done) => {
      const { Writable } = require('stream');
      const chunks = [];
      
      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      writable.on('finish', () => {
        expect(chunks).to.have.length.greaterThan(0);
        chunks.forEach(chunk => {
          expect(Buffer.isBuffer(chunk)).to.be.true;
        });
        done();
      });

      capture.pipe(writable);
      capture.start();

      // Simulate some data
      capture._processor.simulateData(Buffer.from([1, 2, 3, 4]));
      capture._processor.simulateData(Buffer.from([5, 6, 7, 8]));
      
      // Stop and end stream
      setTimeout(() => {
        capture.stop();
      }, 50);
    });

    it('should support _read() implementation', () => {
      // _read is called by Readable stream when consumer is ready
      expect(capture._read).to.be.a('function');
    });
  });

  describe('data flow control', () => {
    it('should continue receiving data while capturing', (done) => {
      let dataCount = 0;
      const expectedCount = 5;

      capture.on('data', () => {
        dataCount++;
        if (dataCount === expectedCount) {
          expect(capture._isCapturing).to.be.true;
          done();
        }
      });

      capture.start();
      
      for (let i = 0; i < expectedCount; i++) {
        capture._processor.simulateData(Buffer.from([i]));
      }
    });

    it('should not receive data after stop', (done) => {
      const receivedData = [];

      capture.on('data', (data) => {
        receivedData.push(data);
      });

      capture.start();
      
      // Send some data
      capture._processor.simulateData(Buffer.from([1]));
      capture._processor.simulateData(Buffer.from([2]));
      
      setTimeout(() => {
        capture.stop();
        const countBeforeStop = receivedData.length;
        
        // Try to send more data after stop
        capture._processor.simulateData(Buffer.from([3]));
        
        setTimeout(() => {
          // Should not receive data sent after stop
          expect(receivedData.length).to.equal(countBeforeStop);
          done();
        }, 50);
      }, 50);
    });
  });
});

// Restore original require
Module.prototype.require = originalRequire;
