const addon = require('../build/Release/node_windows_audio_capture');

describe('AudioProcessor OnAudioData callback', () => {
  it('should have OnAudioData method (native)', () => {
    const instance = new addon.AudioProcessor();
    expect(typeof instance.OnAudioData).toBe('function');
  });
});
