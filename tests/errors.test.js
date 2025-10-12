const { describe, it } = require('mocha');
const { expect } = require('chai');
const { AudioError, ERROR_CODES, fromNativeError, invalidConfig, deviceError, processError } = require('../lib/errors');

describe('AudioError Class', () => {
  describe('constructor', () => {
    it('should create an error with message and code', () => {
      const error = new AudioError('Test error', 'TEST_CODE');
      
      expect(error.message).to.equal('Test error');
      expect(error.code).to.equal('TEST_CODE');
      expect(error.name).to.equal('AudioError');
    });

    it('should create an error with details', () => {
      const details = { param: 'value', count: 42 };
      const error = new AudioError('Test error', 'TEST_CODE', details);
      
      expect(error.details).to.deep.equal(details);
    });

    it('should have default empty details object', () => {
      const error = new AudioError('Test error', 'TEST_CODE');
      
      expect(error.details).to.be.an('object');
      expect(error.details).to.be.empty;
    });

    it('should have a timestamp', () => {
      const before = new Date().toISOString();
      const error = new AudioError('Test error', 'TEST_CODE');
      const after = new Date().toISOString();
      
      expect(error.timestamp).to.be.a('string');
      expect(error.timestamp).to.be.at.least(before);
      expect(error.timestamp).to.be.at.most(after);
    });

    it('should be an instance of Error', () => {
      const error = new AudioError('Test error', 'TEST_CODE');
      
      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(AudioError);
    });

    it('should have proper stack trace', () => {
      const error = new AudioError('Test error', 'TEST_CODE');
      
      expect(error.stack).to.be.a('string');
      expect(error.stack).to.include('Test error');
      expect(error.stack).to.include('AudioError');
    });
  });

  describe('toJSON()', () => {
    it('should serialize to JSON', () => {
      const error = new AudioError('Test error', 'TEST_CODE', { key: 'value' });
      const json = error.toJSON();
      
      expect(json).to.be.an('object');
      expect(json.name).to.equal('AudioError');
      expect(json.message).to.equal('Test error');
      expect(json.code).to.equal('TEST_CODE');
      expect(json.details).to.deep.equal({ key: 'value' });
      expect(json.timestamp).to.be.a('string');
      expect(json.stack).to.be.a('string');
    });

    it('should be JSON.stringify compatible', () => {
      const error = new AudioError('Test error', 'TEST_CODE');
      const jsonString = JSON.stringify(error);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.name).to.equal('AudioError');
      expect(parsed.message).to.equal('Test error');
      expect(parsed.code).to.equal('TEST_CODE');
    });
  });

  describe('toString()', () => {
    it('should return formatted string', () => {
      const error = new AudioError('Test error', 'TEST_CODE');
      const str = error.toString();
      
      expect(str).to.equal('AudioError [TEST_CODE]: Test error');
    });

    it('should work with different error codes', () => {
      const error = new AudioError('Device not found', 'DEVICE_NOT_FOUND');
      const str = error.toString();
      
      expect(str).to.equal('AudioError [DEVICE_NOT_FOUND]: Device not found');
    });
  });
});

describe('ERROR_CODES', () => {
  it('should export error codes object', () => {
    expect(ERROR_CODES).to.be.an('object');
    expect(Object.keys(ERROR_CODES).length).to.be.greaterThan(0);
  });

  it('should have configuration error codes', () => {
    expect(ERROR_CODES.INVALID_CONFIG).to.equal('INVALID_CONFIG');
    expect(ERROR_CODES.INVALID_PROCESS).to.equal('INVALID_PROCESS');
    expect(ERROR_CODES.INVALID_DEVICE).to.equal('INVALID_DEVICE');
    expect(ERROR_CODES.INVALID_SAMPLE_RATE).to.equal('INVALID_SAMPLE_RATE');
    expect(ERROR_CODES.INVALID_CHANNELS).to.equal('INVALID_CHANNELS');
  });

  it('should have device error codes', () => {
    expect(ERROR_CODES.DEVICE_NOT_FOUND).to.equal('DEVICE_NOT_FOUND');
    expect(ERROR_CODES.DEVICE_DISCONNECTED).to.equal('DEVICE_DISCONNECTED');
    expect(ERROR_CODES.DEVICE_IN_USE).to.equal('DEVICE_IN_USE');
    expect(ERROR_CODES.DEVICE_INITIALIZATION_FAILED).to.equal('DEVICE_INITIALIZATION_FAILED');
  });

  it('should have process error codes', () => {
    expect(ERROR_CODES.PROCESS_NOT_FOUND).to.equal('PROCESS_NOT_FOUND');
    expect(ERROR_CODES.PROCESS_ACCESS_DENIED).to.equal('PROCESS_ACCESS_DENIED');
    expect(ERROR_CODES.PROCESS_TERMINATED).to.equal('PROCESS_TERMINATED');
  });

  it('should have capture error codes', () => {
    expect(ERROR_CODES.CAPTURE_ALREADY_RUNNING).to.equal('CAPTURE_ALREADY_RUNNING');
    expect(ERROR_CODES.CAPTURE_NOT_RUNNING).to.equal('CAPTURE_NOT_RUNNING');
    expect(ERROR_CODES.CAPTURE_START_FAILED).to.equal('CAPTURE_START_FAILED');
    expect(ERROR_CODES.CAPTURE_STOP_FAILED).to.equal('CAPTURE_STOP_FAILED');
  });

  it('should have system error codes', () => {
    expect(ERROR_CODES.COM_INIT_FAILED).to.equal('COM_INIT_FAILED');
    expect(ERROR_CODES.INSUFFICIENT_PERMISSIONS).to.equal('INSUFFICIENT_PERMISSIONS');
    expect(ERROR_CODES.SYSTEM_ERROR).to.equal('SYSTEM_ERROR');
  });

  it('should have native error codes', () => {
    expect(ERROR_CODES.NATIVE_ERROR).to.equal('NATIVE_ERROR');
    expect(ERROR_CODES.ADDON_NOT_LOADED).to.equal('ADDON_NOT_LOADED');
  });
});

