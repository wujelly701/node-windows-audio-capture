# Device Event Monitoring Tests
# 设备事件监控测试

## Overview | 概述

This test suite validates the v2.4.0 device hot-plug detection and event monitoring functionality.

本测试套件验证 v2.4.0 设备热插拔检测和事件监控功能。

## Test Results | 测试结果

**Status**: ✅ All 20 tests passing  
**状态**: ✅ 全部 20 个测试通过

```
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
Time:        2.553 s
```

## Test Categories | 测试类别

### 1. Device Enumeration (5 tests) | 设备枚举（5个测试）

Tests for audio device discovery and information retrieval.

测试音频设备发现和信息检索。

- ✅ `getAudioDevices` returns an array  
  ✅ `getAudioDevices` 返回数组
  
- ✅ Each device has required properties (id, name, description, isDefault, isActive)  
  ✅ 每个设备具有必需属性（id、name、description、isDefault、isActive）
  
- ✅ Device IDs are unique  
  ✅ 设备 ID 唯一
  
- ✅ At least one device exists  
  ✅ 至少存在一个设备
  
- ✅ Exactly one device is marked as default  
  ✅ 恰好有一个设备标记为默认

### 2. Default Device (2 tests) | 默认设备（2个测试）

Tests for default audio device identification.

测试默认音频设备识别。

- ✅ `getDefaultDeviceId` returns string or null  
  ✅ `getDefaultDeviceId` 返回字符串或 null
  
- ✅ Default device ID matches a device in the list  
  ✅ 默认设备 ID 与列表中的设备匹配

### 3. Device Monitoring (5 tests) | 设备监控（5个测试）

Tests for event monitoring functionality.

测试事件监控功能。

- ✅ `startDeviceMonitoring` requires a callback function  
  ✅ `startDeviceMonitoring` 需要回调函数
  
- ✅ `startDeviceMonitoring` accepts a valid callback  
  ✅ `startDeviceMonitoring` 接受有效回调
  
- ✅ `stopDeviceMonitoring` works even if not monitoring  
  ✅ 即使未监控，`stopDeviceMonitoring` 也能工作
  
- ✅ Starting and stopping monitoring doesn't throw  
  ✅ 启动和停止监控不抛出错误
  
- ✅ Callback receives event object with correct structure  
  ✅ 回调接收具有正确结构的事件对象

### 4. Error Handling (3 tests) | 错误处理（3个测试）

Tests for error conditions and edge cases.

测试错误条件和边缘情况。

- ✅ `getAudioDevices` doesn't throw  
  ✅ `getAudioDevices` 不抛出错误
  
- ✅ `getDefaultDeviceId` doesn't throw  
  ✅ `getDefaultDeviceId` 不抛出错误
  
- ✅ Starting monitoring twice throws error  
  ✅ 两次启动监控抛出错误

### 5. Event Type Validation (3 tests) | 事件类型验证（3个测试）

Tests for event structure and properties.

测试事件结构和属性。

- ✅ `deviceAdded` event has deviceId  
  ✅ `deviceAdded` 事件具有 deviceId
  
- ✅ `defaultDeviceChanged` event has additional properties  
  ✅ `defaultDeviceChanged` 事件具有额外属性
  
- ✅ `deviceStateChanged` event has state property  
  ✅ `deviceStateChanged` 事件具有 state 属性

### 6. Cleanup (2 tests) | 清理（2个测试）

Tests for proper resource cleanup.

测试正确的资源清理。

- ✅ Cleanup works properly after monitoring  
  ✅ 监控后清理正常工作
  
- ✅ Multiple stop calls don't throw  
  ✅ 多次停止调用不抛出错误

## Running Tests | 运行测试

### Run all device event tests | 运行所有设备事件测试

```bash
npm test -- test/device-events.test.js
```

### Run with verbose output | 使用详细输出运行

```bash
npm test -- test/device-events.test.js --verbose
```

### Run specific test | 运行特定测试

```bash
npm test -- test/device-events.test.js -t "getAudioDevices"
```

