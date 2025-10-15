# Zero-Copy Architecture Research

**Version**: v2.6 Core Innovation  
**Date**: 2025-10-15  
**Goal**: Reduce GC pressure from 366 KB/s to ~36 KB/s (90%+ reduction)

---

## 📋 Background

### Current Architecture

**Memory Allocation Pattern**:
```
┌─────────────────────────────────────────────────────┐
│  C++ (WASAPI)  →  Buffer.from()  →  JS  →  GC      │
└─────────────────────────────────────────────────────┘

Flow:
1. WASAPI captures audio (C++ buffer)
2. Copy to new Buffer via Buffer.from() ← 366 KB/s allocation
3. Pass to JavaScript
4. GC reclaims after use
```

**Performance Metrics** (from Phase 1 analysis):
- Allocation Rate: **366 KB/s** (100 packets/s × 3.66 KB)
- Heap Growth: Stable (+0.05 MB / 50s)
- GC Pressure: **Medium** (acceptable but optimizable)
- External Memory: 1.42 → 5.09 MB (per capture)

### Problem Statement

**Issue**: Every audio packet creates a new Buffer
- 100 allocations/second
- 366 KB/s allocation rate
- Medium GC pressure

**Goal**: Share memory between C++ and JavaScript
- Reduce allocations by 90%+
- Lower GC pressure significantly
- Maintain API compatibility

---

## 🔬 N-API External Buffer

### What is External Buffer?

**Concept**: Buffer backed by externally-managed memory (not V8-managed)

```cpp
// Instead of copying:
Buffer.from(cppData)  // Allocates new V8 memory

// Share memory:
napi_create_external_buffer()  // Uses C++ memory directly
```

### N-API Functions

#### Primary API

```cpp
napi_status napi_create_external_buffer(
  napi_env env,
  size_t length,
  void* data,                    // External memory pointer
  napi_finalize finalize_cb,     // Cleanup callback
  void* finalize_hint,
  napi_value* result
);
```

#### Finalize Callback

```cpp
typedef void (*napi_finalize)(
  napi_env env,
  void* finalize_data,
  void* finalize_hint
);
```

**Purpose**: Called when V8 no longer needs the buffer
- Free C++ memory
- Release resources
- Cleanup references

---

## 🏗️ Architecture Design

### Option 1: Buffer Pool (Simple)

**Concept**: Pre-allocate fixed-size buffers, reuse cyclically

```
┌────────────────────────────────────────────────┐
│  Buffer Pool (10 buffers × 4 KB = 40 KB)      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ...      │
│  │ B1 │ │ B2 │ │ B3 │ │ B4 │ │ B5 │           │
│  └────┘ └────┘ └────┘ └────┘ └────┘           │
│    ↑ Current write position                    │
└────────────────────────────────────────────────┘
```

**Pros**:
- ✅ Simple implementation
- ✅ Predictable memory usage
- ✅ Easy to test

**Cons**:
- ⚠️ Fixed pool size (may waste memory)
- ⚠️ Need to handle pool exhaustion

### Option 2: Dynamic External Buffers

**Concept**: Allocate on demand, manage lifecycle

```
┌─────────────────────────────────────────────────┐
│  WASAPI Capture                                 │
│    ↓                                            │
│  Allocate C++ buffer (if needed)                │
│    ↓                                            │
│  napi_create_external_buffer(buffer)            │
│    ↓                                            │
│  Pass to JavaScript (zero-copy)                 │
│    ↓                                            │
│  JS processes data                              │
│    ↓                                            │
│  Finalize callback → Free C++ memory            │
└─────────────────────────────────────────────────┘
```

**Pros**:
- ✅ Memory usage matches actual needs
- ✅ No pre-allocation overhead
- ✅ Flexible

**Cons**:
- ⚠️ More complex lifecycle management
- ⚠️ Need reference counting

### Option 3: Hybrid (Recommended) ⭐

**Concept**: Small pool + dynamic allocation for peaks

```
┌─────────────────────────────────────────────────┐
│  Fast Path: Buffer Pool (10 buffers)           │
│  • Hot path for 90% of packets                  │
│  • Pre-allocated, zero-latency                  │
│                                                 │
│  Slow Path: Dynamic Allocation                  │
│  • Fallback when pool exhausted                 │
│  • Rare, acceptable overhead                    │
└─────────────────────────────────────────────────┘
```

**Pros**:
- ✅ Best of both worlds
- ✅ Performance + flexibility
- ✅ Handles bursts gracefully

**Cons**:
- ⚠️ Slightly more complex

---

## 🔧 Implementation Strategy

### Phase 1: Prototype (Simple)

**Goal**: Prove zero-copy concept works

**Steps**:
1. Create basic external buffer wrapper
2. Replace one Buffer.from() call
3. Measure memory/GC improvement
4. Validate data correctness

**Code Structure**:
```
src/napi/external_buffer.h       # External buffer helpers
src/napi/external_buffer.cpp     # Implementation
test-zero-copy-prototype.js      # Validation script
```

### Phase 2: Buffer Pool

**Goal**: Implement efficient buffer reuse

**Components**:
- `BufferPool` class (C++)
- Allocation strategy
- Reference counting
- Thread safety

### Phase 3: Integration

**Goal**: Replace all Buffer.from() calls

**Changes**:
- Modify audio_processor.cpp
- Update data callback
- Ensure backward compatibility

### Phase 4: Performance Validation

**Goal**: Measure actual improvements