describe('Helper Functions', () => {
  describe('fromNativeError()', () => {
    it('should create AudioError from native error', () => {
      const nativeError = new Error('Native failure');
      const audioError = fromNativeError(nativeError);
      
      expect(audioError).to.be.instanceOf(AudioError);
      expect(audioError.message).to.equal('Native failure');
      expect(audioError.code).to.equal(ERROR_CODES.NATIVE_ERROR);
    });

    it('should include context in message', () => {
      const nativeError = new Error('Native failure');
      const audioError = fromNativeError(nativeError, 'Device initialization');
      
      expect(audioError.message).to.equal('Device initialization: Native failure');
    });

    it('should include native error details', () => {
      const nativeError = new Error('Native failure');
      const audioError = fromNativeError(nativeError, 'Test context');
      
      expect(audioError.details.nativeError).to.equal('Native failure');
      expect(audioError.details.nativeStack).to.be.a('string');
      expect(audioError.details.context).to.equal('Test context');
    });
  });

  describe('invalidConfig()', () => {
    it('should create invalid config error', () => {
      const error = invalidConfig('sampleRate', 32000);
      
      expect(error).to.be.instanceOf(AudioError);
      expect(error.code).to.equal(ERROR_CODES.INVALID_CONFIG);
      expect(error.message).to.include('sampleRate');
      expect(error.message).to.include('32000');
    });

    it('should include reason in message', () => {
      const error = invalidConfig('channels', 3, 'must be 1 or 2');
      
      expect(error.message).to.equal('Invalid channels: must be 1 or 2');
    });

    it('should include parameter and value in details', () => {
      const error = invalidConfig('processId', -1, 'must be non-negative');
      
      expect(error.details.parameter).to.equal('processId');
      expect(error.details.value).to.equal(-1);
      expect(error.details.reason).to.equal('must be non-negative');
    });
  });

  describe('deviceError()', () => {
    it('should create device error', () => {
      const error = deviceError('device-123', 'not found');
      
      expect(error).to.be.instanceOf(AudioError);
      expect(error.code).to.equal(ERROR_CODES.DEVICE_NOT_FOUND);
      expect(error.message).to.include('device-123');
      expect(error.message).to.include('not found');
    });

    it('should include device id and reason in details', () => {
      const error = deviceError('device-456', 'disconnected');
      
      expect(error.details.deviceId).to.equal('device-456');
      expect(error.details.reason).to.equal('disconnected');
    });
  });

  describe('processError()', () => {
    it('should create process error', () => {
      const error = processError(1234, 'not found');
      
      expect(error).to.be.instanceOf(AudioError);
      expect(error.code).to.equal(ERROR_CODES.PROCESS_NOT_FOUND);
      expect(error.message).to.include('1234');
      expect(error.message).to.include('not found');
    });

    it('should include pid and reason in details', () => {
      const error = processError(5678, 'access denied');
      
      expect(error.details.pid).to.equal(5678);
      expect(error.details.reason).to.equal('access denied');
    });
  });
});

describe('Error Usage', () => {
  it('should be catchable', () => {
    try {
      throw new AudioError('Test error', 'TEST_CODE');
    } catch (error) {
      expect(error).to.be.instanceOf(AudioError);
      expect(error.message).to.equal('Test error');
    }
  });

  it('should work with instanceof checks', () => {
    const error = new AudioError('Test error', 'TEST_CODE');
    
    expect(error instanceof Error).to.be.true;
    expect(error instanceof AudioError).to.be.true;
  });

  it('should preserve stack trace location', () => {
    function throwError() {
      throw new AudioError('Test error', 'TEST_CODE');
    }
    
    try {
      throwError();
    } catch (error) {
      expect(error.stack).to.include('throwError');
    }
  });
});
