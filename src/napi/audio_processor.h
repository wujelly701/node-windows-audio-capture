#pragma once
#include <napi.h>
#include <memory>
#include "../wasapi/capture_thread.h"
#include "../wasapi/audio_client.h"

class AudioProcessor : public Napi::ObjectWrap<AudioProcessor> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    AudioProcessor(const Napi::CallbackInfo& info);
    ~AudioProcessor();

private:
    std::unique_ptr<AudioClient> client_;
    std::unique_ptr<CaptureThread> thread_;
    
    // N-API 方法声明（占位）
    Napi::Value Start(const Napi::CallbackInfo& info);
    Napi::Value Stop(const Napi::CallbackInfo& info);
    Napi::Value StartCapture(const Napi::CallbackInfo& info);
    Napi::Value StopCapture(const Napi::CallbackInfo& info);
    
    // 静态方法：设备枚举
    static Napi::Value GetDeviceInfo(const Napi::CallbackInfo& info);
    
    // 音频数据回调（ThreadSafeFunction 占位）
    void OnAudioData(const std::vector<uint8_t>& data);
};
