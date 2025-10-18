#include "audio_client.h"
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <wrl/client.h>
#include <propvarutil.h>
#include <propidl.h>
#include <windows.h>
#include <functional>
#include <vector>
#include <stdio.h>

// 调试输出宏
#define DEBUG_LOG(msg) do { \
    OutputDebugStringA(msg); \
    fprintf(stderr, "%s", msg); \
    fflush(stderr); \
} while(0)

#define DEBUG_LOGF(fmt, ...) do { \
    char debugMsg[512]; \
    sprintf_s(debugMsg, fmt, __VA_ARGS__); \
    OutputDebugStringA(debugMsg); \
    fprintf(stderr, "%s", debugMsg); \
    fflush(stderr); \
} while(0)

AudioClient::AudioClient() {}
AudioClient::~AudioClient() {}

bool AudioClient::Initialize(const AudioActivationParams& params) {
    HRESULT hr;
    // 获取设备枚举器
    Microsoft::WRL::ComPtr<IMMDeviceEnumerator> enumerator;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) return false;

    // 获取默认音频渲染设备
    hr = enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &device_);
    if (FAILED(hr)) return false;

    // 激活 IAudioClient（标准 loopback 模式）
    // 注意：进程隔离模式需要 IAudioClient3 和 Windows 10 19H1+
    // 这里先使用标准 loopback 捕获所有音频
    hr = device_->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&audioClient_);
    if (FAILED(hr)) return false;

    // 获取设备默认格式
    WAVEFORMATEX* pFormat = nullptr;
    hr = audioClient_->GetMixFormat(&pFormat);
    if (FAILED(hr)) return false;

    // 初始化音频客户端（共享模式 + 环回 + 事件驱动）
    hr = audioClient_->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
        10000000,  // 1 秒缓冲区 (100ns 单位)
        0,
        pFormat,
        nullptr
    );
    CoTaskMemFree(pFormat);
    if (FAILED(hr)) return false;

    // 获取 IAudioCaptureClient 接口
    Microsoft::WRL::ComPtr<IAudioCaptureClient> captureClient;
    hr = audioClient_->GetService(__uuidof(IAudioCaptureClient), (void**)&captureClient);
    if (FAILED(hr)) return false;

    captureClient_ = captureClient;
    initialized_ = true;
    return true;
}

// v2.9.0: 通过设备 ID 初始化（支持麦克风）
bool AudioClient::InitializeWithDeviceId(const std::string& deviceId, bool isLoopback) {
    HRESULT hr;
    
    DEBUG_LOGF("[AudioClient] InitializeWithDeviceId: deviceId=%s, isLoopback=%d\n", 
               deviceId.c_str(), isLoopback);
    
    // 获取设备枚举器
    Microsoft::WRL::ComPtr<IMMDeviceEnumerator> enumerator;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioClient] Failed to create device enumerator: 0x%08X\n", hr);
        return false;
    }

    // 将 std::string 转换为 LPWSTR
    int size = MultiByteToWideChar(CP_UTF8, 0, deviceId.c_str(), -1, nullptr, 0);
    if (size <= 0) {
        DEBUG_LOG("[AudioClient] Failed to convert device ID to wide string\n");
        return false;
    }
    
    std::vector<wchar_t> deviceIdWstr(size);
    MultiByteToWideChar(CP_UTF8, 0, deviceId.c_str(), -1, deviceIdWstr.data(), size);

    // 通过设备 ID 获取设备
    hr = enumerator->GetDevice(deviceIdWstr.data(), &device_);
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioClient] Failed to get device by ID: 0x%08X\n", hr);
        return false;
    }
    
    DEBUG_LOG("[AudioClient] Device acquired successfully\n");

    // 激活 IAudioClient
    hr = device_->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&audioClient_);
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioClient] Failed to activate IAudioClient: 0x%08X\n", hr);
        return false;
    }
    
    DEBUG_LOG("[AudioClient] IAudioClient activated\n");

    // 获取设备默认格式
    WAVEFORMATEX* pFormat = nullptr;
    hr = audioClient_->GetMixFormat(&pFormat);
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioClient] Failed to get mix format: 0x%08X\n", hr);
        return false;
    }
    
    DEBUG_LOGF("[AudioClient] Mix format: %d Hz, %d channels, %d bits\n",
               pFormat->nSamplesPerSec, pFormat->nChannels, pFormat->wBitsPerSample);

    // 构建流标志
    DWORD streamFlags = AUDCLNT_STREAMFLAGS_EVENTCALLBACK;
    
    if (isLoopback) {
        // Loopback 模式：捕获输出设备的音频
        streamFlags |= AUDCLNT_STREAMFLAGS_LOOPBACK;
        DEBUG_LOG("[AudioClient] Using LOOPBACK mode (capture output device audio)\n");
    } else {
        // 直接捕获模式：捕获输入设备（麦克风）的音频
        DEBUG_LOG("[AudioClient] Using DIRECT CAPTURE mode (microphone)\n");
    }

    // 初始化音频客户端
    hr = audioClient_->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        streamFlags,
        10000000,  // 1 秒缓冲区 (100ns 单位)
        0,
        pFormat,
        nullptr
    );
    
    CoTaskMemFree(pFormat);
    
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioClient] Failed to initialize audio client: 0x%08X\n", hr);
        return false;
    }
    
    DEBUG_LOG("[AudioClient] Audio client initialized\n");

    // 获取 IAudioCaptureClient 接口
    Microsoft::WRL::ComPtr<IAudioCaptureClient> captureClient;
    hr = audioClient_->GetService(__uuidof(IAudioCaptureClient), (void**)&captureClient);
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioClient] Failed to get capture client: 0x%08X\n", hr);
        return false;
    }
    
    DEBUG_LOG("[AudioClient] Capture client acquired\n");

    captureClient_ = captureClient;
    initialized_ = true;
    
    DEBUG_LOG("[AudioClient] InitializeWithDeviceId completed successfully\n");
    return true;
}

