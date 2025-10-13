/**
 * 性能和压力测试
 * 测试长时间运行、大量数据处理、内存使用
 */

const { AudioCapture } = require('../index');

describe('AudioCapture - Performance Tests', () => {
    let capture;

    afterEach(async () => {
        if (capture && capture.isRunning()) {
            await capture.stop();
        }
        capture = null;
    });

    test('should handle long-running capture (30 seconds)', async () => {
        capture = new AudioCapture({ processId: 0 });

        let packetCount = 0;
        let totalBytes = 0;
        const startTime = Date.now();

        capture.on('data', (event) => {
            packetCount++;
            totalBytes += event.length;
        });

        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 秒
        await capture.stop();

        const duration = (Date.now() - startTime) / 1000;

        expect(packetCount).toBeGreaterThan(1000); // 至少 1000 个包
        expect(totalBytes).toBeGreaterThan(1000000); // 至少 1 MB

        const packetsPerSecond = packetCount / duration;
        const bytesPerSecond = totalBytes / duration;

        console.log(`Performance (30s):
  - Packets: ${packetCount} (${packetsPerSecond.toFixed(2)}/s)
  - Bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${(bytesPerSecond / 1024).toFixed(2)} KB/s)
  - Duration: ${duration.toFixed(2)}s`);

        // 验证吞吐量在合理范围内
        expect(packetsPerSecond).toBeGreaterThan(20); // 至少 20 包/秒
        expect(packetsPerSecond).toBeLessThan(200); // 不超过 200 包/秒
    }, 35000); // 35 秒超时

    test('should handle rapid start/stop cycles', async () => {
        capture = new AudioCapture({ processId: 0 });

        for (let i = 0; i < 5; i++) {
            await capture.start();
            expect(capture.isRunning()).toBe(true);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await capture.stop();
            expect(capture.isRunning()).toBe(false);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('Completed 5 rapid start/stop cycles');
    }, 15000);

    test('should handle rapid pause/resume cycles', async () => {
        capture = new AudioCapture({ processId: 0 });

        await capture.start();

        for (let i = 0; i < 10; i++) {
            capture.pause();
            expect(capture.isPaused()).toBe(true);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            capture.resume();
            expect(capture.isPaused()).toBe(false);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await capture.stop();

        console.log('Completed 10 rapid pause/resume cycles');
    }, 10000);

    test('should not leak memory during extended capture', async () => {
        capture = new AudioCapture({ processId: 0 });

        const memoryBefore = process.memoryUsage();

        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 秒
        await capture.stop();

        // 强制垃圾回收（如果启用 --expose-gc）
        if (global.gc) {
            global.gc();
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const memoryAfter = process.memoryUsage();

        const heapGrowth = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;

        console.log(`Memory usage:
  - Before: ${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB
  - After: ${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB
  - Growth: ${heapGrowth.toFixed(2)} MB`);

        // 验证内存增长不超过 50 MB（宽松的限制）
        expect(heapGrowth).toBeLessThan(50);
    }, 15000);

    test('should maintain consistent data rate', async () => {
        capture = new AudioCapture({ processId: 0 });

        const dataRates = [];
        let lastPacketCount = 0;

        capture.on('data', () => {
            lastPacketCount++;
        });

        await capture.start();

        // 每秒记录数据率
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            dataRates.push(lastPacketCount);
            lastPacketCount = 0;
        }

        await capture.stop();

        // 计算数据率的标准差
        const mean = dataRates.reduce((a, b) => a + b, 0) / dataRates.length;
        const variance = dataRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / dataRates.length;
        const stdDev = Math.sqrt(variance);

        console.log(`Data rate consistency:
  - Rates: ${dataRates.join(', ')} packets/s
  - Mean: ${mean.toFixed(2)}
  - StdDev: ${stdDev.toFixed(2)}
  - CV: ${(stdDev / mean * 100).toFixed(2)}%`);

        // 验证变异系数小于 20%（表示稳定）
        expect(stdDev / mean).toBeLessThan(0.2);
    }, 10000);
});

describe('AudioCapture - Stress Tests', () => {
    test('should handle many event listeners', async () => {
        const capture = new AudioCapture({ processId: 0 });

        // 添加 100 个监听器
        const listeners = [];
        for (let i = 0; i < 100; i++) {
            const listener = jest.fn();
            listeners.push(listener);
            capture.on('data', listener);
        }

        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await capture.stop();

        // 验证所有监听器都被调用
        listeners.forEach(listener => {
            expect(listener).toHaveBeenCalled();
        });

        console.log(`Successfully handled 100 event listeners`);
    }, 10000);

    test('should handle buffer processing', async () => {
        const capture = new AudioCapture({ processId: 0 });

        const buffers = [];
        let droppedPackets = 0;

        capture.on('data', (event) => {
            // 模拟复杂的数据处理
            try {
                const buffer = event.buffer;
                const copy = Buffer.from(buffer);
                
                // 只保留最近 100 个缓冲区
                if (buffers.length < 100) {
                    buffers.push(copy);
                } else {
                    droppedPackets++;
                }
            } catch (error) {
                console.error('Buffer processing error:', error);
            }
        });

        await capture.start();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await capture.stop();

        expect(buffers.length).toBe(100);
        expect(droppedPackets).toBeGreaterThan(0);

        // 验证所有缓冲区都是有效的
        buffers.forEach(buffer => {
            expect(Buffer.isBuffer(buffer)).toBe(true);
            expect(buffer.length).toBeGreaterThan(0);
        });

        console.log(`Processed ${buffers.length} buffers, dropped ${droppedPackets} packets`);
    }, 10000);
});
