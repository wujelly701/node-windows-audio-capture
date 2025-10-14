# Production-Ready Node.js Audio Capture Addon: Technical Requirements Guide

**The essential technical blueprint for building a per-application Windows audio capture addon combines WASAPI's process loopback capabilities with modern N-API patterns.** This guide distills research from Microsoft's official samples, OBS Studio's production implementation, and successful Node.js native addons to provide actionable technical decisions for a 3-6 month development timeline. You'll need Visual Studio 2022 Build Tools, Windows 10 SDK, node-addon-api for ABI stability, and a multi-threaded architecture using ThreadSafeFunction for real-time audio callbacks.

## Windows AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS: Complete implementation workflow

The WASAPI process loopback API requires Windows 10 Build 20348 (21H2) or Windows 11, though it partially works on Windows 10 2004/20H1 with limitations. The fundamental difference from standard loopback capture is targeting specific processes rather than all system audio.

### Core API initialization sequence

The workflow starts with COM initialization using `CoInitializeEx(NULL, COINIT_MULTITHREADED)` before any WASAPI calls. The critical innovation is using a virtual audio device string rather than enumerating physical devices:

```cpp
#define VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK L"VAD\\Process_Loopback"
```

Configuration requires packing parameters into a PROPVARIANT structure:

```cpp
AUDIOCLIENT_ACTIVATION_PARAMS activationParams = {};
activationParams.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
activationParams.ProcessLoopbackParams.TargetProcessId = targetPID;
activationParams.ProcessLoopbackParams.ProcessLoopbackMode = 
    PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;

PROPVARIANT activateParams = {};
activateParams.vt = VT_BLOB;
activateParams.blob.cbSize = sizeof(activationParams);
activateParams.blob.pBlobData = (BYTE*)&activationParams;
```

The **ProcessLoopbackMode** determines capture scope: `INCLUDE_TARGET_PROCESS_TREE` captures only the specified process and its children, while `EXCLUDE_TARGET_PROCESS_TREE` captures all system audio except that process tree. This capture operates across all physical audio endpoints simultaneously—a process playing audio through multiple devices will be captured from all of them.

### Async activation pattern and completion handling

Activation uses `ActivateAudioInterfaceAsync` with a completion handler callback:

```cpp
ActivateAudioInterfaceAsync(
    VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
    __uuidof(IAudioClient),
    &activateParams,
    this, // IActivateAudioInterfaceCompletionHandler
    &asyncOp
);
```

In the completion callback, you must properly release the async operation to prevent memory leaks—a common bug documented in win-capture-audio issue #14. The callback receives the IAudioClient interface, which then requires initialization with specific flags:

```cpp
hr = m_AudioClient->Initialize(
    AUDCLNT_SHAREMODE_SHARED,  // Exclusive mode NOT supported
    AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
    0,  // hnsBufferDuration - 0 means auto-size
    0,  // hnsPeriodicity
    &wfx,
    NULL
);
```

### Critical format specification workaround

A **major limitation**: `IAudioClient::GetMixFormat()` returns `E_NOTIMPL` for process loopback clients. Microsoft's official sample uses a hard-coded CD-quality PCM format as the workaround:

```cpp
WAVEFORMATEX wfx = {};
wfx.wFormatTag = WAVE_FORMAT_PCM;
wfx.nChannels = 2;
wfx.nSamplesPerSec = 44100;
wfx.wBitsPerSample = 16;
wfx.nBlockAlign = 4;
wfx.nAvgBytesPerSec = 176400;
wfx.cbSize = 0;
```

This format works reliably across Windows versions. Attempting to use IAudioClient3 for lower latency results in error 0x88890021—process loopback is incompatible with the low-latency API, limiting you to approximately 30-50ms inherent latency.

### Threading architecture and MMCSS integration

The recommended pattern uses Media Foundation work queues with MMCSS (Multimedia Class Scheduler Service) thread prioritization:

```cpp
#include <avrt.h>

DWORD taskIndex = 0;
HANDLE hTask = AvSetMmThreadCharacteristics(TEXT("Pro Audio"), &taskIndex);
if (hTask != NULL) {
    AvSetMmThreadPriority(hTask, AVRT_PRIORITY_CRITICAL);
}

// Event-driven capture
HANDLE m_SampleReadyEvent = CreateEvent(NULL, FALSE, FALSE, NULL);
m_AudioClient->SetEventHandle(m_SampleReadyEvent);

while (capturing) {
    DWORD waitResult = WaitForSingleObject(m_SampleReadyEvent, 2000);
    if (waitResult == WAIT_OBJECT_0) {
        ProcessAudioSample();
    }
}

// Cleanup
AvRevertMmThreadCharacteristics(hTask);
```

**Critical thread safety rule**: `GetBuffer()` and `ReleaseBuffer()` must be called from the same thread. Use `COINIT_MULTITHREADED` for worker threads.

### Buffer management and the critical section