Microsoft::WRL::ComPtr<IAudioClient> AudioClient::GetAudioClient() const {
    return audioClient_;
}

Microsoft::WRL::ComPtr<IAudioCaptureClient> AudioClient::GetCaptureClient() const {
    return captureClient_;
}

bool AudioClient::IsInitialized() const {
    return initialized_;
}

// ActivateAsync 占位，后续实现异步激活
// 激活完成回调接口
void AudioClient::ActivateCompleted(HRESULT hr, Microsoft::WRL::ComPtr<IAudioClient> client) {
    if (SUCCEEDED(hr) && client) {
        audioClient_ = client;
        initialized_ = true;
        // 可扩展：通知外部/事件回调
    } else {
        initialized_ = false;
        // 可扩展：错误处理/通知
    }
}

// 设置事件句柄
bool AudioClient::SetEventHandle(HANDLE hEvent) {
    if (!audioClient_) return false;
    HRESULT hr = audioClient_->SetEventHandle(hEvent);
    return SUCCEEDED(hr);
}

// 开始音频捕获
bool AudioClient::Start() {
    if (!audioClient_) return false;
    HRESULT hr = audioClient_->Start();
    return SUCCEEDED(hr);
}

// 停止音频捕获
bool AudioClient::Stop() {
    if (!audioClient_) return false;
    
    // v2.1: 恢复静音状态（如果正在管理）
    if (sessionManager_ && filterOptions_.muteOtherProcesses) {
        DEBUG_LOG("[AudioClient] Stop called, restoring mute states...\n");
        sessionManager_->RestoreMuteStates();
        filterOptions_.muteOtherProcesses = false;  // 重置标志
    }
    
    HRESULT hr = audioClient_->Stop();
    return SUCCEEDED(hr);
}

// 处理音频样本
bool AudioClient::ProcessAudioSample(BYTE* pData, UINT32 numFrames) {
    if (!audioDataCallback_ || !pData || numFrames == 0) {
        return true;
    }
    
    // 获取音频格式以计算字节数
    WAVEFORMATEX* pFormat = nullptr;
    HRESULT hr = audioClient_->GetMixFormat(&pFormat);
    if (FAILED(hr)) return false;
    
    // 计算数据大小（帧数 * 每帧字节数）
    UINT32 bytesPerFrame = pFormat->nBlockAlign;
    UINT32 dataSize = numFrames * bytesPerFrame;
    
    CoTaskMemFree(pFormat);
    
    // 复制数据到 vector 并回调
    std::vector<uint8_t> audioData(pData, pData + dataSize);
    audioDataCallback_(audioData);
    
    return true;
}

