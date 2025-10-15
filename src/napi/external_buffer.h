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
 * Buffer Pool
 * 
 * Pre-allocates a fixed number of buffers for high-frequency allocations.
 * Falls back to dynamic allocation when pool is exhausted.
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
    };

    Stats GetStats() const;
    void ResetStats();

private:
    size_t buffer_size_;
    size_t pool_size_;

    std::vector<std::shared_ptr<ExternalBuffer>> available_buffers_;
    mutable std::mutex pool_mutex_;

    // Statistics
    mutable std::atomic<uint64_t> pool_hits_{0};
    mutable std::atomic<uint64_t> pool_misses_{0};
    mutable std::atomic<uint64_t> dynamic_allocations_{0};
};

/**
 * External Buffer Factory
 * 
 * Singleton factory for creating external buffers with proper lifecycle management.
 */
class ExternalBufferFactory {
public:
    static ExternalBufferFactory& Instance();

    // Initialize with buffer pool
    void Initialize(size_t buffer_size = 4096, size_t pool_size = 10);

    // Create external buffer (using pool if available)
    std::shared_ptr<ExternalBuffer> Create();

    // Get buffer pool statistics
    BufferPool::Stats GetStats() const;

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
