/**
 * 基础功能测试
 * 测试 Native addon 加载、设备枚举、AudioCapture 基本功能
 */

const { AudioCapture, getDeviceInfo, enumerateProcesses } = require('../index');

describe('Native Addon - Basic', () => {
    test('should load native addon successfully', () => {
        expect(AudioCapture).toBeDefined();
        expect(typeof AudioCapture).toBe('function');
        expect(getDeviceInfo).toBeDefined();
        expect(typeof getDeviceInfo).toBe('function');
        expect(enumerateProcesses).toBeDefined();
        expect(typeof enumerateProcesses).toBe('function');
    });

    test('should get device info', () => {
        const device = getDeviceInfo();
        expect(device).toBeDefined();
        expect(device).toHaveProperty('name');
        expect(device).toHaveProperty('id');
        expect(typeof device.name).toBe('string');
        expect(typeof device.id).toBe('string');
        expect(device.name.length).toBeGreaterThan(0);
        expect(device.id.length).toBeGreaterThan(0);
    });

    test('should enumerate processes', () => {
        const processes = enumerateProcesses();
        expect(Array.isArray(processes)).toBe(true);
        expect(processes.length).toBeGreaterThan(0);
        
        // 检查进程对象结构
        const firstProcess = processes[0];
        expect(firstProcess).toHaveProperty('pid');
        expect(firstProcess).toHaveProperty('name');
        expect(typeof firstProcess.pid).toBe('number');
        expect(typeof firstProcess.name).toBe('string');
    });
});

describe('AudioCapture - Constructor', () => {
    test('should create AudioCapture instance with default options', () => {
        const capture = new AudioCapture();
        expect(capture).toBeInstanceOf(AudioCapture);
        expect(capture.isRunning()).toBe(false);
        expect(capture.isPaused()).toBe(false);
    });

    test('should create AudioCapture with custom options', () => {
        const capture = new AudioCapture({
            processId: 1234,
            sampleRate: 48000,
            channels: 2,
            bitDepth: 16
        });
        expect(capture).toBeInstanceOf(AudioCapture);
        
        const options = capture.getOptions();
        expect(options.processId).toBe(1234);
        expect(options.sampleRate).toBe(48000);
        expect(options.channels).toBe(2);
        expect(options.bitDepth).toBe(16);
    });

    test('should create AudioCapture with callback', () => {
        const callback = jest.fn();
        const capture = new AudioCapture({
            processId: 0,
            callback: callback
        });
        expect(capture).toBeInstanceOf(AudioCapture);
    });

    test('should have all required methods', () => {
        const capture = new AudioCapture();
        expect(typeof capture.start).toBe('function');
        expect(typeof capture.stop).toBe('function');
        expect(typeof capture.pause).toBe('function');
        expect(typeof capture.resume).toBe('function');
        expect(typeof capture.isRunning).toBe('function');
        expect(typeof capture.isPaused).toBe('function');
        expect(typeof capture.getOptions).toBe('function');
    });
});

describe('AudioCapture - EventEmitter', () => {
    test('should be an EventEmitter', () => {
        const capture = new AudioCapture();
        expect(typeof capture.on).toBe('function');
        expect(typeof capture.once).toBe('function');
        expect(typeof capture.emit).toBe('function');
        expect(typeof capture.removeListener).toBe('function');
    });

    test('should support event listeners', () => {
        const capture = new AudioCapture();
        const dataListener = jest.fn();
        const errorListener = jest.fn();
        const startedListener = jest.fn();
        const stoppedListener = jest.fn();

        capture.on('data', dataListener);
        capture.on('error', errorListener);
        capture.on('started', startedListener);
        capture.on('stopped', stoppedListener);

        expect(capture.listenerCount('data')).toBe(1);
        expect(capture.listenerCount('error')).toBe(1);
        expect(capture.listenerCount('started')).toBe(1);
        expect(capture.listenerCount('stopped')).toBe(1);
    });
});

describe('AudioCapture - State Management', () => {
    test('should report correct initial state', () => {
        const capture = new AudioCapture();
        expect(capture.isRunning()).toBe(false);
        expect(capture.isPaused()).toBe(false);
    });

    test('should throw error when pausing before starting', () => {
        const capture = new AudioCapture();
        expect(() => capture.pause()).toThrow('AudioCapture is not running');
    });

    test('should throw error when resuming before starting', () => {
        const capture = new AudioCapture();
        expect(() => capture.resume()).toThrow('AudioCapture is not running');
    });
});
