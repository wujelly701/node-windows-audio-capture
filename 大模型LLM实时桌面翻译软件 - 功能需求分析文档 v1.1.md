# 大模型LLM实时桌面翻译软件 - 功能需求分析文档（完整版v1.1）

## 📋 文档信息

**版本**：v1.1（完整版）  
**创建日期**：2025-01-12  
**最后更新**：2025-01-12  
**文档作者**：需求分析专家  

**主要更新**：
- ✅ MVP阶段优先接入阿里Gummy一体化模型
- ✅ 重新设计音频源选择交互（参考OBS Studio）
- ✅ 新增窗口选择器详细设计（三种选择模式）
- ✅ 规划AI内容分析功能（视频总结、脑图生成等）
- ✅ 麦克风捕获简化策略（默认系统麦克风）

---

## 目录

1. [项目概述](#一项目概述)
2. [核心功能需求](#二核心功能需求)
   - 2.1 [音频源捕获与管理](#21-音频源捕获与管理)
   - 2.2 [翻译引擎系统](#22-翻译引擎系统)
   - 2.3 [实时字幕显示](#23-实时字幕显示)
   - 2.4 [会话管理系统](#24-会话管理系统)
   - 2.5 [字幕文件导出](#25-字幕文件导出)
   - 2.6 [快捷键控制](#26-快捷键控制)
   - 2.7 [本地视频翻译](#27-本地视频翻译)
   - 2.8 [AI内容分析功能](#28-ai内容分析功能)
3. [非功能性需求](#三非功能性需求)
4. [技术架构设计](#四技术架构设计)
5. [数据库设计](#五数据库设计)
6. [用户界面设计](#六用户界面设计)
7. [开发优先级与路线图](#七开发优先级与路线图)
8. [风险与挑战](#八风险与挑战)
9. [关键技术挑战与解决方案](#九关键技术挑战与解决方案)
10. [总结与建议](#十总结与建议)
11. [附录](#十一附录)

---

## 一、项目概述

### 1.1 项目定位

开发一款基于大模型LLM的实时音频翻译桌面应用，支持精准的单源音频捕获、实时字幕翻译、会话管理和字幕导出功能。该软件旨在为观看外语视频、参加跨语言会议、学习外语内容的用户提供无缝的实时翻译体验。

### 1.2 核心价值

- **🎯 精准捕获**：类似OBS Studio的窗口选择器，精准捕获特定应用/浏览器标签页音频，避免噪音干扰
- **⚡ 实时翻译**：使用阿里Gummy等一体化模型，实现低延迟（< 2秒）的实时语音识别和翻译
- **📁 会话隔离**：视频、会议、音频场景独立管理，支持按会话导出字幕文件，便于后续使用
- **🎨 字幕自定义**：字幕框可拖动、可配置样式，支持位置记忆，提供最佳观看体验
- **💾 字幕导出**：生成标准字幕文件（SRT/VTT等），可用于视频播放器、会议记录等场景
- **🤖 智能分析**：AI自动总结内容、生成思维导图、提取关键词等增值功能

### 1.3 目标用户

**主要用户群体**：
- **学习者**：观看YouTube、Coursera等平台的外语教学视频
- **职场人士**：参加Zoom、Teams等平台的跨语言在线会议
- **内容消费者**：观看外语电影、纪录片、播客等内容
- **内容创作者**：需要为视频添加多语言字幕的博主、UP主

**用户痛点**：
- 现有字幕工具无法实时翻译音频
- 会议翻译工具无法按会话保存和导出
- 视频平台自带字幕质量差或无中文字幕
- 无法针对特定窗口/标签页进行音频捕获

### 1.4 产品定位

**竞品分析**：
- **Google翻译/有道翻译**：仅支持文本翻译，无实时音频功能
- **字幕通**：支持音频翻译但无会话管理和导出功能
- **腾讯会议/Zoom自动字幕**：仅限会议场景，无法用于视频和其他音频

**差异化优势**：
- ✅ 支持任意应用/浏览器标签页的音频捕获
- ✅ 会话化管理，支持按场景分类和导出
- ✅ 多种翻译引擎可选，成本可控
- ✅ 本地离线模型支持，保护隐私
- ✅ AI内容分析，自动生成摘要和脑图

---

## 二、核心功能需求

### 2.1 音频源捕获与管理

#### 2.1.1 音频源类型与选择策略

**支持的音频源类型**：

1. **🎤 麦克风音频**（外部输入）
2. **🖥️ 应用程序窗口**（系统音频输出，包括浏览器）

**音频源选择策略**：

| 音频源类型 | 选择方式 | 使用场景 | 技术实现 |
|-----------|---------|---------|---------|
| 麦克风 | 自动使用系统默认麦克风 | 现场翻译、语音输入 | Web Audio API |
| 应用窗口 | OBS式窗口选择器 | 所有应用（包括浏览器、播放器、会议软件）| node-windows-audio-capture v2.1 |

**设计原则**：
- **简化优先**：麦克风默认使用系统设备，无需用户选择
- **统一捕获**：浏览器音频与其他应用统一处理，通过进程 PID 捕获
- **精准隔离**：使用 `node-windows-audio-capture` v2.1 动态静音控制，自动隔离非目标进程
- **可视化**：提供实时预览和音频波形，确保捕获正确

---

#### 2.1.2 麦克风音频捕获（简化策略）

**功能描述**：
- 🎤 **默认行为**：自动使用系统默认麦克风，无需用户手动选择
- **目的**：简化操作流程，确保一致性，降低新手门槛
- **适用场景**：
  - 现场会议实时翻译
  - 用户口述内容翻译
  - 外部音频设备输入

**技术实现**：

```javascript
// 自动获取系统默认麦克风
async function getDefaultMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        deviceId: 'default',  // 使用系统默认设备
        echoCancellation: true,  // 回声消除
        noiseSuppression: true,  // 噪音抑制
        autoGainControl: true    // 自动增益
      } 
    });
    
    console.log('✅ 默认麦克风捕获成功');
    return stream;
  } catch (error) {
    console.error('❌ 麦克风访问失败:', error);
    showMicrophonePermissionError();
  }
}
```

**高级选项（设置中提供）**：
- 允许用户在设置中查看所有可用麦克风设备
- 高级用户可手动切换麦克风（如外接USB麦克风）
- 显示麦克风状态和音量实时预览

**配置界面**（设置面板）：

```markdown
┌──────────────────────────────────────┐
│ 🎤 麦克风设置                        │
├──────────────────────────────────────┤
│ 当前麦克风: 系统默认                 │
│ 设备名称: Realtek High Definition    │
│           Audio                      │
│                                      │
│ [🔄 切换麦克风设备]                  │
│                                      │
│ 可用设备列表:                        │
│  ⦿ 系统默认 (推荐)                  │
│  ○ Realtek HD Audio                 │
│  ○ USB Microphone                   │
│                                      │
│ 音频增强:                            │
│  ☑️ 回声消除                         │
│  ☑️ 噪音抑制                         │
│  ☑️ 自动增益控制                     │
│                                      │
│ [保存设置]                           │
└──────────────────────────────────────┘
```

---

#### 2.1.3 窗口选择器详细设计（核心功能）

**设计理念**：
参考OBS Studio的窗口捕获功能，提供直观、高效的窗口选择体验。

**系统音频配置主界面**：

```markdown
┌─────────────────────────────────────────────────────────┐
│  🔊 系统音频配置                                    ✕    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📌 选择捕获类型                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⦿ 应用程序音频                                   │   │
│  │   捕获选定应用程序的音频输出                     │   │
│  │   (浏览器、PotPlayer、网易云音乐、Zoom等)        │   │
│  │   ✨ 使用 v2.1 动态静音控制，90%+ 音频纯度      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○ 麦克风音频                                     │   │
│  │   使用系统默认麦克风 (自动选择)                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🎯 选择音频源                                           │
│                                                         │
│  💡 可视化选择器：点击下方按钮，然后选择要捕获的应用窗口│
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  当前选择：地球超声波 - LibreTV播放器 - Chrome   │  │
│  │  🎵 窗口ID: window/328070100                     │  │
│  │  📊 进程: chrome.exe (PID: 48265)               │  │
│  │                                                  │  │
│  │  音频预览: [████████░░] 80%                     │  │
│  │  波形: ▁▂▃▅▆▇█▇▆▅▃▂▁                            │  │
│  │                                                  │  │
│  │  [🔄 更改选择]  [🎧 测试音频]  [🔍 高级选项]    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ▶ 🔧 高级选项                                          │
│     □ 仅捕获窗口激活时的音频                            │
│     □ 自动跟随窗口状态 (最小化时暂停)                   │
│     采样率: [48kHz ▼]  位深: [16bit ▼]                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                              [取消]  [✓ 确认配置]       │
└─────────────────────────────────────────────────────────┘
```

**窗口选择弹窗（三种模式）**：

点击"更改选择"按钮后弹出：

```markdown
┌─────────────────────────────────────────────────────────┐
│  选择应用程序/窗口              [🔍 搜索框]        ✕   │
├─────────────────────────────────────────────────────────┤
│  📑 列表模式  🎨 十字准星模式                           │
│                                                         │
│  [🔍 搜索窗口或进程名称...]      🔄 刷新  🖼️ 预览开/关 │
│                                                         │
│  ┌──────────────┬──────────────┬──────────────┬────┐  │
│  │ 🖥️ PID:15776 │ 📊 PID:30926 │ 📺 PID:54778 │... │  │
│  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │    │  │
│  │  │[截图]  │  │  │[截图]  │  │  │[截图]  │  │    │  │
│  │  │窗口    │  │  │窗口    │  │  │窗口    │  │    │  │
│  │  │预览图  │  │  │预览图  │  │  │预览图  │  │    │  │
│  │  └────────┘  │  └────────┘  │  └────────┘  │    │  │
│  │ INSTALLmd   │ 环境部署      │  PotPlayer    │    │  │
│  │ - redtime   │ - Chrome     │  🔊 正在播放  │    │  │
│  │ 进程:code   │  进程:chrome │  进程:potpl   │    │  │
│  │ .exe        │  .exe        │  ayer.exe     │    │  │
│  └──────────────┴──────────────┴──────────────┴────┘  │
│                                                         │
│  ┌──────────────┬──────────────┬──────────────┬────┐  │
│  │ 🌐 PID:48265 │ 🗂️ PID:12340│ 🖼️ PID:44037│... │  │
│  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │    │  │
│  │  │[截图]  │  │  │[截图]  │  │  │[截图]  │  │    │  │
│  │  │窗口    │  │  │窗口    │  │  │窗口    │  │    │  │
│  │  │预览图  │  │  │预览图  │  │  │预览图  │  │    │  │
│  │  └────────┘  │  └────────┘  │  └────────┘  │    │  │
│  │ 地球超声波  │  课堂剪报     │  NVIDIA...   │    │  │
│  │ - Chrome    │  进程: 未知   │  GeForce...  │    │  │
│  │ 🔊 正在播放 │              │  进程: nvid  │    │  │
│  │ 进程:chrome │              │  ...lay.exe  │    │  │
│  └──────────────┴──────────────┴──────────────┴────┘  │
│                                                         │
│  [加载更多...]                                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                    [取消]  [🎯 选择此窗口]│
└─────────────────────────────────────────────────────────┘
```

**窗口选择器三种模式详解**：

---

**模式1: 📑 列表模式（默认推荐）**

**功能特点**：
- 显示所有可见窗口的卡片式网格列表
- 自动排序（正在播放音频的窗口优先）
- 实时刷新窗口列表（支持新打开的窗口）

**卡片信息**：
- **窗口截图**：实时缩略图预览（150x100px）
- **窗口标题**：完整标题（鼠标悬停显示）
- **进程信息**：进程名称 + PID
- **音频状态**：🔊 正在播放 / 🔇 静音

**交互功能**：
- 鼠标悬停：高亮显示，显示完整标题和更多信息
- 单击选择：选中窗口，底部显示"选择此窗口"按钮
- 双击：直接选择并关闭弹窗
- 右键菜单：刷新预览、查看详细信息、排除此窗口

**搜索过滤**：
- 支持按窗口标题搜索
- 支持按进程名搜索
- 支持按PID搜索
- 实时过滤结果

**示例代码**：

```javascript
// 枚举所有窗口
async function enumerateWindows() {
  const windows = await ipcRenderer.invoke('get-all-windows');
  
  // 按音频状态排序（正在播放的窗口优先）
  windows.sort((a, b) => {
    if (a.isPlayingAudio && !b.isPlayingAudio) return -1;
    if (!a.isPlayingAudio && b.isPlayingAudio) return 1;
    return 0;
  });
  
  return windows.map(win => ({
    id: win.id,
    title: win.title,
    processName: win.processName,
    pid: win.pid,
    thumbnail: win.thumbnail,  // Base64截图
    isPlayingAudio: win.isPlayingAudio,
    bounds: win.bounds
  }));
}
```

---

**模式2: 🎨 十字准星模式（高级用户）**

**功能特点**：
- 最直观的选择方式，直接点击屏幕上的窗口
- 全屏暗化，高亮显示当前鼠标下的窗口
- 实时显示窗口信息（跟随鼠标）

**交互流程**：

```markdown
1. 用户点击"十字准星模式"
   ↓
2. 整个屏幕变暗（50%透明黑色遮罩）
   ↓
3. 鼠标光标变为十字准星 ✛
   ↓
4. 鼠标移动时：
   - 当前窗口边框高亮（3px红色边框）
   - 显示浮动信息框（跟随鼠标）
   ↓
5. 用户点击确认选择
   ↓
6. 屏幕恢复正常，返回配置界面
```

**屏幕效果示意**：

```markdown
┌────────────────────────────────────────────────────┐
│  屏幕变暗 (50% 透明度)                              │
│                                                    │
│                                                    │
│    ┌─────────────────────┐  ← 高亮窗口            │
│    │  🔴 3px红色边框     │    (鼠标悬停的窗口)    │
│    │                     │                        │
│    │  Chrome Browser     │                        │
│    │                     │                        │
│    │  YouTube - Python   │                        │
│    │                     │                        │
│    └─────────────────────┘                        │
│                                                    │
│    ┌──────────────────────────────┐               │
│    │ ℹ️ 窗口信息 (跟随鼠标)       │               │
│    ├──────────────────────────────┤               │
│    │ 标题: Chrome - YouTube       │               │
│    │ 进程: chrome.exe (PID:12345) │               │
│    │ 音频: 🔊 正在播放            │               │
│    │                              │               │
│    │ 💡 点击选择此窗口             │               │
│    └──────────────────────────────┘               │
│                                                    │
│  ✛ 鼠标光标 (十字准星)                             │
│                                                    │
│                                                    │
│  提示: 移动鼠标选择窗口，点击确认 | 按ESC取消      │
└────────────────────────────────────────────────────┘
```

**技术实现**：

```javascript
// Electron主进程 - 十字准星选择器
const { screen, BrowserWindow } = require('electron');

function createCrosshairWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // 创建全屏透明窗口
  const crosshairWin = new BrowserWindow({
    width: width,
    height: height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  crosshairWin.loadFile('crosshair.html');
  
  // 监听鼠标移动
  crosshairWin.webContents.on('ipc-message', (event, channel, data) => {
    if (channel === 'mouse-move') {
      const { x, y } = data;
      const windowAtPoint = getWindowAtPoint(x, y);
      
      // 高亮窗口
      highlightWindow(windowAtPoint);
      
      // 发送窗口信息到渲染进程
      crosshairWin.webContents.send('window-info', {
        title: windowAtPoint.title,
        process: windowAtPoint.processName,
        pid: windowAtPoint.pid,
        isPlayingAudio: windowAtPoint.isPlayingAudio
      });
    }
  });
  
  // 监听点击
  crosshairWin.webContents.on('ipc-message', (event, channel, data) => {
    if (channel === 'window-selected') {
      const selectedWindow = data.window;
      
      // 保存选择
      saveSelectedWindow(selectedWindow);
      
      // 关闭十字准星窗口
      crosshairWin.close();
      
      // 返回主界面
      showMainWindow();
    }
  });
  
  // ESC键取消
  crosshairWin.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      crosshairWin.close();
      showMainWindow();
    }
  });
}

// 获取鼠标位置的窗口
function getWindowAtPoint(x, y) {
  // 使用Windows API获取窗口句柄
  const hwnd = WindowFromPoint(x, y);
  
  // 获取窗口信息
  const windowInfo = getWindowInfo(hwnd);
  
  return windowInfo;
}

// 高亮显示窗口
function highlightWindow(window) {
  // 绘制红色边框
  drawBorder(window.bounds, 'red', 3);
}
```

---

#### 2.1.4 音频捕获技术实现

**使用 node-windows-audio-capture v2.1 实现**：

本项目使用自主开发的 `node-windows-audio-capture` Node.js 原生插件，提供高性能、低延迟的音频捕获功能。

**核心特性**：
- ✅ **基于 WASAPI Loopback** - Windows 官方音频捕获 API
- ✅ **动态静音控制 v2.1** - 自动隔离非目标进程，音频纯度 90%+
- ✅ **进程级捕获** - 精准捕获指定进程（PID）的音频
- ✅ **允许/阻止列表** - 灵活控制哪些进程被静音
- ✅ **低延迟** - < 100ms 延迟
- ✅ **EventEmitter 架构** - 基于事件的异步回调

**代码示例**：

```javascript
const { AudioProcessor, enumerateProcesses } = require('node-windows-audio-capture');

// 1. 枚举所有音频进程
const processes = enumerateProcesses();
console.log('可用音频进程:', processes);
// 输出: [{ pid: 12345, name: 'chrome.exe' }, ...]

// 2. 查找目标进程（如 Chrome 浏览器）
const chromeProcess = processes.find(p => 
  p.name.toLowerCase().includes('chrome')
);

// 3. 创建音频处理器
const processor = new AudioProcessor({
    processId: chromeProcess.pid,
    callback: (audioData) => {
        // audioData: Buffer，包含 PCM 音频数据
        console.log(`捕获音频: ${audioData.length} 字节`);
        
        // 发送到翻译引擎
        sendToTranslationEngine(audioData);
    }
});

// 4. 启动并配置静音控制
processor.start();

// ⚡ v2.1 核心功能：自动静音其他进程
processor.setMuteOtherProcesses(true);

// 可选：设置允许列表（保留系统声音）
const systemAudio = processes.find(p => p.name === 'audiodg.exe');
if (systemAudio) {
    processor.setAllowList([systemAudio.pid]);
}

// 5. 开始捕获
processor.startCapture();

// 6. 停止时自动恢复所有静音状态
processor.stopCapture();
processor.stop();  // 自动调用 RestoreMuteStates()
```

**动态静音控制原理**：

```markdown
用户选择 Chrome (PID: 12345)
    ↓
启用 setMuteOtherProcesses(true)
    ↓
系统枚举所有音频会话:
  - PotPlayer.exe (PID: 6789) → 静音 🔇
  - Zoom.exe (PID: 54321) → 静音 🔇
  - chrome.exe (PID: 12345) → 保持原状 🔊
  - audiodg.exe (PID: 999) → 允许列表，保持原状 🔊
    ↓
音频纯度: 90%+ ✅
    ↓
停止捕获时自动恢复所有进程的原始静音状态
```

**多进程应用支持（如 Chrome）**：

Chrome 等应用使用多进程架构，音频可能由不同的子进程播放。v2.1 自动保护所有同名进程：

```javascript
// 自动保护所有 Chrome 进程
const chromeProcesses = processes.filter(p => 
    p.name.toLowerCase() === 'chrome.exe'
);
const chromePids = chromeProcesses.map(p => p.pid);

processor.setAllowList(chromePids);  // 保护所有 Chrome 进程
processor.setMuteOtherProcesses(true);
```

**错误处理**：

```javascript
processor.on('error', (error) => {
    console.error('音频捕获错误:', error);
    
    // 错误类型判断
    if (error.code === 'PROCESS_NOT_FOUND') {
        showNotification('目标进程已关闭，请重新选择');
    } else if (error.code === 'AUDIO_DEVICE_ERROR') {
        showNotification('音频设备错误，请检查系统音频设置');
    }
    
    // 停止捕获
    processor.stop();
});
```

**性能监控**：

```javascript
// 监控音频捕获状态
let packetsCount = 0;
let totalBytes = 0;

processor.on('data', (audioData) => {
    packetsCount++;
    totalBytes += audioData.length;
    
    // 每秒统计一次
    if (packetsCount % 100 === 0) {
        const kbps = (totalBytes / 1024).toFixed(2);
        console.log(`捕获统计: ${packetsCount} 包, ${kbps} KB`);
    }
});
```

---

#### 2.1.5 音频预览与测试

**实时音频波形预览**：

```markdown
┌──────────────────────────────────────┐
│ 🎧 音频预览                          │
├──────────────────────────────────────┤
│ 当前音源: Chrome - YouTube           │
│                                      │
│ 音量: [████████░░] 80%              │
│                                      │
│ 实时波形:                            │
│ ▁▂▃▅▆▇█▇▆▅▃▂▁▁▂▃▅▆▇█▇▆▅▃▂▁          │
│                                      │
│ 采样率: 48kHz | 位深: 16bit          │
│ 延迟: 120ms | 缓冲: 512samples      │
│                                      │
│ 状态: ✅ 正常捕获                    │
│                                      │
│ [▶️ 播放测试音频 (3秒)]              │
│ [⏸️ 暂停]  [🔄 刷新]  [⚙️ 高级]    │
└──────────────────────────────────────┘
```

**测试流程**：
1. 选择音频源后自动开始预览
2. 显示实时音量和波形
3. 用户点击"播放测试"，播放3秒音频片段
4. 确认音频正确后点击"确认配置"

**异常提示**：
- 如无声音：提示检查音频源或重新选择
- 如音量过低：提示调整系统音量或启用自动增益
- 如音频异常：提示重新捕获或更换音频源

---

#### 2.1.5 音频处理

**音频处理流程**：

```markdown
原始音频捕获
    ↓
降噪处理 (可选)
    ↓
音量标准化
    ↓
静音检测
    ↓
音频编码 (PCM → Base64)
    ↓
发送到翻译引擎
```

**配置项**：

```markdown
┌──────────────────────────────────────┐
│ 🔧 音频处理设置                      │
├──────────────────────────────────────┤
│ 采样率: [48kHz ▼]                    │
│  • 16kHz (最低延迟，质量一般)        │
│  • 44.1kHz (标准CD质量)              │
│  • 48kHz (推荐，平衡质量和性能)      │
│                                      │
│ 位深: [16bit ▼]                      │
│                                      │
│ 降噪等级: [中 ▼]                     │
│  • 关闭                              │
│  • 低 (适合安静环境)                 │
│  • 中 (推荐)                         │
│  • 高 (适合嘈杂环境，可能影响音质)   │
│                                      │
│ 静音检测:                            │
│  ☑️ 启用静音检测                     │
│  阈值: [████░░░░░░] -40dB           │
│  最小静音时长: [1.0] 秒              │
│                                      │
│ 音频缓冲:                            │
│  缓冲大小: [512 samples ▼]           │
│  (越小延迟越低，但可能不稳定)        │
│                                      │
│ [恢复默认]  [保存设置]               │
└──────────────────────────────────────┘
```

---

### 2.2 翻译引擎系统

#### 2.2.1 引擎配置模式设计

**核心理念**：
提供三种灵活的配置模式，满足不同用户的需求场景：

| 配置模式 | 特点 | 适用人群 | 成本 | 延迟 |
|---------|------|---------|------|------|
| **一体化API** | 配置简单、一步到位 | 新手用户、追求便利 | 中-高 | 最低 |
| **分离式API** | 灵活组合、成本可控 | 高级用户、预算有限 | 低-中 | 中等 |
| **本地离线模型** | 隐私保护、零成本 | 技术用户、重视隐私 | 免费 | 较高 |

**设计优势**：
- ✅ **渐进式学习**：新手从一体化开始，逐步升级到分离式或本地
- ✅ **灵活组合**：分离式支持混搭不同服务，实现最优性价比
- ✅ **成本优化**：从免费到付费，用户自由选择
- ✅ **扩展性强**：新增服务只需添加适配器，无需改动架构

---

#### 2.2.2 模式选择界面

**主配置界面**：

```markdown
┌────────────────────────────────────────────────────┐
│ 🎯 翻译引擎配置                         [❓帮助]   │
├────────────────────────────────────────────────────┤
│                                                    │
│ 📌 选择配置模式                                    │
│                                                    │
│  ⦿ 一体化API（语音识别+翻译一步完成）              │
│     💡 推荐新手使用，配置简单，延迟更低            │
│     示例: 阿里Gummy、OpenAI Realtime API          │
│     成本: ¥0.01/分钟 | 延迟: ~0.8s               │
│                                                    │
│  ○ 分离式API（独立配置识别和翻译）                 │
│     💡 适合高级用户，可自由组合，成本可控          │
│     示例: Whisper识别 + DeepSeek翻译              │
│     成本: ¥0.003/分钟 | 延迟: ~1.2s              │
│                                                    │
│  ○ 本地离线模型（完全本地运行）                    │
│     💡 保护隐私，零成本，需要GPU加速               │
│     示例: Whisper.cpp + Llama.cpp                 │
│     成本: ¥0 | 延迟: ~1.5s | 需要6GB+显存         │
│                                                    │
│ [📊 详细对比] [💡 帮我选择]                        │
│                                                    │
├────────────────────────────────────────────────────┤
│ [下一步 →]                                         │
└────────────────────────────────────────────────────┘
```

---

#### 2.2.3 模式一：一体化API配置（MVP优先实现）

**支持的服务商**：

| 服务商 | 模型 | 延迟 | 成本/分钟 | 特点 |
|-------|------|------|----------|------|
| **阿里Gummy** ⭐ | gummy-realtime-v1 | 0.8s | ¥0.01 | 性价比高，推荐 |
| OpenAI Realtime | gpt-4o-realtime | 0.5s | ¥0.05 | 质量最好，贵 |
| 讯飞星火 | spark-audio | 1.0s | ¥0.02 | 国内服务，稳定 |
| Google Cloud | speech-translation | 0.9s | ¥0.03 | 多语言支持 |
| Azure | cognitive-services | 1.1s | ¥0.04 | 企业级 |

**配置界面（阿里Gummy示例）**：

```markdown
┌────────────────────────────────────────────────────┐
│ 🎯 一体化API配置 - 阿里巴巴                       │
├────────────────────────────────────────────────────┤
│                                                    │
│ 📋 基础配置                                        │
│                                                    │
│ API Key:                                          │
│  [••••••••••••••••••••••]  [🔑 获取API Key]       │
│  [🧪 测试连接]  状态: 🟢 连接正常 (延迟: 0.8s)    │
│                                                    │
│ 模型选择: [gummy-realtime-v1 ▼]                    │
│  • gummy-realtime-v1 (推荐，速度快)                │
│                                                    │
│ 语言设置:                                          │
│  源语言: [自动检测 ▼]                              │
│   • 自动检测 (推荐)                                │
│   • 英语、中文、日语、韩语... (30+语言)           │
│                                                    │
│  目标语言: [中文简体 ▼]                            │
│                                                    │
├────────────────────────────────────────────────────┤
│ ⚙️ 高级选项                                        │
│                                                    │
│  ☑️ 启用流式输出 (逐字显示，降低延迟)              │
│  ☑️ 增量输出 (实时更新译文)                        │
│  ☑️ 启用VAD (静音检测，节省成本)                   │
│                                                    │
│  音频格式: [PCM 16kHz 16bit]                      │
│  发送间隔: [500ms ▼]                              │
│   • 300ms (最低延迟，成本高)                       │
│   • 500ms (推荐，平衡延迟和成本)                   │
│   • 1000ms (低成本，延迟稍高)                      │
│                                                    │
│  重连策略:                                         │
│   最大重连次数: [5 ▼]                             │
│   重连延迟: 指数退避 (1s, 2s, 4s, 8s, 16s)       │
│                                                    │
├────────────────────────────────────────────────────┤
│ 💰 成本预估                                        │
│                                                    │
│  每分钟: ¥0.01                                     │
│  每小时: ¥0.60                                     │
│  每天使用2小时: ¥1.20/天 ≈ ¥36/月                 │
│                                                    │
│  [📊 查看详细计费说明]                             │
│                                                    │
├────────────────────────────────────────────────────┤
│ 📖 使用统计                                        │
│                                                    │
│  今日调用: 1,234次                                 │
│  今日成本: ¥12.50                                  │
│  本月成本: ¥128.30                                 │
│  [查看详细账单]                                    │
│                                                    │
├────────────────────────────────────────────────────┤
│ [← 返回]  [💾 保存配置]  [📖 查看文档]             │
└────────────────────────────────────────────────────┘
```

**技术实现（WebSocket客户端）**：

```javascript
// 阿里Gummy一体化客户端
class GummyIntegratedClient {
    /**
   * 初始化客户端
   */
  initialize(config: GummyConfig): void {
    if (!config.apiKey) {
      throw new Error('请先在设置中配置 API Key');
    }

    this.config = {
      model: 'gummy-realtime-v1',
      sourceLanguage: 'zh',
      targetLanguage: 'en',
      sampleRate: 16000,
      format: 'pcm',
      enableVad: true,
      ...config,
    };
  }
  
    /**
   * 连接到 Gummy API
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new Error('Already connected to Gummy API');
    }

    if (!this.config) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    const config = this.config;

    return new Promise((resolve, reject) => {
      try {
        // Gummy API WebSocket URL (官方文档)
        const wsUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/inference`;
        
        // 设置 WebSocket 认证 header
        const headers = {
          'Authorization': `bearer ${config.apiKey}`,
          'X-DashScope-DataInspection': 'enable',
        };

        this.ws = new WebSocket(wsUrl, { headers });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          
          // 发送 run-task 指令
          this.sendRunTaskCommand();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code: number) => {
          this.handleClose(code);
        });
        
        // 不在这里 resolve，等待 task-started 事件
        this.once('session-created', () => {
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 发送 run-task 指令（根据官方文档）
   */
  private sendRunTaskCommand(): void {
    if (!this.ws || !this.config) {
      throw new Error('WebSocket not ready or config not set');
    }

    // 生成 task_id（32位 UUID）
    const taskId = require('crypto').randomBytes(16).toString('hex');
    this.sessionId = taskId;

    const runTaskCmd = {
      header: {
        streaming: 'duplex',
        task_id: taskId,
        action: 'run-task',
      },
      payload: {
        model: this.config.model || 'gummy-realtime-v1',
        parameters: {
          sample_rate: this.config.sampleRate || 16000,
          format: this.config.format || 'pcm',
          source_language: this.config.sourceLanguage || null,
          transcription_enabled: true,
          translation_enabled: true,
          translation_target_languages: [this.config.targetLanguage || 'en'],
        },
        input: {},
        task: 'asr',
        task_group: 'audio',
        function: 'recognition',
      },
    };

    this.ws.send(JSON.stringify(runTaskCmd));
  }

  /**
   * 发送 finish-task 指令
   */
  private sendFinishTaskCommand(): void {
    if (!this.ws || !this.sessionId) {
      return;
    }

    const finishTaskCmd = {
      header: {
        action: 'finish-task',
        task_id: this.sessionId,
        streaming: 'duplex',
      },
      payload: {
        input: {},
      },
    };

    this.ws.send(JSON.stringify(finishTaskCmd));
  }

  /**
   * 处理接收到的消息（根据官方文档）
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      // 显式使用 UTF-8 解码（修复 Windows 乱码问题）
      const text = Buffer.isBuffer(data) ? data.toString('utf-8') : data.toString();
      const message = JSON.parse(text);
      const event = message.header?.event;
      
      console.debug(`[GUMMY] Received message: event=${event}`);
      
      switch (event) {
        case 'task-started':
          // 任务已开启
          console.log('[GUMMY] Task started successfully');
          this.emit('session-created', this.sessionId!);
          break;

        case 'result-generated':
          // 包含识别和翻译结果
          if (message.payload?.output) {
            const output = message.payload.output;
            
            console.debug('[GUMMY] Result generated:', {
              hasTranscription: !!output.transcription,
              hasTranslations: !!(output.translations && output.translations.length > 0)
            });
            
            // 处理识别结果（只发送中间结果，最终结果由 translation-result 处理）
            if (output.transcription) {
              const transcription = output.transcription;
              console.info(`[GUMMY] Transcription: "${transcription.text}" (final=${transcription.sentence_end})`);
              
              // 只发送非最终结果（中间识别），最终结果等待翻译一起发送
              if (!transcription.sentence_end) {
                this.emit('transcript-delta', {
                  transcript: transcription.text,
                  isFinal: false,
                });
              }
            }
            
            // 处理翻译结果
            if (output.translations && output.translations.length > 0) {
              const translation = output.translations[0];
              console.info(`[GUMMY] Translation: "${translation.text}" (lang=${translation.lang}, final=${translation.sentence_end})`);
              
              this.emit('translation-result', {
                original: message.payload.output.transcription?.text || '',
                translation: translation.text,
                targetLang: translation.lang,
                isFinal: translation.sentence_end,
              });
            }
          }
          break;

        case 'task-finished':
          // 任务完成
          console.log('[GUMMY] Task finished');
          this.emit('task-completed');
          break;

        case 'task-failed':
          // 任务失败
          const errorMsg = message.header?.error_message || 'Task failed';
          const errorCode = message.header?.error_code || 'UNKNOWN';
          console.error(`[GUMMY] Task failed: [${errorCode}] ${errorMsg}`);
          
          const error = new Error(`Gummy API error [${errorCode}]: ${errorMsg}`);
          this.emit('error', error);
          break;

        default:
          // 未知消息类型
          console.debug('[GUMMY] Unknown event:', event);
      }
    } catch (error) {
      console.error('[GUMMY] Error parsing API message:', error);
      this.emit('error', error as Error);
    }
  }

  private audioFrameCount = 0; // 计数器

  /**
   * 发送音频数据
   */
  sendAudio(audioData: Buffer | Int16Array): void {
    if (!this.isConnected || !this.ws) {
      console.warn('[GUMMY] Cannot send audio: not connected');
      throw new Error('Not connected to Gummy API');
    }

    try {
      // 转换为 Buffer（如果需要）
      const buffer = audioData instanceof Int16Array 
        ? Buffer.from(audioData.buffer)
        : audioData;

      this.audioFrameCount++;
      
      // 只在第一次和每10秒记录一次（约100帧）
      if (this.audioFrameCount === 1 || this.audioFrameCount % 100 === 0) {
        console.log(`[GUMMY] Sent ${this.audioFrameCount} audio frames (${buffer.length} bytes/frame)`);
      }

      // 发送二进制音频数据
      this.ws.send(buffer, (error) => {
        if (error) {
          console.error(`[GUMMY] Failed to send audio: ${error.message}`);
          this.emit('error', error);
        }
      });
    } catch (error) {
      console.error('[GUMMY] Error sending audio to Gummy API:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * 停止发送音频（结束识别）
   */
  stopAudio(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }

    try {
      // 发送 finish-task 指令
      this.sendFinishTaskCommand();
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
      this.sessionId = null;
      this.emit('disconnected');
    }
  }
}
```

---

#### 2.2.4 模式二：分离式API配置

**组合方案示例**：

| 识别服务 | 翻译服务 | 总成本/分钟 | 总延迟 | 特点 |
|---------|---------|-----------|--------|------|
| Whisper API | DeepSeek ⭐ | ¥0.003 | 1.2s | 性价比之王 |
| Whisper API | GPT-4o | ¥0.025 | 0.9s | 质量最好 |
| 讯飞识别 | 通义千问 | ¥0.005 | 1.5s | 国内服务 |
| 百度识别 | 百度翻译 | ¥0.001 | 2.0s | 最便宜 |

**配置界面**：

```markdown
┌────────────────────────────────────────────────────┐
│ 🎯 分离式API配置                                   │
├────────────────────────────────────────────────────┤
│ 💡 分离式配置可让您自由组合不同的识别和翻译服务， │
│    实现最佳性价比或质量。                          │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【第1步：语音识别引擎】                            │
│                                                    │
│ 识别服务: [Whisper API ▼]                         │
│  • Whisper API (OpenAI，准确率高) ⭐              │
│  • 讯飞语音识别 (中文优秀)                         │
│  • 百度语音识别 (性价比高)                         │
│  • Google Speech-to-Text                          │
│  • Azure Speech Services                          │
│                                                    │
│ API配置:                                           │
│  API Key: [••••••••••••••••••]  [🔑获取]         │
│  API URL: [https://api.openai.com/v1/audio...]   │
│  [🧪 测试] 状态: 🟢 正常 (识别延迟: 0.5s)         │
│                                                    │
│ 识别设置:                                          │
│  源语言: [自动检测 ▼]                              │
│  模型: [whisper-1 ▼]                              │
│  ☑️ 启用时间戳                                     │
│  ☑️ 启用词汇提示 (提高专业术语识别)                │
│                                                    │
│ 成本: ¥0.001/分钟                                 │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【第2步：翻译引擎】                                │
│                                                    │
│ 翻译服务: [DeepSeek ▼]                            │
│  • DeepSeek (性价比之王) ⭐                       │
│  • GPT-4o (质量最好)                              │
│  • Claude 3.5 Sonnet (理解力强)                   │
│  • 通义千问 (中文优秀)                             │
│  • Gemini Pro (Google)                            │
│                                                    │
│ API配置:                                           │
│  API Key: [••••••••••••••••••]  [🔑获取]         │
│  API URL: [https://api.deepseek.com/...]         │
│  [🧪 测试] 状态: 🟢 正常 (翻译延迟: 0.3s)         │
│                                                    │
│ 翻译设置:                                          │
│  目标语言: [中文简体 ▼]                            │
│  模型: [deepseek-chat ▼]                          │
│  翻译风格: [标准 ▼]                                │
│   • 标准 (准确直译)                                │
│   • 口语化 (更自然)                                │
│   • 专业术语 (保留术语)                            │
│                                                    │
│  Prompt模板: [查看/编辑]                          │
│  ┌────────────────────────────────────────────┐  │
│  │ 你是专业翻译助手。将以下{source_lang}文本  │  │
│  │ 翻译成{target_lang}。要求：              │  │
│  │ 1. 准确传达原意                          │  │
│  │ 2. 语言自然流畅                          │  │
│  │ 3. 保持专业术语                          │  │
│  │ 只输出译文，不要其他说明。                │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│ 成本: ¥0.002/分钟                                 │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【处理流程预览】                                   │
│                                                    │
│  ┌────────┐   ┌────────┐   ┌────────┐           │
│  │ 音频   │ → │ Whisper│ → │DeepSeek│ → 译文    │
│  │ 输入   │   │ 0.5s   │   │ 0.3s   │           │
│  └────────┘   └────────┘   └────────┘           │
│                                                    │
│  总延迟: ~1.2s                                    │
│  总成本: ¥0.003/分钟 (省80%！) 💰                │
│                                                    │
│ [📊 查看更多组合方案]                              │
│                                                    │
├────────────────────────────────────────────────────┤
│ [← 返回]  [💾 保存配置]  [🧪 开始测试]             │
└────────────────────────────────────────────────────┘
```

**技术实现（分离式适配器）**：

```javascript
// 分离式API适配器
class SeparatedAPIAdapter {
  constructor(config) {
    this.asrConfig = config.asr;
    this.translationConfig = config.translation;
    this.asrClient = null;
    this.translationClient = null;
  }
  
  async connect() {
    // 初始化识别客户端
    this.asrClient = this.createASRClient(this.asrConfig.service);
    await this.asrClient.connect();
    
    // 初始化翻译客户端
    this.translationClient = this.createTranslationClient(
      this.translationConfig.service
    );
    await this.translationClient.connect();
  }
  
  async sendAudio(audioBuffer) {
    try {
      // 步骤1: 语音识别
      const startASR = Date.now();
      const recognizedText = await this.asrClient.recognize(audioBuffer);
      const asrLatency = Date.now() - startASR;
      console.log(`识别耗时: ${asrLatency}ms`);
      
      // 步骤2: 翻译
      const startTranslation = Date.now();
      const translatedText = await this.translationClient.translate(
        recognizedText,
        this.translationConfig.targetLanguage
      );
      const translationLatency = Date.now() - startTranslation;
      console.log(`翻译耗时: ${translationLatency}ms`);
      
      // 返回结果
      if (this.onTranslationUpdate) {
        this.onTranslationUpdate({
          original: recognizedText,
          translated: translatedText,
          timestamp: Date.now(),
          latency: {
            asr: asrLatency,
            translation: translationLatency,
            total: asrLatency + translationLatency
          }
        });
      }
      
    } catch (error) {
      console.error('翻译失败:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }
  
  createASRClient(service) {
    const clients = {
      'whisper': WhisperAPIClient,
      'xunfei': XunfeiASRClient,
      'baidu': BaiduASRClient,
      'google': GoogleSpeechClient
    };
    
    const ClientClass = clients[service];
    if (!ClientClass) {
      throw new Error(`Unknown ASR service: ${service}`);
    }
    
    return new ClientClass(this.asrConfig);
  }
  
  createTranslationClient(service) {
    const clients = {
      'deepseek': DeepSeekClient,
      'gpt4': OpenAIClient,
      'claude': ClaudeClient,
      'qwen': QwenClient,
      'gemini': GeminiClient
    };
    
    const ClientClass = clients[service];
    if (!ClientClass) {
      throw new Error(`Unknown translation service: ${service}`);
    }
    
    return new ClientClass(this.translationConfig);
  }
}

// Whisper API客户端示例
class WhisperAPIClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.model = config.model || 'whisper-1';
  }
  
  async connect() {
    // Whisper API无需建立连接
    console.log('Whisper API ready');
  }
  
  async recognize(audioBuffer) {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.wav');
    formData.append('model', this.model);
    formData.append('language', this.config.language || 'auto');
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });
    
    const result = await response.json();
    return result.text;
  }
}

// DeepSeek客户端示例
class DeepSeekClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.model = config.model || 'deepseek-chat';
    this.promptTemplate = config.prompt;
  }
  
  async connect() {
    console.log('DeepSeek API ready');
  }
  
  async translate(text, targetLanguage) {
    const prompt = this.buildPrompt(text, targetLanguage);
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    const result = await response.json();
    return result.choices[0].message.content.trim();
  }
  
  buildPrompt(text, targetLanguage) {
    return this.promptTemplate
      .replace('{source_lang}', 'detected language')
      .replace('{target_lang}', targetLanguage)
      .replace('{text}', text);
  }
}
```

---

#### 2.2.5 模式三：本地离线模型配置

**系统要求**：
- CPU：Intel i5 / AMD Ryzen 5 及以上
- 内存：16GB+ (推荐32GB)
- 显卡：NVIDIA GPU (6GB+ 显存) 推荐RTX 3060及以上
- 磁盘：20GB+ 可用空间

**支持的模型**：

**语音识别模型（Whisper系列）**：

| 模型 | 大小 | 显存占用 | 速度 | 准确率 |
|-----|------|---------|------|--------|
| whisper-tiny | 39MB | 1GB | 最快 | ⭐⭐⭐☆☆ |
| whisper-base | 74MB | 1GB | 快 | ⭐⭐⭐⭐☆ |
| whisper-small | 244MB | 2GB | 中等 | ⭐⭐⭐⭐☆ |
| whisper-medium | 769MB | 5GB | 慢 | ⭐⭐⭐⭐⭐ |
| whisper-large | 1.5GB | 10GB | 很慢 | ⭐⭐⭐⭐⭐ |

**翻译模型（LLaMA系列）**：

| 模型 | 大小 | 显存占用 | 速度 | 质量 |
|-----|------|---------|------|------|
| llama-3.2-3b-q4 | 2.0GB | 4GB | 快 | ⭐⭐⭐⭐☆ |
| qwen2.5-7b-q4 | 4.4GB | 6GB | 中等 | ⭐⭐⭐⭐⭐ |
| mixtral-8x7b-q4 | 26GB | 28GB | 慢 | ⭐⭐⭐⭐⭐ |

**配置界面**：

```markdown
┌────────────────────────────────────────────────────┐
│ 🎯 本地离线模型配置                                │
├────────────────────────────────────────────────────┤
│ 💡 使用本地模型完全离线运行，保护隐私且零成本。   │
│    建议配置: NVIDIA显卡 (至少6GB显存)             │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【系统要求检测】                                   │
│  ✅ GPU: NVIDIA RTX 3060 (12GB显存)               │
│  ✅ CUDA: 版本 12.1                               │
│  ✅ 内存: 32GB                                     │
│  ✅ 磁盘: 剩余 120GB                               │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【语音识别模型】                                   │
│                                                    │
│ 模型引擎: [Whisper.cpp ▼]                         │
│  • Whisper.cpp (推荐，速度快) ⭐                  │
│  • Faster-Whisper (GPU加速优化)                   │
│  • Whisper原生 (PyTorch)                          │
│                                                    │
│ 已下载模型: (2个)                                  │
│  ⦿ whisper-base (74MB)                            │
│     速度: 快 | 准确率: 中 | 显存: 1GB             │
│     [📊 详情] [🗑️ 删除] [🧪 测试]                 │
│                                                    │
│  ○ whisper-small (244MB)                          │
│     速度: 中 | 准确率: 高 | 显存: 2GB             │
│     [📊 详情] [🗑️ 删除] [🧪 测试]                 │
│                                                    │
│ 推荐下载:                                          │
│  ○ whisper-medium (769MB) - 高准确率              │
│     [📥 下载] [📊 详情]                           │
│                                                    │
│ [📥 管理所有模型]                                  │
│                                                    │
│ 识别设置:                                          │
│  源语言: [自动检测 ▼]                              │
│  计算设备: [CUDA (NVIDIA GPU) ▼]                  │
│   • CUDA (NVIDIA GPU) - 推荐                      │
│   • CPU - 速度较慢                                 │
│   • Metal (Apple Silicon)                         │
│   • DirectML (Windows)                            │
│                                                    │
│ 🎯 预计识别延迟: 0.3s (base模型 + GPU)            │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【翻译模型】                                       │
│                                                    │
│ 模型引擎: [Llama.cpp ▼]                           │
│  • Llama.cpp (推荐，兼容性好) ⭐                  │
│  • Ollama (易用，功能丰富)                        │
│  • vLLM (高性能，需专业配置)                      │
│                                                    │
│ 已下载模型: (1个)                                  │
│  ⦿ llama-3.2-3b-instruct-q4 (2.0GB)              │
│     中英互译 | 速度: 快 | 显存: 4GB               │
│     [📊 详情] [🗑️ 删除] [🧪 测试]                 │
│                                                    │
│ 推荐下载:                                          │
│  ○ qwen2.5-7b-instruct-q4 (4.4GB)                │
│     中文翻译优秀，质量更高                         │
│     [📥 下载] [📊 详情]                           │
│                                                    │
│  ○ mixtral-8x7b-instruct-q4 (26GB)               │
│     多语言支持，质量最好 (需要大显存)              │
│     [📥 下载] [📊 详情]                           │
│                                                    │
│ [📥 从HuggingFace浏览更多]                        │
│                                                    │
│ 翻译设置:                                          │
│  目标语言: [中文简体 ▼]                            │
│  计算设备: [CUDA (NVIDIA GPU) ▼]                  │
│                                                    │
│  生成参数:                                         │
│   Temperature: [0.3] (0=确定 1=创造)              │
│   Max Tokens: [500]                               │
│   Top P: [0.9]                                    │
│                                                    │
│ 🎯 预计翻译延迟: 0.5s (3B模型 + GPU)              │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【性能预估】                                       │
│                                                    │
│  当前配置:                                         │
│  • whisper-base + llama-3.2-3b-q4                │
│                                                    │
│  总延迟: ~0.8s                                    │
│  显存占用: 约5GB                                   │
│  成本: ¥0 💰免费                                  │
│  隐私保护: ⭐⭐⭐⭐⭐ 完全本地                     │
│                                                    │
│ [🧪 实际测试性能]                                  │
│                                                    │
├────────────────────────────────────────────────────┤
│ [← 返回]  [💾 保存配置]  [🚀 开始使用]             │
└────────────────────────────────────────────────────┘
```

**技术实现（本地模型适配器）**：

```javascript
// 本地模型适配器
class LocalModelAdapter {
  constructor(config) {
    this.asrConfig = config.asr;
    this.translationConfig = config.translation;
    this.asrModel = null;
    this.translationModel = null;
  }
  
  async connect() {
    console.log('🔄 Loading local models...');
    
    // 加载Whisper模型
    const WhisperCpp = require('whisper-node');
    this.asrModel = await WhisperCpp.load({
      modelPath: this.asrConfig.modelPath,
      device: this.asrConfig.device || 'cuda'
    });
    console.log('✅ Whisper model loaded');
    
    // 加载Llama模型
    const LlamaCpp = require('llama-node');
    this.translationModel = await LlamaCpp.load({
      modelPath: this.translationConfig.modelPath,
      device: this.translationConfig.device || 'cuda',
      nGpuLayers: 35,  // GPU加速层数
      contextSize: 2048
    });
    console.log('✅ Llama model loaded');
  }
  
  async sendAudio(audioBuffer) {
    try {
      // 步骤1: 本地语音识别
      const startASR = Date.now();
      const recognizedText = await this.asrModel.transcribe(audioBuffer, {
        language: this.asrConfig.language || 'auto',
        task: 'transcribe'
      });
      const asrLatency = Date.now() - startASR;
      console.log(`识别耗时: ${asrLatency}ms`);
      
      // 步骤2: 本地翻译
      const startTranslation = Date.now();
      const prompt = this.buildTranslationPrompt(recognizedText);
      const translatedText = await this.translationModel.generate(prompt, {
        temperature: this.translationConfig.temperature || 0.3,
        maxTokens: this.translationConfig.maxTokens || 500,
        stopSequences: ['\n\n', 'Translation:', 'Original:']
      });
      const translationLatency = Date.now() - startTranslation;
      console.log(`翻译耗时: ${translationLatency}ms`);
      
      // 返回结果
      if (this.onTranslationUpdate) {
        this.onTranslationUpdate({
          original: recognizedText,
          translated: this.extractTranslation(translatedText),
          timestamp: Date.now(),
          latency: {
            asr: asrLatency,
            translation: translationLatency,
            total: asrLatency + translationLatency
          }
        });
      }
      
    } catch (error) {
      console.error('本地翻译失败:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }
  
  buildTranslationPrompt(text) {
    const sourceLanguage = this.translationConfig.sourceLanguage || 'English';
    const targetLanguage = this.translationConfig.targetLanguage;
    
    return `Translate the following ${sourceLanguage} text to ${targetLanguage}. Only output the translation, no explanations or extra text.

Text: ${text}

Translation:`;
  }
  
  extractTranslation(rawOutput) {
    // 清理模型输出
    return rawOutput
      .trim()
      .replace(/^Translation:\s*/i, '')
      .replace(/\n\n.+$/s, '')
      .trim();
  }
  
  async disconnect() {
    if (this.asrModel) {
      await this.asrModel.unload();
    }
    if (this.translationModel) {
      await this.translationModel.unload();
    }
  }
}
```

---

#### 2.2.6 引擎管理器（统一架构）

**适配器模式实现**：

```javascript
// 基础适配器接口
class TranslationEngineAdapter {
  constructor(config) {
    this.config = config;
    this.type = null;  // 'integrated' | 'separated' | 'local'
  }
  
  async connect() {
    throw new Error('connect() must be implemented');
  }
  
  async sendAudio(audioBuffer) {
    throw new Error('sendAudio() must be implemented');
  }
  
  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }
  
  onTranslationUpdate(callback) {
    this.translationCallback = callback;
  }
  
  onError(callback) {
    this.errorCallback = callback;
  }
  
  getStatus() {
    return {
      isConnected: this.isConnected || false,
      type: this.type,
      config: this.config
    };
  }
}

// 引擎工厂
class EngineFactory {
  static createEngine(config) {
    switch(config.mode) {
      case 'integrated':
        return new IntegratedAPIAdapter(config);
      case 'separated':
        return new SeparatedAPIAdapter(config);
      case 'local':
        return new LocalModelAdapter(config);
      default:
        throw new Error(`Unknown engine mode: ${config.mode}`);
    }
  }
  
  static getAvailableEngines() {
    return {
      integrated: [
        { id: 'alibaba', name: '阿里巴巴', recommended: true },
        { id: 'openai_realtime', name: 'OpenAI Realtime' },
        { id: 'xunfei', name: '讯飞星火' }
      ],
      separated: {
        asr: [
          { id: 'whisper', name: 'Whisper API', recommended: true },
          { id: 'xunfei_asr', name: '讯飞语音识别' },
          { id: 'baidu_asr', name: '百度语音识别' }
        ],
        translation: [
          { id: 'deepseek', name: 'DeepSeek', recommended: true },
          { id: 'gpt4', name: 'GPT-4o' },
          { id: 'claude', name: 'Claude 3.5' }
        ]
      },
      local: {
        asr: [
          { id: 'whisper_cpp', name: 'Whisper.cpp', recommended: true },
          { id: 'faster_whisper', name: 'Faster-Whisper' }
        ],
        translation: [
          { id: 'llama_cpp', name: 'Llama.cpp', recommended: true },
          { id: 'ollama', name: 'Ollama' }
        ]
      }
    };
  }
}

// 使用示例
const config = {
  mode: 'integrated',  // 或 'separated' 或 'local'
  service: 'gummy',
  apiKey: 'your-api-key',
  sourceLanguage: 'en',
  targetLanguage: 'zh'
};

const engine = EngineFactory.createEngine(config);

engine.onTranslationUpdate((result) => {
  console.log('Original:', result.original);
  console.log('Translated:', result.translated);
  updateUI(result);
});

engine.onError((error) => {
  console.error('Error:', error);
  showError(error);
});

await engine.connect();
```

---

#### 2.2.7 性能与成本对比工具

```markdown
┌────────────────────────────────────────────────────┐
│ 📊 翻译引擎对比工具                                │
├────────────────────────────────────────────────────┤
│ 选择方案进行对比: (最多3个)                        │
│  ☑️ 阿里Gummy (一体化)                            │
│  ☑️ Whisper + DeepSeek (分离式)                   │
│  ☑️ 本地Whisper + Llama (离线)                    │
│                                                    │
├────────────────────────────────────────────────────┤
│ 【延迟对比】                                       │
│  阿里Gummy:          ▓▓▓░░░░░░░ 0.8s  ⭐⭐⭐⭐⭐   │
│  Whisper+DeepSeek:   ▓▓▓▓░░░░░░ 1.2s  ⭐⭐⭐⭐☆   │
│  本地模型:            ▓▓▓▓▓░░░░░ 1.5s  ⭐⭐⭐☆☆   │
│                                                    │
│ 【成本对比】(每小时翻译)                           │
│  阿里Gummy:          ¥0.60                        │
│  Whisper+DeepSeek:   ¥0.18 💰最便宜               │
│  本地模型:            ¥0.00 ⭐免费                │
│                                                    │
│ 【翻译质量】(主观评分)                             │
│  阿里Gummy:          ⭐⭐⭐⭐☆ (8.5/10)           │
│  Whisper+DeepSeek:   ⭐⭐⭐⭐☆ (8.2/10)           │
│  本地模型:            ⭐⭐⭐☆☆ (7.5/10)           │
│                                                    │
│ 【稳定性】                                         │
│  阿里Gummy:          ⭐⭐⭐⭐⭐ 专业服务             │
│  Whisper+DeepSeek:   ⭐⭐⭐⭐☆ 依赖两个API         │
│  本地模型:            ⭐⭐⭐⭐⭐ 完全掌控           │
│                                                    │
│ 【隐私保护】                                       │
│  阿里Gummy:          ⭐⭐⭐☆☆ 上传云端             │
│  Whisper+DeepSeek:   ⭐⭐⭐☆☆ 上传云端             │
│  本地模型:            ⭐⭐⭐⭐⭐ 💯完全本地        │
│                                                    │
│ 【配置难度】                                       │
│  阿里Gummy:          ⭐☆☆☆☆ 最简单                │
│  Whisper+DeepSeek:   ⭐⭐⭐☆☆ 中等                │
│  本地模型:            ⭐⭐⭐⭐☆ 较复杂             │
│                                                    │
│ 【系统要求】                                       │
│  阿里Gummy:          无特殊要求                    │
│  Whisper+DeepSeek:   无特殊要求                    │
│  本地模型:            需要NVIDIA显卡 (6GB+显存)    │
│                                                    │
├────────────────────────────────────────────────────┤
│ 💡 智能推荐                                        │
│                                                    │
│  根据您的使用情况，我们推荐:                       │
│  🎯 Whisper + DeepSeek (分离式)                   │
│                                                    │
│  理由:                                             │
│  • 成本仅为阿里Gummy的30%                         │
│  • 翻译质量接近                                    │
│  • 延迟在可接受范围 (1.2s)                        │
│  • 您的使用频率: 每天2小时                         │
│  • 每月可节省: ¥25.20                             │
│                                                    │
│ [🧪 实际测试] [💾 应用推荐] [📤 导出对比报告]      │
└────────────────────────────────────────────────────┘
```

---

#### 2.2.8 MVP开发优先级（更新）

**Phase 1: 架构搭建（Week 7-8）**
- ✅ 实现适配器模式基础架构
- ✅ 实现引擎工厂
- ✅ 设计配置模式选择UI

**Phase 2: 一体化模式（Week 7-8）**
- ✅ 实现阿里Gummy适配器
- ✅ 完成配置界面
- ✅ 测试和优化

**Phase 3: Beta扩展（Week 19-20）**
- ✅ 添加OpenAI Realtime (一体化)
- ✅ 添加Whisper + DeepSeek (分离式)
- ✅ 实现引擎切换和对比工具

**Phase 4: 正式版（Week 33-34）**
- ✅ 集成本地离线模型
- ✅ 模型下载管理器
- ✅ GPU加速优化
```

---

### 2.3 实时字幕显示

#### 2.3.1 字幕框设计

**基础功能**：
- **🖱️ 可拖动**：鼠标拖动字幕框到屏幕任意位置
- **💾 位置记忆**：自动保存字幕框位置，下次启动自动恢复
- **🔒 锁定功能**：锁定后字幕框不可拖动，避免误操作
- **🧲 吸附功能**：靠近屏幕边缘时自动吸附对齐（可关闭）
- **📏 调整大小**：拖动边角调整字幕框尺寸
- **👁️ 始终置顶**：字幕框始终显示在最前端

**字幕悬浮窗界面**：

```markdown
┌───────────────────────────────────────────┐
│  ⠿ 拖动  |  🔒 锁定  |  ⚙️ 设置  |  ✕ 隐藏│  ← 标题栏
├───────────────────────────────────────────┤
│                                           │
│  Hello, welcome to this tutorial          │  ← 原文（可选）
│  你好，欢迎观看本教程                       │  ← 译文
│                                           │
└───────────────────────────────────────────┘
     ↖️ 拖动边角可调整大小
```

**交互特性**：
- 鼠标悬停：显示标题栏（拖动、锁定、设置、隐藏按钮）
- 鼠标离开：标题栏自动隐藏（2秒后）
- 双击标题栏：快速锁定/解锁
- 右键菜单：
  - 显示模式切换（仅译文/双语/仅原文）
  - 字体大小快速调整（+/- 按钮）
  - 重置位置和大小
  - 打开设置面板

**位置记忆实现**：

```javascript
// 保存字幕框位置
function saveSubtitlePosition() {
  const position = {
    x: subtitleWindow.getBounds().x,
    y: subtitleWindow.getBounds().y,
    width: subtitleWindow.getBounds().width,
    height: subtitleWindow.getBounds().height,
    isLocked: isLocked,
    displayMode: currentDisplayMode
  };
  
  localStorage.setItem('subtitle_position', JSON.stringify(position));
}

// 加载字幕框位置
function loadSubtitlePosition() {
  const saved = localStorage.getItem('subtitle_position');
  
  if (saved) {
    const position = JSON.parse(saved);
    subtitleWindow.setBounds(position);
    isLocked = position.isLocked;
    currentDisplayMode = position.displayMode;
  } else {
    // 默认位置：屏幕底部中央
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    subtitleWindow.setBounds({
      x: width / 2 - 400,
      y: height - 150,
      width: 800,
      height: 100
    });
  }
}
```

---

#### 2.3.2 字幕样式配置

**完整配置面板**：

```markdown
┌──────────────────────────────────────────────────┐
│ 🎨 字幕显示设置                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ 📝 字体设置:                                     │
│  字体: [微软雅黑 ▼]                              │
│   • 微软雅黑                                     │
│   • 思源黑体                                     │
│   • Arial                                        │
│   • Noto Sans                                    │
│   • ... (系统字体)                               │
│                                                  │
│  大小: [32] pt  [─────●────] (12-72)            │
│                                                  │
│  粗细: [加粗 ▼]                                  │
│   • 常规  • 加粗  • 特粗                         │
│                                                  │
│  颜色: [⬜ #FFFFFF]  [🎨选择颜色]                │
│                                                  │
│  描边: [启用 ☑️]                                 │
│   宽度: [2] px  颜色: [⬛ #000000]               │
│                                                  │
│  阴影: [启用 ☑️]                                 │
│   偏移: X[2] Y[2] px  模糊:[3] px               │
│   颜色: [⬛ #000000]  透明度:[80]%              │
│                                                  │
├──────────────────────────────────────────────────┤
│ 🎭 背景设置:                                     │
│  背景颜色: [⬛ #000000]  [🎨选择颜色]            │
│  背景透明度: [70]%  [─────●────] (0-100)        │
│                                                  │
│  圆角: [8] px                                    │
│  内边距: 上[10] 右[20] 下[10] 左[20] px         │
│                                                  │
│  边框: [启用 ☑️]                                 │
│   宽度: [1] px  颜色: [⬜ #FFFFFF]               │
│   透明度: [30]%                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│ 🔤 显示模式:                                     │
│  ⦿ 双语字幕（原文+译文）                         │
│  ○ 仅译文                                        │
│  ○ 仅原文                                        │
│                                                  │
│  行间距: [1.5] 倍                                │
│  对齐方式: [居中 ▼]                              │
│                                                  │
│  □ 自动换行 (长句超过窗口宽度)                   │
│  □ 显示时间戳                                    │
│                                                  │
├──────────────────────────────────────────────────┤
│ ⚡ 动画效果:                                     │
│  淡入/淡出: [启用 ☑️]  时长:[300]ms             │
│  滚动模式: [关闭 ▼]                              │
│   • 关闭（静态显示）                             │
│   • 向上滚动（新字幕从下方进入）                 │
│   • 覆盖模式（新字幕替换旧字幕）                 │
│                                                  │
├──────────────────────────────────────────────────┤
│ 🎨 预设主题:                                     │
│  [经典黑底白字] [弹幕风格] [半透明]  [自定义]    │
│                                                  │
│ 💡 实时预览:                                     │
│  ┌────────────────────────────────────────┐    │
│  │ Hello, welcome to this tutorial        │    │
│  │ 你好，欢迎观看本教程                    │    │
│  └────────────────────────────────────────┘    │
│                                                  │
├──────────────────────────────────────────────────┤
│ [💾 保存设置]  [🔄 恢复默认]  [❌ 取消]          │
└──────────────────────────────────────────────────┘
```

**预设主题示例**：

```javascript
const PRESET_THEMES = {
  classic: {
    name: '经典黑底白字',
    fontFamily: '微软雅黑',
    fontSize: 32,
    fontWeight: 'bold',
    fontColor: '#FFFFFF',
    strokeEnabled: true,
    strokeWidth: 2,
    strokeColor: '#000000',
    backgroundColor: '#000000',
    backgroundOpacity: 0.7,
    borderRadius: 8
  },
  
  danmaku: {
    name: '弹幕风格',
    fontFamily: '思源黑体',
    fontSize: 28,
    fontWeight: 'normal',
    fontColor: '#FFFFFF',
    strokeEnabled: true,
    strokeWidth: 3,
    strokeColor: '#000000',
    backgroundColor: 'transparent',
    backgroundOpacity: 0,
    borderRadius: 0
  },
  
  translucent: {
    name: '半透明',
    fontFamily: 'Noto Sans',
    fontSize: 30,
    fontWeight: 'bold',
    fontColor: '#FFFFFF',
    strokeEnabled: false,
    backgroundColor: '#1a1a1a',
    backgroundOpacity: 0.5,
    borderRadius: 12
  },
  
  minimal: {
    name: '简约风格',
    fontFamily: 'Arial',
    fontSize: 26,
    fontWeight: 'normal',
    fontColor: '#333333',
    strokeEnabled: false,
    backgroundColor: '#f5f5f5',
    backgroundOpacity: 0.9,
    borderRadius: 4
  }
};
```

---

#### 2.3.3 字幕显示模式

**三种显示模式**：

**模式1：双语字幕（推荐）**
```
─────────────────────────────────────
  Hello, welcome to this tutorial
  你好，欢迎观看本教程
─────────────────────────────────────
```

**模式2：仅译文**
```
─────────────────────────────────────
  你好，欢迎观看本教程
─────────────────────────────────────
```

**模式3：仅原文**
```
─────────────────────────────────────
  Hello, welcome to this tutorial
─────────────────────────────────────
```

**时间戳显示（可选）**：
```
─────────────────────────────────────
  [00:01:23] Hello, welcome to...
  [00:01:23] 你好，欢迎观看...
─────────────────────────────────────
```

---

#### 2.3.4 字幕显示优化

**性能优化**：
- 使用GPU加速渲染（Electron的硬件加速）
- 避免频繁重绘（批量更新）
- 文字缓存（相同字幕不重新渲染）

**显示逻辑**：

```javascript
// 字幕更新策略
class SubtitleDisplayManager {
  constructor() {
    this.currentSubtitle = null;
    this.subtitleQueue = [];
    this.displayMode = 'bilingual';  // bilingual/translated/original
    this.updateInterval = 100;  // 100ms更新一次
  }
  
  // 接收新的翻译结果
  addTranslation(data) {
    if (data.isFinal) {
      // 最终结果，立即显示
      this.displaySubtitle(data);
    } else {
      // 流式输出，加入队列
      this.subtitleQueue.push(data);
    }
  }
  
  // 显示字幕
  displaySubtitle(data) {
    const subtitleText = this.formatSubtitle(data);
    
    // 更新字幕窗口
    this.updateSubtitleWindow(subtitleText);
    
    // 保存当前字幕
    this.currentSubtitle = data;
  }
  
  // 格式化字幕文本
  formatSubtitle(data) {
    switch(this.displayMode) {
      case 'bilingual':
        return `${data.original}\n${data.translated}`;
      case 'translated':
        return data.translated;
      case 'original':
        return data.original;
      default:
        return data.translated;
    }
  }
  
  // 更新字幕窗口
  updateSubtitleWindow(text) {
    const subtitleElement = document.getElementById('subtitle-text');
    
    // 淡入动画
    subtitleElement.style.opacity = 0;
    setTimeout(() => {
      subtitleElement.textContent = text;
      subtitleElement.style.opacity = 1;
    }, 100);
  }
}
```

**长句自动换行**：

```javascript
// 自动换行逻辑
function autoWrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine + word + ' ';
    const testWidth = measureTextWidth(testLine);
    
    if (testWidth > maxWidth && currentLine !== '') {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine !== '') {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n');
}

// 测量文字宽度
function measureTextWidth(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `${fontSize}px ${fontFamily}`;
  return context.measureText(text).width;
}
```

---

### 2.4 会话管理系统

#### 2.4.1 会话概念设计

**会话定义**：
每次点击"开始翻译"创建一个新会话，会话是一组相关翻译记录的集合。一个会话对应一个完整的翻译场景（如一个视频、一场会议、一次音频播放）。

**会话类型**：

| 类型 | 图标 | 说明 | 典型场景 |
|------|------|------|----------|
| 视频会话 | 📺 | 视频平台、视频文件 | YouTube、B站、本地视频 |
| 会议会话 | 📞 | 在线会议 | Zoom、Teams、腾讯会议 |
| 音频会话 | 🎵 | 音乐、播客等 | 网易云、Spotify、播客 |
| 麦克风会话 | 🎤 | 麦克风输入 | 现场翻译、语音输入 |

**会话元数据结构**：

```json
{
  "session_id": "sess_20250112_143022_abc123",
  "session_type": "video",  // video/meeting/audio/microphone
  "session_name": "Python教程-从零开始",
  "audio_source": "Chrome - YouTube - Tab#12345",
  "source_url": "https://youtube.com/watch?v=xxx",
  "source_language": "en",
  "target_language": "zh",
  "engine_type": "gummy",
  "engine_model": "qwen-audio-turbo",
  "start_time": "2025-01-12T14:30:22Z",
  "end_time": "2025-01-12T15:15:30Z",
  "status": "completed",  // active/paused/completed
  "tags": ["编程", "Python", "教程"],
  "total_duration": 2708,  // 总时长（秒）
  "total_words": 15234,
  "total_records": 156,
  "created_at": "2025-01-12T14:30:22Z",
  "updated_at": "2025-01-12T15:15:30Z"
}
```

---

#### 2.4.2 翻译记录结构

**单条翻译记录**：

```json
{
  "record_id": "rec_001",
  "session_id": "sess_20250112_143022_abc123",
  "timestamp": "2025-01-12T14:30:25.123Z",  // 绝对时间戳
  "relative_time": 3.123,  // 相对会话开始的秒数（用于字幕导出）
  "original_text": "Hello, welcome to this tutorial",
  "translated_text": "你好，欢迎观看本教程",
  "confidence": 0.95,  // 识别置信度 (0-1)
  "audio_segment_path": "/audio_segments/rec_001.wav",  // 音频片段路径（可选）
  "created_at": "2025-01-12T14:30:25.123Z"
}
```

**时间轴设计**：
- **绝对时间戳**：记录翻译发生的真实时间，用于会话管理和搜索
- **相对时间轴**：相对于会话开始的时间，用于字幕文件导出
- 支持手动调整时间轴（用户可微调字幕时间）

---

#### 2.4.3 会话操作流程

**创建会话**：

```markdown
用户点击"开始翻译" →
    ↓
系统弹出对话框：
┌──────────────────────────────────────┐
│ 📝 创建新会话                        │
├──────────────────────────────────────┤
│ 会话类型: [视频 ▼]                   │
│  • 📺 视频                           │
│  • 📞 会议                           │
│  • 🎵 音频                           │
│  • 🎤 麦克风                         │
│                                      │
│ 会话名称:                            │
│  [Python教程-从零开始]               │
│  💡 自动从窗口标题识别               │
│                                      │
│ □ 追加到已有会话                     │
│   └─ 选择会话: [无 ▼]               │
│                                      │
│ 语言设置:                            │
│  源语言: [英语 ▼]                    │
│  目标语言: [中文 ▼]                  │
│                                      │
│ 翻译引擎: [阿里Gummy ▼]              │
│                                      │
│ 标签: [+编程] [+Python] [+添加]      │
│                                      │
├──────────────────────────────────────┤
│ [❌ 取消]           [✅ 开始翻译]     │
└──────────────────────────────────────┘
```

**会话名称自动识别逻辑**：

```javascript
// 自动识别会话名称
function autoDetectSessionName(audioSource) {
  if (audioSource.type === 'browser-tab') {
    // 从浏览器标签页标题提取
    return extractTitle(audioSource.title);
  } else if (audioSource.type === 'application') {
    // 从应用程序窗口标题提取
    return extractTitle(audioSource.windowTitle);
  } else if (audioSource.type === 'microphone') {
    // 麦克风会话使用时间命名
    return `麦克风翻译-${formatDate(new Date())}`;
  }
  
  return '未命名会话';
}

// 提取标题（去除网站名称等冗余信息）
function extractTitle(fullTitle) {
  // 示例: "Python教程第1集 - YouTube" → "Python教程第1集"
  // 示例: "Zoom Meeting - Room 12345" → "Zoom Meeting"
  return fullTitle.split('-')[0].trim();
}
```

**会话追加模式**：

```markdown
场景: 用户暂停了视频，稍后继续观看

1. 用户再次点击"开始翻译"
   ↓
2. 系统检测到最近有同一视频的会话
   ↓
3. 弹出提示：
   ┌────────────────────────────────┐
   │ 检测到已有会话                  │
   ├────────────────────────────────┤
   │ 会话名称: Python教程-从零开始   │
   │ 上次时间: 2025-01-12 14:30     │
   │ 已翻译: 42条记录               │
   │                                │
   │ 是否继续此会话？                │
   │                                │
   │ [创建新会话]  [继续已有会话]    │
   └────────────────────────────────┘
   ↓
4. 用户选择"继续已有会话"
   ↓
5. 新的翻译记录追加到原会话
   时间轴自动接续（relative_time继续累加）
```

**结束会话**：

```markdown
用户点击"停止翻译" →
    ↓
系统弹出对话框：
┌──────────────────────────────────────┐
│ ✅ 会话已结束                        │
├──────────────────────────────────────┤
│ 会话名称: Python教程-从零开始         │
│                                      │
│ 📊 会话统计:                         │
│  翻译时长: 45分08秒                  │
│  翻译条数: 156条                     │
│  总字数: 15,234字                    │
│  平均延迟: 0.8秒                     │
│                                      │
│ 🏷️ 添加标签:                        │
│  [+编程] [+Python] [+教程]           │
│  [+添加自定义标签]                   │
│                                      │
│ 💾 快速操作:                         │
│  [📄 导出SRT]  [📝 导出VTT]          │
│  [🗺️ 生成脑图]  [📊 查看详情]        │
│                                      │
├──────────────────────────────────────┤
│                     [✅ 完成]         │
└──────────────────────────────────────┘
```

---

#### 2.4.4 会话管理界面

**主界面布局**：

```markdown
┌─────────────────────────────────────────────────────┐
│ 📁 会话管理                          [🔍] [⚙️] [+新建] │
├─────────────────────────────────────────────────────┤
│ 🔍 [搜索会话...]                                     │
│                                                     │
│ 筛选: [全部 ▼] [视频] [会议] [音频] [麦克风]        │
│ 排序: [最新 ▼]  显示: [列表 ▼] [卡片]               │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 今天 (2个会话)                                       │
│ ┌─────────────────────────────────────────────┐   │
│ │ 📺 Python教程-从零开始                       │   │
│ │ 视频 | 2025-01-12 14:30 | 45:08 | 156条     │   │
│ │ 标签: #编程 #Python #教程                    │   │
│ │ 状态: ✅ 已完成                              │   │
│ │                                             │   │
│ │ [👁️ 查看] [📄 导出] [🗺️ 脑图] [🗑️ 删除]    │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 📞 项目讨论会议                              │   │
│ │ 会议 | 2025-01-12 10:00 | 1:23:45 | 342条   │   │
│ │ 标签: #工作 #会议 #项目                      │   │
│ │ 状态: ✅ 已完成                              │   │
│ │                                             │   │
│ │ [👁️ 查看] [📄 导出] [🗺️ 脑图] [🗑️ 删除]    │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 昨天 (3个会话)                                       │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🎵 英语播客 Episode#12                       │   │
│ │ 音频 | 2025-01-11 20:15 | 52:30 | 198条     │   │
│ │ 标签: #英语 #播客 #学习                      │   │
│ │ 状态: ✅ 已完成                              │   │
│ │                                             │   │
│ │ [👁️ 查看] [📄 导出] [🗺️ 脑图] [🗑️ 删除]    │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [加载更多...]                                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📊 本月统计: 28个会话 | 35.5小时 | 8,542条翻译     │
└─────────────────────────────────────────────────────┘
```

**筛选功能**：

```markdown
┌──────────────────────────────────────┐
│ 🔍 高级筛选                          │
├──────────────────────────────────────┤
│ 会话类型:                            │
│  ☑️ 视频  ☑️ 会议  ☑️ 音频  ☑️ 麦克风│
│                                      │
│ 会话状态:                            │
│  ☑️ 进行中  ☑️ 已完成  ☐ 已暂停     │
│                                      │
│ 时间范围:                            │
│  ⦿ 今天                              │
│  ○ 本周                              │
│  ○ 本月                              │
│  ○ 自定义                            │
│    从: [2025-01-01]                  │
│    到: [2025-01-12]                  │
│                                      │
│ 标签:                                │
│  [选择标签...]                       │
│  已选: #编程 #Python                 │
│                                      │
│ 语言对:                              │
│  [英语→中文 ▼]                       │
│                                      │
│ 翻译引擎:                            │
│  ☑️ 阿里Gummy  ☐ OpenAI  ☐ 讯飞     │
│                                      │
├──────────────────────────────────────┤
│ [🔄 重置]          [✅ 应用筛选]     │
└──────────────────────────────────────┘
```

**搜索功能**：

```javascript
// 全文搜索实现
async function searchSessions(keyword) {
  const results = await db.query(`
    SELECT DISTINCT s.*
    FROM sessions s
    LEFT JOIN translations t ON s.session_id = t.session_id
    WHERE 
      s.session_name LIKE '%${keyword}%'
      OR s.tags LIKE '%${keyword}%'
      OR t.original_text LIKE '%${keyword}%'
      OR t.translated_text LIKE '%${keyword}%'
    ORDER BY s.start_time DESC
  `);
  
  return results;
}

// 搜索结果高亮
function highlightSearchResults(text, keyword) {
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
```

**批量操作**：

```markdown
选中多个会话后显示批量操作栏：

┌─────────────────────────────────────────┐
│ 已选择 3 个会话                          │
│ [📄 批量导出] [🏷️ 添加标签] [🗑️ 删除] │
└─────────────────────────────────────────┘
```

---

#### 2.4.5 会话详情页面

**详情页布局**：

```markdown
┌─────────────────────────────────────────────────────┐
```markdown
│ ← 返回    📺 Python教程-从零开始                    │
├─────────────────────────────────────────────────────┤
│ 📋 会话信息                            [⚙️编辑信息] │
│  ┌───────────────────────────────────────────────┐ │
│  │ 类型: 视频  |  时长: 45:08  |  状态: ✅已完成  │ │
│  │ 源语言: 英语  |  目标语言: 中文                │ │
│  │ 翻译引擎: 阿里Gummy (qwen-audio-turbo)       │ │
│  │ 创建时间: 2025-01-12 14:30:22                 │ │
│  │ 完成时间: 2025-01-12 15:15:30                 │ │
│  │ 来源: https://youtube.com/watch?v=xxx         │ │
│  │ 标签: #编程 #Python #教程 [+添加]             │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📊 统计信息                                          │
│  ┌───────────────────────────────────────────────┐ │
│  │ 翻译条数: 156条                                │ │
│  │ 总字数: 15,234字 (原文) | 12,456字 (译文)    │ │
│  │ 平均延迟: 0.8秒                                │ │
│  │ 平均置信度: 0.94                               │ │
│  │ API调用次数: 156次                             │ │
│  │ 预估成本: ¥0.52                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 🎬 翻译记录 (共156条)     [🔍搜索] [📄导出] [🗺️脑图] │
│  ┌───────────────────────────────────────────────┐ │
│  │ [00:00:03 - 00:00:06]              置信度:95% │ │
│  │ 原文: Hello, welcome to this tutorial         │ │
│  │ 译文: 你好，欢迎观看本教程                     │ │
│  │ [✏️编辑] [🗑️删除] [🔊播放音频] [⏱️调整时间]  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ [00:00:08 - 00:00:12]              置信度:97% │ │
│  │ 原文: Today we will learn Python basics       │ │
│  │ 译文: 今天我们将学习Python基础                 │ │
│  │ [✏️编辑] [🗑️删除] [🔊播放音频] [⏱️调整时间]  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ [00:00:15 - 00:00:20]              置信度:92% │ │
│  │ 原文: Python is a high-level programming...   │ │
│  │ 译文: Python是一种高级编程语言...              │ │
│  │ [✏️编辑] [🗑️删除] [🔊播放音频] [⏱️调整时间]  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ... (更多记录)                                     │
│                                                     │
│  [加载更多...]                   当前显示: 1-20/156 │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 🤖 AI分析                                            │
│  [📝 生成内容摘要] [🗺️ 生成思维导图] [🏷️ 提取关键词] │
└─────────────────────────────────────────────────────┘
```

**翻译记录编辑功能**：

```markdown
点击"编辑"按钮后弹出：

┌──────────────────────────────────────┐
│ ✏️ 编辑翻译记录                      │
├──────────────────────────────────────┤
│ 时间轴:                              │
│  开始: [00:00:03.123]                │
│  结束: [00:00:06.456]                │
│  [🔄 自动调整]                       │
│                                      │
│ 原文:                                │
│  ┌────────────────────────────────┐ │
│  │ Hello, welcome to this         │ │
│  │ tutorial                       │ │
│  └────────────────────────────────┘ │
│                                      │
│ 译文:                                │
│  ┌────────────────────────────────┐ │
│  │ 你好，欢迎观看本教程            │ │
│  └────────────────────────────────┘ │
│                                      │
│ 置信度: [95%]                        │
│                                      │
│ □ 标记为已校对                       │
│ □ 添加备注                           │
│  ┌────────────────────────────────┐ │
│  │ 备注内容...                    │ │
│  └────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ [❌ 取消]           [✅ 保存修改]    │
└──────────────────────────────────────┘
```

**记录操作功能**：
- **编辑**：手动修正原文和译文
- **删除**：删除无用记录（如噪音识别的乱码）
- **播放音频**：播放该条记录对应的音频片段（如果保存了）
- **调整时间**：微调字幕时间轴
- **合并**：合并相邻的短句
- **拆分**：拆分过长的句子

---

#### 2.4.6 统计与分析

**会话统计仪表板**：

```markdown
┌─────────────────────────────────────────────────────┐
│ 📊 统计分析                        [导出报告] [打印] │
├─────────────────────────────────────────────────────┤
│ 时间范围: [本月 ▼]  [2025-01-01] 至 [2025-01-31]   │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📈 总体概览                                          │
│  ┌────────────┬────────────┬────────────┬────────┐ │
│  │ 总会话数   │ 翻译时长   │ 翻译条数   │ 总字数 │ │
│  │    28      │  35.5小时  │   8,542    │ 234K   │ │
│  └────────────┴────────────┴────────────┴────────┘ │
│                                                     │
│ 📊 按类型统计                                        │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📺 视频:  15个 (53%) | 20.5小时              │   │
│  │ 📞 会议:  8个 (29%)  | 12.3小时              │   │
│  │ 🎵 音频:  4个 (14%)  | 2.5小时               │   │
│  │ 🎤 麦克风: 1个 (4%)   | 0.2小时               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ 🌍 按语言对统计                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 英语→中文: 18个 (64%) | 25.8小时             │   │
│  │ 日语→中文: 6个 (21%)  | 6.5小时              │   │
│  │ 韩语→中文: 3个 (11%)  | 2.8小时              │   │
│  │ 其他: 1个 (4%)        | 0.4小时              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ 📅 使用趋势 (本月)                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │  6小时 ┤                            ▄        │   │
│  │  5小时 ┤                       ▄   ▄█▄       │   │
│  │  4小时 ┤              ▄       ▄█  ▄███       │   │
│  │  3小时 ┤         ▄   ▄█▄     ▄███▄███▄      │   │
│  │  2小时 ┤    ▄   ▄█  ▄███    ▄█████████▄     │   │
│  │  1小时 ┤   ▄█▄ ▄███▄█████  ▄███████████▄    │   │
│  │  0小时 ┴───┴──┴────┴─────┴─┴────────────┴──  │   │
│  │        1/1  1/8  1/15 1/22  1/29 (日期)      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ 🏆 高频时间段                                        │
│  ┌─────────────────────────────────────────────┐   │
│  │ 周一 20:00-22:00  |  5.2小时 (最活跃)        │   │
│  │ 周三 14:00-16:00  |  4.1小时                 │   │
│  │ 周六 10:00-12:00  |  3.8小时                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ 💰 成本统计 (阿里Gummy)                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ 本月API调用: 8,542次                          │   │
│  │ 预估成本: ¥28.50                              │   │
│  │ 平均成本/会话: ¥1.02                          │   │
│  │ [查看详细账单]                                │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ 🏷️ 热门标签                                         │
│  #编程(12) #英语(8) #会议(8) #Python(6) #教程(5)   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**使用洞察**：

```markdown
┌──────────────────────────────────────┐
│ 💡 使用洞察                          │
├──────────────────────────────────────┤
│ 基于您的使用习惯，我们发现:          │
│                                      │
│ 📊 您最常在周一晚上使用翻译功能      │
│ 🎯 您主要学习编程和英语相关内容      │
│ 📺 视频是您最常使用的场景            │
│ 🌍 英语→中文是您最常用的语言对       │
│                                      │
│ 💡 建议:                             │
│  • 考虑设置每日翻译提醒              │
│  • 为编程视频创建专属标签体系        │
│  • 尝试使用AI摘要功能快速回顾内容    │
│                                      │
└──────────────────────────────────────┘
```

---

### 2.5 字幕文件导出

#### 2.5.1 支持的字幕格式

**SRT格式（SubRip Subtitle）** - 最常用：
```srt
1
00:00:03,123 --> 00:00:05,456
Hello, welcome to this tutorial
你好，欢迎观看本教程

2
00:00:08,789 --> 00:00:12,345
Today we will learn Python basics
今天我们将学习Python基础

3
00:00:15,678 --> 00:00:20,123
Python is a high-level programming language
Python是一种高级编程语言
```

**VTT格式（WebVTT）** - 网页字幕标准：
```vtt
WEBVTT

00:00:03.123 --> 00:00:05.456
Hello, welcome to this tutorial
你好，欢迎观看本教程

00:00:08.789 --> 00:00:12.345
Today we will learn Python basics
今天我们将学习Python基础

00:00:15.678 --> 00:00:20.123
Python is a high-level programming language
Python是一种高级编程语言
```

**ASS/SSA格式（Advanced SubStation Alpha）** - 支持高级样式：
```ass
[Script Info]
Title: Python教程-从零开始
ScriptType: v4.00+
Collisions: Normal

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:03.12,0:00:05.45,Default,,0,0,0,,Hello, welcome to this tutorial
Dialogue: 0,0:00:03.12,0:00:05.45,Default,,0,0,0,,你好，欢迎观看本教程
```

**TXT格式（纯文本）** - 简单记录：
```txt
[00:00:03] Hello, welcome to this tutorial | 你好，欢迎观看本教程
[00:00:08] Today we will learn Python basics | 今天我们将学习Python基础
[00:00:15] Python is a high-level programming language | Python是一种高级编程语言
```

**JSON格式（结构化数据）** - 便于程序处理：
```json
{
  "session_id": "sess_20250112_143022_abc123",
  "session_name": "Python教程-从零开始",
  "source_language": "en",
  "target_language": "zh",
  "subtitles": [
    {
      "index": 1,
      "start": 3.123,
      "end": 5.456,
      "duration": 2.333,
      "original": "Hello, welcome to this tutorial",
      "translated": "你好，欢迎观看本教程",
      "confidence": 0.95
    },
    {
      "index": 2,
      "start": 8.789,
      "end": 12.345,
      "duration": 3.556,
      "original": "Today we will learn Python basics",
      "translated": "今天我们将学习Python基础",
      "confidence": 0.97
    }
  ]
}
```

---

#### 2.5.2 导出配置

**导出对话框**：

```markdown
┌──────────────────────────────────────┐
│ 📄 导出字幕文件                      │
├──────────────────────────────────────┤
│ 会话: Python教程-从零开始            │
│ 翻译记录: 156条                      │
│                                      │
├──────────────────────────────────────┤
│ 📋 基本设置                          │
│                                      │
│ 文件名:                              │
│  [Python教程-从零开始_en-zh]         │
│  💡 自动命名规则: 会话名_语言对      │
│                                      │
│ 文件格式: [SRT ▼]                    │
│  • SRT (推荐，兼容性最好)            │
│  • VTT (网页字幕标准)                │
│  • ASS (支持高级样式)                │
│  • TXT (纯文本，简单记录)            │
│  • JSON (结构化数据)                 │
│                                      │
│ 保存位置:                            │
│  [C:\Users\...\Downloads]  [浏览]   │
│  □ 记住此位置                        │
│                                      │
├──────────────────────────────────────┤
│ 🎨 内容选项                          │
│                                      │
│ 字幕内容:                            │
│  ⦿ 双语字幕（原文+译文，推荐）       │
│  ○ 仅原文                            │
│  ○ 仅译文                            │
│                                      │
│ 显示顺序:                            │
│  ⦿ 原文在上，译文在下                │
│  ○ 译文在上，原文在下                │
│                                      │
│ □ 包含时间戳                         │
│ □ 包含置信度信息                     │
│ □ 包含会话元数据                     │
│                                      │
├──────────────────────────────────────┤
│ ⏱️ 时间轴选项                        │
│                                      │
│ 时间偏移: [+0.0] 秒                  │
│  💡 正值=延后，负值=提前             │
│                                      │
│ □ 自动合并短字幕 (< 2秒)             │
│ □ 自动拆分长字幕 (> 6秒)             │
│                                      │
│ 最小显示时长: [1.0] 秒               │
│ 最大显示时长: [7.0] 秒               │
│                                      │
├──────────────────────────────────────┤
│ 🔤 编码设置                          │
│                                      │
│ 字符编码: [UTF-8 ▼]                  │
│  • UTF-8 (推荐，支持所有语言)        │
│  • UTF-8 with BOM                    │
│  • GBK (中文Windows)                 │
│  • ANSI                              │
│                                      │
│ 换行符: [CRLF (Windows) ▼]          │
│                                      │
├──────────────────────────────────────┤
│ 📊 预览 (前3条)                      │
│  ┌────────────────────────────────┐ │
│  │ 1                              │ │
│  │ 00:00:03,123 --> 00:00:05,456  │ │
│  │ Hello, welcome to this...      │ │
│  │ 你好，欢迎观看本教程            │ │
│  │                                │ │
│  │ 2                              │ │
│  │ 00:00:08,789 --> 00:00:12,345  │ │
│  │ Today we will learn...         │ │
│  │ 今天我们将学习Python基础        │ │
│  └────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ [❌ 取消]  [🔄 预览]  [💾 导出]      │
└──────────────────────────────────────┘
```

**文件命名规则**：
- 默认格式：`{会话名}_{源语言}-{目标语言}.{格式}`
- 示例：`Python教程-从零开始_en-zh.srt`
- 用户可手动修改文件名
- 自动处理非法字符（如 `/` `\` `:` 等）

**导出进度显示**：

```markdown
┌──────────────────────────────────────┐
│ 📤 正在导出字幕文件...               │
├──────────────────────────────────────┤
│ 文件: Python教程-从零开始_en-zh.srt  │
│                                      │
│ 进度: [████████████░░░░] 65%        │
│ 已处理: 102/156 条                   │
│                                      │
│ 预计剩余时间: 2秒                    │
│                                      │
│ [取消导出]                           │
└──────────────────────────────────────┘
```

**导出成功提示**：

```markdown
┌──────────────────────────────────────┐
│ ✅ 导出成功！                        │
├──────────────────────────────────────┤
│ 文件已保存到:                        │
│ C:\Users\...\Downloads\              │
│ Python教程-从零开始_en-zh.srt        │
│                                      │
│ 文件大小: 25.3 KB                    │
│ 字幕条数: 156条                      │
│                                      │
│ [📂 打开文件夹]  [👁️ 预览文件]      │
│ [✅ 完成]                            │
└──────────────────────────────────────┘
```

---

#### 2.5.3 导出后处理

**自动打开选项**：
- ☑️ 导出成功后自动打开文件所在文件夹
- ☑️ 导出成功后用默认程序打开文件
- ☑️ 导出成功后显示预览窗口

**导出历史记录**：

```markdown
┌──────────────────────────────────────┐
│ 📜 导出历史                          │
├──────────────────────────────────────┤
│ 2025-01-12 15:20                     │
│  Python教程-从零开始_en-zh.srt       │
│  156条 | 25.3KB | SRT格式            │
│  [📂 打开] [🔄 重新导出] [🗑️ 删除]  │
│                                      │
│ 2025-01-12 10:35                     │
│  项目讨论会议_en-zh.vtt              │
│  342条 | 68.7KB | VTT格式            │
│  [📂 打开] [🔄 重新导出] [🗑️ 删除]  │
│                                      │
│ 2025-01-11 20:45                     │
│  英语播客Episode12_en-zh.srt         │
│  198条 | 32.1KB | SRT格式            │
│  [📂 打开] [🔄 重新导出] [🗑️ 删除]  │
│                                      │
│ [清空历史]                           │
└──────────────────────────────────────┘
```

**批量导出**：

```markdown
选中多个会话后:

┌──────────────────────────────────────┐
│ 📦 批量导出字幕                      │
├──────────────────────────────────────┤
│ 已选择 3 个会话                      │
│                                      │
│ 导出格式: [SRT ▼]                    │
│ 内容选项: [双语字幕 ▼]              │
│ 保存位置: [C:\...\Downloads]         │
│                                      │
│ □ 每个会话创建独立文件夹             │
│ □ 同时生成汇总目录文件               │
│                                      │
│ [开始批量导出]                       │
└──────────────────────────────────────┘
```

**导出代码实现**：

```javascript
// 导出SRT格式字幕
async function exportToSRT(sessionId, options) {
  // 1. 获取翻译记录
  const records = await db.getTranslationsBySession(sessionId);
  
  // 2. 生成SRT内容
  let srtContent = '';
  records.forEach((record, index) => {
    const startTime = formatSRTTime(record.relative_time);
    const endTime = formatSRTTime(record.relative_time + record.duration);
    
    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    
    if (options.contentType === 'bilingual') {
      srtContent += `${record.original_text}\n`;
      srtContent += `${record.translated_text}\n`;
    } else if (options.contentType === 'original') {
      srtContent += `${record.original_text}\n`;
    } else {
      srtContent += `${record.translated_text}\n`;
    }
    
    srtContent += '\n';
  });
  
  // 3. 保存文件
  const filePath = path.join(options.savePath, options.fileName);
  await fs.writeFile(filePath, srtContent, { encoding: options.encoding });
  
  return filePath;
}

// 格式化SRT时间 (00:00:03,123)
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(milliseconds, 3)}`;
}

function pad(num, size) {
  return String(num).padStart(size, '0');
}
```

---

### 2.6 快捷键控制

#### 2.6.1 全局快捷键

**基础控制快捷键**：

| 功能 | 默认快捷键 | 说明 |
|------|-----------|------|
| 开始/停止翻译 | `Ctrl+Shift+S` | 启动或停止当前翻译会话 |
| 暂停/恢复翻译 | `Ctrl+Shift+P` | 暂停或恢复翻译（不结束会话）|
| 显示/隐藏字幕框 | `Ctrl+Shift+H` | 切换字幕框可见性 |
| 锁定/解锁字幕框 | `Ctrl+Shift+L` | 锁定或解锁字幕框位置 |
| 重新连接音频源 | `Ctrl+Shift+R` | 重新连接音频源 |

**会话管理快捷键**：

| 功能 | 默认快捷键 | 说明 |
|------|-----------|------|
| 创建新会话 | `Ctrl+Shift+N` | 快速创建新会话 |
| 结束并导出 | `Ctrl+Shift+E` | 结束当前会话并导出 |
| 打开会话管理器 | `Ctrl+Shift+M` | 打开会话管理界面 |
| 打开设置 | `Ctrl+Shift+,` | 打开设置面板 |

**快速切换快捷键**：

| 功能 | 默认快捷键 | 说明 |
|------|-----------|------|
| 切换语言对1 | `Ctrl+Shift+1` | 切换到预设语言对1 (如en→zh) |
| 切换语言对2 | `Ctrl+Shift+2` | 切换到预设语言对2 (如ja→zh) |
| 切换语言对3 | `Ctrl+Shift+3` | 切换到预设语言对3 (如ko→zh) |
| 字幕框放大 | `Ctrl+Shift+↑` | 增大字幕框字体 |
| 字幕框缩小 | `Ctrl+Shift+↓` | 减小字幕框字体 |
| 切换显示模式 | `Ctrl+Shift+T` | 循环切换字幕显示模式 |

---

#### 2.6.2 快捷键自定义

**配置界面**：

```markdown
┌────────────────────────────────────────┐
│ ⌨️ 快捷键设置                          │
├────────────────────────────────────────┤
│ 🔍 [搜索功能...]                       │
│                                        │
│ 📂 基础控制                            │
│  ┌──────────────────────────────────┐ │
│  │ 功能              快捷键      状态│ │
│  ├──────────────────────────────────┤ │
│  │ 开始/停止翻译    Ctrl+Shift+S  ✅│ │
│  │                  [✏️修改] [🗑️清除]│ │
│  ├──────────────────────────────────┤ │
│  │ 暂停/恢复翻译    Ctrl+Shift+P  ✅│ │
│  │                  [✏️修改] [🗑️清除]│ │
│  ├──────────────────────────────────┤ │
│  │ 显示/隐藏字幕    Ctrl+Shift+H  ✅│ │
│  │                  [✏️修改] [🗑️清除]│ │
│  └──────────────────────────────────┘ │
│                                        │
│ 📂 会话管理                            │
│  ┌──────────────────────────────────┐ │
│  │ 创建新会话       Ctrl+Shift+N  ✅│ │
│  │                  [✏️修改] [🗑️清除]│ │
│  ├──────────────────────────────────┤ │
│  │ 结束并导出       Ctrl+Shift+E  ✅│ │
│  │                  [✏️修改] [🗑️清除]│ │
│  └──────────────────────────────────┘ │
│                                        │
│ 📂 快速切换                            │
│  ┌──────────────────────────────────┐ │
│  │ 切换语言对1      Ctrl+Shift+1  ✅│ │
│  │  预设: 英语→中文  [修改预设]    │ │
│  │                  [✏️修改] [🗑️清除]│ │
│  └──────────────────────────────────┘ │
│                                        │
│ ⚠️ 冲突检测                            │
│  • Ctrl+Shift+C 与系统快捷键冲突      │
│    [查看详情] [自动解决]              │
│                                        │
│ 💡 预设方案:                           │
│  [默认方案] [Vim风格] [Mac风格]       │
│  [自定义方案] [导入] [导出]           │
│                                        │
├────────────────────────────────────────┤
│ [🔄 恢复默认]  [💾 保存]  [❌ 取消]    │
└────────────────────────────────────────┘
```

**快捷键修改流程**：

```markdown
点击"修改"按钮 →
┌────────────────────────────────┐
│ 🔧 修改快捷键                  │
├────────────────────────────────┤
│ 功能: 开始/停止翻译            │
│ 当前快捷键: Ctrl+Shift+S       │
│                                │
│ 请按下新的快捷键组合...        │
│                                │
│ [正在监听按键...]              │
│                                │
│ 💡 提示:                       │
│  • 建议使用 Ctrl/Alt/Shift 组合│
│  • 避免使用单个字母键          │
│  • 避免与系统快捷键冲突        │
│                                │
│ [❌ 取消]                      │
└────────────────────────────────┘

用户按下 Alt+Q →
┌────────────────────────────────┐
│ 检测到: Alt+Q                  │
│                                │
│ ✅ 无冲突，可以使用            │
│                                │
│ [✅ 确认修改]  [🔄 重新输入]   │
└────────────────────────────────┘
```

**冲突检测与解决**：

```javascript
// 检测快捷键冲突
async function checkShortcutConflict(shortcut) {
  const conflicts = [];
  
  // 1. 检查与其他功能冲突
  const existingShortcuts = await db.getAllShortcuts();
  const duplicate = existingShortcuts.find(s => s.key === shortcut && s.enabled);
  if (duplicate) {
    conflicts.push({
      type: 'internal',
      function: duplicate.function,
      solution: '修改其他功能的快捷键或禁用'
    });
  }
  
  // 2. 检查与系统快捷键冲突
  const systemShortcuts = await getSystemShortcuts();
  if (systemShortcuts.includes(shortcut)) {
    conflicts.push({
      type: 'system',
      description: '与系统快捷键冲突',
      solution: '选择其他快捷键组合'
    });
  }
  
  // 3. 检查与其他应用冲突
  const runningApps = await getRunningApplications();
  for (const app of runningApps) {
    if (app.shortcuts && app.shortcuts.includes(shortcut)) {
      conflicts.push({
        type: 'application',
        app: app.name,
        solution: `关闭${app.name}或选择其他快捷键`
      });
    }
  }
  
  return conflicts;
}

// 自动解决冲突
function autoResolveConflict(shortcut, conflicts) {
  if (conflicts.length === 0) return shortcut;
  
  // 尝试修改修饰键
  const modifiers = ['Ctrl', 'Alt', 'Shift'];
  const key = shortcut.split('+').pop();
  
  for (const mod1 of modifiers) {
    for (const mod2 of modifiers) {
      if (mod1 !== mod2) {
        const newShortcut = `${mod1}+${mod2}+${key}`;
        const newConflicts = checkShortcutConflict(newShortcut);
        if (newConflicts.length === 0) {
          return newShortcut;
        }
      }
    }
  }
  
  return null;  // 无法自动解决
}
```

**预设方案**：

```javascript
const SHORTCUT_PRESETS = {
  default: {
    name: '默认方案',
    shortcuts: {
      'start_stop': 'Ctrl+Shift+S',
      'pause_resume': 'Ctrl+Shift+P',
      'show_hide': 'Ctrl+Shift+H',
      // ...
    }
  },
  
  vim: {
    name: 'Vim风格',
    shortcuts: {
      'start_stop': 'Alt+S',
      'pause_resume': 'Alt+P',
      'show_hide': 'Alt+H',
      'switch_mode': 'Alt+T',
      // ...
    }
  },
  
  mac: {
    name: 'Mac风格',
    shortcuts: {
      'start_stop': 'Cmd+Shift+S',
      'pause_resume': 'Cmd+Shift+P',
      'show_hide': 'Cmd+Shift+H',
      // ...
    }
  }
};
```

---

### 2.7 本地视频翻译

#### 2.7.1 功能描述

用户可导入本地视频文件，软件自动提取音频并进行翻译，生成字幕文件或带字幕的新视频。

**支持的视频格式**：
- MP4、AVI、MKV、MOV、WMV、FLV、WEBM等主流格式

**应用场景**：
- 为本地视频添加多语言字幕
- 学习外语视频材料
- 为视频内容创作者提供字幕制作工具

---

#### 2.7.2 工作流程

**完整流程图**：

```markdown
1. 用户选择本地视频文件
   ↓
2. 软件读取视频元数据（时长、格式、分辨率等）
   ↓
3. 提取音频轨道（使用FFmpeg）
   ↓
4. 音频预处理（降噪、音量标准化）
   ↓
5. 语音识别和翻译（使用阿里Gummy或其他引擎）
   ↓
6. 生成字幕文件（SRT/VTT/ASS等）
   ↓
7. 用户选择输出方式：
   a) 仅导出字幕文件 → 完成
   b) 生成带字幕的新视频 → 使用FFmpeg合成 → 完成
```

---

#### 2.7.3 功能界面

```markdown
┌──────────────────────────────────────────────────┐
│ 🎬 本地视频翻译                       [❌ 关闭]  │
├──────────────────────────────────────────────────┤
│                                                  │
│ 📂 选择视频文件                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 将视频文件拖拽到此处                        │ │
│  │ 或                                         │ │
│  │ [📁 浏览文件...]                           │ │
│  │                                            │ │
│  │ 支持格式: MP4, AVI, MKV, MOV, WMV...      │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│ 📹 视频信息                                      │
│  ┌────────────────────────────────────────────┐ │
│  │ 文件名: video_tutorial.mp4                 │ │
│  │ 时长: 45:23                                │ │
│  │ 大小: 523 MB                               │ │
│  │ 分辨率: 1920x1080                          │ │
│  │ 帧率: 30 fps                               │ │
│  │ 音频: AAC, 48kHz, 立体声                   │ │
│  │                                            │ │
│  │ [🎬 预览视频]                              │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│ ⚙️ 翻译设置                                      │
│  源语言: [自动检测 ▼]                            │
│  目标语言: [中文 ▼]                              │
│  翻译引擎: [阿里Gummy ▼]                         │
│                                                  │
│ 📄 输出选项                                      │
│  ⦿ 仅导出字幕文件                                │
│     格式: [SRT ▼]  双语: [☑️]                   │
│     保存到: [C:\...\Downloads] [浏览]           │
│                                                  │
│  ○ 生成带字幕的新视频                            │
│     字幕位置: [底部居中 ▼]                       │
│     字幕样式: [预设样式1 ▼]  [自定义]           │
│     视频编码: [H.264 ▼]  质量: [高 ▼]           │
│     保存到: [C:\...\Downloads] [浏览]           │
│                                                  │
│ ⚡ 高级选项                                      │
│  □ 保留临时文件（音频、字幕等）                  │
│  □ 使用GPU加速（推荐，需NVIDIA显卡）             │
│  □ 静音段跳过（提高速度）                        │
│  □ 分段处理（每10分钟一段，避免内存溢出）        │
│                                                  │
│ 💡 预估时间: 约 25分钟 (基于视频时长和引擎)      │
│ 💰 预估成本: ¥1.50 (API调用费用)                │
│                                                  │
├──────────────────────────────────────────────────┤
│                   [❌ 取消]  [▶️ 开始翻译]        │
└──────────────────────────────────────────────────┘
```

---

#### 2.7.4 翻译进度显示

```markdown
┌──────────────────────────────────────────────────┐
│ 🔄 正在翻译视频...                               │
├──────────────────────────────────────────────────┤
│ 视频: video_tutorial.mp4                         │
│                                                  │
│ 当前阶段: 语音识别和翻译                         │
│  ┌────────────────────────────────────────────┐ │
│  │ 1. ✅ 提取音频 (完成)                       │ │
│  │ 2. ✅ 音频预处理 (完成)                     │ │
│  │ 3. 🔄 语音识别和翻译 (进行中)              │ │
│  │ 4. ⏳ 生成字幕文件 (等待中)                 │ │
│  │ 5. ⏳ 合成视频 (等待中)                     │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│ 总进度: [████████░░░░░░░░] 42%                  │
│                                                  │
│ 已处理: 19:03 / 45:23                            │
│ 已翻译: 89条字幕                                 │
│                                                  │
│ 预计剩余时间: 13分钟                             │
│ 当前速度: 2.1x (实时速度的2.1倍)                 │
│                                                  │
│ CPU: 45% | 内存: 1.2GB | GPU: 35%               │
│                                                  │
│ [⏸️ 暂停]  [❌ 取消]                             │
└──────────────────────────────────────────────────┘
```

**完成提示**：

```markdown
┌──────────────────────────────────────┐
│ ✅ 翻译完成！                        │
├──────────────────────────────────────┤
│ 视频: video_tutorial.mp4             │
│ 翻译时长: 25分38秒                   │
│                                      │
│ 📄 字幕文件:                         │
│  video_tutorial_en-zh.srt            │
│  (156条字幕, 25.3 KB)                │
│  [📂 打开文件夹]  [👁️ 预览]         │
│                                      │
│ 🎬 视频文件: (如果选择生成视频)      │
│  video_tutorial_subtitled.mp4        │
│  (1.2 GB)                            │
│  [📂 打开文件夹]  [▶️ 播放]          │
│                                      │
│ 💰 本次消耗: ¥1.52                   │
│                                      │
│ [🔄 翻译更多视频]  [✅ 完成]         │
└──────────────────────────────────────┘
```

---

#### 2.7.5 批量处理

```markdown
┌──────────────────────────────────────────────────┐
│ 📦 批量视频翻译                                  │
├──────────────────────────────────────────────────┤
│ 📂 添加视频文件                                  │
│  [📁 选择文件...]  [📂 选择文件夹...]            │
│                                                  │
│ 待处理列表 (3个视频)                             │
│  ┌────────────────────────────────────────────┐ │
│  │ ✅ video1.mp4 (45:23, 523MB)               │ │
│  │ ✅ video2.mp4 (32:10, 398MB)               │ │
│  │ ✅ video3.mp4 (1:02:45, 756MB)             │ │
│  │                                            │ │
│  │ 总时长: 2:20:18  |  总大小: 1.6 GB         │ │
│  │ [🗑️ 清空列表]                              │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│ ⚙️ 批量设置                                      │
│  源语言: [自动检测 ▼]                            │
│  目标语言: [中文 ▼]                              │
│  输出格式: [仅字幕SRT ▼]                         │
│                                                  │
│ 📊 预估信息                                      │
│  总时长: ~85分钟                                 │
│  预估成本: ¥4.50                                 │
│                                                  │
│ ⚡ 处理选项                                      │
│  □ 使用GPU加速                                   │
│  □ 完成后自动关机                                │
│  □ 失败时跳过并继续                              │
│                                                  │
├──────────────────────────────────────────────────┤
│              [❌ 取消]  [▶️ 开始批量翻译]         │
└──────────────────────────────────────────────────┘
```

---

#### 2.7.6 技术实现

**音频提取（使用FFmpeg）**：

```javascript
const ffmpeg = require('fluent-ffmpeg');

// 提取视频音频
async function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        '-vn',  // 不包含视频
        '-acodec pcm_s16le',  // PCM编码
        '-ar 16000',  // 16kHz采样率
        '-ac 1'  // 单声道
      ])
      .output(audioPath)
      .on('progress', (progress) => {
        console.log(`提取进度: ${progress.percent}%`);
        updateProgress('extract_audio', progress.percent);
      })
      .on('end', () => {
        console.log('✅ 音频提取完成');
        resolve(audioPath);
      })
      .on('error', (err) => {
        console.error('❌ 音频提取失败:', err);
        reject(err);
      })
      .run();
  });
}
```

**字幕烧录（使用FFmpeg）**：

```javascript
// 将字幕烧录到视频
async function burnSubtitles(videoPath, subtitlePath, outputPath, options) {
  return new Promise((resolve, reject) => {
    const subtitleFilter = `subtitles=${subtitlePath.replace(/\\/g, '/')}:force_style='${getSubtitleStyle(options)}'`;
    
    ffmpeg(videoPath)
      .outputOptions([
        '-vf', subtitleFilter,
        '-c:v libx264',  // H.264编码
        '-preset', options.preset || 'medium',  // 编码速度
        '-crf', options.crf || '23',  // 质量 (18-28)
        '-c:a copy'  // 音频直接复制
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        console.log(`合成进度: ${progress.percent}%`);
        updateProgress('burn_subtitles', progress.percent);
      })
      .on('end', () => {
        console.log('✅ 视频合成完成');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ 视频合成失败:', err);
        reject(err);
      })
      .run();
  });
}

// 生成字幕样式
function getSubtitleStyle(options) {
  return [
    `FontName=${options.fontFamily || 'Arial'}`,
    `FontSize=${options.fontSize || 32}`,
    `PrimaryColour=${hexToASSColor(options.fontColor || '#FFFFFF')}`,
    `OutlineColour=${hexToASSColor(options.outlineColor || '#000000')}`,
    `Outline=${options.outlineWidth || 2}`,
    `Alignment=${options.alignment || 2}`  // 底部居中
  ].join(',');
}
```

**分段处理（大文件优化）**：

```javascript
// 分段处理长视频
async function processVideoInChunks(videoPath, chunkDuration = 600) {
  const videoInfo = await getVideoInfo(videoPath);
  const totalDuration = videoInfo.duration;
  const chunks = Math.ceil(totalDuration / chunkDuration);
  
  const allSubtitles = [];
  
  for (let i = 0; i < chunks; i++) {
    const startTime = i * chunkDuration;
    const endTime = Math.min((i + 1) * chunkDuration, totalDuration);
    
    // 提取音频片段
    const chunkAudioPath = `temp_chunk_${i}.wav`;
    await extractAudioChunk(videoPath, startTime, endTime, chunkAudioPath);
    
    // 翻译音频片段
    const chunkSubtitles = await translateAudio(chunkAudioPath, {
      timeOffset: startTime  // 时间偏移
    });
    
    allSubtitles.push(...chunkSubtitles);
    
    // 清理临时文件
    await fs.unlink(chunkAudioPath);
    
    // 更新进度
    updateProgress('process_chunks', ((i + 1) / chunks) * 100);
  }
  
  return allSubtitles;
}
```

---

### 2.8 AI内容分析功能（新增）

#### 2.8.1 AI视频内容总结

**功能描述**：
会话结束后，使用GPT-4等大模型自动分析翻译记录，生成内容摘要、关键点提取和时间轴标注。

**应用场景**：
- 📺 **长视频总结**：1小时教程 → 5分钟核心要点
- 📊 **会议纪要**：2小时会议 → 结构化会议记录
- 🎓 **学习笔记**：课程视频 → 知识点清单
- 📝 **内容回顾**：快速浏览视频主要内容

---

#### 2.8.2 功能界面

```markdown
┌─────────────────────────────────────────────────────┐
│ 🤖 AI内容分析 - Python教程-从零开始                  │
├─────────────────────────────────────────────────────┤
│ 会话信息: 视频 | 45:23 | 156条翻译记录 | 15,234字  │
│                                                     │
│ [📝 生成摘要] [🗺️ 生成脑图] [📋 生成大纲] [🏷️ 提取关键词]│
│                                                     │
├─────────────────────────────────────────────────────┤
│ 📊 内容摘要                          [🔄 重新生成]  │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🎯 核心主题                                    │ │
│  │ 本视频介绍了Python编程的基础知识，包括变量、  │ │
│  │ 数据类型、控制流程和函数定义。适合零基础初学  │ │
│  │ 者入门学习。                                   │ │
│  │                                                │ │
│  │ 🔑 关键知识点                                  │ │
│  │ 1. Python变量声明无需类型定义，支持动态类型   │ │
│  │ 2. 基本数据类型包括int、str、list、dict等     │ │
│  │ 3. 使用if-else进行条件判断                    │ │
│  │ 4. for和while循环的基本用法                   │ │
│  │ 5. 函数定义使用def关键字，return返回值        │ │
│  │ 6. 缩进在Python中非常重要，替代大括号         │ │
│  │                                                │ │
│  │ ⏱️ 重要时间轴                                  │ │
│  │ [00:03] 课程介绍和学习目标                     │ │
│  │ [05:12] 变量与数据类型详解                     │ │
│  │ [15:30] 控制流程（if-else, for, while）       │ │
│  │ [28:45] 函数定义与调用                         │ │
│  │ [40:10] 实战练习：简单计算器                   │ │
│  │                                                │ │
│  │ 💡 学习建议                                    │ │
│  │ • 适合零基础初学者                             │ │
│  │ • 建议配合实际编程练习                         │ │
│  │ • 重点掌握缩进规则                             │ │
│  │ • 推荐使用Jupyter Notebook进行练习            │ │
│  │                                                │ │
│  │ 🎓 难度评估: ⭐⭐☆☆☆ (入门级)                  │ │
│  │ ⏱️ 建议学习时长: 3-5天                         │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│ [💾 保存为MD] [📤 导出为PDF] [📋 复制到剪贴板]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**技术实现**：

```javascript
// AI内容摘要生成
async function generateContentSummary(sessionId) {
  // 1. 获取所有翻译记录
  const translations = await db.getTranslationsBySession(sessionId);
  
  // 2. 合并译文
  const fullText = translations.map(t => t.translated_text).join(' ');
  
  // 3. 提取时间轴信息
  const timelineData = translations.map(t => ({
    time: formatTime(t.relative_time),
    text: t.translated_text
  }));
  
  // 4. 调用GPT-4生成摘要
  const prompt = `
请分析以下视频内容的翻译记录，生成一份详细的内容摘要：

视频标题: ${session.session_name}
视频时长: ${formatDuration(session.total_duration)}
翻译内容:
${fullText}

请提供以下内容：
1. 核心主题（2-3句话概括主要内容）
2. 关键知识点列表（5-10个要点，每个要点1-2句话）
3. 重要时间轴（5-8个关键时间点，标注重要内容段落）
4. 学习建议（3-5条实用建议）
5. 难度评估（用星级表示，1-5星）
6. 建议学习时长

请使用简洁清晰的中文，采用结构化的Markdown格式输出。
`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的内容分析师，擅长总结视频和会议内容。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  });
  
  const summary = response.choices[0].message.content;
  
  // 5. 保存摘要到数据库
  await db.saveSummary(sessionId, {
    summary_type: 'overview',
    content: summary,
    model_used: 'gpt-4-turbo',
    generated_at: new Date()
  });
  
  return summary;
}
```

---

#### 2.8.3 AI思维导图生成

**功能描述**：
基于内容摘要，自动生成可视化思维导图，帮助用户快速理解知识结构和内容层次。

**功能界面**：

```markdown
┌─────────────────────────────────────────────────────┐
│ 🗺️ AI思维导图 - Python教程-从零开始                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│                   Python基础教程                     │
│                        ┃                            │
│        ┏━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━┓             │
│        ┃               ┃              ┃             │
│    变量与类型       控制流程        函数定义         │
│        ┃               ┃              ┃             │
│  ┏━━━╋━━━┓       ┏━━╋━━┓        ┏━━╋━━┓          │
│  ┃   ┃   ┃       ┃     ┃        ┃     ┃          │
│ int str list    if   for       def  return        │
│                 else while                         │
│                                                     │
│ 💡 交互功能:                                        │
│  • 点击节点展开/收起子节点                          │
│  • 拖动节点调整位置                                 │
│  • 双击节点编辑内容                                 │
│  • 右键添加/删除节点                                │
│  • 滚轮缩放视图                                     │
│                                                     │
│ 🎨 样式切换:                                        │
│  [经典] [彩色] [简约] [暗黑] [自定义]              │
│                                                     │
│ [💾 导出PNG] [📄 导出SVG] [📋 导出Markdown]        │
│ [🔄 重新生成] [✏️ 手动编辑]                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**技术实现（使用Mermaid.js）**：

```javascript
// 生成思维导图
async function generateMindMap(sessionId) {
  // 1. 获取内容摘要
  const summary = await db.getSummary(sessionId, 'overview');
  
  // 2. 调用GPT-4生成Mermaid语法
  const prompt = `
根据以下内容摘要，生成一个Mermaid格式的思维导图：

${summary.content}

要求：
1. 使用Mermaid mindmap语法
2. 层级不超过3层
3. 每个节点简洁明了（不超过10个字）
4. 突出重点内容
5. 逻辑清晰，结构合理

请直接输出Mermaid代码，不要包含其他说明文字。
`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: '你是一个思维导图专家，擅长将内容整理成清晰的层次结构。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1000,
    temperature: 0.5
  });
  
  const mermaidCode = response.choices[0].message.content;
  
  // 3. 渲染Mermaid图表
  const svgCode = await mermaid.render('mindmap-svg', mermaidCode);
  
  // 4. 保存到数据库
  await db.saveMindMap(sessionId, {
    mermaid_code: mermaidCode,
    svg_code: svgCode,
    style: 'default',
    created_at: new Date()
  });
  
  return { mermaidCode, svgCode };
}

// Mermaid配置
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  mindmap: {
    useMaxWidth: true,
    padding: 10
  }
});
```

**导出格式**：
- 📊 **PNG图片**：高分辨率，适合打印和分享
- 📄 **SVG矢量图**：可缩放，适合网页展示
- 📝 **Markdown**：包含Mermaid代码块，可在支持Mermaid的编辑器中查看
- 🧠 **XMind格式**：（未来支持）可在XMind中打开编辑

---

#### 2.8.4 关键词提取与标签推荐

**功能描述**：
使用NLP技术自动提取内容关键词，为会话智能推荐标签，方便后续搜索和分类。

**技术实现**：

```javascript
// 提取关键词
async function extractKeywords(sessionId) {
  const translations = await db.getTranslationsBySession(sessionId);
  const fullText = translations.map(t => t.translated_text).join(' ');
  
  // 方法1: 使用GPT-4提取
  const prompt = `
请从以下文本中提取5-10个关键词，用于标签和搜索：

${fullText}

要求：
1. 关键词应该是名词或名词短语
2. 选择最能代表内容主题的词汇
3. 适合作为标签使用
4. 用逗号分隔
5. 仅输出关键词，不要其他说明

示例输出: Python, 编程, 教程, 入门, 变量, 函数
`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100
  });
  
  const keywordsText = response.choices[0].message.content;
  const keywords = keywordsText.split(',').map(k => k.trim());
  
  // 保存关键词
  await db.saveSummary(sessionId, {
    summary_type: 'keywords',
    content: JSON.stringify(keywords),
    model_used: 'gpt-4-turbo'
  });
  
  return keywords;
}
```

**UI显示**：

```markdown
┌──────────────────────────────────────┐
│ 🏷️ 智能标签推荐                     │
├──────────────────────────────────────┤
│ AI已为您分析内容，推荐以下标签:      │
│                                      │
│ [+Python] [+编程] [+教程] [+入门]    │
│ [+变量] [+函数] [+控制流程]          │
│ [+数据类型] [+实战]                  │
│                                      │
│ 💡 点击添加标签到会话                │
│                                      │
│ □ 自动接受所有推荐标签               │
│                                      │
│ [✅ 确认]  [🔄 重新分析]             │
└──────────────────────────────────────┘
```

---

#### 2.8.5 AI问答助手（未来扩展）

**功能构想**：
基于会话内容，用户可以向AI提问，快速查找相关信息，实现智能问答。

**示例对话**：

```markdown
用户: 视频中讲了哪些数据类型？

AI: 根据视频内容，主要讲解了以下Python数据类型：
    1. int (整数) - 用于存储整数值
    2. str (字符串) - 用于存储文本
    3. list (列表) - 可变序列，存储多个值
    4. dict (字典) - 键值对数据结构
    
    具体讲解在 [05:12 - 12:30] 时间段。
    [跳转到该时间点]

用户: 函数定义的语法是什么？

AI: Python函数定义的语法如下：
    ```python
    def function_name(parameters):
        # 函数体
        return result
    ```
    
    关键点：
    • 使用 def 关键字
    • 函数名后跟括号和参数
    • 冒号后缩进函数体
    • 使用 return 返回值（可选）
    
    详细讲解在 [28:45 - 35:20] 时间段。
    [跳转到该时间点]

用户: 帮我总结一下控制流程部分

AI: 控制流程部分 [15:30 - 28:40] 主要内容总结：
    
    **条件判断 (if-else)**
    • 基本语法和缩进规则
    • elif 多条件判断
    • 逻辑运算符 and、or、not
    
    **循环结构**
    • for循环遍历序列
    • while循环条件控制
    • break和continue关键字
    
    **实例演示**
    • 判断奇偶数
    • 计算1到100的和
    
    [查看完整笔记] [导出此部分字幕]
```

**技术实现**：

```javascript
// AI问答系统
class ContentQASystem {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.context = null;
  }
  
  async initialize() {
    // 加载会话内容和摘要
    const translations = await db.getTranslationsBySession(this.sessionId);
    const summary = await db.getSummary(this.sessionId, 'overview');
    
    this.context = {
      translations: translations,
      summary: summary,
      fullText: translations.map(t => t.translated_text).join('\n')
    };
  }
  
  async ask(question) {
    const prompt = `
基于以下视频内容，回答用户的问题：

视频摘要:
${this.context.summary.content}

完整内容:
${this.context.fullText}

用户问题: ${question}

请提供准确、有帮助的回答。如果答案涉及特定时间段，请标注时间戳。
`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个AI助手，帮助用户理解和回顾视频内容。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500
    });
    
    return response.choices[0].message.content;
  }
  
  // 查找相关片段
  findRelevantSegments(question) {
    // 使用向量相似度搜索相关内容
    // ...
  }
}
```

---

## 三、非功能性需求

### 3.1 性能要求

#### 3.1.1 响应时间

| 操作类型 | 目标响应时间 | 说明 |
|---------|-------------|------|
| 音频捕获延迟 | < 100ms | 从音频源到软件接收的延迟 |
| 语音识别延迟 | < 500ms | 在线API模式 |
| 语音识别延迟 | < 300ms | 本地模型模式 |
| 翻译延迟 | < 1000ms | 在线API模式 |
| 翻译延迟 | < 500ms | 本地模型模式 |
| 字幕显示延迟 | < 2秒 | 端到端总延迟（可接受范围）|
| UI操作响应 | < 200ms | 所有界面交互 |
| 数据库查询 | < 100ms | 单次查询 |
| 页面加载 | < 1秒 | 界面切换 |

#### 3.1.2 资源占用

**CPU占用率**：
- 空闲时：< 5%
- 翻译时：< 30%（双核及以上）
- 峰值：< 50%（短时间）

**内存占用**：
- 基础运行：< 200MB
- 翻译中：< 500MB
- 峰值：< 1GB（本地模型）

**磁盘占用**：
- 安装包：< 100MB
- 数据库：根据使用时长增长，每月约50-200MB
- 临时文件：自动清理，不超过1GB

**网络带宽**：
- 在线API模式：< 1Mbps
- 音频上传：< 500Kbps
- 结果下载：< 200Kbps

#### 3.1.3 并发处理能力

- 支持同时运行多个翻译会话（多窗口）
- 支持后台队列处理（批量视频翻译）
- 音频流处理使用独立线程，不阻塞UI

---

### 3.2 稳定性与可靠性

#### 3.2.1 异常处理

**API调用失败**：
- 自动重试机制（指数退避，最多3次）
- 失败后提示用户并记录日志
- 降级方案：切换到备用引擎或本地模型

**音频捕获中断**：
- 自动检测音频源状态
- 断开后自动尝试重新连接
- 重连失败后提示用户手动选择

**网络断开**：
- 本地队列缓存待处理请求
- 网络恢复后自动继续处理
- 离线模式自动启用本地模型

**软件崩溃**：
- 自动保存当前会话状态
- 重启后提示恢复未完成的会话
- 崩溃日志自动上报（用户同意后）

**错误日志**：

```javascript
// 错误处理示例
class ErrorHandler {
  static async handle(error, context) {
    // 1. 记录错误
    await logger.error({
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date()
    });
    
    // 2. 尝试恢复
    if (error.recoverable) {
      await this.attemptRecovery(error, context);
    }
    
    // 3. 通知用户
    if (error.userFacing) {
      showErrorNotification({
        title: '发生错误',
        message: error.userMessage || '操作失败，请重试',
        actions: error.actions || ['重试', '取消']
      });
    }
  }
  
  static async attemptRecovery(error, context) {
    switch(error.type) {
      case 'API_FAILURE':
        return await this.retryAPICall(context);
      case 'AUDIO_DISCONNECT':
        return await this.reconnectAudio(context);
      case 'NETWORK_ERROR':
        return await this.enableOfflineMode();
      default:
        return false;
    }
  }
}
```

#### 3.2.2 数据安全

**数据备份**：
- 每日自动备份数据库到本地
- 保留最近7天的备份文件
- 可选云端备份（加密传输）

**API密钥安全**：
- 使用AES-256加密存储
- 密钥加密采用设备唯一标识
- 不可逆向解密

**数据恢复**：
- 支持从备份恢复数据
- 恢复前自动创建当前数据快照
- 恢复过程可撤销

**隐私保护**：
- 音频数据仅在内存处理，不持久化存储（可选保存）
- 翻译记录存储在本地，不上传云端
- 用户可随时删除所有数据

#### 3.2.3 日志系统

**日志级别**：
- **Debug**：详细调试信息
- **Info**：常规操作记录
- **Warning**：警告信息
- **Error**：错误信息
- **Fatal**：致命错误

**日志内容**：
- 操作记录（启动、停止、配置更改等）
- API调用（请求、响应、耗时）
- 错误堆栈（详细错误信息）
- 性能指标（CPU、内存、延迟等）

**日志文件管理**：
- 日志文件按日期分割
- 自动清理超过30天的日志
- 日志文件大小限制（单个文件 < 10MB）

**日志查看器**：

```markdown
┌──────────────────────────────────────────────────┐
│ 📜 日志查看器                       [🔄] [🗑️] [⚙️]│
├──────────────────────────────────────────────────┤
│ 筛选: [全部 ▼] [Info] [Warning] [Error]         │
│ 时间: [今天 ▼]  搜索: [🔍 搜索...]              │
│                                                  │
│ 2025-01-12 15:30:22 [INFO] 翻译会话已启动       │
│   Session ID: sess_20250112_153022_abc123       │
│   Audio Source: Chrome - YouTube                │
│                                                  │
│ 2025-01-12 15:30:25 [INFO] API连接成功          │
│   Engine: Gummy                                 │
│   Latency: 0.8s                                 │
│                                                  │
│ 2025-01-12 15:35:10 [WARNING] 音频质量较低      │
│   SNR: 15dB (建议 > 20dB)                       │
│   建议: 提高音量或启用降噪                       │
│                                                  │
│ 2025-01-12 15:42:05 [ERROR] API调用失败         │
│   Error: Connection timeout                     │
│   Retry: 1/3                                    │
│   [查看详情]                                     │
│                                                  │
│ [加载更多...]                                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### 3.3 多平台支持

#### 3.3.1 操作系统兼容性

**Windows**：
- Windows 10 (版本 1809及以上) 64位
- Windows 11 64位

**macOS**：
- macOS 11 (Big Sur) 及以上
- 支持Intel和Apple Silicon (M1/M2/M3)

**Linux**：
- Ubuntu 20.04 LTS及以上
- Debian 11及以上
- Fedora 35及以上
- Arch Linux (滚动更新)

#### 3.3.2 平台特定实现

**Windows平台**：
- 音频捕获：WASAPI Loopback
- UI框架：Electron + React
- 安装包：NSIS安装程序
- 自动更新：Squirrel.Windows

**macOS平台**：
- 音频捕获：Core Audio
- UI框架：Electron + React
- 安装包：DMG镜像文件
- 自动更新：Squirrel.Mac
- 签名：Apple Developer ID签名

**Linux平台**：
- 音频捕获：PulseAudio/ALSA
- UI框架：Electron + React
- 安装包：AppImage / DEB / RPM
- 自动更新：AppImageUpdate

#### 3.3.3 统一体验

**跨平台配置同步**：
- 导出配置文件（JSON格式）
- 导入到其他设备
- 可选云端同步（需登录账号）

**相同的功能集**：
- 所有平台提供相同的核心功能
- UI布局和交互保持一致
- 快捷键自动适配（Ctrl vs Cmd）

**平台特定优化**：
- Windows：优化任务栏集成
- macOS：优化菜单栏和Dock
- Linux：优化系统托盘

---

### 3.4 自动更新

#### 3.4.1 更新机制

**更新检测**：
- 启动时检查更新
- 后台每4小时检查一次
- 用户可手动检查更新

**更新策略**：
- **小版本更新**（x.x.1 → x.x.2）：静默下载，提示安装
- **大版本更新**（x.1.x → x.2.x）：弹窗提示，用户确认

**增量更新**：
- 只下载变化的文件
- 减少下载量和安装时间
- 失败自动回滚

#### 3.4.2 更新流程

```markdown
1. 检测到新版本
   ↓
2. 弹出更新提示:
   ┌────────────────────────────────┐
   │ 🎉 发现新版本 v2.1.0           │
   ├────────────────────────────────┤
   │ 更新内容:                      │
   │  ✨ 新增本地视频翻译功能       │
   │  ⚡ 优化字幕显示性能           │
   │  🐛 修复若干Bug               │
   │                                │
   │ 更新大小: 23.5 MB              │
   │ 发布日期: 2025-01-15           │
   │                                │
   │ [📖 查看完整更新日志]          │
   │                                │
   │ [⏰ 稍后提醒] [⏭️ 忽略此版本]  │
   │              [⬇️ 立即更新]     │
   └────────────────────────────────┘
   ↓
3. 用户点击"立即更新"
   ↓
4. 后台下载更新包:
   ┌────────────────────────────────┐
   │ 正在下载更新... (32%)          │
   │ [████████░░░░░░░░░░░░]        │
   │ 7.5 MB / 23.5 MB              │
   │ 速度: 2.1 MB/s | 剩余: 8秒    │
   │                                │
   │ [⏸️ 暂停]  [❌ 取消]           │
   └────────────────────────────────┘
   ↓
5. 下载完成，准备安装:
   ┌────────────────────────────────┐
   │ ✅ 更新下载完成                │
   ├────────────────────────────────┤
   │ 需要关闭应用以完成安装。        │
   │                                │
   │ □ 安装后自动启动应用            │
   │                                │
   │ [⏰ 稍后安装]  [🔄 立即安装]   │
   └────────────────────────────────┘
   ↓
6. 关闭应用，执行更新
   ↓
7. 更新完成，自动重启应用
```

#### 3.4.3 版本回滚

**回滚功能**：
- 支持回滚到上一个稳定版本
- 保留最近3个历史版本
- 回滚前自动备份当前数据

**回滚操作**：

```markdown
设置 → 关于 → 版本管理

┌────────────────────────────────┐
│ 📦 版本管理                    │
├────────────────────────────────┤
│ 当前版本: v2.1.0               │
│ 安装日期: 2025-01-15           │
│                                │
│ 历史版本:                      │
│  • v2.0.5 (2025-01-10)         │
│    [🔄 回滚到此版本]           │
│                                │
│  • v2.0.3 (2025-01-05)         │
│    [🔄 回滚到此版本]           │
│                                │
│ 💡 回滚前会自动备份当前数据     │
│                                │
└────────────────────────────────┘
```

---

### 3.5 用户体验优化

#### 3.5.1 首次使用引导

**新手教程**：

```markdown
首次启动时显示欢迎向导:

┌────────────────────────────────────────────┐
│ 🎉 欢迎使用大模型翻译助手！         [跳过] │
├────────────────────────────────────────────┤
│                                            │
│ 让我们用3个步骤快速开始:                   │
│                                            │
│ 第1步: 配置翻译引擎                        │
│  • 输入阿里云Gummy API Key                 │
│  • 或选择其他翻译引擎                      │
│  [下一步 →]                                │
│                                            │
└────────────────────────────────────────────┘

→

┌────────────────────────────────────────────┐
│ 第2步: 选择音频源                          │
│  • 了解如何选择窗口或浏览器标签页          │
│  • 测试音频捕获                            │
│  [← 上一步]  [下一步 →]                   │
└────────────────────────────────────────────┘

→

┌────────────────────────────────────────────┐
│ 第3步: 开始第一次翻译                      │
│  • 打开一个YouTube视频                     │
│  • 点击"开始翻译"按钮                      │
│  • 看看实时字幕效果吧！                    │
│  [← 上一步]  [开始使用 ✓]                 │
└────────────────────────────────────────────┘
```

**交互式教程**：
- 高亮显示关键按钮和功能
- 提供示例操作演示
- 可随时跳过或重新查看

#### 3.5.2 错误提示友好化

**错误信息设计原则**：
1. **说明问题**：清楚说明发生了什么错误
2. **解释原因**：为什么会发生这个错误
3. **提供解决方案**：用户应该怎么做
4. **避免技术术语**：使用通俗易懂的语言

**示例**：

```markdown
❌ 差的错误提示:
┌────────────────────────────────┐
│ Error: API_KEY_INVALID         │
│ Code: 401                      │
│ [OK]                           │
└────────────────────────────────┘

✅ 好的错误提示:
┌────────────────────────────────────────┐
│ ⚠️ API密钥验证失败                     │
├────────────────────────────────────────┤
│ 问题: 无法连接到阿里云Gummy服务        │
│                                        │
│ 可能原因:                              │
│  • API密钥输入错误                     │
│  • API密钥已过期                       │
│  • 账号余额不足                        │
│                                        │
│ 建议解决方案:                          │
│  1. 检查API密钥是否正确                │
│  2. 登录阿里云控制台验证密钥状态       │
│  3. 查看账号余额                       │
│                                        │
│ [🔑 重新输入API密钥]  [📖 查看帮助]    │
│ [❌ 关闭]                              │
└────────────────────────────────────────┘
```

**常见问题FAQ内置**：

```markdown
设置 → 帮助与支持 → 常见问题

┌────────────────────────────────────────┐
│ ❓ 常见问题                            │
├────────────────────────────────────────┤
│ 🔍 [搜索问题...]                       │
│                                        │
│ 热门问题:                              │
│  ▶ 如何获取API密钥？                   │
│  ▶ 为什么听不到原声音频？              │
│  ▶ 字幕延迟太高怎么办？                │
│  ▶ 如何导出字幕文件？                  │
│  ▶ 支持哪些视频格式？                  │
│                                        │
│ 分类:                                  │
│  📁 安装和配置                         │
│  📁 音频捕获                           │
│  📁 翻译和字幕                         │
│  📁 会话管理                           │
│  📁 导出和分享                         │
│  📁 故障排除                           │
│                                        │
│ [💬 联系支持]  [📧 反馈问题]           │
└────────────────────────────────────────┘
```

#### 3.5.3 在线支持

**支持渠道**：
- 📖 在线文档：https://docs.translator-app.com
- 💬 社区论坛：https://forum.translator-app.com
- 📧 邮件支持：support@translator-app.com
- 🐛 Bug反馈：https://github.com/translator-app/issues

**应用内支持入口**：

```markdown
┌────────────────────────────────┐
│ 💬 帮助与支持                  │
├────────────────────────────────┤
│ [📖 查看文档]                  │
│ [❓ 常见问题]                  │
│ [🎥 视频教程]                  │
│ [💬 社区论坛]                  │
│ [📧 联系支持]                  │
│ [🐛 反馈问题]                  │
│                                │
│ [📊 诊断报告] - 用于问题排查   │
└────────────────────────────────┘
```

#### 3.5.4 多语言界面支持

**支持语言**：
- 🇨🇳 简体中文
- 🇺🇸 English (英语)
- 🇯🇵 日本語 (日语)
- 🇰🇷 한국어 (韩语)
- 🇫🇷 Français (法语)
- 🇩🇪 Deutsch (德语)
- 🇪🇸 Español (西班牙语)

**语言切换**：

```markdown
设置 → 通用 → 语言

┌────────────────────────────────┐
│ 🌍 界面语言                    │
├────────────────────────────────┤
│ 当前语言: 简体中文              │
│                                │
│ 可用语言:                      │
│  ⦿ 简体中文                    │
│  ○ English                     │
│  ○ 日本語                      │
│  ○ 한국어                      │
│  ○ Français                    │
│  ○ Deutsch                     │
│  ○ Español                     │
│                                │
│ □ 跟随系统语言                 │
│                                │
│ 💡 更改语言后需要重启应用       │
│                                │
│ [保存]  [取消]                 │
└────────────────────────────────┘
```

---

## 四、技术架构设计

### 4.1 整体架构

**技术栈概览**：

```markdown
┌─────────────────────────────────────────────────────┐
│              前端界面层 (React 18 + TypeScript)      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 主界面 / 窗口选择器 / 字幕框 / 会话管理 / AI分析 │ │
│  │ UI组件: Ant Design 5.x                         │ │
│  │ 状态管理: Zustand                              │ │
│  │ 图表: Recharts, Mermaid.js                    │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      ↕️ IPC通信 (Electron)
┌─────────────────────────────────────────────────────┐
│         后端核心层 (Node.js 18+ + Electron 27+)      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 窗口选择器模块 (Native Addon - C++/Rust)       │ │
│  │  • Windows: Win32 API + WASAPI                │ │
│  │  • macOS: NSWorkspace + Core Audio            │ │
│  │  • Linux: X11 + PulseAudio                    │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ 音频捕获模块 (node-windows-audio-capture v2.1)│ │
│  │  • 应用窗口: WASAPI Loopback (进程级捕获)     │ │
│  │  • 动态静音: 自动隔离非目标进程 (90%+ 纯度)  │ │
│  │  • 麦克风: getUserMedia API                   │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ 音频处理模块                                   │ │
│  │  • 降噪: WebRTC Audio Processing             │ │
│  │  • 音量标准化                                 │ │
│  │  • 格式转换: PCM ↔ WAV ↔ Base64              │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ 翻译引擎模块 (三种配置模式)                     │ │
│  │  【一体化API】                                 │ │
│  │   • 阿里Gummy (WebSocket)                     │ │
│  │   • OpenAI Realtime API                       │ │
│  │   • 讯飞星火                                   │ │
│  │  【分离式API】                                 │ │
│  │   • ASR: Whisper / 讯飞 / 百度               │ │
│  │   • Translation: DeepSeek / GPT-4 / Claude   │ │
│  │  【本地离线模型】                              │ │
│  │   • Whisper.cpp + Llama.cpp                  │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ 会话管理模块                                   │ │
│  │  • 会话CRUD                                   │ │
│  │  • 翻译记录管理                               │ │
│  │  • 标签和搜索                                 │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ 字幕导出模块                                   │ │
│  │  • SRT/VTT/ASS生成器                         │ │
│  │  • FFmpeg集成 (视频处理)                      │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ AI分析模块                                     │ │
│  │  • GPT-4 API客户端                           │ │
│  │  • 内容摘要生成                               │ │
│  │  • 思维导图生成                               │ │
│  │  • 关键词提取                                 │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      ↕️ ORM (Sequelize)
┌─────────────────────────────────────────────────────┐
│         数据持久化层 (SQLite 3)                      │
│  • sessions表 (会话信息)                            │
│  • translations表 (翻译记录)                        │
│  • content_summaries表 (AI分析结果)                 │
│  • mind_maps表 (思维导图)                           │
│  • configs表 (配置)                                 │
│  • api_keys表 (API密钥，加密存储)                   │
└─────────────────────────────────────────────────────┘
```

### 4.2 关键技术选型

#### 4.2.1 前端技术栈

```json
{
  "framework": "React 18.2+",
  "language": "TypeScript 5.0+",
  "ui": "Ant Design 5.x",
  "state": "Zustand 4.x",
  "charts": ["Recharts", "Mermaid.js", "D3.js"],
  "styling": "CSS Modules + Sass",
  "build": "Vite 5.x",
  "testing": "Jest + React Testing Library"
}
```

**为什么选择React？**
- 成熟的生态系统
- 丰富的组件库
- 良好的TypeScript支持
- Electron兼容性好

#### 4.2.2 后端技术栈

```json
{
  "runtime": "Node.js 18 LTS",
  "desktop": "Electron 27+",
  "database": "SQLite 3 + Sequelize ORM",
  "native": "Node-API (N-API) + C++/Rust",
  "video": "FFmpeg (fluent-ffmpeg)",
  "audio": "WebRTC Audio Processing",
  "http": "Axios",
  "websocket": "ws library",
  "logging": "Winston",
  "testing": "Jest"
}
```

**为什么选择Electron？**
- 跨平台支持（Windows/macOS/Linux）
- 使用Web技术栈开发桌面应用
- 强大的Native API集成能力
- 活跃的社区和丰富的生态

#### 4.2.3 Native模块技术栈

**音频捕获（C++）**：
- Windows: WASAPI + Win32 API
- macOS: Core Audio + AVFoundation
- Linux: PulseAudio + ALSA

**窗口枚举（C++）**：
- Windows: EnumWindows + GetWindowText
- macOS: NSWorkspace + CGWindowListCopyWindowInfo
- Linux: X11 + XQueryTree

**或使用Rust（性能更好）**：
- windows-rs (Windows API绑定)
- core-foundation-rs (macOS API绑定)
- x11-rs (Linux X11绑定)

### 4.3 模块间通信

**IPC通信架构**：

```javascript
// 渲染进程 → 主进程
ipcRenderer.invoke('start-translation', {
  sessionId: 'xxx',
  audioSource: {...},
  engineConfig: {...}
});

// 主进程 → 渲染进程（事件推送）
mainWindow.webContents.send('translation-update', {
  sessionId: 'xxx',
  original: '...',
  translated: '...'
});

// 双向通信示例
ipcMain.handle('get-windows', async () => {
  const windows = await nativeModule.enumerateWindows();
  return windows;
});
```

**事件总线**：

```javascript
// 应用内事件总线
class EventBus {
  constructor() {
    this.events = new Map();
  }
  
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(handler);
  }
  
  emit(event, data) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  off(event, handler) {
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

// 使用示例
eventBus.on('translation:update', (data) => {
  updateSubtitleDisplay(data);
  saveToDatabase(data);
});

eventBus.emit('translation:update', {
  original: 'Hello',
  translated: '你好'
});
```

### 4.4 性能优化策略

#### 4.4.1 音频流处理优化

**环形缓冲区（Ring Buffer）**：

```javascript
class RingBuffer {
  constructor(size) {
    this.buffer = new Float32Array(size);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.size = size;
  }
  
  write(data) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.writeIndex] = data[i];
      this.writeIndex = (this.writeIndex + 1) % this.size;
    }
  }
  
  read(length) {
    const result = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.size;
    }
    return result;
  }
  
  available() {
    return (this.writeIndex - this.readIndex + this.size) % this.size;
  }
}
```

**多线程处理**：

```javascript
// 主线程：音频捕获
const captureWorker = new Worker('audio-capture-worker.js');

// Worker线程：音频处理
// audio-capture-worker.js
self.onmessage = (e) => {
  const audioData = e.data;
  
  // 降噪处理
  const processedData = applyNoiseReduction(audioData);
  
  // 音量标准化
  const normalizedData = normalizeVolume(processedData);
  
  // 发送回主线程
  self.postMessage(normalizedData);
};
```

**批量处理**：

```javascript
// 累积一定时长的音频再发送，减少API调用次数
class AudioBatcher {
  constructor(batchDuration = 1000) {  // 1秒
    this.buffer = [];
    this.batchDuration = batchDuration;
    this.timer = null;
  }
  
  add(audioChunk) {
    this.buffer.push(audioChunk);
    
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.batchDuration);
    }
  }
  
  flush() {
    if (this.buffer.length > 0) {
      const combined = this.combineChunks(this.buffer);
      this.sendToAPI(combined);
      this.buffer = [];
    }
    this.timer = null;
  }
  
  combineChunks(chunks) {
    // 合并音频块
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }
}
```

#### 4.4.2 UI渲染优化

**虚拟列表（会话列表）**：

```jsx
import { FixedSizeList } from 'react-window';

function SessionList({ sessions }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <SessionCard session={sessions[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={sessions.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**字幕框独立渲染**：

```javascript
// 使用独立的BrowserWindow渲染字幕框
const subtitleWindow = new BrowserWindow({
  width: 800,
  height: 100,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  hasShadow: false,
  webPreferences: {
    offscreen: false,  // 启用GPU加速
    enableWebGL: true
  }
});

// 避免阻塞主窗口
subtitleWindow.loadFile('subtitle.html');
```

**React性能优化**：

```jsx
// 使用React.memo避免不必要的重渲染
const SubtitleDisplay = React.memo(({ text }) => {
  return <div className="subtitle">{text}</div>;
});

// 使用useMemo缓存计算结果
const processedText = useMemo(() => {
  return formatSubtitle(rawText);
}, [rawText]);

// 使用useCallback缓存函数
const handleUpdate = useCallback((data) => {
  updateSubtitle(data);
}, []);
```

#### 4.4.3 数据库优化

**索引优化**：

```sql
-- 会话查询优化
CREATE INDEX idx_session_type ON sessions(session_type);
CREATE INDEX idx_session_start_time ON sessions(start_time DESC);
CREATE INDEX idx_session_status ON sessions(status);
CREATE INDEX idx_session_tags ON sessions(tags);  -- 全文索引

-- 翻译记录查询优化
CREATE INDEX idx_translation_session ON translations(session_id);
CREATE INDEX idx_translation_time ON translations(relative_time);
CREATE INDEX idx_translation_search ON translations(translated_text);  -- 全文索引
```

**分表存储**：

```javascript
// 按月份分表，避免单表过大
function getTableName(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `translations_${year}_${month}`;
}

// 自动创建分表
async function ensureTableExists(date) {
  const tableName = getTableName(date);
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id VARCHAR(64) NOT NULL,
      -- ... 其他字段
    )
  `);
  
  return tableName;
}
```

**查询优化**：

```javascript
// 使用prepared statements
const stmt = db.prepare(`
  SELECT * FROM sessions
  WHERE session_type = ? AND start_time > ?
  ORDER BY start_time DESC
  LIMIT ?
`);

const sessions = stmt.all('video', startDate, limit);
```

---

## 五、数据库设计

### 5.1 数据表结构

#### 5.1.1 会话表（sessions）

```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    session_type VARCHAR(20) NOT NULL,  -- video/meeting/audio/microphone
    session_name VARCHAR(255),
    audio_source VARCHAR(255),  -- 音频源描述
    source_url TEXT,  -- 来源URL（如YouTube链接）
    source_language VARCHAR(10),  -- 源语言代码（如en, zh, ja）
    target_language VARCHAR(10),  -- 目标语言代码
    engine_type VARCHAR(50),  -- 翻译引擎类型（gummy, openai等）
    engine_model VARCHAR(100),  -- 具体模型（qwen-audio-turbo等）
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active/paused/completed
    tags TEXT,  -- JSON数组，如'["编程", "Python"]'
    total_duration INTEGER DEFAULT 0,  -- 总时长（秒）
    total_words INTEGER DEFAULT 0,  -- 总字数
    total_records INTEGER DEFAULT 0,  -- 翻译记录总数
    average_confidence REAL DEFAULT 0,  -- 平均置信度
    api_calls INTEGER DEFAULT 0,  -- API调用次数
    estimated_cost REAL DEFAULT 0,  -- 预估成本（元）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_session_type ON sessions(session_type);
CREATE INDEX idx_session_start_time ON sessions(start_time DESC);
CREATE INDEX idx_session_status ON sessions(status);
CREATE INDEX idx_session_updated ON sessions(updated_at DESC);
```

#### 5.1.2 翻译记录表（translations）

```sql
CREATE TABLE translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id VARCHAR(64) UNIQUE NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    timestamp DATETIME NOT NULL,  -- 绝对时间戳
    relative_time REAL NOT NULL,  -- 相对会话开始的秒数
    duration REAL DEFAULT 3.0,  -- 该条字幕显示时长（秒）
    original_text TEXT,  -- 原文
    translated_text TEXT,  -- 译文
    confidence REAL DEFAULT 1.0,  -- 识别置信度 (0-1)
    audio_segment_path TEXT,  -- 音频片段文件路径（可选）
    is_edited BOOLEAN DEFAULT 0,  -- 是否被用户手动编辑
    note TEXT,  -- 用户备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_translation_session ON translations(session_id);
CREATE INDEX idx_translation_time ON translations(relative_time);
CREATE INDEX idx_translation_timestamp ON translations(timestamp);

-- 全文搜索索引（SQLite FTS5）
CREATE VIRTUAL TABLE translations_fts USING fts5(
    record_id,
    original_text,
    translated_text,
    content='translations',
    content_rowid='id'
);

-- 触发器：保持FTS表同步
CREATE TRIGGER translations_ai AFTER INSERT ON translations BEGIN
    INSERT INTO translations_fts(rowid, record_id, original_text, translated_text)
    VALUES (new.id, new.record_id, new.original_text, new.translated_text);
END;

CREATE TRIGGER translations_ad AFTER DELETE ON translations BEGIN
    DELETE FROM translations_fts WHERE rowid = old.id;
END;

CREATE TRIGGER translations_au AFTER UPDATE ON translations BEGIN
    UPDATE translations_fts
    SET original_text = new.original_text, translated_text = new.translated_text
    WHERE rowid = new.id;
END;
```

#### 5.1.3 内容摘要表（content_summaries）

```sql
CREATE TABLE content_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(64) NOT NULL,
    summary_type VARCHAR(20) NOT NULL,  -- overview/keywords/timeline/qa
    content TEXT NOT NULL,  -- Markdown格式的摘要内容或JSON数据
    model_used VARCHAR(50),  -- 使用的AI模型（gpt-4-turbo等）
    tokens_used INTEGER,  -- 消耗的tokens数
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_summary_session ON content_summaries(session_id);
CREATE INDEX idx_summary_type ON content_summaries(summary_type);
```

#### 5.1.4 思维导图表（mind_maps）

```sql
CREATE TABLE mind_maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(64) NOT NULL,
    mermaid_code TEXT NOT NULL,  -- Mermaid语法代码
    svg_code TEXT,  -- 渲染后的SVG代码
    image_path TEXT,  -- 导出的图片路径
    style VARCHAR(20) DEFAULT 'default',  -- 样式主题
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_mindmap_session ON mind_maps(session_id);
```

#### 5.1.5 配置表（configs）

```sql
CREATE TABLE configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,  -- JSON格式存储复杂配置
    config_type VARCHAR(20) NOT NULL,  -- string/number/boolean/json
    description TEXT,
    category VARCHAR(50),  -- 配置分类（audio/engine/subtitle/general等）
    is_sensitive BOOLEAN DEFAULT 0,  -- 是否敏感信息
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_category ON configs(category);

-- 预设配置
INSERT INTO configs (config_key, config_value, config_type, category) VALUES
('audio.sample_rate', '48000', 'number', 'audio'),
('audio.noise_reduction', 'medium', 'string', 'audio'),
('subtitle.font_size', '32', 'number', 'subtitle'),
('subtitle.position', '{"x": 0, "y": 0}', 'json', 'subtitle'),
('general.language', 'zh-CN', 'string', 'general'),
('general.theme', 'light', 'string', 'general');
```

#### 5.1.6 API密钥表（api_keys）

```sql
CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name VARCHAR(100) NOT NULL,  -- 密钥名称（用户自定义）
    engine_type VARCHAR(50) NOT NULL,  -- whisper/gummy/openai/xunfei等
    engine_mode VARCHAR(20),  -- integrated/separated/local
    api_key_encrypted TEXT NOT NULL,  -- AES-256加密后的API Key
    api_url TEXT,  -- API端点URL
    api_config TEXT,  -- JSON格式的额外配置
    is_active BOOLEAN DEFAULT 1,  -- 是否启用
    usage_count INTEGER DEFAULT 0,  -- 使用次数
    last_used_at DATETIME,  -- 最后使用时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apikey_engine ON api_keys(engine_type);
CREATE INDEX idx_apikey_active ON api_keys(is_active);
```

#### 5.1.7 导出历史表（export_history）

```sql
CREATE TABLE export_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(64) NOT NULL,
    export_format VARCHAR(20) NOT NULL,  -- srt/vtt/ass/txt/json/png/svg
    export_type VARCHAR(20) NOT NULL,  -- subtitle/mindmap/summary
    file_path TEXT NOT NULL,  -- 导出文件路径
    file_size INTEGER,  -- 文件大小（字节）
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_export_session ON export_history(session_id);
CREATE INDEX idx_export_time ON export_history(exported_at DESC);
```

#### 5.1.8 日志表（logs）

```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(10) NOT NULL,  -- debug/info/warning/error/fatal
    category VARCHAR(50),  -- audio/engine/ui/database等
    message TEXT NOT NULL,
    details TEXT,  -- JSON格式的详细信息
    stack_trace TEXT,  -- 错误堆栈（如果有）
    session_id VARCHAR(64),  -- 关联的会话ID（如果有）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_log_level ON logs(level);
CREATE INDEX idx_log_category ON logs(category);
CREATE INDEX idx_log_time ON logs(created_at DESC);

-- 自动清理超过30天的日志
CREATE TRIGGER cleanup_old_logs
AFTER INSERT ON logs
BEGIN
    DELETE FROM logs WHERE created_at < datetime('now', '-30 days');
END;
```

### 5.2 数据迁移与版本管理

**使用Sequelize Migrations**：

```javascript
// migrations/001-initial-schema.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      session_id: {
        type: Sequelize.STRING(64),
        unique: true,
        allowNull: false
      },
      // ... 其他字段
    });
    
    // 创建索引
    await queryInterface.addIndex('sessions', ['session_type']);
    await queryInterface.addIndex('sessions', ['start_time']);
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sessions');
  }
};

// 运行迁移
npx sequelize-cli db:migrate
```

**版本升级示例**：

```javascript
// migrations/002-add-ai-analysis-tables.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('content_summaries', { /* ... */ });
    await queryInterface.createTable('mind_maps', { /* ... */ });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('content_summaries');
    await queryInterface.dropTable('mind_maps');
  }
};
```

---

## 六、用户界面设计

### 6.1 主界面布局

**主窗口设计**：

```markdown
┌─────────────────────────────────────────────────────────┐
│  大模型翻译助手               ─  □  ✕    [🔔] [⚙️] [❓] │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────────┐ │
│  │  音频源选择          │  │  翻译引擎状态             │ │
│  │                     │  │                          │ │
│  │  🖥️ 应用窗口        │  │  🟢 阿里Gummy: 正常      │ │
│  │  🌐 浏览器标签页    │  │  延迟: 0.8s              │ │
│  │  🎤 麦克风          │  │  今日翻译: 2.5小时        │ │
│  │                     │  │                          │ │
│  │  当前选择:           │  │  [🔄 切换引擎]          │ │
│  │  Chrome - YouTube   │  └──────────────────────────┘ │
│  │  Python教程         │                               │
│  │                     │                               │
│  │  [🎧 测试音频]      │                               │
│  └─────────────────────┘                               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  翻译控制                                        │   │
│  │                                                 │   │
│  │  源语言: [英语 ▼]    →    目标语言: [中文 ▼]    │   │
│  │                                                 │   │
│  │  [▶️ 开始翻译]  [⏸️ 暂停]  [⏹️ 停止]           │   │
│  │                                                 │   │
│  │  当前会话: Python教程-从零开始                   │   │
│  │  翻译时长: 00:15:23  |  已翻译: 42条            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  会话管理                            [查看全部 →] │   │
│  │                                                 │   │
│  │  最近会话:                                       │   │
│  │  • Python教程-从零开始 (进行中)                  │   │
│  │  • Zoom会议-项目讨论 (已完成)                    │   │
│  │  • 英语播客Episode#12 (已完成)                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  状态栏: CPU: 18% | 内存: 356MB | 网络: ↓450KB/s       │
└─────────────────────────────────────────────────────────┘
```

### 6.2 字幕悬浮窗

（已在2.3节详细描述）

### 6.3 设置面板

**完整设置界面**：

```markdown
┌──────────────────────────────────────────────────┐
│ ⚙️ 设置                                     [✕]  │
├──────────────────────────────────────────────────┤
│ 侧边栏:                    主面板:               │
│ ┌────────────┐  ┌──────────────────────────┐   │
│ │ 📋 通用    │  │ 📋 通用设置               │   │
│ │ 🔊 音频    │  │                          │   │
│ │ 🎯 翻译引擎│  │ 界面语言:                 │   │
│ │ 🎨 字幕显示│  │  [简体中文 ▼]            │   │
│ │ ⌨️ 快捷键  │  │                          │   │
│ │ 💾 数据管理│  │ 主题:                     │   │
│ │ 📖 关于    │  │  ⦿ 浅色  ○ 深色  ○ 自动 │   │
│ └────────────┘  │                          │   │
│                 │ 启动选项:                 │   │
│                 │  □ 开机自动启动           │   │
│                 │  □ 启动时检查更新         │   │
│                 │  □ 最小化到系统托盘       │   │
│                 │                          │   │
│                 │ 默认保存位置:             │   │
│                 │  [C:\Users\...\Downloads] │   │
│                 │  [浏览...]               │   │
│                 │                          │   │
│                 │ [保存]  [取消]            │   │
│                 └──────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

## 七、开发优先级与路线图

### 7.1 MVP阶段（第1-2个月）

**目标**：实现核心功能，验证产品可行性

**Week 1-2: 项目初始化**
- ✅ Electron + React + TypeScript项目搭建
- ✅ 基础UI框架（Ant Design）
- ✅ SQLite数据库设计和初始化
- ✅ 项目结构和代码规范

**Week 3-4: 窗口选择器**
- ✅ Windows平台窗口枚举功能
- ✅ 窗口选择器UI（列表模式）
- ✅ 十字准星选择模式
- ✅ 窗口截图预览

**Week 5-6: 音频捕获**
- ✅ WASAPI音频捕获（Windows）
- ✅ 麦克风音频捕获（系统默认）
- ✅ 音频预览和波形显示
- ✅ 音频质量检测

**Week 7-8: 翻译引擎架构**
- ✅ 实现适配器模式（支持三种配置模式）
- ✅ 实现引擎工厂
- ✅ 阿里Gummy一体化适配器
- ✅ 配置模式选择UI
- ✅ 测试一体化模式

**Week 9-10: 字幕显示**
- ✅ 实时字幕悬浮窗
- ✅ 字幕样式配置
- ✅ 位置记忆功能
- ✅ 拖动和锁定功能

**Week 11-12: 会话管理基础**
- ✅ 会话创建和结束
- ✅ 翻译记录保存
- ✅ 基础会话列表
- ✅ 会话详情页面

**Week 13-14: 字幕导出**
- ✅ SRT格式导出
- ✅ VTT格式导出
- ✅ 导出配置界面
- ✅ 导出历史记录

**Week 15-16: MVP测试与优化**
- ✅ 功能测试
- ✅ 性能优化
- ✅ Bug修复
- ✅ 用户文档

**MVP验收标准**：
- ✅ 能够选择特定窗口并捕获音频
- ✅ 实时翻译并显示字幕（延迟 < 2秒）
- ✅ 保存会话记录并导出SRT文件
- ✅ 基本稳定，无频繁崩溃
- ✅ 完成10+用户内测

---

### 7.2 Beta阶段（第3-4个月）

**目标**：功能完善，提升用户体验

**Week 17-18: 音频捕获优化**
- 📅 多进程应用支持优化（Chrome、Edge等）
- 📅 允许/阻止列表 UI 配置
- 📅 音频源实时监控和统计
- 📅 异常处理和自动恢复

**Week 19-20: 多引擎支持**
- 📅 OpenAI Realtime API（一体化）
- 📅 讯飞星火（一体化）
- 📅 Whisper + DeepSeek（分离式）
- 📅 Whisper + GPT-4（分离式）
- 📅 引擎对比工具

**Week 21-22: 会话管理增强**
- 📅 标签系统
- 📅 搜索和筛选
- 📅 统计和分析
- 📅 批量操作
- 📅 会话追加模式

**Week 23-24: macOS支持**
- 📅 Core Audio音频捕获
- 📅 NSWorkspace窗口枚举
- 📅 macOS特定UI适配
- 📅 DMG打包和签名

**Week 25-26: Linux支持**
- 📅 PulseAudio音频捕获
- 📅 X11窗口枚举
- 📅 Linux特定UI适配
- 📅 AppImage打包

**Week 27-28: Beta测试与优化**
- 📅 跨平台测试
- 📅 性能优化
- 📅 用户反馈收集
- 📅 Bug修复

**Beta验收标准**：
- ✅ 支持Windows/macOS/Linux三平台
- ✅ 支持所有应用窗口音频捕获（包括浏览器）
- ✅ 动态静音控制，音频纯度 90%+
- ✅ 支持3种以上翻译引擎
- ✅ 会话管理功能完善
- ✅ 完成100+用户公测

---

### 7.3 正式版（第5-6个月）

**目标**：AI功能、离线模型、产品化

**Week 29-30: AI内容分析**
- 📅 GPT-4 API接入
- 📅 内容摘要生成
- 📅 思维导图生成（Mermaid.js）
- 📅 关键词提取和标签推荐
- 📅 AI分析UI优化

**Week 31-32: 本地视频翻译**
- 📅 FFmpeg集成
- 📅 视频音频提取
- 📅 批量处理功能
- 📅 字幕烧录功能
- 📅 进度显示和任务队列

**Week 33-34: 本地离线模型**
- 📅 Whisper.cpp集成
- 📅 Llama.cpp集成
- 📅 模型下载管理器
- 📅 GPU加速优化
- 📅 性能测试工具

**Week 35-36: 自动更新系统**
- 📅 更新检测和下载
- 📅 增量更新支持
- 📅 版本回滚功能
- 📅 更新日志展示

**Week 37-38: 性能优化**
- 📅 端到端延迟优化（< 1.5秒）
- 📅 内存占用优化（< 400MB）
- 📅 长时间运行稳定性测试
- 📅 资源监控和优化

**Week 39-40: 产品化完善**
- 📅 完善文档和帮助系统
- 📅 多语言界面支持
- 📅 错误提示优化
- 📅 用户引导和教程
- 📅 官网和宣传材料

**正式版验收标准**：
- ✅ 所有核心功能完整可用
- ✅ 性能达标（延迟、资源占用）
- ✅ 稳定性达标（无崩溃）
- ✅ 用户体验优秀（NPS > 50）
- ✅ 文档完善
- ✅ 发布1.0正式版

---

### 7.4 后续迭代（第7个月及以后）

**v1.1 - 高级功能（1-2个月）**
- ✨ 字幕自动阅读（TTS）
- ✨ 翻译结果语音播报
- ✨ AI问答助手
- ✨ 自动生成学习笔记

**v1.2 - 协作与分享（2-3个月）**
- ✨ 云端会话同步
- ✨ 团队协作翻译
- ✨ 分享会话链接
- ✨ 导出为网页

**v1.3 - 扩展与集成（2-3个月）**
- ✨ 浏览器插件（独立版）
- ✨ 移动端应用（iOS/Android）
- ✨ API开放平台
- ✨ 第三方应用集成

**v2.0 - 企业版（3-6个月）**
- ✨ 多用户支持
- ✨ 权限管理
- ✨ 私有部署
- ✨ 自定义模型训练
- ✨ 企业级安全和合规

---

## 八、风险与挑战

### 8.1 技术风险

#### 8.1.1 音频捕获兼容性

**风险描述**：
不同操作系统、不同应用的音频架构差异大，部分应用（如游戏、某些视频播放器）可能无法捕获音频。

**应对措施**：
1. 优先支持主流应用（Chrome、Zoom、PotPlayer等）
2. 提供详细的兼容性列表
3. 对于无法直接捕获的应用，提供虚拟音频设备方案（如VB-CABLE）
4. 提供详细的troubleshooting文档
5. 社区反馈和持续优化

**兼容性测试计划**：
- Windows：测试Top 20常用应用
- macOS：测试Top 15常用应用
- Linux：测试Top 10常用应用

#### 8.1.2 实时性能要求

**风险描述**：
语音识别和翻译的延迟可能影响用户体验，特别是在网络状况不佳或API服务器负载高时。

**应对措施**：
1. 使用流式API降低延迟（如阿里Gummy）
2. 本地缓存和预处理
3. 提供本地离线模型选项
4. 多引擎负载均衡
5. 用户可配置的延迟容忍度

**性能目标**：
- MVP阶段：< 2秒
- Beta阶段：< 1.5秒
- 正式版：< 1秒（最佳情况）

#### 8.1.3 API成本控制

**风险描述**：
在线API调用成本可能很高，尤其是长时间使用或大量用户时。

**应对措施**：
1. 提供本地离线模型选项（Whisper + Llama）
2. 静音检测，避免无效请求
3. 音频压缩和批量处理
4. 用户成本预警和每日额度限制
5. 推荐性价比高的API服务（如阿里Gummy）
6. 企业版考虑私有部署

**成本估算**：
- 阿里Gummy：约 ¥0.01/分钟
- OpenAI Realtime：约 ¥0.05/分钟
- 本地模型：免费（但需要GPU）

---

### 8.2 用户体验风险

#### 8.2.1 学习曲线

**风险描述**：
配置API密钥、选择音频源等操作对小白用户不够友好。

**应对措施**：
1. 提供详细的新手引导
2. 内置演示账号（免费额度）
3. 提供视频教程
4. 简化配置流程（一键配置）
5. 智能推荐配置

**用户调研**：
- 目标：90%的用户能在5分钟内完成首次翻译
- 方法：用户测试 + 问卷调查

#### 8.2.2 翻译质量期望

**风险描述**：
用户对AI翻译质量期望过高，实际使用时可能失望。

**应对措施**：
1. 明确告知用户翻译可能存在错误
2. 提供手动校正功能
3. 推荐高质量翻译模型（GPT-4、Claude等）
4. 提供翻译质量评估和反馈机制
5. 持续优化Prompt和后处理

**质量评估指标**：
- 翻译准确率：> 85%
- 用户满意度：> 75%
- 手动修正率：< 20%

---

### 8.3 法律与合规风险

#### 8.3.1 隐私保护

**风险描述**：
音频数据涉及用户隐私，需要合规处理。

**应对措施**：
1. 所有音频数据本地处理，不上传云端（除非用户主动选择）
2. 明确隐私政策，告知用户数据如何使用
3. 支持数据加密存储
4. 用户可随时删除所有数据
5. 符合GDPR、CCPA等隐私法规

**隐私政策要点**：
- 数据收集范围
- 数据使用目的
- 数据存储位置
- 数据删除方式
- 用户权利说明

#### 8.3.2 版权问题

**风险描述**：
翻译视频字幕可能涉及版权问题。

**应对措施**：
1. 明确软件用于个人学习和使用，不得用于商业分发
2. 用户协议中说明版权责任由用户承担
3. 导出的字幕文件可添加水印（可选）
4. 不提供批量下载视频功能
5. 教育用户尊重版权

---

## 九、关键技术挑战与解决方案

### 9.1 窗口音频精准捕获

**挑战详述**：
Windows下不同应用的音频架构差异大，某些应用（如独占模式的游戏）音频难以捕获。

**解决方案**：

1. **使用WASAPI Loopback捕获**：
   - 捕获系统音频输出
   - 通过进程ID过滤目标窗口的音频
   - 处理多音频流混音情况

2. **虚拟音频设备方案**：
   - 使用VB-CABLE等虚拟音频驱动
   - 将目标应用音频重定向到虚拟设备
   - 从虚拟设备捕获音频

3. **应用特定优化**：
   - 为主流应用（Chrome、Zoom等）提供专项适配
   - 社区贡献应用配置文件

**代码示例**：

```cpp
// WASAPI Loopback音频捕获
HRESULT CaptureWindowAudio(HWND targetWindow) {
    // 1. 获取目标窗口的进程ID
    DWORD processId;
    GetWindowThreadProcessId(targetWindow, &processId);
    
    // 2. 枚举所有音频会话
    IAudioSessionManager2* sessionManager;
    IAudioSessionEnumerator* sessionEnum;
    // ... 初始化代码
    
    // 3. 查找目标进程的音频会话
    int sessionCount;
    sessionEnum->GetCount(&sessionCount);
    
    for (int i = 0; i < sessionCount; i++) {
        IAudioSessionControl* sessionControl;
        sessionEnum->GetSession(i, &sessionControl);
        
        IAudioSessionControl2* sessionControl2;
        sessionControl->QueryInterface(&sessionControl2);
        
        DWORD sessionProcessId;
        sessionControl2->GetProcessId(&sessionProcessId);
        
        if (sessionProcessId == processId) {
            // 找到目标会话，开始捕获
            return CaptureFromSession(sessionControl2);
        }
    }
    
    return E_FAIL;
}
```

### 9.2 浏览器标签页音频隔离

**挑战详述**：
浏览器多标签页音频混杂，如何只捕获特定标签页？

**解决方案**：

1. **Chrome扩展方案**：
   - 使用`chrome.tabCapture` API
   - 扩展与桌面应用通过Native Messaging通信
   - 用户授权后捕获特定标签页音频

2. **音频流标识**：
   - 为每个标签页的音频流添加唯一标识
   - 桌面应用根据标识过滤音频

**Chrome扩展实现**：

```javascript
// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTab') {
    const tabId = request.tabId;
    
    chrome.tabCapture.capture({
      audio: true,
      video: false
    }, (stream) => {
      if (stream) {
        // 发送音频流到桌面应用
        sendAudioStreamToDesktopApp(stream, tabId);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: chrome.runtime.lastError });
      }
    });
    
    return true;  // 异步响应
  }
});

// Native Messaging通信
function sendAudioStreamToDesktopApp(stream, tabId) {
  const port = chrome.runtime.connectNative('com.translator.native');
  
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  processor.onaudioprocess = (e) => {
    const audioData = e.inputBuffer.getChannelData(0);
    
    // 发送到桌面应用
    port.postMessage({
      type: 'audio',
      tabId: tabId,
      data: Array.from(audioData)
    });
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
}
```

### 9.3 实时性与成本平衡

**挑战详述**：
实时流式翻译需要频繁调用API，成本高昂。

**解决方案**：

1. **智能批处理**：
   - 累积500ms-1s的音频再发送
   - 静音段不发送
   - 降低API调用频率

2. **本地预处理**：
   - 降噪和音量标准化在本地完成
   - 减少API处理负担

3. **多级缓存**：
   - 相似音频片段缓存翻译结果
   - 减少重复翻译

4. **离线模型**：
   - 提供Whisper + Llama本地模型
   - 用户可选择性价比方案

**成本优化代码**：

```javascript
class CostOptimizedTranslator {
  constructor() {
    this.audioBuffer = [];
    this.batchDuration = 1000;  // 1秒批处理
    this.silenceThreshold = -40;  // 静音阈值
    this.cache = new Map();  // 翻译缓存
  }
  
  async processAudio(audioChunk) {
    // 1. 静音检测
    if (this.isSilence(audioChunk)) {
      console.log('检测到静音，跳过');
      return;
    }
    
    // 2. 加入缓冲区
    this.audioBuffer.push(audioChunk);
    
    // 3. 达到批处理阈值时发送
    if (this.getTotalDuration() >= this.batchDuration) {
      await this.sendBatch();
    }
  }
  
  async sendBatch() {
    const combinedAudio = this.combineBuffer();
    
    // 检查缓存
    const cacheKey = this.getAudioHash(combinedAudio);
    if (this.cache.has(cacheKey)) {
      console.log('使用缓存翻译');
      return this.cache.get(cacheKey);
    }
    
    // 调用API
    const result = await this.callAPI(combinedAudio);
    
    // 缓存结果
    this.cache.set(cacheKey, result);
    
    // 清空缓冲区
    this.audioBuffer = [];
    
    return result;
  }
  
  isSilence(audioChunk) {
    // 计算音频能量
    const energy = this.calculateEnergy(audioChunk);
    const dB = 20 * Math.log10(energy);
    return dB < this.silenceThreshold;
  }
}
```

### 9.4 AI分析质量保证

**挑战详述**：
AI生成的摘要和脑图可能不准确或不符合用户预期。

**解决方案**：

1. **Prompt工程优化**：
   - 提供清晰的指令和示例
   - 多轮对话优化结果
   - A/B测试不同Prompt

2. **人工反馈循环**：
   - 用户可重新生成
   - 用户可手动编辑
   - 收集反馈持续优化

3. **多模型对比**：
   - 同时使用GPT-4和Claude
   - 对比结果，选择更好的
   - 用户可选择首选模型

4. **质量评估**：
   - 自动评估摘要质量（ROUGE、BLEU等指标）
   - 用户满意度评分
   - 持续迭代优化

**Prompt优化示例**：

```javascript
const SUMMARY_PROMPT_V1 = `
请总结以下内容。

内容: ${content}
`;

// ↓ 优化后

const SUMMARY_PROMPT_V2 = `
你是一个专业的内容分析师。请分析以下视频翻译记录，生成一份结构化的内容摘要。

视频标题: ${title}
视频时长: ${duration}
翻译内容:
${content}

请按以下格式输出：

## 核心主题
（用2-3句话概括视频主要内容）

## 关键知识点
（列出5-10个要点，每个要点1-2句话）

## 重要时间轴
（标注5-8个关键时间点和内容）

## 学习建议
（提供3-5条实用的学习建议）

## 难度评估
（用星级表示，1-5星）

要求：
1. 使用简洁清晰的中文
2. 结构化输出
3. 突出重点内容
4. 适合快速阅读

开始分析：
`;
```

---

## 十、总结与建议

### 10.1 核心功能总结

本需求文档详细设计了一款**大模型LLM实时桌面翻译软件**，核心功能包括：

1. **✅ 精准音频捕获**：OBS式窗口选择器，支持应用/浏览器/麦克风
2. **✅ 实时翻译**：阿里Gummy一体化API，低延迟（< 2秒）
3. **✅ 实时字幕**：可拖动、可配置、位置记忆的悬浮字幕框
4. **✅ 会话管理**：按场景分类，支持搜索、标签、统计
5. **✅ 字幕导出**：SRT/VTT/ASS等多种格式
6. **✅ 本地视频翻译**：批量处理本地视频文件
7. **✅ AI内容分析**：自动生成摘要、脑图、关键词

### 10.2 技术架构建议

**推荐技术栈**：
- 前端：**React 18 + TypeScript + Ant Design**
- 后端：**Electron + Node.js 18**
- 数据库：**SQLite + Sequelize**
- 音频处理：**Native Addon (C++/Rust)**
- AI分析：**GPT-4 API**

**开发优先级**：
1. **MVP（2个月）**：音频捕获 + 阿里Gummy + 字幕显示 + 基础会话管理
2. **Beta（2个月）**：多引擎 + 浏览器支持 + 跨平台 + 会话增强
3. **正式版（2个月）**：AI分析 + 本地模型 + 视频翻译 + 产品化

### 10.3 关键成功因素

1. **用户体验至上**：
   - 简化配置流程
   - 友好的错误提示
   - 详细的新手引导

2. **性能与成本平衡**：
   - 优化延迟（< 1.5秒）
   - 控制API成本
   - 提供离线模型选项

3. **持续迭代优化**：
   - 收集用户反馈
   - 快速修复Bug
   - 定期发布新功能

4. **社区建设**：
   - 开放源码（考虑）
   - 活跃的论坛和文档
   - 用户贡献机制

### 10.4 下一步行动

**立即开始**：
1. **Week 1**：搭建Electron + React项目框架
2. **Week 2**：设计和实现窗口选择器UI
3. **Week 3**：研究阿里Gummy API并完成集成测试

**3个月目标**：
- 完成MVP开发
- 发布内测版本
- 收集至少50个用户反馈

**6个月目标**：
- 完成正式版开发
- 发布1.0版本
- 用户量达到1000+

---

## 十一、附录

### 11.1 参考文档

**官方文档**：
- 阿里云Gummy API：https://help.aliyun.com/zh/model-studio/real-time-websocket-api
- Electron文档：https://www.electronjs.org/docs
- React文档：https://react.dev
- Ant Design：https://ant.design
- FFmpeg文档：https://ffmpeg.org/documentation.html

**开源项目参考**：
- OBS Studio：https://github.com/obsproject/obs-studio
- Whisper.cpp：https://github.com/ggerganov/whisper.cpp
- Electron-React-Boilerplate：https://github.com/electron-react-boilerplate/electron-react-boilerplate

**技术博客**：
- Electron音频捕获：https://blog.example.com/electron-audio-capture
- WebSocket实时通信：https://blog.example.com/websocket-realtime
- SQLite性能优化：https://blog.example.com/sqlite-optimization

### 11.2 术语表

| 术语 | 英文 | 解释 |
|------|------|------|
| 会话 | Session | 一次完整的翻译过程，包含多条翻译记录 |
| 翻译记录 | Translation Record | 单条音频片段的识别和翻译结果 |
| 相对时间轴 | Relative Timeline | 相对于会话开始的时间，用于字幕文件 |
| Loopback | Audio Loopback | 音频回环技术，捕获正在播放的音频 |
| 流式输出 | Streaming Output | 逐字/逐句输出结果，降低延迟 |
| WASAPI | Windows Audio Session API | Windows音频会话API |
| Core Audio | - | macOS核心音频框架 |
| PulseAudio | - | Linux音频服务器 |
| IPC | Inter-Process Communication | 进程间通信 |
| Native Addon | - | Node.js原生扩展模块 |

### 11.3 缩写表

| 缩写 | 全称 | 说明 |
|------|------|------|
| MVP | Minimum Viable Product | 最小可行产品 |
| API | Application Programming Interface | 应用程序接口 |
| UI | User Interface | 用户界面 |
| UX | User Experience | 用户体验 |
| SRT | SubRip Subtitle | 字幕格式 |
| VTT | WebVTT | 网页视频字幕格式 |
| ASS | Advanced SubStation Alpha | 高级字幕格式 |
| GPU | Graphics Processing Unit | 图形处理器 |
| CPU | Central Processing Unit | 中央处理器 |
| RAM | Random Access Memory | 随机存储器 |
| NLP | Natural Language Processing | 自然语言处理 |
| TTS | Text-to-Speech | 文本转语音 |
| ASR | Automatic Speech Recognition | 自动语音识别 |
| NMT | Neural Machine Translation | 神经机器翻译 |

---

**文档版本**：v1.1（完整版）  
**最后更新**：2025-01-12  
**文档状态**：✅ 已完成  
**总页数**：约100+页  
**总字数**：约50,000字

🎯 **现在可以开始开发了！**

**建议的第一步**：
1. 初始化Electron + React + TypeScript项目
2. 参考OBS Studio源码研究窗口枚举实现
3. 注册阿里云账号并获取Gummy API Key
4. 搭建SQLite数据库
5. 实现窗口选择器原型

**祝开发顺利！** 🚀