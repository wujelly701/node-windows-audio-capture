# v2.5.0 - Performance Edition ⚡

**Release Date**: October 15, 2025

## 🎯 Major Features

### Kaiser-Windowed Sinc Interpolation
Revolutionary performance optimization for audio resampling with precomputed coefficient tables.

**Key Achievements**:
- ⚡ **42% Faster**: Sinc interpolation speed improved from 4.89ms to 2.83ms per second
- 🎯 **40% Lower CPU**: CPU usage reduced from 0.5% to 0.3%
- 🚀 **73% Better Real-time**: Real-time factor increased from 204x to 353x
- ✨ **Superior Quality**: -70dB stopband attenuation (vs -60dB in v2.4.0)
- 🔄 **100% Compatible**: Zero breaking changes, no migration needed

## 🆕 What's New

### High-Performance Sinc Interpolation

```javascript
const AudioResampler = require('node-windows-audio-capture/lib/audio-resampler');

// Same API, 42% faster performance!
const resampler = new AudioResampler({
  quality: 'sinc',      // Now uses Kaiser-windowed Sinc
  inputRate: 48000,
  outputRate: 16000,
  channels: 2
});

const resampled = resampler.resample(audioBuffer);

// Check performance stats
const stats = resampler.getStats();
console.log(stats.sincInterpolator);  // New performance metrics
```

### Performance Comparison

| Metric | v2.4.0 | v2.5.0 | Improvement |
|--------|--------|--------|-------------|
| **Sinc Processing Speed** | 4.89 ms/sec | 2.83 ms/sec | **-42%** ⚡ |
| **CPU Usage** | 0.5% | 0.3% | **-40%** 🎯 |
| **Real-time Factor** | 204x | 353x | **+73%** 🚀 |
| **Stopband Attenuation** | -60dB | -70dB | **+10dB** ✨ |
| **Initialization** | N/A | ~18ms | (one-time) |
| **Memory Overhead** | 0 | +128KB | (coefficient table) |

### New Modules

#### KaiserWindow (`lib/kaiser-window.js`)
Kaiser window function generator with Bessel I₀ implementation.

```javascript
const KaiserWindow = require('node-windows-audio-capture/lib/kaiser-window');

const window = new KaiserWindow(32, 7);  // length=32, beta=7
const coefficients = window.getWindow();
```

**Features**:
- Bessel I₀ function with 1e-6 precision
- Symmetric window for linear phase response
- Configurable beta parameter for quality/performance trade-off

#### SincInterpolator (`lib/sinc-interpolator.js`)
High-performance Sinc interpolator with precomputed coefficient table.

```javascript
const SincInterpolator = require('node-windows-audio-capture/lib/sinc-interpolator');

const interpolator = new SincInterpolator({
  lobeCount: 4,
  phaseCount: 1024,
  beta: 7
});

// Mono resampling
const output = interpolator.resample(input, inputRate, outputRate);

// Stereo resampling (optimized)
const stereoOutput = interpolator.resampleStereo(stereoInput, inputRate, outputRate);
```

**Features**:
- Precomputed 128KB coefficient table (1024 phases × 32 taps)
- Zero runtime overhead (lookup table strategy)
- Separate optimized paths for mono and stereo
- SIMD-friendly memory layout

## 🔬 Technical Implementation

### Algorithm Design

**Kaiser Window Parameters**:
```javascript
const beta = 7;              // Shape parameter (quality vs speed)
const lobeCount = 4;         // Window width (4 main lobes)
const phaseCount = 1024;     // Phase precision
const order = 32;            // FIR filter order
```

**Coefficient Table**:
- Size: 1024 phases × 32 taps = 32,768 floats (128KB)
- Generation: ~18ms one-time initialization
- Access: O(1) lookup, no runtime computation

**Optimization Techniques**:
- Precomputation eliminates real-time sin/cos calculations
- Kaiser window optimizes frequency domain characteristics
- Normalized coefficients avoid runtime scaling
- Separate code paths for mono/stereo processing

### Performance Analysis

**Before (v2.4.0) - Lanczos Window**:
- Real-time sin/cos computation for every sample
- Processing time: 4.89ms per second of audio
- CPU usage: 0.5%

**After (v2.5.0) - Kaiser Window + Lookup Table**:
- Precomputed coefficient table
- Processing time: 2.83ms per second of audio
- CPU usage: 0.3%
- Initialization: 18ms (one-time cost)

## 📚 Documentation

### Technical Documentation
- [📖 Algorithm Design](RESAMPLING_ALGORITHM_DESIGN.md) - Complete mathematical derivation
- [📖 Performance Analysis](benchmark/V2.5_PERFORMANCE_COMPARISON.md) - Detailed benchmarks
- [📖 Memory Optimization Exploration](docs/MEMORY_OPTIMIZATION_EXPLORATION.md) - BufferPool lessons learned
- [📖 Complete Release Notes](docs/V2.5_RELEASE_NOTES.md) - Full technical details

### Project Documentation
- [📖 Completion Summary](V2.5_COMPLETION_SUMMARY.md) - Project retrospective
- [📖 Development Plan](V2.5_DEVELOPMENT_PLAN.md) - Original planning
- [📖 Progress Tracking](V2.5_PROGRESS.md) - Development timeline

## ✅ Testing

### Test Coverage
- ✅ 69 Tests Passing (100% pass rate)
- ✅ 28 KaiserWindow tests
- ✅ 29 SincInterpolator tests
- ✅ 12 AudioResampler integration tests

### Test Suites
1. **KaiserWindow Tests**: Constructor, Bessel I₀ function, window generation, edge cases
2. **SincInterpolator Tests**: Configuration, coefficient table, interpolation accuracy, performance
3. **AudioResampler Integration**: Sinc initialization, mono/stereo resampling, statistics, backward compatibility

