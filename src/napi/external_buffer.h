/**
 * External Buffer Helper for Zero-Copy Architecture
 * 
 * Purpose: Reduce GC pressure by sharing memory between C++ and JavaScript
 * instead of copying data via Buffer.from()
 * 
 * Target: Reduce allocation rate from 366 KB/s to ~36 KB/s (90%+ reduction)
 */

#ifndef EXTERNAL_BUFFER_H
#define EXTERNAL_BUFFER_H

#include <napi.h>
#include <memory>
#include <mutex>
#include <vector>
#include <atomic>

namespace AudioCapture {

// Forward declaration
class BufferPool;

/**
 * External Buffer Wrapper
 * 
 * Manages lifecycle of externally-allocated memory that can be
 * shared with JavaScript without copying.
 */
class ExternalBuffer {
public:
    ExternalBuffer(size_t size, BufferPool* pool = nullptr);
    ~ExternalBuffer();

    // Get raw data pointer
    void* data() { return data_; }
    size_t size() const { return size_; }

    // Create N-API value (zero-copy)
    Napi::Value ToBuffer(Napi::Env env);
    Napi::Value ToBuffer(Napi::Env env, size_t actual_size); // With custom size
    
    // NEW: Create N-API buffer from shared_ptr (proper ownership transfer)
    static Napi::Value ToBufferFromShared(Napi::Env env, std::shared_ptr<ExternalBuffer> buffer, size_t actual_size);

    // Reference counting for safety
    void AddRef();
    void Release();
    int RefCount() const { return ref_count_.load(); }

private:
    void* data_;
    size_t size_;
    std::atomic<int> ref_count_;
    BufferPool* pool_; // Pool to return to when released
};

/**
 * v2.7: Pool Adjustment Strategy
 */
enum class PoolStrategy {
    Fixed,      // Fixed pool size (original behavior)
    Adaptive    // v2.7: Dynamically adjust pool size based on usage
};

/**
 * Buffer Pool
 * 
 * Pre-allocates a fixed number of buffers for high-frequency allocations.
 * Falls back to dynamic allocation when pool is exhausted.
 * 
 * v2.7: Supports adaptive pool sizing to optimize hit rate (target: 2-5%)
 */
class BufferPool {
public:
    BufferPool(size_t buffer_size, size_t pool_size);
    ~BufferPool();

    // Acquire a buffer (from pool or allocate new)
    std::shared_ptr<ExternalBuffer> Acquire();

    // Return buffer to pool (called by finalize callback)
    void Release(ExternalBuffer* buffer);

    // Statistics
    struct Stats {
        uint64_t pool_hits;
        uint64_t pool_misses;
        uint64_t dynamic_allocations;
        size_t current_pool_size;
        size_t max_pool_size;
        double hit_rate;  // NEW: Calculated hit rate percentage
    };

    Stats GetStats() const;
    void ResetStats();

    // v2.7: Adaptive pool management
    void SetStrategy(PoolStrategy strategy) { strategy_ = strategy; }
    void SetMinMaxPoolSize(size_t min_size, size_t max_size);
    void EvaluateAndAdjust(); // Periodic evaluation (called every 10s)

private:
    void AdjustPoolSize(); // Internal: grow or shrink pool based on stats
    
    size_t buffer_size_;
    size_t pool_size_;        // Current target pool size
    size_t min_pool_size_;    // v2.7: Minimum pool size (default: 10)
    size_t max_pool_size_;    // v2.7: Maximum pool size (default: 200)
    PoolStrategy strategy_;   // v2.7: Adjustment strategy

    std::vector<std::shared_ptr<ExternalBuffer>> available_buffers_;
    mutable std::mutex pool_mutex_;

    // Statistics
    mutable std::atomic<uint64_t> pool_hits_{0};
    mutable std::atomic<uint64_t> pool_misses_{0};
    mutable std::atomic<uint64_t> dynamic_allocations_{0};
    
    // v2.7: Evaluation tracking
    uint64_t last_eval_hits_{0};
    uint64_t last_eval_misses_{0};
};

/**
 * External Buffer Factory
 * 
 * Singleton factory for creating external buffers with proper lifecycle management.
 * v2.7: Supports adaptive pool sizing for optimal performance
 */
class ExternalBufferFactory {
public:
    static ExternalBufferFactory& Instance();

    // Initialize with buffer pool
    void Initialize(size_t buffer_size = 4096, size_t pool_size = 10);
    
    // v2.7: Initialize with adaptive strategy
    void InitializeAdaptive(size_t buffer_size = 4096, 
                           size_t initial_pool_size = 50,
                           size_t min_pool_size = 50,
                           size_t max_pool_size = 200);

    // Create external buffer (using pool if available)
    std::shared_ptr<ExternalBuffer> Create();

    // Get buffer pool statistics
    BufferPool::Stats GetStats() const;
    
    // v2.7: Trigger pool evaluation (call periodically, e.g. every 10s)
    void EvaluatePool();

    // Cleanup (called on module unload)
    void Cleanup();

private:
    ExternalBufferFactory() = default;
    ~ExternalBufferFactory() = default;

    std::unique_ptr<BufferPool> buffer_pool_;
    mutable std::mutex factory_mutex_;
};

} // namespace AudioCapture

#endif // EXTERNAL_BUFFER_H
