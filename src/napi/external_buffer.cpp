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
    : buffer_size_(buffer_size), pool_size_(pool_size) {
    
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
    
    return Stats{
        pool_hits_.load(std::memory_order_relaxed),
        pool_misses_.load(std::memory_order_relaxed),
        dynamic_allocations_.load(std::memory_order_relaxed),
        available_buffers_.size(),
        pool_size_
    };
}

void BufferPool::ResetStats() {
    pool_hits_.store(0, std::memory_order_relaxed);
    pool_misses_.store(0, std::memory_order_relaxed);
    dynamic_allocations_.store(0, std::memory_order_relaxed);
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
    
    if (!buffer_pool_) {
        buffer_pool_ = std::make_unique<BufferPool>(buffer_size, pool_size);
    }
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
    
    return BufferPool::Stats{0, 0, 0, 0, 0};
}

void ExternalBufferFactory::Cleanup() {
    std::lock_guard<std::mutex> lock(factory_mutex_);
    buffer_pool_.reset();
}

} // namespace AudioCapture
