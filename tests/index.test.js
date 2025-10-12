const { describe, it } = require('mocha');
const { expect } = require('chai');

describe('Module Exports', () => {
  let module;

  // Mock the native addon before requiring the module
  before(() => {
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function(id) {
      if (id === '../build/Release/node_windows_audio_capture') {
        return {
          AudioProcessor: class MockAudioProcessor {
            constructor(processId, loopbackMode) {
              this.processId = processId;
              this.loopbackMode = loopbackMode;
            }
            start(callback) {}
            stop() {}
          },
          GetDeviceInfo: () => [],
          enumerateProcesses: () => []
        };
      }
      return originalRequire.apply(this, arguments);
    };

    // Now require the main module
    module = require('../lib/index');
  });

  describe('Main exports', () => {
    it('should export AudioCapture class', () => {
      expect(module.AudioCapture).to.be.a('function');
      expect(module.AudioCapture.name).to.equal('AudioCapture');
    });

    it('should export AudioError class', () => {
      expect(module.AudioError).to.be.a('function');
      expect(module.AudioError.name).to.equal('AudioError');
    });

    it('should export ERROR_CODES object', () => {
      expect(module.ERROR_CODES).to.be.an('object');
      expect(Object.keys(module.ERROR_CODES).length).to.be.greaterThan(0);
    });

    it('should export ErrorCodes alias', () => {
      expect(module.ErrorCodes).to.equal(module.ERROR_CODES);
    });

    it('should export helper functions', () => {
      expect(module.fromNativeError).to.be.a('function');
      expect(module.invalidConfig).to.be.a('function');
      expect(module.deviceError).to.be.a('function');
      expect(module.processError).to.be.a('function');
    });

    it('should export version string', () => {
      expect(module.version).to.be.a('string');
      expect(module.version).to.match(/^\d+\.\d+\.\d+/);
    });

    it('should export default as AudioCapture', () => {
      expect(module.default).to.equal(module.AudioCapture);
    });
  });

  describe('AudioCapture instantiation', () => {
    it('should be able to instantiate AudioCapture', () => {
      const capture = new module.AudioCapture();
      
      expect(capture).to.be.instanceOf(module.AudioCapture);
    });

    it('should be able to instantiate AudioCapture with options', () => {
      const capture = new module.AudioCapture({
        processId: 1234,
        loopbackMode: 0
      });
      
      expect(capture).to.be.instanceOf(module.AudioCapture);
      expect(capture._processor).to.exist;
    });

    it('should have AudioCapture methods', () => {
      const capture = new module.AudioCapture();
      
      expect(capture.start).to.be.a('function');
      expect(capture.stop).to.be.a('function');
      expect(capture._onData).to.be.a('function');
      expect(capture._validateConfig).to.be.a('function');
    });

    it('should have AudioCapture static methods', () => {
      expect(module.AudioCapture.getDevices).to.be.a('function');
      expect(module.AudioCapture.getProcesses).to.be.a('function');
    });
  });

  describe('AudioError instantiation', () => {
    it('should be able to instantiate AudioError', () => {
      const error = new module.AudioError('Test error', 'TEST_CODE');
      
      expect(error).to.be.instanceOf(module.AudioError);
      expect(error).to.be.instanceOf(Error);
    });

    it('should create AudioError with message and code', () => {
      const error = new module.AudioError('Test message', 'TEST_CODE');
      
      expect(error.message).to.equal('Test message');
      expect(error.code).to.equal('TEST_CODE');
      expect(error.name).to.equal('AudioError');
    });
  });

  describe('ERROR_CODES constants', () => {
    it('should have configuration error codes', () => {
      expect(module.ERROR_CODES.INVALID_CONFIG).to.be.a('string');
      expect(module.ERROR_CODES.INVALID_PROCESS).to.be.a('string');
      expect(module.ERROR_CODES.INVALID_DEVICE).to.be.a('string');
    });

    it('should have device error codes', () => {
      expect(module.ERROR_CODES.DEVICE_NOT_FOUND).to.be.a('string');
      expect(module.ERROR_CODES.DEVICE_DISCONNECTED).to.be.a('string');
    });

    it('should have process error codes', () => {
      expect(module.ERROR_CODES.PROCESS_NOT_FOUND).to.be.a('string');
      expect(module.ERROR_CODES.PROCESS_ACCESS_DENIED).to.be.a('string');
    });

    it('should have capture error codes', () => {
      expect(module.ERROR_CODES.CAPTURE_ALREADY_RUNNING).to.be.a('string');
      expect(module.ERROR_CODES.CAPTURE_NOT_RUNNING).to.be.a('string');
    });
  });

  describe('Helper functions', () => {
    it('should have working fromNativeError', () => {
      const nativeError = new Error('Native error');
      const audioError = module.fromNativeError(nativeError);
      
      expect(audioError).to.be.instanceOf(module.AudioError);
      expect(audioError.code).to.equal(module.ERROR_CODES.NATIVE_ERROR);
    });

    it('should have working invalidConfig', () => {
      const error = module.invalidConfig('testParam', 'testValue');
      
      expect(error).to.be.instanceOf(module.AudioError);
      expect(error.code).to.equal(module.ERROR_CODES.INVALID_CONFIG);
    });

    it('should have working deviceError', () => {
      const error = module.deviceError('device-123', 'not found');
      
      expect(error).to.be.instanceOf(module.AudioError);
      expect(error.code).to.equal(module.ERROR_CODES.DEVICE_NOT_FOUND);
    });

    it('should have working processError', () => {
      const error = module.processError(1234, 'not found');
      
      expect(error).to.be.instanceOf(module.AudioError);
      expect(error.code).to.equal(module.ERROR_CODES.PROCESS_NOT_FOUND);
    });
  });

  describe('Module structure', () => {
    it('should export all expected keys', () => {
      const expectedKeys = [
        'AudioCapture',
        'AudioError',
        'ERROR_CODES',
        'ErrorCodes',
        'fromNativeError',
        'invalidConfig',
        'deviceError',
        'processError',
        'version',
        'default'
      ];
      
      expectedKeys.forEach(key => {
        expect(module).to.have.property(key);
      });
    });

    it('should have correct number of exports', () => {
      const exportKeys = Object.keys(module);
      expect(exportKeys.length).to.equal(10);
    });
  });

  describe('Version', () => {
    it('should match package.json version', () => {
      const packageJson = require('../package.json');
      expect(module.version).to.equal(packageJson.version);
    });

    it('should be a valid semver version', () => {
      expect(module.version).to.match(/^\d+\.\d+\.\d+/);
    });
  });

  describe('Integration', () => {
    it('should be able to use AudioCapture with ERROR_CODES', () => {
      const capture = new module.AudioCapture();
      const errorCode = module.ERROR_CODES.CAPTURE_NOT_RUNNING;
      
      expect(capture).to.exist;
      expect(errorCode).to.be.a('string');
    });

    it('should be able to create and throw AudioError', () => {
      expect(() => {
        throw new module.AudioError(
          'Test error',
          module.ERROR_CODES.INVALID_CONFIG
        );
      }).to.throw(module.AudioError);
    });

    it('should maintain correct instanceof relationships', () => {
      const capture = new module.AudioCapture();
      const error = new module.AudioError('Test', 'TEST');
      
      expect(capture instanceof module.AudioCapture).to.be.true;
      expect(error instanceof module.AudioError).to.be.true;
      expect(error instanceof Error).to.be.true;
    });
  });

  describe('CommonJS compatibility', () => {
    it('should work with destructuring', () => {
      const { AudioCapture, AudioError, ERROR_CODES } = module;
      
      expect(AudioCapture).to.be.a('function');
      expect(AudioError).to.be.a('function');
      expect(ERROR_CODES).to.be.an('object');
    });

    it('should work with default export', () => {
      const DefaultExport = module.default;
      
      expect(DefaultExport).to.equal(module.AudioCapture);
      expect(new DefaultExport()).to.be.instanceOf(module.AudioCapture);
    });
  });
});