### Validation
- ✅ All performance targets met (<3.0ms/sec, <0.5% CPU, -70dB quality)
- ✅ Audio quality verified (sine wave tests, impulse response)
- ✅ Backward compatibility confirmed (100% API compatible)
- ✅ Memory usage validated (+128KB coefficient table only)

## 🔄 Compatibility

### Backward Compatibility
- ✅ All v2.4.0 APIs remain unchanged
- ✅ Existing code works without modification
- ✅ No breaking changes
- ✅ Zero migration effort required

### Migration Guide
**No migration needed!** Your existing code automatically benefits from 42% faster performance:

```javascript
// This code from v2.4.0 works exactly the same in v2.5.0
// But now it's 42% faster with no code changes!
const resampler = new AudioResampler({
  quality: 'sinc',
  inputRate: 48000,
  outputRate: 16000
});
```

### System Requirements
- **OS**: Windows 10/11
- **Node.js**: >= 16.x
- **Architecture**: x64

## 📦 Installation

### From npm
```bash
npm install node-windows-audio-capture@2.5.0
```

### From GitHub
```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.5.0
```

### Prebuilt Binary Included
- ✅ Windows x64 prebuilt binary
- ✅ No compilation required
- ✅ Works out of the box

## 🚀 Use Cases

### Real-time ASR Processing
```javascript
// 42% faster Sinc resampling means better real-time performance
const AudioProcessingPipeline = require('node-windows-audio-capture/lib/audio-processing-pipeline');

const pipeline = new AudioProcessingPipeline('china-asr');

capture.on('data', (event) => {
  const asrReady = pipeline.process(event.buffer);
  // Faster processing, lower latency!
});
```

### High-Quality Audio Recording
```javascript
// Superior -70dB stopband attenuation for professional audio
const resampler = new AudioResampler({
  quality: 'sinc',
  inputRate: 48000,
  outputRate: 44100,
  channels: 2
});
```

### Batch Audio Processing
```javascript
// 73% better real-time factor means faster batch processing
const processAudioFiles = async (files) => {
  const resampler = new AudioResampler({ quality: 'sinc' });
  
  for (const file of files) {
    const audio = await loadAudio(file);
    const resampled = resampler.resample(audio);
    await saveAudio(resampled);
  }
  // 353x real-time = process 1 hour of audio in ~10 seconds
};
```

## 🎓 Development Insights

### What Worked (Phase 1 ✅)

**Sinc Optimization Success**:
- Algorithmic optimization (lookup table) > micro-optimization
- Kaiser window provides excellent quality/performance balance
- Precomputed coefficients eliminate runtime overhead
- Separate mono/stereo paths maximize efficiency

**Key Lesson**: Invest in algorithm design before code optimization.

### What Didn't Work (Phase 2 📚)

**BufferPool Exploration**:
- Implemented object pooling for Buffer reuse
- Result: Memory growth increased 79-114% (unexpected!)
- Root cause: Copy + release pattern, scenario mismatch
- Decision: Rolled back, fully documented

**Key Lesson**: Not all "best practices" fit every scenario. V8's native GC is already highly optimized. Document failures for community learning.

**Full Analysis**: See [Memory Optimization Exploration](docs/MEMORY_OPTIMIZATION_EXPLORATION.md)

## 📊 Release Statistics

- **Files Changed**: 172 files
- **Insertions**: 450,141 lines
- **Deletions**: 1,668 lines
- **New Modules**: 3 (KaiserWindow, SincInterpolator, BufferPool reference)
- **New Tests**: 69 tests (28 + 29 + 12)
- **Documentation**: 17 comprehensive documents
- **Development Time**: ~1 week

### Commits Breakdown
- Algorithm design and prototyping
- KaiserWindow implementation and tests
- SincInterpolator implementation and tests
- AudioResampler integration
- BufferPool exploration and rollback
- Comprehensive documentation
- Release preparation

## 🔗 Related Releases

- [v2.4.0](https://github.com/wujelly701/node-windows-audio-capture/releases/tag/v2.4.0) - Device Hot-Plug Detection
- [v2.3.0](https://github.com/wujelly701/node-windows-audio-capture/releases/tag/v2.3.0) - Device Selection
- [v2.2.0](https://github.com/wujelly701/node-windows-audio-capture/releases/tag/v2.2.0) - ASR Format Conversion
- [v2.1.0](https://github.com/wujelly701/node-windows-audio-capture/releases/tag/v2.1.0) - Dynamic Mute Control

## 🗺️ Roadmap

### v2.6.0 (Next) - Memory & Ecosystem 🔧
- Zero-copy streaming architecture exploration
- V8 GC behavior deep analysis
- npm publishing and CI/CD configuration
- Prebuilt binary optimization

### v2.7-2.9 - Quality & Performance 🎚️
- Configurable Kaiser parameters
- Adaptive windowing
- SIMD optimization
- Multi-threaded resampling

### v3.0 - Cross-Platform 🌐
- macOS support (Core Audio)
- Linux support (PulseAudio/PipeWire)
- Unified cross-platform API

## 🙏 Credits

Special thanks to all contributors and users who provided feedback and feature requests!

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed changes.

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/wujelly701/node-windows-audio-capture/issues/new).

---

**Full Changelog**: https://github.com/wujelly701/node-windows-audio-capture/compare/v2.4.0...v2.5.0

**Download**: [node-windows-audio-capture-v2.5.0.tar.gz](https://github.com/wujelly701/node-windows-audio-capture/archive/refs/tags/v2.5.0.tar.gz)

**Release Tag**: [v2.5.0](https://github.com/wujelly701/node-windows-audio-capture/releases/tag/v2.5.0)
