/**
 * BufferPool - Buffer 对象池管理器
 * 
 * 通过复用 Buffer 对象减少内存分配和 GC 压力。
 * 支持多种预定义大小的 Buffer，适用于高频率音频处理场景。
 * 
 * 特性:
 * - 多尺寸池: 支持 4KB, 8KB, 16KB, 32KB
 * - 自动扩容: 池耗尽时自动创建新 Buffer
 * - 内存限制: 防止池无限增长
 * - 统计监控: 跟踪分配/回收/命中率
 * 
 * @module lib/buffer-pool
 */

class BufferPool {
  /**
   * 创建 Buffer 池
   * 
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.maxBuffersPerSize=50] - 每个尺寸的最大 Buffer 数量
   * @param {boolean} [options.enableStats=true] - 是否启用统计
   */
  constructor(options = {}) {
    this.maxBuffersPerSize = options.maxBuffersPerSize || 50;
    this.enableStats = options.enableStats !== false;
    
    // 预定义的 Buffer 尺寸 (字节)
    this.sizes = [
      4096,   // 4KB  - 小块音频数据
      8192,   // 8KB  - 标准音频包
      16384,  // 16KB - 大音频包
      32768   // 32KB - 批处理缓冲
    ];
    
    // 为每个尺寸创建独立的池
    this.pools = new Map();
    this.sizes.forEach(size => {
      this.pools.set(size, []);
    });
    
    // 统计信息
    this.stats = {
      allocated: 0,      // 总分配次数
      reused: 0,         // 复用次数
      created: 0,        // 新创建次数
      released: 0,       // 释放次数
      hits: 0,           // 命中次数
      misses: 0,         // 未命中次数
      currentPooled: 0   // 当前池中 Buffer 数量
    };
  }
  
  /**
   * 获取最接近指定大小的 Buffer
   * 
   * @param {number} size - 请求的 Buffer 大小
   * @returns {Buffer} Buffer 对象
   */
  acquire(size) {
    this.stats.allocated++;
    
    // 找到最小的足够大的尺寸
    const targetSize = this._findTargetSize(size);
    
    if (!targetSize) {
      // 请求大小超出预定义范围，直接分配
      this.stats.misses++;
      this.stats.created++;
      return Buffer.allocUnsafe(size);
    }
    
    const pool = this.pools.get(targetSize);
    
    if (pool.length > 0) {
      // 从池中获取
      this.stats.hits++;
      this.stats.reused++;
      this.stats.currentPooled--;
      return pool.pop();
    }
    
    // 池为空，创建新 Buffer
    this.stats.misses++;
    this.stats.created++;
    return Buffer.allocUnsafe(targetSize);
  }
  
  /**
   * 归还 Buffer 到池中
   * 
   * @param {Buffer} buffer - 要归还的 Buffer
   * @returns {boolean} 是否成功归还到池
   */
  release(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      return false;
    }
    
    this.stats.released++;
    
    const size = buffer.length;
    const pool = this.pools.get(size);
    
    if (!pool) {
      // 不在预定义尺寸范围内，让其被 GC 回收
      return false;
    }
    
    if (pool.length >= this.maxBuffersPerSize) {
      // 池已满，让其被 GC 回收
      return false;
    }
    
    // 清零 Buffer（安全考虑）
    buffer.fill(0);
    
    // 归还到池中
    pool.push(buffer);
    this.stats.currentPooled++;
    
