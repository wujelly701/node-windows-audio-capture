/**
 * External Buffer Implementation
 */

#include "external_buffer.h"
#include <cstring>
#include <stdexcept>

namespace AudioCapture {

// ============================================================================
// ExternalBuffer Implementation
// ============================================================================

ExternalBuffer::ExternalBuffer(size_t size, BufferPool* pool)
    : data_(nullptr), size_(size), ref_count_(1), pool_(pool) {
    
    if (size == 0) {
        throw std::invalid_argument("Buffer size must be > 0");
    }

    // Allocate aligned memory for better performance
    data_ = malloc(size);
    if (!data_) {
        throw std::bad_alloc();
    }

    // Zero-initialize for safety
    std::memset(data_, 0, size);
}

ExternalBuffer::~ExternalBuffer() {
    if (data_) {
        free(data_);
        data_ = nullptr;
    }
}

Napi::Value ExternalBuffer::ToBuffer(Napi::Env env) {
    // Create external buffer (zero-copy - shares C++ memory)
    // The finalizer will be called when V8 no longer needs the buffer
    
    AddRef(); // Increment ref count before passing to JavaScript
    
    // Use static finalize callback for proper cleanup
    auto finalizer = [](Napi::Env env, uint8_t* data, ExternalBuffer* hint) {
        // Called by V8 when buffer is garbage collected
        if (hint) {
            hint->Release(); // Decrement ref count, may delete buffer
        }
    };
    
    // Create external buffer with finalize callback
    auto buffer = Napi::Buffer<uint8_t>::New(
        env,
        static_cast<uint8_t*>(data_),
        size_,
        finalizer,
        this // hint passed to finalizer
    );
    
    return buffer;
}

Napi::Value ExternalBuffer::ToBuffer(Napi::Env env, size_t actual_size) {
    // Create external buffer with custom size (zero-copy - shares C++ memory)
    // Validate size
    if (actual_size > size_) {
        actual_size = size_; // Clamp to buffer size
    }
    
    AddRef(); // Increment ref count before passing to JavaScript
    
    // Use static finalize callback for proper cleanup
    auto finalizer = [](Napi::Env env, uint8_t* data, ExternalBuffer* hint) {
        // Called by V8 when buffer is garbage collected
        if (hint) {
            hint->Release(); // Decrement ref count, may delete buffer
        }
    };
    
    // Create external buffer with custom size and finalize callback
    auto buffer = Napi::Buffer<uint8_t>::New(
        env,
        static_cast<uint8_t*>(data_),
        actual_size,  // Use actual size instead of full buffer size
        finalizer,
        this // hint passed to finalizer
    );
    
    return buffer;
}

// Static method: Create buffer from shared_ptr (proper ownership transfer)
Napi::Value ExternalBuffer::ToBufferFromShared(Napi::Env env, std::shared_ptr<ExternalBuffer> buffer, size_t actual_size) {
    if (!buffer) {
        return env.Null();
    }
    
    // Validate size
    if (actual_size > buffer->size_) {
        actual_size = buffer->size_;
    }
    
    // Create a heap-allocated copy of shared_ptr to keep buffer alive
    // This shared_ptr will be deleted in the finalize callback
    auto* shared_ptr_copy = new std::shared_ptr<ExternalBuffer>(buffer);
    
    // Finalize callback that properly releases the shared_ptr
    auto finalizer = [](Napi::Env env, uint8_t* data, std::shared_ptr<ExternalBuffer>* hint) {
        // When V8 GC runs, release the shared_ptr
        // This may trigger buffer return to pool or deletion
        delete hint; // Destroys shared_ptr, decrements ref count
    };
    
    // Create N-API external buffer
    auto napi_buffer = Napi::Buffer<uint8_t>::New(
        env,
        static_cast<uint8_t*>(buffer->data_),
        actual_size,
        finalizer,
        shared_ptr_copy // Pass shared_ptr as hint
    );
    
    return napi_buffer;
}

void ExternalBuffer::AddRef() {
    ref_count_.fetch_add(1, std::memory_order_relaxed);
}

void ExternalBuffer::Release() {
    int old_count = ref_count_.fetch_sub(1, std::memory_order_release);
    if (old_count == 1) {
        // Last reference released
        if (pool_) {
            // Return to pool for reuse
            pool_->Release(this);
        } else {
            // No pool - just delete
            delete this;
        }
    }
}

// ============================================================================
// BufferPool Implementation
// ============================================================================

BufferPool::BufferPool(size_t buffer_size, size_t pool_size)
    : buffer_size_(buffer_size), 
      pool_size_(pool_size),
      min_pool_size_(pool_size),  // Default: same as initial
      max_pool_size_(pool_size),  // Default: same as initial (fixed)
      strategy_(PoolStrategy::Fixed) {  // Default: fixed strategy
    
    // Pre-allocate buffers
    available_buffers_.reserve(pool_size);
    
    for (size_t i = 0; i < pool_size; ++i) {
        try {
            auto buffer = std::make_shared<ExternalBuffer>(buffer_size, this);
            available_buffers_.push_back(buffer);
        } catch (const std::exception& e) {
            // Failed to pre-allocate - continue with smaller pool
            break;
        }
    }
}

BufferPool::~BufferPool() {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    available_buffers_.clear();
}

std::shared_ptr<ExternalBuffer> BufferPool::Acquire() {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    
    if (!available_buffers_.empty()) {
        // Pool hit - reuse existing buffer
        auto buffer = available_buffers_.back();
        available_buffers_.pop_back();
        
        pool_hits_.fetch_add(1, std::memory_order_relaxed);
        return buffer;
    }
    
    // Pool miss - allocate new buffer dynamically
    pool_misses_.fetch_add(1, std::memory_order_relaxed);
    dynamic_allocations_.fetch_add(1, std::memory_order_relaxed);
    
    try {
        return std::make_shared<ExternalBuffer>(buffer_size_, this);
    } catch (const std::exception& e) {
        // Allocation failed - return nullptr (caller must handle)
        return nullptr;
    }
}

void BufferPool::Release(ExternalBuffer* buffer) {
    if (!buffer) return;
    
    std::lock_guard<std::mutex> lock(pool_mutex_);
    
    // Return to pool if not full
    if (available_buffers_.size() < pool_size_) {
        // Reset buffer content for reuse (optional, for security)
        // std::memset(buffer->data(), 0, buffer->size());
        
        // CRITICAL FIX: Use a custom deleter that does NOTHING
        // The buffer should NOT be deleted when returned to pool
        // It will only be deleted when the pool itself is destroyed
        available_buffers_.push_back(std::shared_ptr<ExternalBuffer>(
            buffer,
            [](ExternalBuffer* ptr) {
                // NO-OP deleter: buffer is managed by pool, don't delete here
                // The buffer will be deleted in ~BufferPool()
            }
        ));
    } else {
        // Pool full - delete the buffer
        // This only happens for dynamically allocated buffers beyond pool size
        delete buffer;
    }
}

BufferPool::Stats BufferPool::GetStats() const {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    
    uint64_t hits = pool_hits_.load(std::memory_order_relaxed);
    uint64_t misses = pool_misses_.load(std::memory_order_relaxed);
    uint64_t total = hits + misses;
    
    // Calculate hit rate percentage
    double hit_rate = (total > 0) ? (static_cast<double>(hits) / total * 100.0) : 0.0;
    
    return Stats{
        hits,
        misses,
        dynamic_allocations_.load(std::memory_order_relaxed),
        available_buffers_.size(),
        pool_size_,
        hit_rate
    };
}

void BufferPool::ResetStats() {
    pool_hits_.store(0, std::memory_order_relaxed);
    pool_misses_.store(0, std::memory_order_relaxed);
    dynamic_allocations_.store(0, std::memory_order_relaxed);
}

// v2.7: Set adaptive pool size constraints
void BufferPool::SetMinMaxPoolSize(size_t min_size, size_t max_size) {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    
    if (min_size > max_size) {
        std::swap(min_size, max_size);
    }
    
    min_pool_size_ = min_size;
    max_pool_size_ = max_size;
    
    // Clamp current pool size to new constraints
    if (pool_size_ < min_pool_size_) {
        pool_size_ = min_pool_size_;
    } else if (pool_size_ > max_pool_size_) {
        pool_size_ = max_pool_size_;
    }
}

// v2.7: Evaluate pool performance and adjust size
void BufferPool::EvaluateAndAdjust() {
    if (strategy_ != PoolStrategy::Adaptive) {
        return; // Only adjust for adaptive strategy
    }
    
    std::lock_guard<std::mutex> lock(pool_mutex_);
    
    // Get current statistics
    uint64_t current_hits = pool_hits_.load(std::memory_order_relaxed);
    uint64_t current_misses = pool_misses_.load(std::memory_order_relaxed);
    
    // Calculate delta since last evaluation
    uint64_t delta_hits = current_hits - last_eval_hits_;
    uint64_t delta_misses = current_misses - last_eval_misses_;
    uint64_t delta_total = delta_hits + delta_misses;
    
    // Update last evaluation counters
    last_eval_hits_ = current_hits;
    last_eval_misses_ = current_misses;
    
    // Need sufficient data to make decision (at least 100 requests)
    if (delta_total < 100) {
        return; // Not enough data, skip adjustment
    }
    
    // Calculate hit rate for this period
    double period_hit_rate = static_cast<double>(delta_hits) / delta_total * 100.0;
    
    // Target: 2-5% hit rate
    // If hit rate < 2%: pool too small, grow it
    // If hit rate > 5%: pool might be too large, consider shrinking
    // If 2% <= hit rate <= 5%: optimal, no change
    
    size_t old_pool_size = pool_size_;
    
    if (period_hit_rate < 2.0 && pool_size_ < max_pool_size_) {
        // Hit rate too low - grow pool by 20%
        size_t growth = std::max<size_t>(10, pool_size_ / 5); // At least 10, or 20%
        pool_size_ = std::min(pool_size_ + growth, max_pool_size_);
        
        // Pre-allocate additional buffers
        AdjustPoolSize();
        
    } else if (period_hit_rate > 5.0 && pool_size_ > min_pool_size_) {
        // Hit rate too high - pool might be over-sized, shrink by 10%
        size_t shrink = std::max<size_t>(5, pool_size_ / 10); // At least 5, or 10%
        pool_size_ = std::max(pool_size_ - shrink, min_pool_size_);
        
        // Note: we don't actively delete buffers, just reduce target size
        // Excess buffers will naturally not be retained on Release()
    }
    
    // Log adjustment (optional, can be removed in production)
    if (old_pool_size != pool_size_) {
        // Pool size changed - could log here
        // printf("[BufferPool] Adjusted: %zu -> %zu (hit rate: %.2f%%)\n", 
        //        old_pool_size, pool_size_, period_hit_rate);
    }
}

// v2.7: Internal method to grow pool size
void BufferPool::AdjustPoolSize() {
    // Called with pool_mutex_ already locked
    
    size_t current_available = available_buffers_.size();
    size_t target_size = pool_size_;
    
    if (current_available < target_size) {
        // Need to pre-allocate more buffers
        size_t needed = target_size - current_available;
        available_buffers_.reserve(target_size);
        
        for (size_t i = 0; i < needed; ++i) {
            try {
                auto buffer = std::make_shared<ExternalBuffer>(buffer_size_, this);
                available_buffers_.push_back(buffer);
            } catch (const std::exception& e) {
                // Allocation failed - stop growing
                break;
            }
        }
    }
    // Note: shrinking happens naturally as buffers are not retained
    // when available_buffers_.size() >= pool_size_ in Release()
}

// ============================================================================
// ExternalBufferFactory Implementation
// ============================================================================

ExternalBufferFactory& ExternalBufferFactory::Instance() {
    static ExternalBufferFactory instance;
    return instance;
}

void ExternalBufferFactory::Initialize(size_t buffer_size, size_t pool_size) {
    std::lock_guard<std::mutex> lock(factory_mutex_);
    
    // v2.7: Allow re-initialization (cleanup old pool if exists)
    // This allows switching strategies between different AudioProcessor instances
    if (buffer_pool_) {
        buffer_pool_.reset();
    }
    
    buffer_pool_ = std::make_unique<BufferPool>(buffer_size, pool_size);
    buffer_pool_->SetStrategy(PoolStrategy::Fixed); // Fixed strategy
}

// v2.7: Initialize with adaptive strategy
void ExternalBufferFactory::InitializeAdaptive(size_t buffer_size, 
                                               size_t initial_pool_size,
                                               size_t min_pool_size,
                                               size_t max_pool_size) {
    std::lock_guard<std::mutex> lock(factory_mutex_);
    
    // v2.7: Allow re-initialization (cleanup old pool if exists)
    if (buffer_pool_) {
        buffer_pool_.reset();
    }
    
    buffer_pool_ = std::make_unique<BufferPool>(buffer_size, initial_pool_size);
    buffer_pool_->SetStrategy(PoolStrategy::Adaptive); // Adaptive strategy
    buffer_pool_->SetMinMaxPoolSize(min_pool_size, max_pool_size);
}

std::shared_ptr<ExternalBuffer> ExternalBufferFactory::Create() {
    std::lock_guard<std::mutex> lock(factory_mutex_);
    
    if (!buffer_pool_) {
        // Not initialized - create default pool
        Initialize();
    }
    
    return buffer_pool_->Acquire();
}

BufferPool::Stats ExternalBufferFactory::GetStats() const {
    std::lock_guard<std::mutex> lock(factory_mutex_);
    
    if (buffer_pool_) {
        return buffer_pool_->GetStats();
    }
    
    return BufferPool::Stats{0, 0, 0, 0, 0, 0.0};
}

// v2.7: Trigger periodic pool evaluation
void ExternalBufferFactory::EvaluatePool() {
    std::lock_guard<std::mutex> lock(factory_mutex_);
    
    if (buffer_pool_) {
        buffer_pool_->EvaluateAndAdjust();
    }
}

void ExternalBufferFactory::Cleanup() {
    std::lock_guard<std::mutex> lock(factory_mutex_);
    buffer_pool_.reset();
}

} // namespace AudioCapture
