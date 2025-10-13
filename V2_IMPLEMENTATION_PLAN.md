# node-windows-audio-capture v2.0.0 实现计划

## 🎯 目标

实现 Windows 10 19H1+ (Build 18362+) 的 **IAudioClient3 Process Loopback** 进程隔离音频捕获功能。

## 📋 核心需求

### 必需功能
1. ✅ 精准捕获特定进程音频（按 PID）
2. ✅ 支持按窗口标题捕获
3. ✅ 支持按进程名捕获
4. ✅ 支持进程树模式（包含子进程）
5. ✅ 向后兼容 v1.0（processId=0 仍使用标准 Loopback）
6. ✅ 窗口选择器 API（类似 OBS Studio）

### API 设计

```javascript
// 选项 1：简单 API（按 PID）
const capture = new AudioCapture({ processId: 12345 });

// 选项 2：按进程名
const capture = new AudioCapture({ 
  processName: 'chrome.exe',
  includeChildren: true  // 包含子进程
});

// 选项 3：按窗口标题
const capture = new AudioCapture({ 
  windowTitle: 'Google Chrome - 翻译页面' 
});

// 选项 4：高级配置
const capture = new AudioCapture({
  target: {
    processId: 12345,
    mode: 'include-process-tree'  // 或 'exclude-process-tree'
  }
});

// 选项 5：窗口选择器（返回 Promise<AudioCaptureOptions>）
const options = await AudioCapture.selectWindow({
  title: '选择要捕获的窗口',
  filter: (window) => window.hasAudio  // 过滤条件
});
const capture = new AudioCapture(options);
```

## 🏗️ 技术架构

### 核心组件

1. **activation_handler.h/cpp** (新增)
   - 实现 `IActivateAudioInterfaceCompletionHandler`
   - 处理异步激活完成回调
   - 管理激活状态（pending, completed, failed）

2. **audio_client.h/cpp** (扩展)
   - 添加 `InitializeProcessLoopback(DWORD processId, PROCESS_LOOPBACK_MODE mode)`
   - 添加 `IsProcessLoopbackSupported()` 检测系统支持
   - 保持 `Initialize()` 用于标准 Loopback（向后兼容）

3. **window_selector.h/cpp** (新增)
   - 枚举所有可见窗口
   - 过滤有音频的窗口
   - 提供窗口信息（标题、进程、图标）

4. **process_helper.h/cpp** (扩展)
   - 添加 `FindProcessByName(const std::string& name)`
   - 添加 `FindProcessByWindow(HWND hwnd)`
   - 添加 `GetProcessTree(DWORD pid)` 获取进程树

5. **audio_processor.cpp** (扩展)
   - 修改构造函数，支持进程隔离模式
   - 添加 `SetProcessTarget()` N-API 方法
   - 添加 `SelectWindow()` N-API 静态方法

6. **index.js** (扩展)
   - 添加 `processName`, `windowTitle` 选项
   - 添加 `AudioCapture.selectWindow()` 静态方法
   - 保持向后兼容

7. **index.d.ts** (更新)
   - 更新类型定义
   - 添加新的接口和枚举

## 📝 实现步骤

### Phase 1: 核心基础设施 (2-3 小时)

#### Step 1.1: 创建 activation_handler.h
```cpp
// src/wasapi/activation_handler.h
#pragma once
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <wrl/client.h>
#include <atomic>
#include <condition_variable>
#include <mutex>

class ActivationHandler : public IActivateAudioInterfaceCompletionHandler {
public:
    ActivationHandler();
    virtual ~ActivationHandler();

    // IUnknown
    STDMETHOD(QueryInterface)(REFIID riid, void** ppvObject) override;
    STDMETHOD_(ULONG, AddRef)() override;
    STDMETHOD_(ULONG, Release)() override;

    // IActivateAudioInterfaceCompletionHandler
    STDMETHOD(ActivateCompleted)(IActivateAudioInterfaceAsyncOperation* operation) override;

    // Wait for activation
    bool WaitForActivation(DWORD timeoutMs = 5000);
    HRESULT GetActivationResult() const { return activationResult_; }
    Microsoft::WRL::ComPtr<IAudioClient3> GetAudioClient() const { return audioClient_; }

private:
    std::atomic<ULONG> refCount_;
    std::atomic<bool> completed_;
    HRESULT activationResult_;
    Microsoft::WRL::ComPtr<IAudioClient3> audioClient_;
    std::mutex mutex_;
    std::condition_variable cv_;
};
```