The capture loop accesses audio data through IAudioCaptureClient:

```cpp
HRESULT ProcessAudioSample() {
    UINT32 framesToRead = 0;
    BYTE* data = nullptr;
    DWORD flags = 0;
    
    hr = m_AudioCaptureClient->GetBuffer(&data, &framesToRead, &flags, NULL, NULL);
    if (FAILED(hr)) return hr;
    
    // Check for special conditions
    if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
        // Buffer contains silence (target process may have no audio)
    }
    if (flags & AUDCLNT_BUFFERFLAGS_DATA_DISCONTINUITY) {
        // Data loss detected - audio glitch occurred
    }
    
    // Process audio data QUICKLY
    if (framesToRead > 0) {
        ProcessAudio(data, framesToRead);
    }
    
    // CRITICAL: Release buffer ASAP
    hr = m_AudioCaptureClient->ReleaseBuffer(framesToRead);
    return hr;
}
```

**Between GetBuffer and ReleaseBuffer, never**:
- Allocate memory (malloc, new, vector operations)
- Acquire locks (mutex, critical section)
- Perform file I/O
- Make COM calls
- Sleep or block

Pre-allocate all buffers before starting capture. Typical buffer sizes are ~10ms periods (441 frames @ 44.1kHz). Using buffer duration of 0 (auto-size) is recommended.

### Error codes and recovery strategies

Key error codes you'll encounter:

| Error | Code | Recovery Strategy |
|-------|------|-------------------|
| AUDCLNT_E_DEVICE_INVALIDATED | 0x88890004 | Recreate audio client completely |
| AUDCLNT_E_OUT_OF_ORDER | 0x88890007 | Ensure alternating GetBuffer/ReleaseBuffer |
| AUDCLNT_E_UNSUPPORTED_FORMAT | 0x88890008 | Use hard-coded PCM format |
| AUDCLNT_E_CPUUSAGE_EXCEEDED | 0x88890027 | Reduce concurrent capture clients |
| E_NOTIMPL | 0x80004001 | Expected for GetMixFormat—use workaround |

Device disconnection requires complete teardown and re-activation. Target process termination doesn't stop capture—it continues receiving silence. Monitor process lifetime separately if you need to handle this.

### Known issues requiring workarounds

