# GitHub Release 创建指南 - v2.4.0

## ✅ 准备工作已完成

- ✅ 已合并 `feature/device-management` 到 `main` 分支
- ✅ 已更新版本号到 2.4.0
- ✅ 已创建 git tag `v2.4.0`
- ✅ 已推送所有更改和 tag 到 GitHub
- ✅ 已创建详细的 Release Notes (`RELEASE_v2.4.0.md`)

## 📝 手动创建 GitHub Release 步骤

### 方法一：通过 GitHub Web 界面（推荐）

1. **打开 Releases 页面**
   - 访问：https://github.com/wujelly701/node-windows-audio-capture/releases
   - 或者：在仓库主页点击右侧的 "Releases" 链接

2. **点击 "Draft a new release"**
   - 位于页面右上角的绿色按钮

3. **填写 Release 信息**

   **Tag**: 
   ```
   v2.4.0
   ```
   （从下拉列表选择已存在的 tag）

   **Release title**:
   ```
   v2.4.0 - Device Hot-Plug Detection 🔌
   ```

   **Description**:
   复制 `RELEASE_v2.4.0.md` 的全部内容，或者使用以下简化版本：

   ```markdown
   # v2.4.0 - Device Hot-Plug Detection 🔌

   ## 🎯 Major Features

   ### Device Hot-Plug Detection
   Real-time monitoring of audio device changes with comprehensive event notifications.

   **Key Capabilities**:
   - 🔌 USB Device Detection: Automatically detect device connections
   - 🔄 Default Device Tracking: Monitor system default device changes
   - 📊 Device State Monitoring: Track device enable/disable status
   - ⚙️ Property Change Detection: Get notified of device property changes
   - 🎛️ Complete Event Coverage: 5 event types

   ## 🆕 New APIs

   ```javascript
   const { AudioCapture } = require('node-windows-audio-capture');

   // Start device monitoring
   AudioCapture.startDeviceMonitoring((event) => {
     console.log(`Device event: ${event.type}`, event.deviceId);
   });

   // Stop monitoring
   AudioCapture.stopDeviceMonitoring();
   ```

   ## 📚 Documentation

   - [Device Hot-Plug Guide](docs/DEVICE_HOTPLUG_GUIDE.md)
   - [Device Events Testing](docs/DEVICE_EVENTS_TESTING.md)
   - [Example Code](examples/device-events.js)

   ## 📦 Installation

   ```bash
   npm install node-windows-audio-capture@2.4.0
   ```

   Or from GitHub:
   ```bash
   npm install https://github.com/wujelly701/node-windows-audio-capture/tarball/v2.4.0
   ```

   ## ✅ Testing

   - ✅ 20 Unit Tests (100% pass)
   - ✅ 18 Integration Tests
   - ✅ Complete documentation (English + Chinese)

   ## 🔄 Compatibility

   - ✅ Backward compatible with v2.3.0
   - ✅ Windows 10/11 x64
   - ✅ Node.js >= 16.x
   - ✅ Prebuilt binary included (353KB)

   ## 📊 Release Statistics

   - **Files Changed**: 26 files
   - **Insertions**: 6,014 lines
   - **New Features**: Device hot-plug detection with 5 event types
   - **Documentation**: 910 lines (bilingual)

   ## 🔗 Full Release Notes

   See [RELEASE_v2.4.0.md](RELEASE_v2.4.0.md) for complete details.

   **Full Changelog**: https://github.com/wujelly701/node-windows-audio-capture/compare/v2.3.0...v2.4.0
   ```

4. **添加二进制文件（可选）**
   - 如果有预编译的二进制包，可以在 "Attach binaries" 区域上传
   - 当前已包含在代码中：`prebuilds/win32-x64/node-windows-audio-capture.node`

5. **选择 Release 类型**
   - ☐ **不要**勾选 "Set as a pre-release"（这是正式版本）
   - ☑ 勾选 "Set as the latest release"

6. **发布**
   - 点击绿色的 "Publish release" 按钮

---

### 方法二：通过 GitHub CLI（需要先安装）

如果你想使用命令行，可以安装 GitHub CLI：

1. **安装 GitHub CLI**
   ```powershell
   winget install GitHub.cli
   ```

2. **认证**
   ```bash
   gh auth login
   ```

3. **创建 Release**
   ```bash
   gh release create v2.4.0 \
     --title "v2.4.0 - Device Hot-Plug Detection 🔌" \
     --notes-file RELEASE_v2.4.0.md \
     --latest
   ```

---

## 🎉 完成后的验证

创建 Release 后，请验证以下内容：

1. ✅ Release 出现在 https://github.com/wujelly701/node-windows-audio-capture/releases
2. ✅ Tag `v2.4.0` 正确链接
3. ✅ Release Notes 显示正确
4. ✅ 标记为 "Latest Release"
5. ✅ 下载链接可用（tar.gz 和 zip）

## 📢 发布后的任务

1. **发布到 npm**（如果需要）
   ```bash
   npm publish
   ```

2. **通知用户**
   - 在 README 中添加 badge 链接到最新版本
   - 在项目说明中提到新特性
   - 社交媒体/社区公告

3. **更新文档链接**
   - 确保所有文档链接指向正确的版本

---

## 🔗 相关链接

- **仓库**: https://github.com/wujelly701/node-windows-audio-capture
- **Releases**: https://github.com/wujelly701/node-windows-audio-capture/releases
- **Issues**: https://github.com/wujelly701/node-windows-audio-capture/issues
- **Changelog**: https://github.com/wujelly701/node-windows-audio-capture/blob/main/CHANGELOG.md

---

**当前状态**: ✅ 所有准备工作完成，可以创建 Release！