#### Step 1.2: 创建 activation_handler.cpp
```cpp
// src/wasapi/activation_handler.cpp
#include "activation_handler.h"
#include <audioclientactivationparams.h>

ActivationHandler::ActivationHandler() 
    : refCount_(1), completed_(false), activationResult_(E_PENDING) {}

ActivationHandler::~ActivationHandler() {}

HRESULT ActivationHandler::QueryInterface(REFIID riid, void** ppvObject) {
    if (riid == IID_IUnknown || 
        riid == __uuidof(IActivateAudioInterfaceCompletionHandler)) {
        *ppvObject = static_cast<IActivateAudioInterfaceCompletionHandler*>(this);
        AddRef();
        return S_OK;
    }
    *ppvObject = nullptr;
    return E_NOINTERFACE;
}

ULONG ActivationHandler::AddRef() {
    return ++refCount_;
}

ULONG ActivationHandler::Release() {
    ULONG count = --refCount_;
    if (count == 0) {
        delete this;
    }
    return count;
}

HRESULT ActivationHandler::ActivateCompleted(
    IActivateAudioInterfaceAsyncOperation* operation) {
    
    std::lock_guard<std::mutex> lock(mutex_);
    
    HRESULT hr;
    IUnknown* pUnknown = nullptr;
    
    hr = operation->GetActivateResult(&activationResult_, &pUnknown);
    
    if (SUCCEEDED(hr) && SUCCEEDED(activationResult_)) {
        hr = pUnknown->QueryInterface(IID_PPV_ARGS(&audioClient_));
    }
    
    if (pUnknown) {
        pUnknown->Release();
    }
    
    completed_ = true;
    cv_.notify_all();
    
    return S_OK;
}

bool ActivationHandler::WaitForActivation(DWORD timeoutMs) {
    std::unique_lock<std::mutex> lock(mutex_);
    return cv_.wait_for(lock, std::chrono::milliseconds(timeoutMs),
                        [this] { return completed_.load(); });
}
```

#### Step 1.3: 扩展 audio_client.h
```cpp
// 在 audio_client.h 中添加
#include <audioclientactivationparams.h>

class AudioClient {
public:
    // ... 现有方法 ...
    
    // v2.0 新增：进程隔离模式初始化
    bool InitializeProcessLoopback(
        DWORD processId,
        PROCESS_LOOPBACK_MODE mode = PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE
    );
    
    // 检测系统是否支持进程隔离
    static bool IsProcessLoopbackSupported();
    
    // 获取 IAudioClient3 接口（如果使用进程隔离）
    Microsoft::WRL::ComPtr<IAudioClient3> GetAudioClient3() const;
    
private:
    Microsoft::WRL::ComPtr<IAudioClient3> audioClient3_;
    bool usingProcessLoopback_;
};
```

### Phase 2: 进程隔离核心实现 (3-4 小时)

