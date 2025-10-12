const addon = require('../build/Release/node_windows_audio_capture');

describe('AudioProcessor getDeviceInfo', () => {
  it('should export getDeviceInfo static method', () => {
    expect(typeof addon.getDeviceInfo).toBe('function');
    const devices = addon.getDeviceInfo();
    expect(Array.isArray(devices)).toBe(true);
  });
});