**Issue**: Sample code bug places `AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM` in wrong parameter (GitHub #196). **Fix**: Ensure flags go in StreamFlags parameter, not hnsPeriodicity.

**Issue**: Race condition if Stop called immediately after Start. **Fix**: Wait for activation complete event before allowing stop operations.

**Issue**: Windows 11 22H2 crashes in fullscreen exclusive mode games. **Fix**: Monitor for device position anomalies and restart capture when detected.

**Issue**: Cannot re-activate after releasing. **Cause**: IActivateAudioInterfaceAsyncOperation not properly released. **Fix**: Store and explicitly Release() the async operation interface.

**Issue**: High latency (30-50ms minimum). **Reality**: Inherent to process loopback architecture. **Mitigation**: Use buffer=0, avoid resampling, employ MMCSS, but cannot reduce below ~30ms.

## Node.js native addon development: 2024-2025 best practices

### Technology choice: node-addon-api wins decisively

**Use node-addon-api (C++ wrapper over N-API) for all new development.** NAN is deprecated and requires recompilation for each major Node.js version. N-API provides ABI (Application Binary Interface) stability—binaries work across Node.js versions without recompilation. node-addon-api wraps N-API with modern C++ syntax, RAII patterns, and better developer experience.

Migration path: Install `npm install node-addon-api`, update binding.gyp to include its headers, replace NAN macros with Napi:: equivalents, and remove V8-specific code.

Key binding.gyp configuration:

```json
{
  "targets": [{
    "target_name": "audio_addon",
    "sources": ["src/addon.cc"],
    "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
    "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
    "cflags!": ["-fno-exceptions"],
    "cflags_cc!": ["-fno-exceptions"]
  }]
}
```

Target **N-API version 8** for maximum compatibility (Node.js 12.22+ through 22.x, all current Electron versions). Higher versions offer additional features but reduce compatibility.

### Electron compatibility requires specific handling

Electron uses different ABI than Node.js due to custom V8/Chromium integration. Native modules must be recompiled using `@electron/rebuild`:

```bash
npm install --save-dev @electron/rebuild
npx electron-rebuild -f -w your-native-module
```

**Windows-specific requirement**: Electron 4.x+ exports symbols from electron.exe instead of node.dll. Add delay-load configuration to binding.gyp:

```python
{
  'conditions': [
    ['OS=="win"', {
      'libraries': ['-ldelayimp.lib'],
      'msvs_settings': {
        'VCLinkerTool': {
          'DelayLoadDLLs': ['electron.exe', 'node.exe']
        }
      }
    }]
  ]
}
```

Test with actual Electron versions, not just Node.js. The same N-API level works across versions, but edge cases exist. Document Electron compatibility explicitly.

### Streaming audio efficiently: zero-copy patterns and chunk sizing

**Critical Electron limitation**: External buffers (zero-copy shared memory) are not supported. Define `NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED` before including headers when building for Electron. For Node.js, external ArrayBuffers provide true zero-copy:

```cpp
Napi::ArrayBuffer CreateSharedBuffer(const Napi::Env& env, void* data, size_t length) {
  return Napi::ArrayBuffer::New(
    env, data, length,
    [](Napi::Env env, void* finalizeData) {
      free(finalizeData); // Cleanup when GC'd
    },
    data
  );
}
```

For maximum compatibility (especially Electron), use buffer copying with strategic reuse. **Optimal chunk size: 64-256KB** for audio streaming. Smaller chunks increase overhead; larger chunks increase latency.

```cpp
// Buffer reuse pattern
std::vector<uint8_t> audioBuffer(BUFFER_SIZE);

void StreamAudioChunk(Napi::Env env) {
  FillAudioData(audioBuffer.data(), audioBuffer.size());
  Napi::Buffer<uint8_t> chunk = Napi::Buffer<uint8_t>::Copy(
    env, audioBuffer.data(), audioBuffer.size()
  );
  EmitToJavaScript(env, chunk);
}
```

Use TypedArrays (Uint8Array, Float32Array) over Node.js Buffer for better cross-platform compatibility, though Buffer is a Uint8Array subclass and works interchangeably.

### Real-time event emission with ThreadSafeFunction

**ThreadSafeFunction is the official N-API solution** for calling JavaScript from C++ worker threads. It creates a thread-safe queue between worker threads and the JavaScript main thread, solving the fundamental problem of cross-thread communication in Node.js.

Complete implementation pattern:

```cpp
class AudioProcessor : public Napi::ObjectWrap<AudioProcessor> {
private:
  Napi::ThreadSafeFunction tsfn;
  std::thread worker;
  
public:
  void StartCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Function callback = info[0].As<Napi::Function>();
    
    // Create ThreadSafeFunction
    tsfn = Napi::ThreadSafeFunction::New(
      env,
      callback,              // JS callback function
      "AudioProcessor",      // Resource name
      0,                     // Max queue (0 = unlimited)
      1,                     // Initial thread count
      [](Napi::Env, void*, void*) {}  // Finalizer
    );
    
    // Start worker thread
    worker = std::thread([this]() {
      while (capturing) {
        float* audioData = CaptureAudioChunk();
        
        struct CallbackData {
          float* samples;
          size_t length;
        };
        auto* data = new CallbackData{audioData, CHUNK_SIZE};
        
        // Call from worker thread - SAFE!
        napi_status status = tsfn.BlockingCall(data, 
          [](Napi::Env env, Napi::Function jsCallback, CallbackData* data) {
            // This lambda executes on JS main thread
            Napi::Float32Array samples = Napi::Float32Array::New(env, data->length);
            std::memcpy(samples.Data(), data->samples, data->length * sizeof(float));
            
            jsCallback.Call({samples});
            
            // CRITICAL: Always clean up
            delete[] data->samples;
            delete data;
          }
        );
        
        if (status != napi_ok) break;
      }
      tsfn.Release();
    });
  }
};
```

**BlockingCall vs NonBlockingCall**: Use `BlockingCall()` for critical audio data (waits if queue full), `NonBlockingCall()` for best-effort events (returns immediately with error if queue full).

**Reference counting**: Call `tsfn.Acquire()` when spawning new threads, `tsfn.Release()` when done. For emergency shutdown, use `tsfn.Abort()` which causes all calls to return napi_closing.

**Common pitfall**: Memory leaks if you forget to delete callback data in the lambda. Always clean up both the data structure and any allocated buffers.

### Memory management between C++ and V8

V8's garbage collector uses generational collection: Young Generation (1-8MB, frequent) and Old Generation (larger, infrequent). About 20% of objects survive from Young to Old.

**HandleScope pattern for temporary objects**:

```cpp
void ProcessAudioBatch(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  
  for (int i = 0; i < 1000; i++) {
    Napi::HandleScope innerScope(env);  // Inner scope for each iteration
    
    Napi::Buffer<uint8_t> tempBuffer = Napi::Buffer<uint8_t>::New(env, 1024);
    // Process buffer...
    
    // innerScope closes automatically, allowing GC of tempBuffer
  }
}
```

**References for long-lived objects**:

```cpp
class AudioEngine {
private:
  Napi::ObjectReference bufferRef;  // Prevents GC
  
public:
  void StoreBuffer(const Napi::CallbackInfo& info) {
    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    bufferRef = Napi::Persistent(buffer);  // Create strong reference
  }
  
  void ReleaseBuffer() {
    bufferRef.Reset();  // Allow GC
  }
};
```

**AsyncWorker pattern prevents leaks**:

```cpp
class AudioAsyncWorker : public Napi::AsyncWorker {
private:
  Napi::Reference<Napi::Buffer<uint8_t>> bufferRef;
  
public:
  AudioAsyncWorker(Napi::Function& callback, Napi::Buffer<uint8_t> buffer)
    : Napi::AsyncWorker(callback),
      bufferRef(Napi::Persistent(buffer)) {}  // Create reference IN worker
  
  void Execute() override {
    uint8_t* data = bufferRef.Value().Data();  // Safe to access
  }
  
  void OnOK() override {
    Callback().Call({bufferRef.Value()});
    bufferRef.Reset();  // Clean up
  }
};
```

Always call `Reset()` on references when done to allow garbage collection. For external memory (native allocations), inform V8 using `napi_adjust_external_memory()` so GC knows about memory pressure.

### Building and distributing for Windows

**Essential dependencies**: Visual Studio 2022 Build Tools (or full IDE), Windows 10 SDK 10.0.22621.0, Python 3.11 or 3.12 (requires node-gyp v10+).

Install Build Tools with "Desktop development with C++" workload. Configure node-gyp:

```bash
npm config set msvs_version 2022
npm config set python /path/to/python.exe
```

For Windows audio APIs, add required libraries to binding.gyp:

```json
{
  "targets": [{
    "target_name": "audio_addon",
    "conditions": [
      ["OS=='win'", {
        "defines": [
          "WIN32_LEAN_AND_MEAN",
          "_WIN32_WINNT=0x0A00"  // Windows 10
        ],
        "libraries": [
          "ole32.lib",
          "oleaut32.lib",
          "uuid.lib",
          "winmm.lib"
        ]
      }]
    ]
  }]
}
```

**Distribution strategy 2024-2025**: Use **prebuildify + node-gyp-build** rather than node-pre-gyp. Prebuildify bundles all prebuilds in the npm package (no download step), works offline, requires no external hosting, and is simpler.

Setup:

```json
{
  "scripts": {
    "install": "node-gyp-build",
    "prebuild": "prebuildify --napi --strip"
  },
  "dependencies": {
    "node-gyp-build": "^4.8.0"
  },
  "devDependencies": {
    "node-addon-api": "^8.0.0",
    "prebuildify": "^6.0.0"
  }
}
```

Building prebuilds:

```bash
# Node.js (all versions via N-API)
npx prebuildify --napi --strip

# Electron
npx prebuildify --napi --strip --runtime electron --target 25.0.0
npx prebuildify --napi --strip --runtime electron --target 26.0.0

# Multiple architectures
npx prebuildify --napi --strip --arch x64 --arch arm64
```

Loading in JavaScript:

```javascript
const binding = require('node-gyp-build')(__dirname);
module.exports = binding;
```

## Reference implementations: architectural lessons from production code

### Microsoft ApplicationLoopback: canonical WASAPI implementation

The official sample at github.com/microsoft/Windows-classic-samples/tree/main/Samples/ApplicationLoopback provides the definitive implementation pattern. **Key architectural decisions**:

**State machine pattern** with explicit states: Initialized → Starting → Capturing → Stopping → Stopped → Error. State transitions are explicit and traceable.

**Async callback model** using Media Foundation's IMFAsyncCallback interface. Callbacks fire every ~10ms when audio data is available. This avoids polling and ensures minimal latency.

**MMCSS thread registration** for real-time priority. The sample uses Media Foundation work queues which automatically benefit from MMCSS scheduling, ensuring audio processing doesn't get preempted.

**Hard-coded format workaround** documented in the sample itself. Microsoft's own code uses 16-bit PCM at 44.1kHz stereo as the standard format because GetMixFormat() doesn't work.

### OBS Studio win-capture-audio: production-ready multi-threading

The bozbez/win-capture-audio plugin (merged into OBS 28.0+) demonstrates **production patterns for multiple simultaneous captures**:

**Multi-threaded architecture** separates concerns:
- Main thread: UI and OBS interaction
- Session monitor thread: Tracks audio sessions independently
- Capture threads: Per-process audio capture (one per target)
- Media Foundation queue: MMCSS-registered for stable capture

**Session-based tracking** instead of window-based. Uses `IAudioSessionEnumerator` to discover processes producing audio, even without windows. Solves race conditions by using a single shared session monitor instance across all plugin sources.

**Resource sharing pattern**: Multiple OBS sources can share the same IAudioCaptureClient instance. This prevents duplicate capture overhead when the same process is monitored by multiple scenes.

**Exclude mode implementation** doesn't use ProcessLoopbackParams exclude flag. Instead, it uses a custom mixer that captures ALL non-matching sessions. This works even when the target session doesn't exist yet.

**Major architectural evolution**: v2.0.0 was a complete rewrite using ActivateAudioInterfaceAsync API, eliminating process injection and hooking (anti-cheat safe). Switched from C to C++ with WIL (Windows Implementation Library) and WRL for cleaner COM handling.

### naudiodon: Node.js stream integration pattern

This PortAudio wrapper (github.com/Streampunk/naudiodon) demonstrates **ideal Node.js integration via streams**:

**Stream-based API** rather than events or callbacks. Extends Node.js Readable/Writable/Duplex streams, enabling natural piping:

```javascript
const portAudio = require('naudiodon');

const ai = new portAudio.AudioIO({
  inOptions: {
    channelCount: 2,
    sampleFormat: portAudio.SampleFormat16Bit,
    sampleRate: 44100,
    deviceId: -1
  }
});

ai.pipe(fs.createWriteStream('output.raw'));
```

**N-API for ABI stability**. Binary works across Node.js 12-22 without recompilation. **Bundled PortAudio** eliminates external dependencies.

**Back-pressure handling** automatic via Node.js streams. If consumer can't keep up, the stream system pauses reading, preventing memory overflow.

**Timestamp metadata** augments buffers with timing information: `buffer.timestamp` represents the time of the first sample, critical for synchronization.

**Device enumeration as static methods**: `portAudio.getDevices()` returns array of device info, `portAudio.getHostAPIs()` returns host API info (MME, WASAPI, DirectSound).

### Common architectural patterns across implementations

**Threading model**: Separate audio thread managed by system (PortAudio, WASAPI) communicates with main thread via async messaging. Audio thread gets real-time priority; main thread handles JavaScript interaction.

**Configuration via options object**: All successful libraries use this pattern with sensible defaults. Users specify only what differs from defaults.

**Stream interface for continuous data**: Natural piping, automatic back-pressure, fits Node.js paradigm perfectly.

**EventEmitter for state changes**: Device connected, error occurred, capture started/stopped. Multiple listeners can subscribe.

**Static methods for system queries**: Device enumeration, capability checking, version information.

**Error recovery strategies**: Distinguish recoverable errors (device disconnect → retry) from fatal errors (invalid configuration → fail fast).

## Build toolchain and distribution strategy

### Visual Studio and SDK requirements

**Install Visual Studio 2022 Build Tools** (free) with "Desktop development with C++" workload. This includes:
- MSVC v143 - VS 2022 C++ x64/x86 build tools
- Windows 10 SDK (10.0.22621.0 recommended)
- C++ CMake tools (if using CMake)

For **audio-specific APIs**, the Windows SDK provides:
- `mmdeviceapi.h` for audio device enumeration
- `audioclient.h` for WASAPI core interfaces
- `endpointvolume.h` for volume control
- COM headers and libraries

**ARM64 support on Windows on ARM**: Add "Visual C++ compilers and libraries for ARM64" and "Visual C++ ATL for ARM64" components. Requires Visual Studio 2022 17.4+ for native ARM64 compiler.

Configuration:

```bash
npm config set msvs_version 2022
npm config set python /path/to/python.exe

# Verify
npm config get msvs_version
```

**node-gyp v10+ required** for Python 3.12+ support. Python 3.11 or 3.12 recommended.

### node-gyp configuration for complex Windows projects

Example binding.gyp with Windows audio dependencies:

```json
{
  "targets": [
    {
      "target_name": "native_audio",
      "sources": [
        "src/main.cc",
        "src/audio_device.cc",
        "src/process_capture.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "include",
        "<(module_root_dir)/deps/include"
      ],
      "dependencies": [
        "<!@(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ 
        "NAPI_VERSION=8",
        "UNICODE",
        "_UNICODE"
      ],
      "conditions": [
        ["OS=='win'", {
          "defines": [
            "WIN32_LEAN_AND_MEAN",
            "_WIN32_WINNT=0x0A00"
          ],
          "libraries": [
            "ole32.lib",
            "oleaut32.lib",
            "uuid.lib",
            "winmm.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "RuntimeLibrary": 2
            },
            "VCLinkerTool": {
              "AdditionalLibraryDirectories": [
                "<(module_root_dir)/lib"
              ]
            }
          }
        }]
      ]
    }
  ]
}
```

**Common issues**: Visual Studio not found (solution: `Install-Module VSSetup`), Python version conflicts (solution: update node-gyp), Windows SDK version not found (solution: install Windows 10 SDK even on Windows 11).

### CMake vs node-gyp decision criteria

**Use node-gyp when**:
- Pure Node.js native addon project
- Standard npm workflow integration
- Smaller, simpler native modules
- Following Node.js community conventions
- Want bundled Python + GYP (no external dependencies)

**Use CMake when**:
- Extensive C/C++ codebase with existing CMake files
- Complex build requirements with multiple targets
- Cross-platform library already built with CMake
- Need better IDE integration (CLion, Qt Creator)

**Can combine** using cmake-js wrapper. CMake offers more mature ecosystem and better documentation for complex C++ projects, but node-gyp integrates better with npm tooling. **For audio addon**: node-gyp is sufficient unless wrapping existing CMake-based audio library.

### Prebuilt binary distribution: prebuildify strategy

**Recommended 2024-2025: prebuildify + node-gyp-build** rather than node-pre-gyp.

**Why prebuildify**:
- Bundles all prebuilds in npm package (no download step)
- Works offline
- No external hosting costs (no S3, no GitHub Releases management)
- Simpler CI/CD pipeline
- Better Electron compatibility

Setup package.json:

```json
{
  "scripts": {
    "install": "node-gyp-build",
    "prebuild": "prebuildify --napi --strip",
    "prebuild-all": "prebuildify --napi --strip --arch x64+arm64"
  },
  "dependencies": {
    "node-gyp-build": "^4.8.0"
  },
  "devDependencies": {
    "node-addon-api": "^8.0.0",
    "prebuildify": "^6.0.0"
  },
  "binary": {
    "napi_versions": [8]
  }
}
```

Building prebuilds for multiple runtimes:

```bash
# Node.js with N-API (works across versions)
npx prebuildify --napi --strip

# Electron 25
npx prebuildify --napi --strip --runtime electron --target 25.0.0

# Electron 26
npx prebuildify --napi --strip --runtime electron --target 26.0.0

# Multiple architectures
npx prebuildify --napi --strip --arch x64 --arch arm64
```

Loading in code (automatic fallback to build):

```javascript
const binding = require('node-gyp-build')(__dirname);
module.exports = binding;
```

**GitHub Actions for automated multi-platform builds**:

```yaml
name: Prebuild

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
        
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm run prebuild
      - uses: actions/upload-artifact@v3
        with:
          name: prebuilds-${{ matrix.os }}
          path: prebuilds/
```

**Only use node-pre-gyp if**: binaries are very large (>50MB), need custom hosting infrastructure, or have specific compliance requirements.

## Testing strategies and quality assurance

### Testing framework choice and structure

**Recommended: Jest** (most popular, 3x Mocha downloads) for comprehensive testing with built-in mocking and coverage. **Alternative: Node.js native test runner** (Node v18+) for zero dependencies and fast execution.

Testing strategy for native audio addons:

**Unit testing**: Test JavaScript API surface with mocked native components. Validate parameter handling, error conditions, and configuration.

**Integration testing**: Compile addon in debug mode, test actual audio capture with real devices locally. Use mock devices or skip hardware tests in CI.

Example test structure (Jest):

```javascript
const { AudioCapture } = require('../build/Release/addon');

describe('AudioCapture', () => {
  let capture;
  
  beforeEach(() => {
    capture = new AudioCapture({
      processId: 1234,
      sampleRate: 44100,
      channels: 2
    });
  });
  
  afterEach(() => {
    if (capture) capture.stop();
  });
  
  test('should create instance with valid config', () => {
    expect(capture).toBeDefined();
    expect(capture.sampleRate).toBe(44100);
  });
  
  test('should emit data events', (done) => {
    capture.on('data', (buffer) => {
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      done();
    });
    capture.start();
  }, 5000);
  
  test('should handle device errors gracefully', (done) => {
    capture.on('error', (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBeDefined();
      done();
    });
    capture.start();
    // Simulate error condition
  });
});

const isCI = process.env.CI === 'true';
(isCI ? test.skip : test)('should capture from real device', () => {
  // Test with actual hardware - skip in CI
});
```

### CI/CD configuration for Windows native modules

**GitHub Actions matrix strategy** for multiple Node.js and Electron versions:

```yaml
name: Build and Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
        node-version: [18.x, 20.x, 22.x]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Configure Build Tools (Windows)
      if: runner.os == 'Windows'
      run: |
        npm config set msvs_version 2022
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build native addon
      run: npm run build
      env:
        npm_config_build_from_source: true
    
    - name: Run tests
      run: npm test
      env:
        CI: true
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: addon-${{ matrix.os }}-node${{ matrix.node-version }}
        path: build/Release/*.node
```

**Windows-specific**: GitHub Actions Windows runners include Visual Studio Build Tools. Explicitly set Python version and configure node-gyp.

### Memory leak detection tools and practices

**Chrome DevTools heap snapshots** (most accessible):

```javascript
const v8 = require('v8');

function takeHeapSnapshot(filename) {
  const snapshot = v8.writeHeapSnapshot(filename);
  console.log('Heap snapshot written to', snapshot);
}

// Take snapshots before and after operation
takeHeapSnapshot('./heap-before.heapsnapshot');
// Run your code
takeHeapSnapshot('./heap-after.heapsnapshot');
```

Load snapshots in Chrome DevTools (Profile → Load), use "Comparison" view to identify growing objects. **Size Delta** column shows constantly increasing memory—the smoking gun for leaks.

**heapdump module** for runtime snapshots:

```javascript
const heapdump = require('heapdump');

// Trigger on signal
process.on('SIGUSR2', () => {
  heapdump.writeSnapshot((err, filename) => {
    console.log('Heap dump:', filename);
  });
});
```

Trigger externally: `kill -USR2 <pid>` generates snapshot while running.

**Valgrind for native leaks** (Linux):

```bash
npm rebuild --debug
valgrind --leak-check=full --show-leak-kinds=all node app.js
```

**Common leak patterns to avoid**:

1. **Global accumulation**: Never use unbounded arrays/objects for caching. Use LRU cache with size limit.
2. **EventEmitter listeners never removed**: Always `removeListener()` when done, or use `once()`.
3. **Native memory not reported to V8**: Call `napi_adjust_external_memory()` for large native allocations so GC knows about memory pressure.
4. **Closures capturing large objects**: Extract only needed values from closures, not entire buffers.

### Compatibility testing matrix

**Node.js versions**: 18.x (Previous LTS), 20.x (Active LTS), 22.x (Current)
**Windows versions**: Windows 10 21H2+, Windows 11
**Electron versions**: If supporting Electron, test latest 2-3 major versions

**Electron-specific considerations**:

Rebuild for each Electron version:

```json
{
  "scripts": {
    "rebuild:electron": "electron-rebuild -f -w audio-addon",
    "rebuild:electron:debug": "electron-rebuild --debug -f -w audio-addon"
  }
}
```

Context-aware addons required for Electron multi-instance support:

```cpp
NODE_MODULE_INIT() {
  // Your initialization code
}
```

## API design patterns from successful implementations

### Stream-based architecture recommendation

**Extend Node.js Stream classes** for natural integration with Node.js ecosystem. Naudiodon and node-speaker demonstrate this pattern successfully.

**Class-based API with options object**:

```javascript
const { AudioCapture } = require('windows-audio-capture');

class AudioCapture extends Readable {
  constructor(options = {}) {
    super(options);
    
    // Configuration with defaults
    this.config = {
      processId: options.processId || null,
      mode: options.mode || 'include', // 'include' or 'exclude'
      includeChildren: options.includeChildren !== false,
      
      // Audio format
      sampleRate: options.sampleRate || 48000,
      channels: options.channels || 2,
      sampleFormat: options.sampleFormat || 'int16',
      
      // Buffer control
      framesPerBuffer: options.framesPerBuffer || 1024,
      
      // Error handling
      closeOnError: options.closeOnError !== false
    };
    
    this._validateConfig();
    this._initNative();
  }
  
  _read(size) {
    // Called by stream when consumer ready
    this._requestNativeData(size);
  }
  
  start() {
    this._startNative();
    this.emit('started');
  }
  
  stop() {
    this._stopNative();
    this.emit('stopped');
  }
  
  // Static methods for enumeration
  static getDevices() {
    return this._nativeGetDevices();
  }
  
  static getProcesses() {
    return this._nativeGetProcesses();
  }
}

// Usage with piping
const capture = new AudioCapture({
  processId: 1234,
  mode: 'include'
});

capture.pipe(fs.createWriteStream('output.raw'));

// Or event-based
capture.on('data', (buffer) => {
  // Process audio chunks
});

capture.on('error', (err) => {
  console.error('Capture error:', err.code, err.message);
});

capture.start();
```

### Configuration options users need

Essential configuration for per-application audio capture:

```javascript
{
  // Target selection
  processId: 1234,              // Required: target process ID
  mode: 'include',               // 'include' or 'exclude' process tree
  includeChildren: true,         // Include child processes
  
  // Audio format
  sampleRate: 48000,             // 8000, 16000, 44100, 48000
  channels: 2,                   // 1 mono, 2 stereo
  sampleFormat: 'int16',         // 'int16', 'int32', 'float32'
  
  // Buffer configuration
  framesPerBuffer: 1024,         // Smaller = lower latency, higher CPU
  highWaterMark: 65536,          // Stream buffer size (64KB default)
  
  // Error handling
  closeOnError: true,            // Auto-close on device error
  autoReconnect: false,          // Retry on device disconnect
  maxRetries: 3                  // Max reconnection attempts
}
```

**Validation with helpful errors**:

```javascript
_validateConfig() {
  if (!this.config.processId) {
    throw new TypeError('processId is required');
  }
  
  if (!['include', 'exclude'].includes(this.config.mode)) {
    throw new TypeError('mode must be "include" or "exclude"');
  }
  
  const validRates = [8000, 16000, 44100, 48000];
  if (!validRates.includes(this.config.sampleRate)) {
    throw new RangeError(`sampleRate must be one of: ${validRates.join(', ')}`);
  }
}
```

### Error reporting patterns

**Three-tier error strategy**:

**1. Synchronous exceptions** for immediate validation errors:

```javascript
try {
  const capture = new AudioCapture({ channels: 999 }); // Throws TypeError
} catch (err) {
  console.error('Configuration error:', err.message);
}
```

**2. Error events** for async runtime errors:

```javascript
capture.on('error', (err) => {
  console.error('Runtime error:', err.code, err.message);
  if (err.code === 'DEVICE_DISCONNECTED') {
    // Handle recoverable error
  } else if (err.code === 'PROCESS_TERMINATED') {
    // Target process ended
    capture.stop();
  }
});
```

**3. Custom error classes** with error codes:

```javascript
class AudioError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AudioError';
    this.code = code;
    this.details = details;
  }
}

// In native code
throw new AudioError(
  'Failed to activate audio client',
  'ACTIVATION_FAILED',
  { hresult: '0x88890004', processId: 1234 }
);
```

**Standard error codes**:
- `INVALID_PROCESS`: Process ID not found or inaccessible
- `PROCESS_TERMINATED`: Target process ended
- `DEVICE_DISCONNECTED`: Audio hardware removed
- `ACTIVATION_FAILED`: WASAPI activation error
- `BUFFER_OVERFLOW`: Consumer too slow, data lost
- `UNSUPPORTED_FORMAT`: Audio format not supported
- `PERMISSION_DENIED`: No access to audio capture

**Error recovery with retry logic**:

```javascript
class ResilientCapture extends AudioCapture {
  constructor(options) {
    super(options);
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
    
    this.on('error', (err) => {
      if (this._isRecoverable(err) && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(() => this.start(), 1000 * this.retryCount);
      } else {
        this.emit('fatal', err);
      }
    });
    
    this.on('started', () => {
      this.retryCount = 0; // Reset on success
    });
  }
  
  _isRecoverable(err) {
    return ['DEVICE_DISCONNECTED', 'ACTIVATION_FAILED'].includes(err.code);
  }
}
```

## Conclusion: actionable development roadmap

For a **3-6 month production-ready implementation**, prioritize these technical decisions:

**Month 1 - Foundation**: Set up Visual Studio 2022 Build Tools, Windows SDK, and node-addon-api project structure. Implement basic WASAPI process loopback wrapper following Microsoft's ApplicationLoopback sample. Create proof-of-concept capturing audio from a target process to file. Focus on getting the complete workflow working: COM initialization → async activation → audio client initialization → capture loop.

**Month 2 - Threading and Integration**: Implement ThreadSafeFunction for real-time callbacks from WASAPI thread to JavaScript. Build Stream interface extending Readable for natural Node.js integration. Add proper error handling for device disconnection, process termination, and WASAPI errors. Implement MMCSS thread prioritization for stable capture.

**Month 3 - API and Testing**: Design complete API surface with configuration validation, static device/process enumeration, and comprehensive error codes. Write Jest test suite with unit tests for API and integration tests for capture (skip hardware tests in CI). Set up GitHub Actions for building across Node.js 18/20/22 on Windows.

**Month 4 - Electron and Distribution**: Add Electron compatibility with delay-load configuration for electron.exe. Set up prebuildify for automated prebuilt binary generation. Test with actual Electron applications. Ensure N-API version 8 compatibility for broadest support.

**Month 5 - Robustness**: Implement memory leak testing with Chrome DevTools heap profiling. Add automatic reconnection logic for device disconnection. Handle edge cases: process termination during capture, fullscreen exclusive mode transitions, multiple simultaneous captures. Performance optimization: minimize latency, optimize buffer sizes.

**Month 6 - Documentation and Polish**: Write comprehensive documentation with code examples. Create example applications demonstrating common use cases. Performance benchmarking and optimization. Beta testing with real-world applications. Prepare for npm publication with prebuild binaries.

**Critical architecture decisions**:
- **Use node-addon-api** (N-API wrapper) targeting version 8
- **Follow Microsoft's ApplicationLoopback** sample for WASAPI implementation
- **ThreadSafeFunction** for C++ worker thread to JavaScript callbacks
- **Stream-based API** extending Readable for piping support
- **prebuildify + node-gyp-build** for distribution
- **Multi-threaded design**: Capture thread with MMCSS priority, main thread for JavaScript
- **Hard-coded PCM format** (44.1kHz, 16-bit stereo) as primary, with 48kHz option

**Avoid these pitfalls**:
- Using NAN (deprecated) or bare N-API (verbose)
- Attempting IAudioClient3 low-latency mode (incompatible)
- Relying on GetMixFormat() (returns E_NOTIMPL)
- Memory allocation between GetBuffer/ReleaseBuffer
- Forgetting to release IActivateAudioInterfaceAsyncOperation
- Not handling device disconnection gracefully
- Ignoring AUDCLNT_BUFFERFLAGS_DATA_DISCONTINUITY

**Success metrics**: Stable capture from any Windows application including games with anti-cheat, ~30-50ms latency, no memory leaks in 24-hour runs, works across Node.js 18-22 and Electron 25+, prebuilt binaries for x64 and ARM64, comprehensive test coverage with CI passing on all target platforms.

This technical foundation provides everything needed for a production-ready per-application audio capture addon that integrates naturally with Node.js while leveraging Windows' modern WASAPI capabilities.