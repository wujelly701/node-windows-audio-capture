#pragma once
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <wrl/client.h>
#include "audio_params.h"

class AudioClient {
public:
    AudioClient();
    ~AudioClient();

    // 初始化音频客户端
    bool Initialize(const AudioActivationParams& params);

    // 获取底层 IAudioClient2 指针
    Microsoft::WRL::ComPtr<IAudioClient2> GetAudioClient() const;

private:
    Microsoft::WRL::ComPtr<IMMDevice> device_;
    Microsoft::WRL::ComPtr<IAudioClient2> audioClient_;
    bool initialized_ = false;
};
