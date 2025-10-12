const addon = require('../build/Release/node_windows_audio_capture');

describe('Process Enumerator', () => {
  it('should enumerate processes', () => {
    expect(typeof addon.enumerateProcesses).toBe('function');
    const list = addon.enumerateProcesses();
    expect(Array.isArray(list)).toBe(true);
    // 进程列表应包含系统进程
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('pid');
    expect(list[0]).toHaveProperty('name');
  });
});