**Metrics**:
- Allocation rate (target: < 50 KB/s)
- GC frequency (target: -50%)
- Memory usage (target: -30%)
- CPU usage (target: -10%)

---

## 📊 Expected Results

### Before (Current)

```
Allocation Rate:    366 KB/s
GC Pressure:        Medium (B grade)
External Memory:    1.42 → 5.09 MB (per 10s)
Heap Stability:     ✅ Good
```

### After (Zero-Copy)

```
Allocation Rate:    ~36 KB/s      (-90%)
GC Pressure:        Low (A grade)  (-50-70%)
External Memory:    ~1.5 MB       (stable)
Heap Stability:     ✅ Excellent
```

---

## ⚠️ Risks & Mitigations

### Risk 1: Memory Lifecycle Issues

**Problem**: Premature freeing or leaks

**Mitigation**:
- Careful reference counting
- Comprehensive testing
- Use smart pointers (shared_ptr)

### Risk 2: Thread Safety

**Problem**: Capture thread vs finalize callback

**Mitigation**:
- Mutex protection
- Atomic operations
- Clear ownership rules

### Risk 3: API Compatibility

**Problem**: Breaking existing code

**Mitigation**:
- Keep existing API unchanged
- Internal implementation only
- Extensive compatibility tests

### Risk 4: Performance Regression

**Problem**: Complex logic adds overhead

**Mitigation**:
- Profile carefully
- Optimize hot paths
- Benchmark before/after

---

## 🧪 Testing Strategy

### Unit Tests

```javascript
// Test 1: Basic external buffer creation
test('should create external buffer', () => {
  const buffer = createExternalBuffer(1024);
  expect(buffer.length).toBe(1024);
});

// Test 2: Memory not copied
test('should share memory (zero-copy)', () => {
  const initialMem = process.memoryUsage().external;
  const buffer = createExternalBuffer(1024 * 1024);
  const afterMem = process.memoryUsage().external;
  // Should not increase by 1 MB (only small overhead)
  expect(afterMem - initialMem).toBeLessThan(100000);
});

// Test 3: Data correctness
test('should preserve audio data', () => {
  const buffer = captureWithZeroCopy(100);
  expect(buffer[0]).toBe(expectedSample);
});
```

### Performance Tests

```javascript
// Compare allocation rates
test('allocation rate comparison', async () => {
  // Old method
  const oldRate = await measureAllocationRate(useBufferFrom);
  
  // New method
  const newRate = await measureAllocationRate(useExternalBuffer);
  
  expect(newRate).toBeLessThan(oldRate * 0.2); // < 20% of old rate
});
```

### Integration Tests

```javascript
// Ensure existing code still works
test('backward compatibility', () => {
  const capture = new AudioCapture({ processId: 0 });
  // Should work exactly as before
  capture.on('data', (event) => {
    expect(event.buffer).toBeInstanceOf(Buffer);
  });
});
```

---

## 📚 Resources

### N-API Documentation

- [N-API External Buffer](https://nodejs.org/api/n-api.html#napi_create_external_buffer)
- [N-API Finalize](https://nodejs.org/api/n-api.html#napi_finalize)
- [N-API Memory Management](https://nodejs.org/api/n-api.html#memory-management)

### Reference Implementations

- [node-buffer-pool](https://github.com/NodeRedis/node-buffer-pool)
- [node-addon-examples](https://github.com/nodejs/node-addon-examples)

### Performance Profiling

- [V8 Memory Profiler](https://v8.dev/docs/memory-leak)
- [Node.js Profiling Guide](https://nodejs.org/en/docs/guides/simple-profiling/)

---

## 🎯 Success Criteria

### Must Have ✅

- [ ] Allocation rate reduced by 80%+ (366 → < 73 KB/s)
- [ ] No memory leaks in 1-hour test
- [ ] 100% data correctness (bit-perfect)
- [ ] All existing tests pass
- [ ] No API breaking changes

### Should Have 🎯

- [ ] GC pressure reduced by 50%+
- [ ] CPU usage reduced by 10%+
- [ ] Memory usage reduced by 30%+
- [ ] Performance benchmark report

### Nice to Have 💎

- [ ] Configurable buffer pool size
- [ ] Runtime statistics (hits/misses)
- [ ] Memory usage monitoring
- [ ] Documentation with examples

---

## 🗓️ Timeline

### Week 2 (Current)

**Days 1-2** (Oct 15-16):
- [x] Research N-API External Buffer
- [ ] Design architecture
- [ ] Create prototype

**Days 3-4** (Oct 17-18):
- [ ] Implement buffer pool
- [ ] Basic integration
- [ ] Initial testing

**Days 5-6** (Oct 19-20):
- [ ] Performance validation
- [ ] Bug fixes
- [ ] Documentation

**Day 7** (Oct 21):
- [ ] Code review
- [ ] Prepare for Week 3

### Week 3 (If needed)

- Further optimization
- Production readiness
- Release preparation

---

## 📝 Notes

### Key Insights from Phase 1 Analysis

1. **Current implementation is stable** - No urgent need to rush
2. **GC pressure is medium** - Optimization worthwhile but not critical
3. **Allocation pattern is predictable** - 100 packets/s, 3.66 KB each
4. **No memory leaks** - Good foundation to build upon

### Design Philosophy

1. **Backward Compatibility First** - Don't break existing code
2. **Measure Everything** - Data-driven decisions
3. **Simple Before Complex** - Start with basic prototype
4. **Safety Over Speed** - Avoid premature optimization bugs

---

*Research Document - Will be updated as implementation progresses*
