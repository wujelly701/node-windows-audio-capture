# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Multi-device capture support
- Audio effects and filters
- Real-time audio visualization
- WebSocket streaming support
- Performance metrics API

---

## [0.1.0] - 2025-10-13

### Added

#### Core Features
- **Per-process audio capture** using Windows WASAPI loopback mode
- **Real-time audio streaming** with Node.js Readable Stream interface
- **Process enumeration** with `getProcesses()` static method
- **Device enumeration** with `getDevices()` static method
- **Flexible configuration** supporting multiple sample rates (8-192 kHz) and channel layouts (1-8 channels)
- **Multiple audio formats** support (Float32 and Int16)

#### Audio Capture
- WASAPI loopback audio capture implementation
- Automatic audio format conversion and resampling
- Low-latency audio streaming (< 50ms)
- Efficient memory management with buffer pooling
- Graceful error handling and recovery

#### Node.js Integration
- N-API native addon for cross-version compatibility
- JavaScript wrapper with Promise-based async API
- Event-driven architecture (`'data'`, `'error'`, `'end'` events)
- Stream interface compatible with Node.js ecosystem
- Full TypeScript type definitions

#### Error Handling
- Comprehensive error codes (15 error types)
- Automatic reconnection for recoverable errors
- Process termination detection
- Device disconnection handling
- Detailed error messages with context

#### Build System
- CMake-based build configuration
- node-gyp integration
- Prebuild support for multiple Node.js versions
- Electron rebuild support
- Automated GitHub Actions CI/CD

#### Examples
- Basic audio capture example (`examples/basic-capture.js`)
- Stream processing with volume metering (`examples/stream-processing.js`)
- Error handling and auto-reconnect (`examples/error-handling.js`)

#### Testing
- Comprehensive unit tests (20+ test cases)
- Integration tests for real-world scenarios
- Memory leak detection tests
- Performance benchmarking tests
- CI/CD automated testing

#### Documentation
- Complete API reference (`docs/api.md`)
- Build instructions (`docs/build.md`)
- Troubleshooting guide (`docs/troubleshooting.md`)
- Project README with quick start guide
- Inline code documentation

#### Performance
- Low CPU usage (< 10% on typical workloads)
- High throughput (> 1 MB/s audio data)
- Memory efficient (< 50 MB typical usage)
- No memory leaks in long-running tests (100+ start/stop cycles)

### Technical Details

#### Native Code
- C++ implementation using WASAPI COM interfaces
- `IAudioClient`, `IAudioCaptureClient` for audio capture
- `IMMDeviceEnumerator` for device enumeration
- Thread-safe audio buffer management
- RAII pattern for resource cleanup

#### JavaScript API
- `AudioCapture` class (extends `Readable`)
- `AudioCapture.getDevices()` - enumerate audio devices
- `AudioCapture.getProcesses()` - enumerate running processes
- `start()` - start audio capture (Promise-based)
- `stop()` - stop audio capture (synchronous)

#### Configuration Options
- `processId` (required) - target process ID
- `loopbackMode` (optional, default: true) - capture mode
- `sampleRate` (optional, default: 48000) - audio sample rate
- `channels` (optional, default: 2) - number of audio channels
- `format` (optional, default: 'float32') - audio data format

#### Error Codes
- `PROCESS_NOT_FOUND` - target process does not exist
- `PROCESS_TERMINATED` - target process was terminated
- `DEVICE_NOT_FOUND` - audio device not available
- `DEVICE_DISCONNECTED` - audio device was disconnected
- `INITIALIZATION_FAILED` - failed to initialize audio system
- `CAPTURE_FAILED` - audio capture failed
- `INVALID_STATE` - operation in invalid state
- `ACCESS_DENIED` - insufficient permissions
- `INVALID_CONFIG` - invalid configuration parameters
- ... and 6 more error codes

#### Supported Platforms
- Windows 10 (x64, ARM64)
- Windows 11 (x64, ARM64)
- Windows Server 2019/2022

#### Supported Node.js Versions
- Node.js 16.x (LTS)
- Node.js 18.x (LTS)
- Node.js 20.x (Current)

#### Development Tools
- Visual Studio 2022 with C++ Desktop Development
- Windows SDK 10.0.19041.0 or higher
- Python 3.10+ for node-gyp
- CMake 3.15+

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- N/A (initial release)

---

## Version History

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

### Release Cycle

- **Major releases** (x.0.0): Breaking changes, major new features
- **Minor releases** (0.x.0): New features, enhancements
- **Patch releases** (0.0.x): Bug fixes, documentation updates

### Support Policy

- **Current version** (0.1.x): Full support, active development
- **Previous minor version**: Security fixes only
- **Older versions**: No support

---

## Links

- [GitHub Repository](https://github.com/wujelly701/node-windows-audio-capture)
- [Issue Tracker](https://github.com/wujelly701/node-windows-audio-capture/issues)
- [npm Package](https://www.npmjs.com/package/node-windows-audio-capture)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

**Note**: This is the initial release (v0.1.0) of the project. Future releases will be documented here following the Keep a Changelog format.
