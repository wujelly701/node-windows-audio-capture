# Device Hot-Plug Detection Guide
# 设备热插拔检测指南

## Overview | 概述

v2.4.0 introduces real-time device hot-plug detection through the Windows WASAPI interface. Your application can now respond to:

v2.4.0 通过 Windows WASAPI 接口引入了实时设备热插拔检测。您的应用现在可以响应：

- USB audio devices being plugged in or removed
- Default audio device changes
- Device state changes (enabled/disabled)
- Device property modifications

- USB 音频设备插入或移除
- 默认音频设备更改
- 设备状态更改（启用/禁用）
- 设备属性修改

---

## Quick Start | 快速开始

### Basic Usage | 基本用法

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

// Start monitoring device events
// 开始监控设备事件
AudioCapture.startDeviceMonitoring((event) => {
  console.log('Event:', event.type);
  console.log('Device ID:', event.deviceId);
});

// When done
// 完成后
AudioCapture.stopDeviceMonitoring();
```

### TypeScript Usage | TypeScript 用法

```typescript
import { AudioCapture, DeviceEvent } from 'node-windows-audio-capture';

AudioCapture.startDeviceMonitoring((event: DeviceEvent) => {
  switch (event.type) {
    case 'deviceAdded':
      console.log('New device:', event.deviceId);
      break;
    case 'deviceRemoved':
      console.log('Device removed:', event.deviceId);
      break;
    case 'defaultDeviceChanged':
      console.log('Default device changed');
      break;
  }
});
```

---

## Event Types | 事件类型

### 1. deviceAdded | 设备添加

Fired when a new audio device is plugged in (e.g., USB headset).

当插入新音频设备时触发（例如 USB 耳机）。

```javascript
{
  type: 'deviceAdded',
  deviceId: '{0.0.0.00000000}.{device-guid}'
}
```

**Use Cases | 使用场景:**
- Notify user of new audio device
- Automatically switch to new device
- Update device selection UI

- 通知用户新音频设备
- 自动切换到新设备
- 更新设备选择 UI

### 2. deviceRemoved | 设备移除

Fired when an audio device is unplugged.

当音频设备被拔出时触发。

```javascript
{
  type: 'deviceRemoved',
  deviceId: '{0.0.0.00000000}.{device-guid}'
}
```

**Use Cases | 使用场景:**
- Handle device disconnection gracefully
- Switch to default device
- Update device list

- 优雅处理设备断开
- 切换到默认设备
- 更新设备列表

### 3. defaultDeviceChanged | 默认设备更改

Fired when the system default audio device changes.

当系统默认音频设备更改时触发。

```javascript
{
  type: 'defaultDeviceChanged',
  deviceId: '{0.0.0.00000000}.{device-guid}',
  dataFlow: 0,  // 0=Render(Output), 1=Capture(Input), 2=All
  role: 0       // 0=Console, 1=Multimedia, 2=Communications
}
```

**Use Cases | 使用场景:**
- Auto-switch capture to new default device
- Notify user of system audio changes
- Maintain sync with system settings

- 自动切换捕获到新默认设备
- 通知用户系统音频更改
- 与系统设置保持同步

### 4. deviceStateChanged | 设备状态更改

Fired when a device is enabled, disabled, or unplugged.

当设备被启用、禁用或拔出时触发。

```javascript
{
  type: 'deviceStateChanged',
  deviceId: '{0.0.0.00000000}.{device-guid}',
  state: 1  // 1=ACTIVE, 2=DISABLED, 4=NOT_PRESENT, 8=UNPLUGGED
}
```

**Device States | 设备状态:**
- `1` (ACTIVE): Device is active and available
- `2` (DISABLED): Device is disabled in system settings
- `4` (NOT_PRESENT): Device hardware is not present
- `8` (UNPLUGGED): Device is unplugged

- `1` (ACTIVE): 设备活动且可用
- `2` (DISABLED): 设备在系统设置中被禁用
- `4` (NOT_PRESENT): 设备硬件不存在
- `8` (UNPLUGGED): 设备被拔出

**Use Cases | 使用场景:**
- Detect when device becomes unavailable
- Handle disabled devices
- Update device status indicators

- 检测设备何时不可用
- 处理禁用的设备
- 更新设备状态指示器

### 5. devicePropertyChanged | 设备属性更改

Fired when device properties (like volume, name, etc.) change.

当设备属性（如音量、名称等）更改时触发。

```javascript
{
  type: 'devicePropertyChanged',
  deviceId: '{0.0.0.00000000}.{device-guid}'
}
```

**Use Cases | 使用场景:**
- Update device information display
- Sync with device property changes
- Refresh device details

- 更新设备信息显示
- 与设备属性更改同步
- 刷新设备详情

---

## Complete Example | 完整示例

### Device Manager with Event Handling | 带事件处理的设备管理器

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

class AudioDeviceManager {
  constructor() {
    this.devices = [];
    this.currentDeviceId = null;
    this.isMonitoring = false;
  }

  async initialize() {
    // Load initial device list
    // 加载初始设备列表
    this.devices = await AudioCapture.getAudioDevices();
    this.currentDeviceId = await AudioCapture.getDefaultDeviceId();
    
    // Start monitoring
    // 开始监控
    this.startMonitoring();
    
    console.log(`Initialized with ${this.devices.length} devices`);
    console.log(`Current device: ${this.getCurrentDeviceName()}`);
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    AudioCapture.startDeviceMonitoring((event) => {
      this.handleDeviceEvent(event);
    });
    
    this.isMonitoring = true;
  }

  async handleDeviceEvent(event) {
    console.log(`[Event] ${event.type}`);
    
    switch (event.type) {
      case 'deviceAdded':
        await this.onDeviceAdded(event);
        break;
      case 'deviceRemoved':
        await this.onDeviceRemoved(event);
        break;
      case 'defaultDeviceChanged':
        await this.onDefaultDeviceChanged(event);
        break;
      case 'deviceStateChanged':
        await this.onDeviceStateChanged(event);
        break;
    }
  }

  async onDeviceAdded(event) {
    console.log('New device detected, refreshing list...');
    // 新设备检测到，刷新列表...
    this.devices = await AudioCapture.getAudioDevices();
    
    const newDevice = this.devices.find(d => d.id === event.deviceId);
    if (newDevice) {
      console.log(`Added: ${newDevice.name}`);
    }
  }

  async onDeviceRemoved(event) {
    console.log('Device removed, refreshing list...');
    // 设备移除，刷新列表...
    
    // Check if current device was removed
    // 检查当前设备是否被移除
    if (this.currentDeviceId === event.deviceId) {
      console.warn('Current device was removed!');
      // 当前设备被移除！
      this.currentDeviceId = await AudioCapture.getDefaultDeviceId();
      console.log(`Switched to default: ${this.getCurrentDeviceName()}`);
    }
    
    this.devices = await AudioCapture.getAudioDevices();
  }

  async onDefaultDeviceChanged(event) {
    console.log('Default device changed');
    // 默认设备已更改
    
    this.currentDeviceId = event.deviceId;
    const device = this.devices.find(d => d.id === event.deviceId);
    
    if (device) {
      console.log(`New default: ${device.name}`);
    }
    
    // Refresh to update isDefault flags
    // 刷新以更新 isDefault 标志
    this.devices = await AudioCapture.getAudioDevices();
  }

  async onDeviceStateChanged(event) {
    const stateNames = {
      1: 'ACTIVE',
      2: 'DISABLED',
      4: 'NOT_PRESENT',
      8: 'UNPLUGGED'
    };
    
    console.log(`Device state changed to: ${stateNames[event.state]}`);
    // 设备状态更改为: ...
    
    // Refresh device list
    // 刷新设备列表
    this.devices = await AudioCapture.getAudioDevices();
  }

  getCurrentDeviceName() {
    const device = this.devices.find(d => d.id === this.currentDeviceId);
    return device ? device.name : 'Unknown';
  }

  getDeviceList() {
    return this.devices.map(d => ({
      id: d.id,
      name: d.name,
      isDefault: d.isDefault,
      isActive: d.isActive
    }));
  }

  shutdown() {
    if (this.isMonitoring) {
      AudioCapture.stopDeviceMonitoring();
      this.isMonitoring = false;
      console.log('Device monitoring stopped');
      // 设备监控已停止
    }
  }
}

// Usage | 用法
async function main() {
  const manager = new AudioDeviceManager();
  await manager.initialize();
  
  // Keep running and monitoring events
  // 保持运行并监控事件
  process.on('SIGINT', () => {
    manager.shutdown();
    process.exit(0);
  });
}

main().catch(console.error);
```

