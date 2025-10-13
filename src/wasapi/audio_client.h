#pragma once
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <wrl/client.h>
#include <functional>
#include <vector>
#include <cstdint>
#include <memory>
#include "audio_params.h"
#include "audio_session_manager.h"  // v2.0: 音频会话管理

class AudioClient {
public:
    AudioClient();
    ~AudioClient();

    // 初始化音频客户端
    bool Initialize(const AudioActivationParams& params);
    
    // v2.0: 初始化并启用进程过滤
    bool InitializeWithProcessFilter(DWORD processId);

    // 获取底层 IAudioClient 指针
    Microsoft::WRL::ComPtr<IAudioClient> GetAudioClient() const;

    // 获取捕获客户端指针
    Microsoft::WRL::ComPtr<IAudioCaptureClient> GetCaptureClient() const;

    // 查询是否已初始化
    bool IsInitialized() const;

    // 激活完成回调
    void ActivateCompleted(HRESULT hr, Microsoft::WRL::ComPtr<IAudioClient> client);

    // 设置事件句柄
    bool SetEventHandle(HANDLE hEvent);

    // 开始音频捕获
    bool Start();

    // 停止音频捕获
    bool Stop();

    // 处理音频样本（接口占位）
    bool ProcessAudioSample(BYTE* pData, UINT32 numFrames);
    
    // 设置音频数据回调
    using AudioDataCallback = std::function<void(const std::vector<uint8_t>&)>;
    void SetAudioDataCallback(AudioDataCallback callback);
    
    // v2.0: 进程过滤相关
    void SetProcessFilter(DWORD processId);  // 0 = 禁用过滤
    DWORD GetProcessFilter() const { return filterProcessId_; }
    bool IsProcessFilterEnabled() const { return filterProcessId_ != 0; }
    bool IsTargetProcessPlayingAudio() const;

    // ====== v2.1: 动态静音控制 ======
    
    // 进程过滤选项
    struct ProcessFilterOptions {
        bool muteOtherProcesses = false;     // 自动静音其他进程
        std::vector<DWORD> allowList;        // 白名单（不静音）
        std::vector<DWORD> blockList;        // 黑名单（强制静音）
    };
    
    // 使用选项初始化进程过滤
    bool InitializeWithProcessFilter(DWORD processId, 
                                     const ProcessFilterOptions& options);
    
    // 运行时配置
    void SetMuteOtherProcesses(bool enable);
    void SetAllowList(const std::vector<DWORD>& pids);
    void SetBlockList(const std::vector<DWORD>& pids);
    
    // 查询状态
    bool IsMutingOtherProcesses() const { return filterOptions_.muteOtherProcesses; }
    std::vector<DWORD> GetAllowList() const { return filterOptions_.allowList; }
    std::vector<DWORD> GetBlockList() const { return filterOptions_.blockList; }
    
    // 应用静音控制（内部使用）
    void ApplyMuteControl();

private:
    Microsoft::WRL::ComPtr<IMMDevice> device_;
    Microsoft::WRL::ComPtr<IAudioClient> audioClient_;
    Microsoft::WRL::ComPtr<IAudioCaptureClient> captureClient_;
    bool initialized_ = false;
    AudioDataCallback audioDataCallback_;
    
    // v2.0: 进程过滤
    DWORD filterProcessId_ = 0;  // 0 = 不过滤
    std::unique_ptr<audio_capture::AudioSessionManager> sessionManager_;
    
    // v2.1: 动态静音控制选项
    ProcessFilterOptions filterOptions_;
};
