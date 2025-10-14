/**
 * BufferPool 单元测试
 */

const BufferPool = require('../lib/buffer-pool');

describe('BufferPool', () => {
  describe('Constructor', () => {
    test('should create with default options', () => {
      const pool = new BufferPool();
      
      expect(pool.maxBuffersPerSize).toBe(50);
      expect(pool.enableStats).toBe(true);
      expect(pool.sizes).toEqual([4096, 8192, 16384, 32768]);
    });
    
    test('should create with custom options', () => {
      const pool = new BufferPool({ 
        maxBuffersPerSize: 20,
        enableStats: false 
      });
      
      expect(pool.maxBuffersPerSize).toBe(20);
      expect(pool.enableStats).toBe(false);
    });
    
    test('should initialize pools for all sizes', () => {
      const pool = new BufferPool();
      
      expect(pool.pools.size).toBe(4);
      expect(pool.pools.has(4096)).toBe(true);
      expect(pool.pools.has(8192)).toBe(true);
      expect(pool.pools.has(16384)).toBe(true);
      expect(pool.pools.has(32768)).toBe(true);
    });
  });
  
  describe('acquire()', () => {
    test('should allocate buffer for standard size', () => {
      const pool = new BufferPool();
      const buffer = pool.acquire(8192);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(8192);
    });
    
    test('should allocate smallest sufficient size', () => {
      const pool = new BufferPool();
      
      const buf1 = pool.acquire(5000);  // Should get 8192
      const buf2 = pool.acquire(10000); // Should get 16384
      
      expect(buf1.length).toBe(8192);
      expect(buf2.length).toBe(16384);
    });
    
    test('should allocate exact size for oversized request', () => {
      const pool = new BufferPool();
      const buffer = pool.acquire(100000);
      
      expect(buffer.length).toBe(100000);
    });
    
    test('should update statistics on acquire', () => {
      const pool = new BufferPool();
      
      pool.acquire(8192);
      pool.acquire(8192);
      
      const stats = pool.getStats();
      expect(stats.allocated).toBe(2);
      expect(stats.created).toBe(2);
    });
  });
  
  describe('release()', () => {
    test('should accept buffer back to pool', () => {
      const pool = new BufferPool();
      const buffer = pool.acquire(8192);
      
      const released = pool.release(buffer);
      
      expect(released).toBe(true);
      expect(pool.stats.released).toBe(1);
      expect(pool.stats.currentPooled).toBe(1);
    });
    
    test('should reject non-buffer objects', () => {
      const pool = new BufferPool();
      
      expect(pool.release(null)).toBe(false);
      expect(pool.release({})).toBe(false);
      expect(pool.release('string')).toBe(false);
    });
    
    test('should reject buffer when pool is full', () => {
      const pool = new BufferPool({ maxBuffersPerSize: 2 });
      
      const buf1 = pool.acquire(8192);
      const buf2 = pool.acquire(8192);
      const buf3 = pool.acquire(8192);
      
      expect(pool.release(buf1)).toBe(true);
      expect(pool.release(buf2)).toBe(true);
      expect(pool.release(buf3)).toBe(false); // Pool full
    });
    
    test('should clear buffer on release', () => {
      const pool = new BufferPool();
      const buffer = pool.acquire(8192);
      
      buffer[0] = 123;
      buffer[100] = 456;
      
      pool.release(buffer);
      
      expect(buffer[0]).toBe(0);
      expect(buffer[100]).toBe(0);
    });
  });
  
  describe('Buffer Reuse', () => {
    test('should reuse released buffers', () => {
      const pool = new BufferPool();
      
      const buf1 = pool.acquire(8192);
      pool.release(buf1);
      
      pool.resetStats();
      const buf2 = pool.acquire(8192);
      
      const stats = pool.getStats();
      expect(stats.reused).toBe(1);
      expect(stats.created).toBe(0);
      expect(buf2).toBe(buf1); // Same buffer
    });
    
    test('should track hit rate correctly', () => {
      const pool = new BufferPool();
      pool.warmup(5);
      pool.resetStats();
      
      // Acquire and release 10 times
      for (let i = 0; i < 10; i++) {
        const buf = pool.acquire(8192);
        pool.release(buf);
      }
      
      const stats = pool.getStats();
      expect(parseFloat(stats.hitRate)).toBeGreaterThan(50);
    });
  });
  
  describe('warmup()', () => {
    test('should pre-allocate buffers', () => {
      const pool = new BufferPool();
      pool.warmup(10);
      
      const stats = pool.getStats();
      expect(stats.created).toBe(40); // 4 sizes * 10
      expect(stats.currentPooled).toBe(40);
    });
    
    test('should improve hit rate after warmup', () => {
      const pool = new BufferPool();
      pool.warmup(5);
      pool.resetStats();
      
      // All these should hit
      for (let i = 0; i < 20; i++) {
        const buf = pool.acquire(8192);
        pool.release(buf);
      }
      
      const stats = pool.getStats();
      expect(parseFloat(stats.hitRate)).toBe(100);
    });
  });
  
  describe('clear()', () => {
    test('should empty all pools', () => {
      const pool = new BufferPool();
      pool.warmup(10);
      
      pool.clear();
      
      expect(pool.stats.currentPooled).toBe(0);
      pool.pools.forEach(p => {
        expect(p.length).toBe(0);
      });
    });
  });
  
  describe('getStats()', () => {
    test('should return all statistics', () => {
      const pool = new BufferPool();
      pool.acquire(8192);
      
      const stats = pool.getStats();
      
      expect(stats).toHaveProperty('allocated');
      expect(stats).toHaveProperty('reused');
      expect(stats).toHaveProperty('created');
      expect(stats).toHaveProperty('released');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('reuseRate');
      expect(stats).toHaveProperty('poolSizes');
    });
    
    test('should calculate rates correctly', () => {
      const pool = new BufferPool();
      pool.warmup(5);
      pool.resetStats();
      
      // 10 hits
      for (let i = 0; i < 10; i++) {
        const buf = pool.acquire(8192);
        pool.release(buf);
      }
      
      const stats = pool.getStats();
      expect(stats.hitRate).toBe('100.00%');
      expect(stats.reuseRate).toBe('100.00%');
    });
  });
  
  describe('getConfig()', () => {
    test('should return configuration', () => {
      const pool = new BufferPool({ maxBuffersPerSize: 30 });
      const config = pool.getConfig();
      
      expect(config.sizes).toEqual([4096, 8192, 16384, 32768]);
      expect(config.maxBuffersPerSize).toBe(30);
      expect(config.totalCapacity).toBe(120); // 4 * 30
    });
  });
  
  describe('getMemoryUsage()', () => {
    test('should calculate memory usage', () => {
      const pool = new BufferPool();
      pool.warmup(10);
      
      const usage = parseFloat(pool.getMemoryUsage());
      
      // 4 sizes * 10 buffers * avg size ≈ 0.6MB
      expect(usage).toBeGreaterThan(0);
      expect(usage).toBeLessThan(1);
    });
    
    test('should return 0 for empty pool', () => {
      const pool = new BufferPool();
      
      const usage = parseFloat(pool.getMemoryUsage());
      expect(usage).toBe(0);
    });
  });
  
  describe('Performance', () => {
    test('should handle high allocation rate', () => {
      const pool = new BufferPool();
      pool.warmup(20);
      
      const startTime = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        const buf = pool.acquire(8192);
        pool.release(buf);
      }
      
      const elapsedMs = Date.now() - startTime;
      
      // Should complete in less than 100ms
      expect(elapsedMs).toBeLessThan(100);
    });
    
    test('should maintain high hit rate under load', () => {
      const pool = new BufferPool();
      pool.warmup(10);
      pool.resetStats();
      
      for (let i = 0; i < 1000; i++) {
        const buf = pool.acquire(8192);
        pool.release(buf);
      }
      
      const stats = pool.getStats();
      expect(parseFloat(stats.hitRate)).toBeGreaterThan(99);
    });
  });
  
  describe('Memory Safety', () => {
    test('should not exceed max buffers per size', () => {
      const pool = new BufferPool({ maxBuffersPerSize: 5 });
      
      // Allocate and release 10 buffers
      for (let i = 0; i < 10; i++) {
        const buf = pool.acquire(8192);
        pool.release(buf);
      }
      
      const poolSize = pool.pools.get(8192).length;
      expect(poolSize).toBeLessThanOrEqual(5);
    });
    
    test('should handle concurrent operations', () => {
      const pool = new BufferPool();
      pool.warmup(10);
      
      const buffers = [];
      
      // Allocate many
      for (let i = 0; i < 100; i++) {
        buffers.push(pool.acquire(8192));
      }
      
      // Release all
      buffers.forEach(buf => pool.release(buf));
      
      // Pool should not be oversized
      const poolSize = pool.pools.get(8192).length;
      expect(poolSize).toBeLessThanOrEqual(pool.maxBuffersPerSize);
    });
  });
});