---

## Best Practices | 最佳实践

### 1. Always Stop Monitoring | 始终停止监控

```javascript
// Good | 好
process.on('SIGINT', () => {
  AudioCapture.stopDeviceMonitoring();
  process.exit(0);
});

process.on('SIGTERM', () => {
  AudioCapture.stopDeviceMonitoring();
  process.exit(0);
});
```

### 2. Handle Errors Gracefully | 优雅处理错误

```javascript
try {
  AudioCapture.startDeviceMonitoring((event) => {
    try {
      // Handle event | 处理事件
      handleEvent(event);
    } catch (error) {
      console.error('Event handler error:', error);
      // Don't let event handler errors stop monitoring
      // 不要让事件处理器错误停止监控
    }
  });
} catch (error) {
  console.error('Failed to start monitoring:', error);
}
```

### 3. Refresh Device List After Events | 事件后刷新设备列表

```javascript
AudioCapture.startDeviceMonitoring(async (event) => {
  if (event.type === 'deviceAdded' || 
      event.type === 'deviceRemoved' ||
      event.type === 'defaultDeviceChanged') {
    
    // Refresh device list | 刷新设备列表
    const devices = await AudioCapture.getAudioDevices();
    updateUI(devices);
  }
});
```

### 4. Debounce Rapid Events | 防抖快速事件

