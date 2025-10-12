// 处理音频样本（接口占位）
bool AudioClient::ProcessAudioSample(BYTE* pData, UINT32 numFrames) {
    // TODO: 实际样本处理逻辑
    // 占位实现，返回 true
    return true;
}
// 停止音频捕获
bool AudioClient::Stop() {
    if (!audioClient_) return false;
    HRESULT hr = audioClient_->Stop();
    return SUCCEEDED(hr);
}
// 开始音频捕获
bool AudioClient::Start() {
    if (!audioClient_) return false;
    HRESULT hr = audioClient_->Start();
    return SUCCEEDED(hr);
}
#include "audio_client.h"
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <wrl/client.h>
#include <propvarutil.h>
#include <propidl.h>
#include <windows.h>

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

    // 激活 IAudioClient2
    PROPVARIANT var = params.ToPropVariant();
    hr = device_->Activate(__uuidof(IAudioClient2), CLSCTX_ALL, &var, (void**)&audioClient_);
    PropVariantClear(&var);
    if (FAILED(hr)) return false;

    initialized_ = true;
    return true;
}

Microsoft::WRL::ComPtr<IAudioClient2> AudioClient::GetAudioClient() const {
    return audioClient_;
}

bool AudioClient::IsInitialized() const {
    return initialized_;
}

// ActivateAsync 占位，后续实现异步激活
// 激活完成回调接口
void AudioClient::ActivateCompleted(HRESULT hr, Microsoft::WRL::ComPtr<IAudioClient2> client) {
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