#### Step 2.1: 实现 InitializeProcessLoopback
```cpp
// src/wasapi/audio_client.cpp
bool AudioClient::InitializeProcessLoopback(
    DWORD processId, 
    PROCESS_LOOPBACK_MODE mode) {
    
    // 检查系统支持
    if (!IsProcessLoopbackSupported()) {
        return false;
    }
    
    HRESULT hr;
    
    // 1. 获取默认音频设备
    Microsoft::WRL::ComPtr<IMMDeviceEnumerator> enumerator;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr,
                          CLSCTX_ALL, IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) return false;

    Microsoft::WRL::ComPtr<IMMDevice> device;
    hr = enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &device);
    if (FAILED(hr)) return false;

    LPWSTR deviceId = nullptr;
    hr = device->GetId(&deviceId);
    if (FAILED(hr)) return false;

    // 2. 构造进程 Loopback 激活参数
    AUDIOCLIENT_ACTIVATION_PARAMS activationParams = {};
    activationParams.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
    activationParams.ProcessLoopbackParams.ProcessLoopbackMode = mode;
    activationParams.ProcessLoopbackParams.TargetProcessId = processId;

    PROPVARIANT activateParams = {};
    activateParams.vt = VT_BLOB;
    activateParams.blob.cbSize = sizeof(activationParams);
    activateParams.blob.pBlobData = (BYTE*)&activationParams;

    // 3. 创建激活完成处理器
    Microsoft::WRL::ComPtr<ActivationHandler> handler;
    handler.Attach(new ActivationHandler());

    // 4. 异步激活 IAudioClient3
    Microsoft::WRL::ComPtr<IActivateAudioInterfaceAsyncOperation> asyncOp;
    hr = ActivateAudioInterfaceAsync(
        deviceId,
        __uuidof(IAudioClient3),
        &activateParams,
        handler.Get(),
        &asyncOp
    );
    
    CoTaskMemFree(deviceId);
    
    if (FAILED(hr)) return false;

    // 5. 等待激活完成（最多 5 秒）
    if (!handler->WaitForActivation(5000)) {
        return false;
    }

    if (FAILED(handler->GetActivationResult())) {
        return false;
    }

    audioClient3_ = handler->GetAudioClient3();
    if (!audioClient3_) return false;

    // 6. 获取设备默认格式
    WAVEFORMATEX* pFormat = nullptr;
    hr = audioClient3_->GetMixFormat(&pFormat);
    if (FAILED(hr)) return false;

    // 7. 初始化音频客户端
    hr = audioClient3_->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
        10000000,  // 1 秒缓冲区
        0,
        pFormat,
        nullptr
    );
    CoTaskMemFree(pFormat);
    
    if (FAILED(hr)) return false;

    // 8. 获取 IAudioCaptureClient
    Microsoft::WRL::ComPtr<IAudioCaptureClient> captureClient;
    hr = audioClient3_->GetService(__uuidof(IAudioCaptureClient), 
                                    (void**)&captureClient);
    if (FAILED(hr)) return false;

    captureClient_ = captureClient;
    usingProcessLoopback_ = true;
    initialized_ = true;
    
    return true;
}

bool AudioClient::IsProcessLoopbackSupported() {
    // 检查 Windows 版本 >= 10.0.18362
    OSVERSIONINFOEXW osvi = {};
    osvi.dwOSVersionInfoSize = sizeof(osvi);
    osvi.dwBuildNumber = 18362;
    
    DWORDLONG conditionMask = 0;
    VER_SET_CONDITION(conditionMask, VER_BUILDNUMBER, VER_GREATER_EQUAL);
    
    return VerifyVersionInfoW(&osvi, VER_BUILDNUMBER, conditionMask) != FALSE;
}
```

### Phase 3: 窗口选择器 (2-3 小时)

#### Step 3.1: 创建 window_selector.h
```cpp
// src/utils/window_selector.h
#pragma once
#include <windows.h>
#include <string>
#include <vector>

struct WindowInfo {
    HWND hwnd;
    DWORD processId;
    std::wstring title;
    std::wstring processName;
    bool hasAudio;
};

class WindowSelector {
public:
    static std::vector<WindowInfo> EnumerateWindows(bool audioOnly = false);
    static WindowInfo FindWindowByTitle(const std::wstring& title);
    static WindowInfo FindWindowByProcessId(DWORD processId);
    static bool WindowHasAudio(HWND hwnd);
};
```

