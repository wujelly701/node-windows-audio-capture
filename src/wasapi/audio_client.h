#pragma once
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <wrl/client.h>
#include <functional>
#include <vector>
#include <cstdint>
#include "audio_params.h"

class AudioClient {
public:
    AudioClient();
    ~AudioClient();

    // 初始化音频客户端
    bool Initialize(const AudioActivationParams& params);

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

private:
    Microsoft::WRL::ComPtr<IMMDevice> device_;
    Microsoft::WRL::ComPtr<IAudioClient> audioClient_;
    Microsoft::WRL::ComPtr<IAudioCaptureClient> captureClient_;
    bool initialized_ = false;
    AudioDataCallback audioDataCallback_;
};
