const addon = require('../build/Release/node_windows_audio_capture');

describe('AudioProcessor StartCapture', () => {
  it('should call startCapture without error', () => {
    const instance = new addon.AudioProcessor();
    expect(() => instance.startCapture()).not.toThrow();
  });
});
