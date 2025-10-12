const addon = require('../build/Release/node_windows_audio_capture');

describe('AudioProcessor StopCapture', () => {
  it('should call stopCapture without error', () => {
    const instance = new addon.AudioProcessor();
    instance.startCapture();
    expect(() => instance.stopCapture()).not.toThrow();
  });
});