#### Step 3.2: 创建 window_selector.cpp
```cpp
// src/utils/window_selector.cpp
#include "window_selector.h"
#include <psapi.h>
#include <mmdeviceapi.h>
#include <endpointvolume.h>

static BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    auto* windows = reinterpret_cast<std::vector<WindowInfo>*>(lParam);
    
    if (!IsWindowVisible(hwnd)) return TRUE;
    
    WCHAR title[256];
    if (GetWindowTextW(hwnd, title, 256) == 0) return TRUE;
    
    DWORD processId;
    GetWindowThreadProcessId(hwnd, &processId);
    
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                                   FALSE, processId);
    if (!hProcess) return TRUE;
    
    WCHAR processPath[MAX_PATH];
    DWORD size = MAX_PATH;
    QueryFullProcessImageNameW(hProcess, 0, processPath, &size);
    CloseHandle(hProcess);
    
    std::wstring processName = processPath;
    size_t pos = processName.find_last_of(L"\\");
    if (pos != std::wstring::npos) {
        processName = processName.substr(pos + 1);
    }
    
    WindowInfo info;
    info.hwnd = hwnd;
    info.processId = processId;
    info.title = title;
    info.processName = processName;
    info.hasAudio = WindowSelector::WindowHasAudio(hwnd);
    
    windows->push_back(info);
    return TRUE;
}

std::vector<WindowInfo> WindowSelector::EnumerateWindows(bool audioOnly) {
    std::vector<WindowInfo> windows;
    EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&windows));
    
    if (audioOnly) {
        windows.erase(
            std::remove_if(windows.begin(), windows.end(),
                          [](const WindowInfo& w) { return !w.hasAudio; }),
            windows.end()
        );
    }
    
    return windows;
}

bool WindowSelector::WindowHasAudio(HWND hwnd) {
    // 简化版本：假设所有可见窗口都可能有音频
    // 实际实现可以通过检查进程是否有音频会话
    return true;
}
```

### Phase 4: N-API 绑定层更新 (2-3 小时)

#### Step 4.1: 更新 audio_processor.h
```cpp
// src/napi/audio_processor.h
class AudioProcessor : public Napi::ObjectWrap<AudioProcessor> {
public:
    // ... 现有方法 ...
    
    // v2.0 新增：设置进程目标
    Napi::Value SetProcessTarget(const Napi::CallbackInfo& info);
    
    // v2.0 新增：窗口选择器（静态方法）
    static Napi::Value SelectWindow(const Napi::CallbackInfo& info);
    static Napi::Value EnumerateWindows(const Napi::CallbackInfo& info);
    
private:
    bool useProcessLoopback_;
    DWORD targetProcessId_;
};
```

#### Step 4.2: 更新 audio_processor.cpp 构造函数
```cpp
AudioProcessor::AudioProcessor(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<AudioProcessor>(info),
      useProcessLoopback_(false),
      targetProcessId_(0) {
    
    Napi::Env env = info.Env();
    
    // COM 初始化
    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    comInitialized_ = SUCCEEDED(hr);
    
    // 解析选项
    if (info.Length() > 0 && info[0].IsObject()) {
        Napi::Object options = info[0].As<Napi::Object>();
        
        // processId 选项
        if (options.Has("processId")) {
            targetProcessId_ = options.Get("processId").As<Napi::Number>().Uint32Value();
        }
        
        // processName 选项
        if (options.Has("processName")) {
            std::string processName = options.Get("processName").As<Napi::String>().Utf8Value();
            // TODO: 通过进程名查找 PID
        }
        
        // windowTitle 选项
        if (options.Has("windowTitle")) {
            std::string windowTitle = options.Get("windowTitle").As<Napi::String>().Utf8Value();
            // TODO: 通过窗口标题查找 PID
        }
    }
    
    // 创建 AudioClient
    client_ = std::make_unique<AudioClient>();
    
    // 初始化模式判断
    if (targetProcessId_ > 0) {
        // 使用进程隔离模式
        useProcessLoopback_ = true;
    } else {
        // 使用标准 Loopback 模式（向后兼容）
        useProcessLoopback_ = false;
    }
    
    // 设置音频数据回调
    client_->SetAudioDataCallback([this](const std::vector<uint8_t>& data) {
        this->OnAudioData(data);
    });
    
    // 创建捕获线程
    thread_ = std::make_unique<CaptureThread>(client_.get());
}
```

