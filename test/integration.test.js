/**
 * 音频捕获集成测试
 * 测试完整的 start -> capture -> stop 流程
 */

const { AudioCapture, getDeviceInfo } = require('../index');

describe('AudioCapture - Integration Tests', () => {
    let capture;

    beforeEach(() => {
        capture = null;
    });

    afterEach(async () => {
        if (capture && capture.isRunning()) {
            await capture.stop();
        }
        capture = null;
    });

    test('should start and stop capture successfully', async () => {
        capture = new AudioCapture({ processId: 0 });

        const startedListener = jest.fn();
        const stoppedListener = jest.fn();
        
        capture.on('started', startedListener);
        capture.on('stopped', stoppedListener);

        await capture.start();
        expect(capture.isRunning()).toBe(true);
        expect(startedListener).toHaveBeenCalledTimes(1);

        await capture.stop();
        expect(capture.isRunning()).toBe(false);
        expect(stoppedListener).toHaveBeenCalledTimes(1);
    });

    test('should capture audio data', async () => {
        capture = new AudioCapture({ processId: 0 });

        const dataListener = jest.fn();
        capture.on('data', dataListener);

        await capture.start();
        
        // 等待 3 秒捕获数据
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await capture.stop();

        // 验证数据格式（如果有数据的话）
        if (dataListener.mock.calls.length > 0) {
            const firstCall = dataListener.mock.calls[0];
            expect(firstCall[0]).toHaveProperty('buffer');
            expect(firstCall[0]).toHaveProperty('length');
            expect(firstCall[0]).toHaveProperty('timestamp');
            expect(Buffer.isBuffer(firstCall[0].buffer)).toBe(true);
            expect(firstCall[0].length).toBeGreaterThan(0);
            console.log(`✅ Captured ${dataListener.mock.calls.length} audio packets`);
        } else {
            console.log('⚠️  No audio data captured (system may be silent)');
        }

        // 至少应该能成功启动和停止
        expect(capture.isRunning()).toBe(false);
    }, 10000); // 10 秒超时

    test('should handle pause and resume', async () => {
        capture = new AudioCapture({ processId: 0 });

        const dataListener = jest.fn();
        const pausedListener = jest.fn();
        const resumedListener = jest.fn();

        capture.on('data', dataListener);
        capture.on('paused', pausedListener);
        capture.on('resumed', resumedListener);

        await capture.start();
        
        // 捕获 1 秒
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dataCountBeforePause = dataListener.mock.calls.length;

        // 暂停
        capture.pause();
        expect(capture.isPaused()).toBe(true);
        expect(pausedListener).toHaveBeenCalledTimes(1);

        // 暂停期间等待 1 秒
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dataCountDuringPause = dataListener.mock.calls.length;

        // 验证暂停期间没有新数据（或很少）
        // 注意：如果系统没有音频，这个测试会跳过
        if (dataCountBeforePause > 0) {
            expect(dataCountDuringPause - dataCountBeforePause).toBeLessThan(10);
        }

        // 恢复
        capture.resume();
        expect(capture.isPaused()).toBe(false);
        expect(resumedListener).toHaveBeenCalledTimes(1);

        // 恢复后捕获 1 秒
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dataCountAfterResume = dataListener.mock.calls.length;

        if (dataCountBeforePause > 0) {
            // 只在有音频数据时验证
            console.log(`Pause/Resume test: before=${dataCountBeforePause}, during=${dataCountDuringPause}, after=${dataCountAfterResume}`);
        } else {
            console.log('⚠️  No audio data for pause/resume test (system may be silent)');
        }

        await capture.stop();
    }, 10000);

    test('should not allow starting twice', async () => {
        capture = new AudioCapture({ processId: 0 });

        await capture.start();
        expect(capture.isRunning()).toBe(true);

        // 尝试再次启动应该抛出错误
        await expect(capture.start()).rejects.toThrow('AudioCapture is already running');

        await capture.stop();
    }, 10000);

    test('should handle errors gracefully', async () => {
        capture = new AudioCapture({ processId: 0 });

        const errorListener = jest.fn();
        capture.on('error', errorListener);

        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await capture.stop();

        // 在正常操作中不应该有错误
        expect(errorListener).not.toHaveBeenCalled();
    }, 10000);

    test('should calculate audio data statistics', async () => {
        capture = new AudioCapture({ processId: 0 });

        let totalBytes = 0;
        let packetCount = 0;

        capture.on('data', (event) => {
            totalBytes += event.length;
            packetCount++;
        });

        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await capture.stop();

        expect(packetCount).toBeGreaterThan(0);
        expect(totalBytes).toBeGreaterThan(0);

        const avgPacketSize = totalBytes / packetCount;
        
        // 验证平均包大小在合理范围内（典型值 ~3500 字节）
        expect(avgPacketSize).toBeGreaterThan(1000);
        expect(avgPacketSize).toBeLessThan(10000);

        console.log(`Captured ${packetCount} packets, ${totalBytes} bytes, avg ${avgPacketSize.toFixed(2)} bytes/packet`);
    }, 10000);
});

describe('AudioCapture - Multiple Instances', () => {
    test('should support multiple capture instances', async () => {
        const capture1 = new AudioCapture({ processId: 0 });
        const capture2 = new AudioCapture({ processId: 0 });

        const data1 = jest.fn();
        const data2 = jest.fn();

        capture1.on('data', data1);
        capture2.on('data', data2);

        await capture1.start();
        await capture2.start();

        await new Promise(resolve => setTimeout(resolve, 2000));

        await capture1.stop();
        await capture2.stop();

        expect(data1).toHaveBeenCalled();
        expect(data2).toHaveBeenCalled();
    }, 10000);
});
