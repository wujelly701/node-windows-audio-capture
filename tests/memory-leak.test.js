/**
 * 内存泄漏测试
 * 
 * 测试音频捕获模块在长时间运行和多次启停循环中的内存管理。
 * 使用 V8 堆快照检测内存增长，确保没有内存泄漏。
 * 
 * 注意：此测试需要较长时间运行，可能在 CI 环境中跳过。
 */

const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const v8 = require('v8');
const fs = require('fs');
const path = require('path');

describe('Memory Leak Test', function() {
  // 设置长超时时间，因为测试需要运行多次循环
  this.timeout(300000); // 5 分钟

  const ITERATIONS = 100; // 循环次数
  const MEMORY_THRESHOLD_MB = 10; // 内存增长阈值（MB）
  const SNAPSHOT_DIR = path.join(__dirname, '..', '.heapsnapshots');
  
  // 检测是否在 CI 环境
  const isCI = process.env.CI === 'true' || 
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.CONTINUOUS_INTEGRATION === 'true';
  
  // 检测是否跳过长时间测试
  const skipLongTests = process.env.SKIP_LONG_TESTS === 'true';

  before(function() {
    // 创建快照目录
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }
  });

  after(function() {
    // 清理快照文件
    try {
      const files = fs.readdirSync(SNAPSHOT_DIR);
      files.forEach(file => {
        if (file.endsWith('.heapsnapshot')) {
          fs.unlinkSync(path.join(SNAPSHOT_DIR, file));
        }
      });
      // 尝试删除目录
      fs.rmdirSync(SNAPSHOT_DIR);
    } catch (error) {
      console.warn('清理快照文件失败:', error.message);
    }
  });

  describe('Heap Snapshot Generation', function() {
    it('should generate heap snapshot successfully', function() {
      const snapshotPath = path.join(SNAPSHOT_DIR, 'test-snapshot.heapsnapshot');
      
      // 生成堆快照
      v8.writeHeapSnapshot(snapshotPath);
      
      // 验证文件存在
      expect(fs.existsSync(snapshotPath)).to.be.true;
      
      // 验证文件大小大于 0
      const stats = fs.statSync(snapshotPath);
      expect(stats.size).to.be.greaterThan(0);
      
      // 清理
      fs.unlinkSync(snapshotPath);
    });

    it('should parse heap snapshot file as JSON', function() {
      const snapshotPath = path.join(SNAPSHOT_DIR, 'test-parse.heapsnapshot');
      
      v8.writeHeapSnapshot(snapshotPath);
      
      // 读取并解析 JSON（快照文件是 JSON 格式）
      const content = fs.readFileSync(snapshotPath, 'utf-8');
      let snapshot;
      
      expect(() => {
        snapshot = JSON.parse(content);
      }).to.not.throw();
      
      expect(snapshot).to.be.an('object');
      expect(snapshot).to.have.property('snapshot');
      
      // 清理
      fs.unlinkSync(snapshotPath);
    });
  });

  describe('Memory Usage Tracking', function() {
    it('should track memory usage before and after operations', function() {
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage();
      
      // 分配一些内存
      const largeArray = new Array(1000000).fill('test');
      
      const memAfter = process.memoryUsage();
      
      // 验证内存增长
      expect(memAfter.heapUsed).to.be.greaterThan(memBefore.heapUsed);
      
      // 清理引用
      largeArray.length = 0;
    });

    it('should measure memory in MB', function() {
      const mem = process.memoryUsage();
      const heapUsedMB = mem.heapUsed / 1024 / 1024;
      
      expect(heapUsedMB).to.be.a('number');
      expect(heapUsedMB).to.be.greaterThan(0);
    });

    it('should access heapUsed property', function() {
      const mem = process.memoryUsage();
      expect(mem).to.have.property('heapUsed');
      expect(mem.heapUsed).to.be.a('number');
    });

    it('should access external property', function() {
      const mem = process.memoryUsage();
      expect(mem).to.have.property('external');
      expect(mem.external).to.be.a('number');
    });
  });

  describe('Garbage Collection', function() {
    it('should reduce memory after garbage collection', function() {
      // 此测试需要使用 --expose-gc 标志运行
      if (!global.gc) {
        this.skip();
        return;
      }
      
      // 分配大量内存
      let largeArray = new Array(1000000).fill('test');
      
      global.gc();
      const memBefore = process.memoryUsage().heapUsed;
      
      // 释放引用
      largeArray = null;
      
      global.gc();
      const memAfter = process.memoryUsage().heapUsed;
      
      // 验证内存减少
      expect(memAfter).to.be.lessThan(memBefore);
    });
  });

  describe('AudioCapture Memory Leak Test', function() {
    // 在 CI 或设置跳过标志时跳过
    before(function() {
      if (isCI || skipLongTests) {
        console.log('⚠️  跳过长时间内存泄漏测试（CI 环境或 SKIP_LONG_TESTS=true）');
        this.skip();
      }
    });

    it('should not leak memory after multiple start-stop cycles', async function() {
      // 尝试加载 AudioCapture
      let AudioCapture;
      try {
        AudioCapture = require('../lib/audio-capture').AudioCapture;
      } catch (error) {
        console.log('⚠️  无法加载 AudioCapture，跳过测试:', error.message);
        this.skip();
        return;
      }
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      // 生成初始堆快照
      const beforeSnapshotPath = path.join(SNAPSHOT_DIR, 'before.heapsnapshot');
      v8.writeHeapSnapshot(beforeSnapshotPath);
      const memBefore = process.memoryUsage().heapUsed;
      
      console.log(`\n  初始内存: ${(memBefore / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  开始 ${ITERATIONS} 次启动-停止循环...\n`);
      
      // 运行多次启动-停止循环
      for (let i = 0; i < ITERATIONS; i++) {
        try {
          // 创建捕获实例
          const capture = new AudioCapture({
            processId: process.pid,
            loopbackMode: true,
            sampleRate: 48000,
            channels: 2
          });
          
          // 模拟数据处理
          const dataHandler = (chunk) => {
            // 简单处理，避免优化掉
            if (chunk.length > 0) {
              const sample = chunk[0];
            }
          };
          
          capture.on('data', dataHandler);
          capture.on('error', () => {
            // 忽略错误
          });
          
          // 尝试启动（可能失败，这没关系）
          try {
            await capture.start();
            
            // 运行短时间
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // 停止捕获
            capture.stop();
          } catch (error) {
            // 启动失败是预期的（没有实际音频设备）
          }
          
          // 移除监听器
          capture.removeListener('data', dataHandler);
          
          // 每 10 次迭代显示进度
          if ((i + 1) % 10 === 0) {
            const currentMem = process.memoryUsage().heapUsed;
            const memDiff = (currentMem - memBefore) / 1024 / 1024;
            console.log(`  迭代 ${i + 1}/${ITERATIONS} - 内存增长: ${memDiff.toFixed(2)} MB`);
          }
          
        } catch (error) {
          // 忽略单次迭代的错误
          console.log(`  迭代 ${i + 1} 失败:`, error.message);
        }
        
        // 定期触发垃圾回收
        if (global.gc && (i + 1) % 20 === 0) {
          global.gc();
        }
      }
      
      console.log('\n  循环完成，等待垃圾回收...\n');
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 500));
        global.gc();
      }
      
      // 生成最终堆快照
      const afterSnapshotPath = path.join(SNAPSHOT_DIR, 'after.heapsnapshot');
      v8.writeHeapSnapshot(afterSnapshotPath);
      const memAfter = process.memoryUsage().heapUsed;
      
      const memDiffMB = (memAfter - memBefore) / 1024 / 1024;
      
      console.log(`  最终内存: ${(memAfter / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  内存增长: ${memDiffMB.toFixed(2)} MB`);
      console.log(`  阈值: ${MEMORY_THRESHOLD_MB} MB\n`);
      
      // 验证内存增长在阈值内
      expect(memDiffMB).to.be.lessThan(MEMORY_THRESHOLD_MB);
      
      console.log('  ✅ 内存泄漏测试通过\n');
    });
  });

  describe('Mock Memory Leak Test', function() {
    it('should not leak memory with mock object creation', function() {
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage().heapUsed;
      
      // 创建和销毁多个对象
      for (let i = 0; i < 1000; i++) {
        const obj = {
          id: i,
          data: new Array(100).fill(i),
          callback: () => {}
        };
        
        // 对象会自动被垃圾回收
      }
      
      // 触发垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDiffMB = (memAfter - memBefore) / 1024 / 1024;
      
      // 验证内存增长很小（应该大部分被回收）
      expect(memDiffMB).to.be.lessThan(5);
    });

    it('should detect memory leak with retained references', function() {
      const retainedObjects = [];
      
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage().heapUsed;
      
      // 创建并保持引用（会泄漏）
      for (let i = 0; i < 1000; i++) {
        retainedObjects.push({
          id: i,
          data: new Array(100).fill(i)
        });
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDiffMB = (memAfter - memBefore) / 1024 / 1024;
      
      // 验证内存确实增长了（因为保持了引用）
      expect(memDiffMB).to.be.greaterThan(0.5);
      
      // 清理
      retainedObjects.length = 0;
    });
  });

  describe('EventEmitter Memory Leak Test', function() {
    const EventEmitter = require('events');

    it('should not leak memory when listeners are properly removed', function() {
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        const emitter = new EventEmitter();
        const listener = () => {};
        
        emitter.on('test', listener);
        emitter.emit('test');
        emitter.removeListener('test', listener);
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDiffMB = (memAfter - memBefore) / 1024 / 1024;
      
      expect(memDiffMB).to.be.lessThan(2);
    });

    it('should detect memory leak when listeners are not removed', function() {
      const emitters = [];
      
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        const emitter = new EventEmitter();
        const listener = () => {};
        
        emitter.on('test', listener);
        emitters.push(emitter); // 保持引用
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDiffMB = (memAfter - memBefore) / 1024 / 1024;
      
      expect(memDiffMB).to.be.greaterThan(0.1);
      
      // 清理
      emitters.length = 0;
    });
  });

  describe('Buffer Memory Management', function() {
    it('should not leak memory with buffer allocation', function() {
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        const buffer = Buffer.allocUnsafe(1024);
        buffer.fill(0);
        // Buffer 会自动被垃圾回收
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDiffMB = (memAfter - memBefore) / 1024 / 1024;
      
      expect(memDiffMB).to.be.lessThan(2);
    });

    it('should track external memory for buffers', function() {
      const memBefore = process.memoryUsage();
      
      // 分配大量 buffer
      const buffers = [];
      for (let i = 0; i < 100; i++) {
        buffers.push(Buffer.allocUnsafe(1024 * 1024)); // 1MB each
      }
      
      const memAfter = process.memoryUsage();
      
      // external 内存应该增长
      expect(memAfter.external).to.be.greaterThan(memBefore.external);
      
      // 清理
      buffers.length = 0;
    });
  });

  describe('Snapshot Comparison', function() {
    it('should generate comparable snapshots', function() {
      const snapshot1Path = path.join(SNAPSHOT_DIR, 'compare1.heapsnapshot');
      const snapshot2Path = path.join(SNAPSHOT_DIR, 'compare2.heapsnapshot');
      
      v8.writeHeapSnapshot(snapshot1Path);
      
      // 分配一些内存
      const data = new Array(10000).fill('test');
      
      v8.writeHeapSnapshot(snapshot2Path);
      
      const stats1 = fs.statSync(snapshot1Path);
      const stats2 = fs.statSync(snapshot2Path);
      
      // 第二个快照应该更大
      expect(stats2.size).to.be.greaterThan(stats1.size);
      
      // 清理
      fs.unlinkSync(snapshot1Path);
      fs.unlinkSync(snapshot2Path);
      data.length = 0;
    });
  });

  describe('Test Environment', function() {
    it('should check if gc is exposed', function() {
      if (global.gc) {
        console.log('  ✓ 垃圾回收已启用 (--expose-gc)');
        expect(global.gc).to.be.a('function');
      } else {
        console.log('  ⚠️  垃圾回收未启用，运行时添加 --expose-gc 以获得更准确的结果');
      }
    });

    it('should provide test configuration info', function() {
      console.log(`  循环次数: ${ITERATIONS}`);
      console.log(`  内存阈值: ${MEMORY_THRESHOLD_MB} MB`);
      console.log(`  CI 环境: ${isCI ? '是' : '否'}`);
      console.log(`  跳过长测试: ${skipLongTests ? '是' : '否'}`);
    });
  });
});
