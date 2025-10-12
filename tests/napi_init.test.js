const addon = require('../build/Release/node_windows_audio_capture');

describe('AudioProcessor N-API Init', () => {
  it('should export AudioProcessor class', () => {
    expect(typeof addon.AudioProcessor).toBe('function');
    const instance = new addon.AudioProcessor();
    expect(instance).toBeInstanceOf(addon.AudioProcessor);
    expect(typeof instance.start).toBe('function');
    expect(typeof instance.stop).toBe('function');
  });
});
