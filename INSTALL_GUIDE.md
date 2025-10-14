# Installation Guide | 安装指南
# node-windows-audio-capture v2.4.0

**Date**: October 14, 2025  
**日期**: 2025年10月14日

---

## Quick Start | 快速开始

### Option 1: Install from GitHub (Recommended) | 从 GitHub 安装（推荐）

```bash
npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/feature/device-management
```

**Features | 功能**:
- ✅ Pre-compiled binary included (no build required)
- ✅ Automatic installation (uses `node-gyp-build`)
- ✅ Latest v2.4.0 features (hot-plug detection + device events)
- ✅ 包含预编译二进制文件（无需编译）
- ✅ 自动安装（使用 `node-gyp-build`）
- ✅ 最新 v2.4.0 功能（热插拔检测 + 设备事件）

---

### Option 2: Install from npm (After v2.4.0 Release) | 从 npm 安装（v2.4.0 发布后）

```bash
npm install node-windows-audio-capture
```

**Note**: v2.4.0 is currently in development. Use GitHub installation for latest features.  
**注意**: v2.4.0 当前正在开发中。使用 GitHub 安装以获取最新功能。

---

### Option 3: Clone and Build from Source | 克隆源码并编译

```bash
# Clone repository
git clone https://github.com/wujelly701/node-windows-audio-capture.git
cd node-windows-audio-capture

# Switch to development branch
git checkout feature/device-management

# Install dependencies
npm install

# Build native addon
npm run build

# Run tests
npm test
```

---

## System Requirements | 系统要求

### Platform | 平台
- **OS**: Windows 10/11 (64-bit)
- **架构**: x64 (arm64 support planned)

### Development Environment | 开发环境

If you need to build from source:  
如果需要从源码编译：

1. **Node.js**: >= 16.0.0
2. **Python**: 3.x (for node-gyp)
3. **Visual Studio Build Tools**: 2022 or later
   - Install with: `npm install --global windows-build-tools`
   - 安装命令: `npm install --global windows-build-tools`

---

## Verification | 验证安装

### Test Installation | 测试安装

Create a test file `test.js`:  
创建测试文件 `test.js`:

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

console.log('✅ Module loaded successfully!');
console.log('✅ 模块加载成功！');

// Test v2.4.0 features
async function testFeatures() {
  try {
    // 1. List audio devices
    const devices = await AudioCapture.getAudioDevices();
    console.log(`\n📱 Found ${devices.length} audio devices:`);
    devices.forEach((device, index) => {
      console.log(`  ${index + 1}. ${device.name} ${device.isDefault ? '(默认)' : ''}`);
    });

    // 2. Get default device
    const defaultId = await AudioCapture.getDefaultDeviceId();
    console.log(`\n🔊 Default device ID: ${defaultId}`);

    // 3. Start device monitoring
    console.log('\n👂 Starting device event monitoring...');
    AudioCapture.startDeviceMonitoring((event) => {
      console.log(`  📢 Event: ${event.type} - Device: ${event.deviceId}`);
    });

    console.log('✅ All features working correctly!');
    console.log('✅ 所有功能正常工作！');

    // Stop monitoring after 5 seconds
    setTimeout(() => {
      AudioCapture.stopDeviceMonitoring();
      console.log('\n👋 Test complete!');
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testFeatures();
```

Run the test:  
运行测试:

```bash
node test.js
```

**Expected Output | 预期输出**:

```
✅ Module loaded successfully!
✅ 模块加载成功！

📱 Found 3 audio devices:
  1. Speakers (Realtek High Definition Audio) (默认)
  2. Headphones (USB Audio Device)
  3. Digital Output (HDMI)

🔊 Default device ID: {0.0.0.00000000}.{guid-here}

👂 Starting device event monitoring...
✅ All features working correctly!
✅ 所有功能正常工作！

👋 Test complete!
```

---

## Troubleshooting | 故障排除

### Issue 1: Module Not Found | 模块未找到

**Error | 错误**:
```
Error: Cannot find module './build/Release/audio_addon.node'
```

**Solution | 解决方案**:
1. Ensure you installed the correct version (feature/device-management branch)
   确保安装了正确的版本（feature/device-management 分支）
2. Try reinstalling:
   尝试重新安装:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/feature/device-management
   ```

### Issue 2: Build Failed (MSBuild Error) | 编译失败

**Error | 错误**:
```
gyp ERR! build error
gyp ERR! stack Error: `MSBuild.exe` failed with exit code: 1
```

**Solution | 解决方案**:
1. Install Visual Studio Build Tools:
   安装 Visual Studio 构建工具:
   ```bash
   npm install --global windows-build-tools
   ```
2. Or use pre-built binary (Option 1):
   或使用预编译二进制文件（选项 1）:
   ```bash
   npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/feature/device-management
   ```

### Issue 3: Network Timeout | 网络超时

**Error | 错误**:
```
npm error errno ETIMEDOUT
npm error network request to https://github.com/... failed
```

**Solution | 解决方案**:
1. Check your network connection
   检查网络连接
2. Try using a proxy or VPN
   尝试使用代理或 VPN
3. Download tarball manually:
   手动下载 tarball:
   ```bash
   # Download from:
   https://github.com/wujelly701/node-windows-audio-capture/archive/refs/heads/feature/device-management.tar.gz
   
   # Then install:
   npm install /path/to/downloaded/file.tar.gz
   ```

### Issue 4: Permission Denied | 权限被拒绝

**Solution | 解决方案**:
Run PowerShell or CMD as Administrator:
以管理员身份运行 PowerShell 或 CMD:
```bash
# Right-click on PowerShell/CMD icon
# Select "Run as Administrator"
# Then run npm install
```

---

## Usage Example | 使用示例

See complete examples in:  
查看完整示例:

- `examples/device-events.js` - Device monitoring example
  设备监控示例
- `examples/basic-capture.js` - Audio capture example
  音频捕获示例
- `examples/process-capture.js` - Process-specific capture
  进程特定捕获
- `docs/DEVICE_HOTPLUG_GUIDE.md` - Complete API documentation
  完整 API 文档

---

## Support | 支持

- **GitHub Issues**: https://github.com/wujelly701/node-windows-audio-capture/issues
- **Documentation**: `docs/` folder
- **API Reference**: `docs/api.md`
- **Testing Guide**: `docs/DEVICE_EVENTS_TESTING.md`

---

## Version Information | 版本信息

**Current Version | 当前版本**: v2.4.0-alpha  
**Branch | 分支**: feature/device-management  
**Node.js**: >= 16.0.0  
**Platform | 平台**: Windows 10/11 x64

**New in v2.4.0**:
- ✅ Device hot-plug detection
- ✅ Real-time device event notifications
- ✅ 5 event types (deviceAdded, deviceRemoved, etc.)
- ✅ TypeScript definitions
- ✅ Comprehensive test suite

**v2.4.0 新功能**:
- ✅ 设备热插拔检测
- ✅ 实时设备事件通知
- ✅ 5 种事件类型（设备添加、移除等）
- ✅ TypeScript 类型定义
- ✅ 全面的测试套件

---

**Last Updated**: October 14, 2025  
**最后更新**: 2025年10月14日

**Status**: Ready for testing | 准备测试  
**状态**: 可用于测试
