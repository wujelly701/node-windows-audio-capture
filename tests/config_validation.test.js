const { describe, it } = require('mocha');
const { expect } = require('chai');
const AudioCapture = require('../lib/audio-capture');

describe('AudioCapture Configuration Validation', () => {
  describe('processId validation', () => {
    it('should throw TypeError for negative processId', () => {
      expect(() => {
        new AudioCapture({ processId: -1 });
      }).to.throw(TypeError, 'processId must be a non-negative number');
    });

    it('should throw TypeError for non-number processId', () => {
      expect(() => {
        new AudioCapture({ processId: '123' });
      }).to.throw(TypeError, 'processId must be a non-negative number');
    });

    it('should accept valid processId', () => {
      expect(() => {
        new AudioCapture({ processId: 1234 });
      }).to.not.throw();
    });
  });

  describe('loopbackMode validation', () => {
    it('should throw TypeError for invalid loopbackMode value', () => {
      expect(() => {
        new AudioCapture({ loopbackMode: 2 });
      }).to.throw(TypeError, 'loopbackMode must be 0 (EXCLUDE) or 1 (INCLUDE)');
    });

    it('should throw TypeError for non-number loopbackMode', () => {
      expect(() => {
        new AudioCapture({ loopbackMode: '0' });
      }).to.throw(TypeError, 'loopbackMode must be 0 (EXCLUDE) or 1 (INCLUDE)');
    });

    it('should accept loopbackMode 0 (EXCLUDE)', () => {
      expect(() => {
        new AudioCapture({ loopbackMode: 0 });
      }).to.not.throw();
    });

    it('should accept loopbackMode 1 (INCLUDE)', () => {
      expect(() => {
        new AudioCapture({ loopbackMode: 1 });
      }).to.not.throw();
    });
  });

  describe('sampleRate validation', () => {
    it('should throw TypeError for invalid sampleRate', () => {
      expect(() => {
        new AudioCapture({ sampleRate: 32000 });
      }).to.throw(TypeError, 'sampleRate must be one of');
    });

    it('should accept valid sampleRate 44100', () => {
      expect(() => {
        new AudioCapture({ sampleRate: 44100 });
      }).to.not.throw();
    });

    it('should accept valid sampleRate 48000', () => {
      expect(() => {
        new AudioCapture({ sampleRate: 48000 });
      }).to.not.throw();
    });
  });

  describe('channels validation', () => {
    it('should throw TypeError for channels < 1', () => {
      expect(() => {
        new AudioCapture({ channels: 0 });
      }).to.throw(TypeError, 'channels must be 1 (mono) or 2 (stereo)');
    });

    it('should throw TypeError for channels > 2', () => {
      expect(() => {
        new AudioCapture({ channels: 3 });
      }).to.throw(TypeError, 'channels must be 1 (mono) or 2 (stereo)');
    });

    it('should throw TypeError for non-number channels', () => {
      expect(() => {
        new AudioCapture({ channels: '2' });
      }).to.throw(TypeError, 'channels must be 1 (mono) or 2 (stereo)');
    });

    it('should accept channels 1 (mono)', () => {
      expect(() => {
        new AudioCapture({ channels: 1 });
      }).to.not.throw();
    });

    it('should accept channels 2 (stereo)', () => {
      expect(() => {
        new AudioCapture({ channels: 2 });
      }).to.not.throw();
    });
  });

  describe('combined validation', () => {
    it('should accept valid configuration with all parameters', () => {
      expect(() => {
        new AudioCapture({
          processId: 1234,
          loopbackMode: 1,
          sampleRate: 44100,
          channels: 2
        });
      }).to.not.throw();
    });

    it('should throw on first invalid parameter in combined config', () => {
      expect(() => {
        new AudioCapture({
          processId: -1,
          loopbackMode: 1,
          sampleRate: 44100
        });
      }).to.throw(TypeError, 'processId must be a non-negative number');
    });
  });
});