```javascript
let refreshTimeout = null;

AudioCapture.startDeviceMonitoring((event) => {
  // Debounce rapid events | 防抖快速事件
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(async () => {
    await refreshDeviceList();
  }, 500);
});
```

### 5. Log All Events for Debugging | 记录所有事件用于调试

```javascript
AudioCapture.startDeviceMonitoring((event) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${event.type}:`, event);
  
  // Your event handling logic
  // 您的事件处理逻辑
});
```

---

## Common Use Cases | 常见用例

### 1. Auto-Switch to New Device | 自动切换到新设备

```javascript
AudioCapture.startDeviceMonitoring(async (event) => {
  if (event.type === 'deviceAdded') {
    const devices = await AudioCapture.getAudioDevices();
    const newDevice = devices.find(d => d.id === event.deviceId);
    
    if (newDevice && newDevice.name.includes('USB')) {
      console.log('Switching to new USB device...');
      // Restart capture with new device
      // 使用新设备重启捕获
      await restartCaptureWithDevice(newDevice.id);
    }
  }
});
```

### 2. Maintain Device List UI | 维护设备列表 UI

```javascript
let deviceListUI = [];

AudioCapture.startDeviceMonitoring(async (event) => {
  if (['deviceAdded', 'deviceRemoved', 'defaultDeviceChanged'].includes(event.type)) {
    deviceListUI = await AudioCapture.getAudioDevices();
    renderDeviceList(deviceListUI);
  }
});
```

### 3. Handle Default Device Changes | 处理默认设备更改

```javascript
let currentCapture = null;
let autoSwitchEnabled = true;

AudioCapture.startDeviceMonitoring(async (event) => {
  if (event.type === 'defaultDeviceChanged' && autoSwitchEnabled) {
    console.log('Default device changed, restarting capture...');
    
    if (currentCapture && currentCapture.isRunning()) {
      await currentCapture.stop();
    }
    
    // Restart with default device (no deviceId specified)
    // 使用默认设备重启（不指定 deviceId）
    currentCapture = new AudioCapture({ processId: 0 });
    await currentCapture.start();
  }
});
```

### 4. Detect Device Disconnection During Capture | 捕获期间检测设备断开

```javascript
const capture = new AudioCapture({ 
  processId: 0,
  deviceId: myDeviceId 
});

