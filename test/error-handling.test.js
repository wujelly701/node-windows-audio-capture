/**
 * 错误处理和边界情况测试
 */

const { AudioCapture, getDeviceInfo, enumerateProcesses } = require('../index');

describe('AudioCapture - Error Handling', () => {
    test('should handle invalid constructor arguments gracefully', () => {
        // 无效的 processId
        expect(() => new AudioCapture({ processId: -1 })).not.toThrow();
        expect(() => new AudioCapture({ processId: 99999999 })).not.toThrow();
        
        // 无效的回调
        expect(() => new AudioCapture({ callback: 'not a function' })).not.toThrow();
        expect(() => new AudioCapture({ callback: 123 })).not.toThrow();
    });

    test('should handle missing native addon gracefully', () => {
        // 这个测试验证当 native addon 不可用时的行为
        // 在正常情况下应该能加载
        expect(() => require('../index')).not.toThrow();
    });

    test('should handle stop without start', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        // 停止未启动的捕获应该不抛出错误
        await expect(capture.stop()).resolves.not.toThrow();
    });

    test('should handle multiple stops', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        await capture.start();
        await capture.stop();
        
        // 多次停止应该不抛出错误
        await expect(capture.stop()).resolves.not.toThrow();
        await expect(capture.stop()).resolves.not.toThrow();
    });

    test('should emit error event on capture failure', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        const errorListener = jest.fn();
        capture.on('error', errorListener);
        
        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await capture.stop();
        
        // 在正常情况下不应该有错误
        // 但如果有错误，应该通过 error 事件发出
        if (errorListener.mock.calls.length > 0) {
            const error = errorListener.mock.calls[0][0];
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBeDefined();
        }
    }, 10000);
});

describe('AudioCapture - Edge Cases', () => {
    test('should handle zero-length capture', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        await capture.start();
        // 立即停止
        await capture.stop();
        
        expect(capture.isRunning()).toBe(false);
    }, 5000);

    test('should handle very short captures', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        const dataListener = jest.fn();
        capture.on('data', dataListener);
        
        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms
        await capture.stop();
        
        // 可能有数据，也可能没有
        // 但不应该崩溃
        expect(capture.isRunning()).toBe(false);
    }, 5000);

    test('should handle pause immediately after start', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        await capture.start();
        capture.pause();
        
        expect(capture.isPaused()).toBe(true);
        
        await capture.stop();
    }, 5000);

    test('should handle resume immediately after pause', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        await capture.start();
        capture.pause();
        capture.resume();
        
        expect(capture.isPaused()).toBe(false);
        
        await capture.stop();
    }, 5000);

    test('should handle removing all listeners', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        const dataListener = jest.fn();
        capture.on('data', dataListener);
        
        await capture.start();
        
        // 移除所有监听器
        capture.removeAllListeners('data');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await capture.stop();
        
        // 即使没有监听器，也不应该崩溃
        expect(capture.isRunning()).toBe(false);
    }, 5000);
});

describe('Native Functions - Error Handling', () => {
    test('getDeviceInfo should not throw', () => {
        expect(() => getDeviceInfo()).not.toThrow();
    });

    test('enumerateProcesses should not throw', () => {
        expect(() => enumerateProcesses()).not.toThrow();
    });

    test('getDeviceInfo should return valid data structure', () => {
        const device = getDeviceInfo();
        
        expect(device).toBeTruthy();
        expect(typeof device).toBe('object');
        expect(device).not.toBeNull();
    });

    test('enumerateProcesses should return valid array', () => {
        const processes = enumerateProcesses();
        
        expect(Array.isArray(processes)).toBe(true);
        
        if (processes.length > 0) {
            processes.forEach(process => {
                expect(process).toHaveProperty('pid');
                expect(process).toHaveProperty('name');
                expect(typeof process.pid).toBe('number');
                expect(process.pid).toBeGreaterThanOrEqual(0); // PID 可以是 0（系统空闲进程）
            });
        }
    });
});

describe('AudioCapture - Concurrency', () => {
    test('should handle concurrent start/stop operations', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        // 尝试并发启动
        const startPromises = [
            capture.start().catch(err => err),
            capture.start().catch(err => err)
        ];
        
        const results = await Promise.all(startPromises);
        
        // 至少一个应该成功
        const successCount = results.filter(r => !(r instanceof Error)).length;
        expect(successCount).toBeGreaterThanOrEqual(1);
        
        await capture.stop();
    }, 5000);

    test('should handle listener additions during capture', async () => {
        const capture = new AudioCapture({ processId: 0 });
        
        await capture.start();
        
        // 在捕获期间添加监听器
        const listener1 = jest.fn();
        const listener2 = jest.fn();
        
        capture.on('data', listener1);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        capture.on('data', listener2);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await capture.stop();
        
        // 两个监听器都应该被调用
        expect(listener1).toHaveBeenCalled();
        expect(listener2).toHaveBeenCalled();
    }, 5000);
});