### Phase 5: JavaScript API 更新 (1-2 小时)

#### Step 5.1: 更新 index.js
```javascript
// 添加新的静态方法
AudioCapture.selectWindow = async function(options = {}) {
  const addon = require('./build/Release/audio_addon.node');
  
  const windows = addon.enumerateWindows(options.audioOnly !== false);
  
  // 过滤
  let filtered = windows;
  if (options.filter && typeof options.filter === 'function') {
    filtered = windows.filter(options.filter);
  }
  
  // 排序（按标题）
  filtered.sort((a, b) => a.title.localeCompare(b.title));
  
  // 如果提供了 UI 回调，调用它
  if (options.onSelect && typeof options.onSelect === 'function') {
    const selected = await options.onSelect(filtered);
    if (selected) {
      return { processId: selected.processId };
    }
  }
  
  // 否则返回所有窗口
  return filtered;
};

// 添加辅助方法：按进程名查找
AudioCapture.findProcessByName = function(processName) {
  const addon = require('./build/Release/audio_addon.node');
  const processes = addon.enumerateProcesses();
  return processes.find(p => 
    p.name.toLowerCase().includes(processName.toLowerCase())
  );
};

// 添加辅助方法：检测进程隔离支持
AudioCapture.isProcessLoopbackSupported = function() {
  const addon = require('./build/Release/audio_addon.node');
  return addon.isProcessLoopbackSupported();
};
```

#### Step 5.2: 更新 index.d.ts
```typescript
export interface AudioCaptureOptions {
  processId?: number;
  processName?: string;
  windowTitle?: string;
  includeChildren?: boolean;
  mode?: 'include' | 'exclude';
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
}

export interface WindowInfo {
  hwnd: number;
  processId: number;
  title: string;
  processName: string;
  hasAudio: boolean;
}

export interface SelectWindowOptions {
  title?: string;
  audioOnly?: boolean;
  filter?: (window: WindowInfo) => boolean;
  onSelect?: (windows: WindowInfo[]) => Promise<WindowInfo | null>;
}

export class AudioCapture extends EventEmitter {
  constructor(options: AudioCaptureOptions);
  
  // ... 现有方法 ...
  
  // v2.0 新增
  static selectWindow(options?: SelectWindowOptions): Promise<WindowInfo[] | AudioCaptureOptions>;
  static findProcessByName(processName: string): ProcessInfo | undefined;
  static isProcessLoopbackSupported(): boolean;
  static enumerateWindows(audioOnly?: boolean): WindowInfo[];
}
```

## 📝 测试计划

### 单元测试
- `test/process-loopback.test.js` (新增)
- `test/window-selector.test.js` (新增)

### 集成测试
- 启动测试音频进程（如 VLC）
- 捕获特定进程音频
- 验证其他进程音频被排除

### 兼容性测试
- 测试 Windows 10 19H1+
- 测试向后兼容（processId=0）

## 📚 文档更新

- README.md：添加进程隔离示例
- CHANGELOG.md：添加 v2.0.0 更新日志
- API.md：详细 API 文档

## 🎯 里程碑

- [ ] Phase 1: 完成激活处理器
- [ ] Phase 2: 完成进程隔离核心
- [ ] Phase 3: 完成窗口选择器
- [ ] Phase 4: 完成 N-API 绑定
- [ ] Phase 5: 完成 JavaScript API
- [ ] Phase 6: 完成测试
- [ ] Phase 7: 完成文档
- [ ] Phase 8: 发布 v2.0.0

---

**预计总时间**: 2-3 天
**开始日期**: 2025-10-13
**目标完成**: 2025-10-15
