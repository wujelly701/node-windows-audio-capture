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
    DWORD processId_ = 0;
    Napi::ThreadSafeFunction tsfn_;
    bool comInitialized_ = false;
    
    // N-API 方法声明
    Napi::Value Start(const Napi::CallbackInfo& info);
    Napi::Value Stop(const Napi::CallbackInfo& info);
    Napi::Value StartCapture(const Napi::CallbackInfo& info);
    Napi::Value StopCapture(const Napi::CallbackInfo& info);
    
    // v2.1: 动态音频会话静音控制
    Napi::Value SetMuteOtherProcesses(const Napi::CallbackInfo& info);
    Napi::Value SetAllowList(const Napi::CallbackInfo& info);
    Napi::Value SetBlockList(const Napi::CallbackInfo& info);
    Napi::Value IsMutingOtherProcesses(const Napi::CallbackInfo& info);
    Napi::Value GetAllowList(const Napi::CallbackInfo& info);
    Napi::Value GetBlockList(const Napi::CallbackInfo& info);
    
    // 静态方法：设备枚举
    static Napi::Value GetDeviceInfo(const Napi::CallbackInfo& info);
    
    // 音频数据回调（从捕获线程调用）
    void OnAudioData(const std::vector<uint8_t>& data);
};
