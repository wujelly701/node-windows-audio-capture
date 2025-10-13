#include "audio_processor.h"
#include <napi.h>
#include <vector>
#include "../wasapi/capture_thread.h"
#include "../wasapi/audio_client.h"

Napi::Object AudioProcessor::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "AudioProcessor", {
        InstanceMethod("start", &AudioProcessor::Start),
        InstanceMethod("stop", &AudioProcessor::Stop),
        InstanceMethod("startCapture", &AudioProcessor::StartCapture),
        InstanceMethod("stopCapture", &AudioProcessor::StopCapture)
    });
    exports.Set("AudioProcessor", func);
    exports.Set("getDeviceInfo", Napi::Function::New(env, AudioProcessor::GetDeviceInfo));
    return exports;
}

AudioProcessor::AudioProcessor(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AudioProcessor>(info) {
    client_ = std::make_unique<AudioClient>();
    thread_ = std::make_unique<CaptureThread>(client_.get());
}

AudioProcessor::~AudioProcessor() {}

Napi::Value AudioProcessor::Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    // TODO: 实现启动逻辑
    return env.Undefined();
}

Napi::Value AudioProcessor::Stop(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    // TODO: 实现停止逻辑
    return env.Undefined();
}

Napi::Value AudioProcessor::StartCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    // TODO: 实现捕获开始逻辑
    return env.Undefined();
}

Napi::Value AudioProcessor::StopCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    // TODO: 实现捕获停止逻辑
    return env.Undefined();
}

Napi::Value AudioProcessor::GetDeviceInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    // TODO: 实现设备信息获取
    return env.Undefined();
}

// 音频数据回调（ThreadSafeFunction 占位）
void AudioProcessor::OnAudioData(const std::vector<uint8_t>& data) {
    // TODO: 使用 Napi::ThreadSafeFunction 向 JS 层回调音频数据
}
