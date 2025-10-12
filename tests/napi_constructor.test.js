const addon = require('../build/Release/node_windows_audio_capture');

describe('AudioProcessor Constructor', () => {
  it('should accept processId and loopbackMode', () => {
    const processId = 1234;
    const loopbackMode = 1; // INCLUDE
    const instance = new addon.AudioProcessor(processId, loopbackMode);
    expect(instance).toBeInstanceOf(addon.AudioProcessor);
  });

  it('should fallback to default if no args', () => {
    const instance = new addon.AudioProcessor();
    expect(instance).toBeInstanceOf(addon.AudioProcessor);
  });
});