## Test Coverage | 测试覆盖率

### Covered Functionality | 覆盖的功能

- ✅ Device enumeration API  
  ✅ 设备枚举 API
  
- ✅ Default device identification  
  ✅ 默认设备识别
  
- ✅ Monitoring lifecycle (start/stop)  
  ✅ 监控生命周期（启动/停止）
  
- ✅ Callback validation  
  ✅ 回调验证
  
- ✅ Event structure validation  
  ✅ 事件结构验证
  
- ✅ Error handling  
  ✅ 错误处理
  
- ✅ Resource cleanup  
  ✅ 资源清理

### Not Covered (Requires Manual Testing) | 未覆盖（需要手动测试）

- ⚠️ Actual device plug/unplug events  
  ⚠️ 实际设备插拔事件
  
- ⚠️ Default device change events  
  ⚠️ 默认设备更改事件
  
- ⚠️ Device state change events  
  ⚠️ 设备状态更改事件
  
- ⚠️ Device property change events  
  ⚠️ 设备属性更改事件

*Note: Event-based tests require actual hardware changes or system events to trigger. These are tested manually using the test scripts in the root directory.*

*注意：基于事件的测试需要实际的硬件更改或系统事件来触发。这些使用根目录中的测试脚本进行手动测试。*

## Test Implementation Details | 测试实现细节

### Mock Events | 模拟事件

The test suite validates event structure using mock event objects. Actual COM events are tested through manual integration tests.

测试套件使用模拟事件对象验证事件结构。实际的 COM 事件通过手动集成测试进行测试。

### Cleanup Strategy | 清理策略

Each test suite uses `afterEach` hooks to ensure device monitoring is stopped, preventing test interference.

每个测试套件使用 `afterEach` 钩子确保停止设备监控，防止测试干扰。

### Timeout Handling | 超时处理

Event-based tests use timeouts to handle cases where events might not occur during test execution (e.g., in CI environments).

基于事件的测试使用超时来处理测试执行期间可能不发生事件的情况（例如，在 CI 环境中）。

## Manual Testing Guide | 手动测试指南

For comprehensive testing, use the following scripts:

要进行全面测试，请使用以下脚本：

### 1. Basic Event Monitoring | 基本事件监控

```bash
node test-device-monitoring.js
```

Actions to test:
- Plug in a USB audio device
- Unplug a USB audio device
- Change default audio device in Windows Sound settings

测试操作：
- 插入 USB 音频设备
- 拔出 USB 音频设备
- 在 Windows 声音设置中更改默认音频设备

### 2. Comprehensive Example | 综合示例

```bash
node examples/device-events.js
```

This provides formatted output and demonstrates best practices.

这提供格式化输出并演示最佳实践。

## Known Limitations | 已知限制

1. **CI Environment**: Device events cannot be reliably tested in CI environments without actual hardware.  
   **CI 环境**: 在没有实际硬件的情况下，无法在 CI 环境中可靠地测试设备事件。

2. **Event Timing**: Some events may not fire immediately, requiring manual verification.  
   **事件时机**: 某些事件可能不会立即触发，需要手动验证。

3. **Platform-Specific**: Tests are Windows-only due to WASAPI dependency.  
   **平台特定**: 由于 WASAPI 依赖，测试仅限 Windows。

## Future Improvements | 未来改进

- [ ] Add mock COM interface for event simulation  
  [ ] 添加用于事件模拟的模拟 COM 接口
  
- [ ] Create integration test environment with virtual audio devices  
  [ ] 使用虚拟音频设备创建集成测试环境
  
- [ ] Add performance benchmarks for event handling  
  [ ] 为事件处理添加性能基准
  
- [ ] Implement snapshot testing for device enumeration  
  [ ] 为设备枚举实现快照测试

---

**Last Updated**: October 14, 2025  
**最后更新**: 2025年10月14日

**Test Framework**: Jest 29.x  
**测试框架**: Jest 29.x

**Coverage**: 20/20 tests passing (100%)  
**覆盖率**: 20/20 测试通过（100%）
