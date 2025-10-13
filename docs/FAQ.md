# FAQ - 常见问题与解答

## 目录

- [音频问题](#音频问题)
  - [Q1: 测试后某个应用（如Chrome）没有声音了](#q1-测试后某个应用如chrome没有声音了)
- [进程过滤问题](#进程过滤问题)
- [性能问题](#性能问题)

---

## 音频问题

### Q1: 测试后某个应用（如Chrome）没有声音了

**问题描述：**

运行 v2.1 动态静音测试后，即使调用了 `processor.stop()`，某些应用（特别是 Chrome）仍然没有声音。即使重启应用也无法恢复。

**根本原因：**

Windows 会**持久化保存**应用程序的音量和静音状态。当我们通过 `ISimpleAudioVolume::SetMute()` 静音某个进程时，Windows 会将这个静音状态保存到注册表中。即使：
- 调用 `RestoreMuteStates()` 恢复静音状态
- 重启应用程序
- 重启我们的 Node.js 程序

**静音状态仍可能被保留**，特别是对于多进程应用（如 Chrome）。

**为什么 PotPlayer 恢复了，Chrome 没有？**

1. **PotPlayer**: 单进程架构，音频会话与主进程绑定，恢复机制正常工作
2. **Chrome**: 多进程架构（渲染进程、GPU进程等），音频由**子进程**负责
   - 测试时静音了某个 Chrome 子进程（如 PID 17616）
   - 恢复时可能恢复了这个 PID 的状态
   - 但 Chrome 重启后，新的音频子进程（如 PID 22488）继承了之前的静音状态
   - 导致新进程也被静音

**解决方案 1：手动恢复（立即生效）**

1. **打开 Windows 音量混合器**
   - 右键点击任务栏右下角的音量图标
   - 选择 "打开音量混合器" 或 "音量混合器"

2. **找到被静音的应用**
   - 在音量混合器中找到 Chrome（或其他应用）
   - 查看其音量滑块旁边是否有静音图标 🔇

3. **取消静音**
   - 点击静音图标，切换为 🔊
   - 或直接拖动音量滑块

4. **验证**
   - 应该立即能听到声音

**解决方案 2：使用修复脚本（推荐）**

运行我们提供的修复脚本：

```bash
node fix-chrome-mute.js
```

此脚本会自动尝试解除所有 Chrome 进程的静音状态。

**解决方案 3：预防措施（开发中使用）**

在测试代码中使用**允许列表**保护目标应用的所有进程：

```javascript
const { enumerateProcesses } = require('node-windows-audio-capture');
const addon = require('node-windows-audio-capture').addon;

// 1. 获取所有 Chrome 进程
const processes = enumerateProcesses();
const chromeProcesses = processes.filter(p => p.name.toLowerCase() === 'chrome.exe');
const chromePids = chromeProcesses.map(p => p.pid);

// 2. 创建捕获器
const processor = new addon.AudioProcessor({ 
    processId: chromeProcesses[0].pid, 
    callback: handleAudio 
});

// 3. 启动捕获
processor.start('chrome.exe');

// 4. ⚠️ 重要：设置允许列表，保护所有 Chrome 进程
processor.setAllowList(chromePids);

// 5. 启用静音控制
processor.setMuteOtherProcesses(true);

// 6. 停止时会自动恢复（但多进程应用可能需要手动检查）
processor.stop();
```

**解决方案 4：清除 Windows 音量状态缓存（高级）**

如果问题持续存在，可以清除 Windows 的音量状态缓存：

1. 打开注册表编辑器（`regedit`）
2. 导航到：
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Multimedia\Audio\VolumeControl
   ```
3. 找到对应应用的键值（通常包含应用名称或路径）
4. 删除该键值或修改 `Mute` 值为 `0`
5. 重启应用程序

⚠️ **警告**：修改注册表有风险，请谨慎操作并备份。

**最佳实践（生产环境）**

为避免此问题，建议在生产代码中：

1. **使用允许列表保护目标应用的所有进程**
   ```javascript
   // 查找目标应用的所有进程
   const targetProcesses = processes.filter(p => 
       p.name.toLowerCase() === targetAppName.toLowerCase()
   );
   processor.setAllowList(targetProcesses.map(p => p.pid));
   ```

2. **在 Stop() 后添加验证逻辑**
   ```javascript
   processor.stop();
   
   // 等待100ms让系统稳定
   await new Promise(resolve => setTimeout(resolve, 100));
   
   // 验证目标应用未被静音
   const stillMuted = checkIfAppIsMuted(targetAppName);
   if (stillMuted) {
       console.warn('警告：目标应用仍被静音，请手动检查音量混合器');
   }
   ```

3. **提供用户友好的错误提示**
   ```javascript
   try {
       await startAudioCapture();
   } catch (error) {
       showErrorMessage(
           '音频捕获遇到问题。\n' +
           '如果某些应用没有声音，请：\n' +
           '1. 右键点击任务栏音量图标\n' +
           '2. 选择"音量混合器"\n' +
           '3. 取消对应应用的静音状态'
       );
   }
   ```

**技术说明：为什么会这样？**

Windows 音频会话管理器（WASAPI）的设计：

1. **持久化设计目的**
   - 用户手动调整的音量/静音状态应该被记住
   - 重启应用后保持用户偏好

2. **进程识别方式**
   - Windows 通过**可执行文件路径**识别应用
   - 不是通过进程 PID（PID 每次启动都不同）

3. **我们的操作影响**
   - 当我们静音 `chrome.exe` 的某个进程时
   - Windows 记录了："`C:\Program Files\Google\Chrome\Application\chrome.exe` = 静音"
   - 下次启动 Chrome（任何进程），都会应用这个静音状态

4. **恢复的局限性**
   - 我们的 `RestoreMuteStates()` 只能恢复**当前正在运行的会话**
   - 如果应用重启，新会话会从 Windows 的持久化状态中读取配置
   - 导致即使我们"恢复"了，新会话仍然是静音的

**相关问题**

- [GitHub Issue #XX: Chrome remains muted after testing](#)
- [WASAPI Documentation: Audio Session State Persistence](https://docs.microsoft.com/en-us/windows/win32/coreaudio/audio-sessions)

**相关 API**

- `setAllowList(pids)` - 设置不被静音的进程列表
- `setBlockList(pids)` - 设置强制静音的进程列表
- `RestoreMuteStates()` - 恢复原始静音状态（仅限当前会话）

---

## 进程过滤问题

（待补充）

---

## 性能问题

（待补充）

---

## 贡献

如果你遇到了其他问题并找到了解决方案，欢迎：
1. 提交 Issue 到 [GitHub Issues](https://github.com/wujelly701/node-windows-audio-capture/issues)
2. 提交 PR 更新此 FAQ 文档

---

**文档版本**: v2.1.0  
**最后更新**: 2025-01-13