    return true;
  }
  
  /**
   * 查找最小的满足需求的尺寸
   * @private
   */
  _findTargetSize(requestedSize) {
    for (const size of this.sizes) {
      if (size >= requestedSize) {
        return size;
      }
    }
    return null;
  }
  
  /**
   * 预热池（预先分配 Buffer）
   * 
   * @param {number} count - 每个尺寸预分配的数量
   */
  warmup(count = 10) {
    this.sizes.forEach(size => {
      const pool = this.pools.get(size);
      for (let i = 0; i < count; i++) {
        pool.push(Buffer.allocUnsafe(size));
        this.stats.created++;
        this.stats.currentPooled++;
      }
    });
    
    console.log(`[BufferPool] Warmed up with ${count} buffers per size`);
  }
  
  /**
   * 清空所有池
   */
  clear() {
    this.pools.forEach((pool, size) => {
      pool.length = 0;
    });
    this.stats.currentPooled = 0;
  }
  
  /**
   * 获取统计信息
   * 
   * @returns {Object} 统计对象
   */
  getStats() {
    const hitRate = this.stats.allocated > 0
      ? ((this.stats.hits / this.stats.allocated) * 100).toFixed(2)
      : '0.00';
    
    const reuseRate = this.stats.allocated > 0
      ? ((this.stats.reused / this.stats.allocated) * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      reuseRate: `${reuseRate}%`,
      poolSizes: this._getPoolSizes()
    };
  }
  
  /**
   * 获取每个池的当前大小
   * @private
   */
  _getPoolSizes() {
    const sizes = {};
    this.pools.forEach((pool, size) => {
      sizes[`${size}B`] = pool.length;
    });
    return sizes;
  }
  
  /**
   * 重置统计计数器
   */
  resetStats() {
    this.stats.allocated = 0;
    this.stats.reused = 0;
    this.stats.created = 0;
    this.stats.released = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    // 不重置 currentPooled
  }
  
  /**
   * 获取池配置信息
   * 
   * @returns {Object} 配置对象
   */
  getConfig() {
    return {
      sizes: this.sizes,
      maxBuffersPerSize: this.maxBuffersPerSize,
      enableStats: this.enableStats,
      totalCapacity: this.sizes.length * this.maxBuffersPerSize
    };
  }
  
  /**
   * 获取总内存占用估算 (MB)
   * 
   * @returns {number} 内存占用 (MB)
   */
  getMemoryUsage() {
    let totalBytes = 0;
    this.pools.forEach((pool, size) => {
      totalBytes += pool.length * size;
    });
    return (totalBytes / 1024 / 1024).toFixed(2);
  }
}

// 导出单例和类
const defaultPool = new BufferPool();

module.exports = BufferPool;
module.exports.default = defaultPool;
module.exports.BufferPool = BufferPool;

// ============================================================================
// 使用示例
// ============================================================================

if (require.main === module) {
  console.log('='.repeat(80));
  console.log('BufferPool 使用示例');
  console.log('='.repeat(80));
  
  const pool = new BufferPool({ maxBuffersPerSize: 20 });
  
  console.log('\n1. 预热池');
  pool.warmup(5);
  console.log('Pool config:', pool.getConfig());
  console.log('Pool sizes:', pool.getStats().poolSizes);
  
  console.log('\n2. 分配和释放 Buffer');
  const buffers = [];
  
  // 分配 10 个 8KB buffer
  for (let i = 0; i < 10; i++) {
    const buf = pool.acquire(8192);
    buffers.push(buf);
    console.log(`Allocated buffer ${i + 1}: ${buf.length} bytes`);
  }
  
  console.log('\n3. 查看统计信息');
  console.log('Stats:', pool.getStats());
  
  // 释放 buffer
  console.log('\n4. 释放 Buffer');
  buffers.forEach((buf, i) => {
    const released = pool.release(buf);
    console.log(`Released buffer ${i + 1}: ${released}`);
  });
  
  console.log('\n5. 最终统计');
  console.log('Stats:', pool.getStats());
  console.log('Memory usage:', pool.getMemoryUsage(), 'MB');
  
  console.log('\n6. 测试命中率');
  pool.resetStats();
  
  // 连续分配和释放
  for (let i = 0; i < 100; i++) {
    const buf = pool.acquire(8192);
    // 模拟使用
    buf[0] = i;
    pool.release(buf);
  }
  
  const stats = pool.getStats();
  console.log(`Allocated: ${stats.allocated}`);
  console.log(`Hit rate: ${stats.hitRate}`);
  console.log(`Reuse rate: ${stats.reuseRate}`);
  
  console.log('\n✅ 示例完成');
}