AudioCapture.startDeviceMonitoring(async (event) => {
  if (event.type === 'deviceRemoved' && event.deviceId === myDeviceId) {
    console.warn('Capture device was removed!');
    
    // Gracefully stop capture
    // 优雅停止捕获
    if (capture.isRunning()) {
      await capture.stop();
    }
    
    // Switch to default device
    // 切换到默认设备
    const defaultId = await AudioCapture.getDefaultDeviceId();
    console.log(`Switching to default device: ${defaultId}`);
    
    // Restart with default device
    // 使用默认设备重启
    const newCapture = new AudioCapture({ processId: 0 });
    await newCapture.start();
  }
});

await capture.start();
```

---

## Troubleshooting | 故障排除

### Issue: Events not firing | 问题：事件不触发

**Check:** Ensure monitoring is started before device changes occur.

**检查:** 确保在设备更改发生之前已启动监控。

```javascript
// Start monitoring first | 先启动监控
AudioCapture.startDeviceMonitoring(callback);

// Then make device changes | 然后进行设备更改
```

### Issue: Cannot start monitoring twice | 问题：无法两次启动监控

**Solution:** Stop monitoring before starting again.

**解决方案:** 在再次启动之前停止监控。

```javascript
AudioCapture.stopDeviceMonitoring();
AudioCapture.startDeviceMonitoring(newCallback);
```

### Issue: Memory leak concerns | 问题：内存泄漏问题

**Solution:** Always stop monitoring when done.

**解决方案:** 完成后始终停止监控。

```javascript
// Always cleanup | 始终清理
process.on('exit', () => {
  AudioCapture.stopDeviceMonitoring();
});
```

### Issue: Events firing too frequently | 问题：事件触发过于频繁

**Solution:** Implement debouncing or throttling.

**解决方案:** 实施防抖或节流。

```javascript
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const handleEvent = debounce(async (event) => {
  await refreshDeviceList();
}, 500);

AudioCapture.startDeviceMonitoring(handleEvent);
```

---

## Performance Considerations | 性能考虑

- **Overhead:** Device monitoring has minimal CPU overhead (~0.1%)
- **开销:** 设备监控具有最小的 CPU 开销（~0.1%）

- **Memory:** Each callback holds minimal state (~1KB)
- **内存:** 每个回调保持最小状态（~1KB）

- **Latency:** Events are delivered within 50-100ms of actual device changes
- **延迟:** 事件在实际设备更改后 50-100ms 内传递

- **Thread Safety:** All callbacks are executed on the JavaScript thread
- **线程安全:** 所有回调在 JavaScript 线程上执行

---

## API Reference | API 参考

### AudioCapture.startDeviceMonitoring(callback)

Starts monitoring device events.

开始监控设备事件。

**Parameters | 参数:**
- `callback` (Function): Event callback function
- `callback` (函数): 事件回调函数
  - Receives `DeviceEvent` object
  - 接收 `DeviceEvent` 对象

**Throws | 抛出:**
- `TypeError`: If callback is not a function
- `TypeError`: 如果回调不是函数
- `Error`: If monitoring is already started
- `Error`: 如果监控已启动

### AudioCapture.stopDeviceMonitoring()

Stops monitoring device events.

停止监控设备事件。

**No parameters | 无参数**

Safe to call multiple times.

可以多次安全调用。

---

## See Also | 另请参阅

- [API Documentation](./api.md)
- [Examples](../examples/)
- [Testing Guide](./DEVICE_EVENTS_TESTING.md)
- [Troubleshooting](./troubleshooting.md)

---

**Version:** v2.4.0+  
**Last Updated:** October 14, 2025  
**最后更新:** 2025年10月14日
