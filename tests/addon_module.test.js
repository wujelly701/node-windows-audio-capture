const addon = require('../build/Release/node_windows_audio_capture');

describe('Native Module Loading', () => {
  it('should load native addon without error', () => {
    expect(addon).toBeDefined();
    expect(typeof addon).toBe('object');
  });

  it('should export AudioProcessor class', () => {
    expect(typeof addon.AudioProcessor).toBe('function');
  });

  it('should export enumerateProcesses function', () => {
    expect(typeof addon.enumerateProcesses).toBe('function');
  });

  it('should export getDeviceInfo function', () => {
    expect(typeof addon.getDeviceInfo).toBe('function');
  });
});