// 设置音频数据回调
void AudioClient::SetAudioDataCallback(AudioDataCallback callback) {
    audioDataCallback_ = callback;
}

// ========== v2.0: 进程过滤功能 ==========

// v2.0: 初始化并启用进程过滤
bool AudioClient::InitializeWithProcessFilter(DWORD processId) {
    // 首先使用标准 Loopback 初始化
    AudioActivationParams params;
    if (!Initialize(params)) {
        return false;
    }
    
    // 初始化会话管理器
    sessionManager_ = std::make_unique<audio_capture::AudioSessionManager>();
    if (!sessionManager_->Initialize(device_.Get())) {
        return false;
    }
    
    // 设置进程过滤
    filterProcessId_ = processId;
    
    return true;
}

// v2.0: 设置/取消进程过滤
void AudioClient::SetProcessFilter(DWORD processId) {
    filterProcessId_ = processId;
    
    if (processId != 0 && !sessionManager_ && device_) {
        // 延迟初始化会话管理器
        sessionManager_ = std::make_unique<audio_capture::AudioSessionManager>();
        sessionManager_->Initialize(device_.Get());
    }
}

// v2.0: 检查目标进程是否有活动音频
bool AudioClient::IsTargetProcessPlayingAudio() const {
    if (filterProcessId_ == 0 || !sessionManager_) {
        return false;
    }
    
    return sessionManager_->IsProcessPlayingAudio(filterProcessId_);
}

// ====== v2.1: 动态静音控制实现 ======

bool AudioClient::InitializeWithProcessFilter(
    DWORD processId,
    const ProcessFilterOptions& options) {
    
    DEBUG_LOGF("[AudioClient] InitializeWithProcessFilter: PID=%d, muteOthers=%d\n",
               processId, options.muteOtherProcesses);
    
    // 1. 先调用原始的 InitializeWithProcessFilter(DWORD)
    if (!InitializeWithProcessFilter(processId)) {
        DEBUG_LOG("[AudioClient] Base initialization failed\n");
        return false;
    }
    
    // 2. 保存选项
    filterOptions_ = options;
    
    // 3. 立即应用静音控制
    if (filterOptions_.muteOtherProcesses) {
        DEBUG_LOG("[AudioClient] Applying initial mute control\n");
        ApplyMuteControl();
    }
    
    return true;
}

void AudioClient::SetMuteOtherProcesses(bool enable) {
    DEBUG_LOGF("[AudioClient] SetMuteOtherProcesses: %d\n", enable);
    
    filterOptions_.muteOtherProcesses = enable;
    
    if (enable) {
        ApplyMuteControl();
    } else {
        // 恢复原始状态
        if (sessionManager_) {
            sessionManager_->UnmuteAll();
        }
    }
}

void AudioClient::SetAllowList(const std::vector<DWORD>& pids) {
    DEBUG_LOGF("[AudioClient] SetAllowList: %d processes\n", pids.size());
    
    filterOptions_.allowList = pids;
    
    // 如果正在使用静音控制，重新应用
    if (filterOptions_.muteOtherProcesses) {
        ApplyMuteControl();
    }
}

void AudioClient::SetBlockList(const std::vector<DWORD>& pids) {
    DEBUG_LOGF("[AudioClient] SetBlockList: %d processes\n", pids.size());
    
    filterOptions_.blockList = pids;
    
    // 如果正在使用静音控制，重新应用
    if (filterOptions_.muteOtherProcesses) {
        ApplyMuteControl();
    }
}

void AudioClient::ApplyMuteControl() {
    if (!sessionManager_ || filterProcessId_ == 0) {
        DEBUG_LOG("[AudioClient] ApplyMuteControl: Not ready (no session manager or filter)\n");
        return;
    }
    
    if (!filterOptions_.muteOtherProcesses) {
        DEBUG_LOG("[AudioClient] ApplyMuteControl: Muting disabled\n");
        return;
    }
    
    DEBUG_LOG("[AudioClient] Applying mute control to all sessions...\n");
    
    // 构建最终的白名单（allowList）
    std::vector<DWORD> finalAllowList = filterOptions_.allowList;
    
    // 应用静音规则
    if (sessionManager_->MuteAllExcept(filterProcessId_, finalAllowList)) {
        DEBUG_LOG("[AudioClient] Mute control applied successfully\n");
    } else {
        DEBUG_LOG("[AudioClient] Failed to apply mute control\n");
    }
}
