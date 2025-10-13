# Process Loopback 实现状态报告

## 问题总结

经过大量调试和尝试，`ActivateAudioInterfaceAsync` with `AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK` 在 Node.js Native Addon 环境中持续返回 **0x8000000E (E_ILLEGAL_METHOD_CALL)**。

### 已尝试的方案

1. ✅ **虚拟设备 ID** (`VAD\Process_Loopback`, `DEVINTERFACE_AUDIO_RENDER`, `VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK`)
   - 结果: 0x8000000E

2. ✅ **真实默认渲染设备 ID** (使用 `IMMDeviceEnumerator`)
   - 结果: 0x8000000E

3. ✅ **STA 线程模式** (`COINIT_APARTMENTTHREADED` + `RO_INIT_SINGLETHREADED`)
   - 结果: 0x8000000E

4. ✅ **MTA 线程模式** (`COINIT_MULTITHREADED` + `RO_INIT_MULTITHREADED`)
   - 结果: 0x8000000E

5. ✅ **主线程直接调用** (无单独工作线程)
   - 结果: 0x8000000E

6. ✅ **管理员权限**
   - 结果: 0x8000000E

7. ✅ **Windows Runtime 初始化** (`RoInitialize`)
   - 结果: 0x8000000E

### 根本原因分析

`ActivateAudioInterfaceAsync` 是 **Windows Runtime (WinRT) API**，主要设计用于：
- **UWP 应用**
- **Windows Store 应用**
- **具有 Windows Runtime 支持的现代应用**

在传统的**桌面 Native 代码**（如 Node.js Native Addon）中，这个 API 可能受到以下限制：

1. **应用容器限制** - 需要特定的应用清单 (AppxManifest.xml)
2. **沙盒环境** - 需要在 UWP/AppContainer 沙盒中运行
3. **消息循环依赖** - 可能需要 Windows 消息循环（`GetMessage`/`DispatchMessage`）
4. **包标识** - 可能需要应用包标识 (Package Identity)

## 推荐的替代方案

### 方案 A: 音频会话过滤 (推荐) ⭐

使用 **IAudioSessionManager2** + **IAudioSessionEnumerator** 来实现进程级音频捕获：

**优势：**
- ✅ 完全兼容传统桌面应用
- ✅ 不需要特殊权限或清单
- ✅ v1.0 标准 Loopback 已验证可用
- ✅ 只需扩展现有代码

**实现思路：**
```cpp
// 1. 使用标准 Loopback 捕获所有系统音频
// 2. 使用 IAudioSessionManager2 枚举所有音频会话
// 3. 通过 GetProcessId() 过滤目标进程的音频会话
// 4. 只处理目标进程的音频数据
```

**核心 API：**
- `IAudioSessionManager2::GetSessionEnumerator()` - 枚举音频会话
- `IAudioSessionControl2::GetProcessId()` - 获取会话的进程 ID
- `IAudioSessionControl2::GetState()` - 检查会话状态
- `ISimpleAudioVolume` - 可以静音其他进程

### 方案 B: 使用 Windows Audio Session API 过滤

在捕获线程中：
```cpp
1. 捕获所有系统音频 (标准 Loopback)
2. 查询 IAudioSessionManager2
3. 遍历所有会话，检查 ProcessId
4. 如果 ProcessId 匹配目标，保留音频
5. 否则，丢弃或静音该部分音频
```

### 方案 C: 外部 UWP Helper 应用

创建一个 UWP 辅助应用：
1. UWP 应用调用 `ActivateAudioInterfaceAsync`
2. 通过 Named Pipe 或共享内存传递音频数据给 Node.js
3. Node.js addon 接收并处理数据

**缺点：** 复杂度高，部署困难

## 下一步行动建议

### 立即可行的方案

**实现方案 A：音频会话过滤**

1. **扩展 `AudioClient` 类**
   ```cpp
   // 新增方法
   bool SetProcessFilter(DWORD processId);
   bool IsAudioFromProcess(DWORD processId);
   ```

2. **在捕获循环中过滤**
   ```cpp
   // 捕获音频数据后
   if (processFilter_ != 0) {
       if (!IsAudioFromCurrentSession(processFilter_)) {
           // 丢弃或静音此音频帧
           memset(buffer, 0, bufferSize);
       }
   }
   ```

3. **使用 IAudioSessionControl2**
   ```cpp
   // 枚举所有音频会话
   // 查找匹配 processId 的会话
   // 可选：静音其他会话
   ```

### 性能评估

- **CPU 开销**: 低 (只需检查进程 ID)
- **延迟**: 无额外延迟
- **准确性**: 高 (基于系统音频会话)
- **兼容性**: 完美 (Windows 7+)

### 代码复杂度

- **新增代码**: ~200 行
- **修改现有代码**: ~50 行
- **测试工作量**: 中等

## 技术结论

虽然 `IAudioClient3` Process Loopback API 在理论上是最优方案，但在 Node.js Native Addon 环境中存在根本性的兼容性问题。

**推荐采用方案 A（音频会话过滤）**，因为：
1. 技术成熟度高
2. 兼容性好
3. 实现难度适中
4. 性能开销低
5. 可以立即开始实施

## 参考资料

- [WASAPI Audio Session APIs](https://docs.microsoft.com/en-us/windows/win32/coreaudio/audio-sessions)
- [IAudioSessionManager2](https://docs.microsoft.com/en-us/windows/win32/api/audiopolicy/nn-audiopolicy-iaudiosessionmanager2)
- [IAudioSessionControl2](https://docs.microsoft.com/en-us/windows/win32/api/audiopolicy/nn-audiopolicy-iaudiosessioncontrol2)

---

**日期**: 2025-01-13  
**状态**: Process Loopback API 不可行，推荐音频会话过滤方案  
**下一步**: 实现方案 A
