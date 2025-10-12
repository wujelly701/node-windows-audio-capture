// 音频数据回调（ThreadSafeFunction 占位）
void AudioProcessor::OnAudioData(const std::vector<uint8_t>& data) {
    // TODO: 使用 Napi::ThreadSafeFunction 向 JS 层回调音频数据
}
#include "audio_processor.h"
#include <napi.h>
#include "wasapi/capture_thread.h"
#include "wasapi/audio_client.h"

Napi::Object AudioProcessor::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "AudioProcessor", {
        InstanceMethod("start", &AudioProcessor::Start),
        InstanceMethod("stop", &AudioProcessor::Stop),
        InstanceMethod("startCapture", &AudioProcessor::StartCapture),
        InstanceMethod("stopCapture", &AudioProcessor::StopCapture)
    });
    exports.Set("AudioProcessor", func);
    return exports;
}
Napi::Value AudioProcessor::StopCapture(const Napi::CallbackInfo& info) {
    thread_->Stop();
    return info.Env().Undefined();
}
Napi::Value AudioProcessor::StartCapture(const Napi::CallbackInfo& info) {
    thread_->Start();
    return info.Env().Undefined();
}

AudioProcessor::AudioProcessor(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AudioProcessor>(info) {
    client_ = std::make_unique<AudioClient>();
    thread_ = std::make_unique<CaptureThread>(client_.get());
    // 支持参数初始化
    if (info.Length() >= 2 && info[0].IsNumber() && info[1].IsNumber()) {
        AudioActivationParams params;
        params.targetProcessId = info[0].As<Napi::Number>().Uint32Value();
        params.loopbackMode = static_cast<ProcessLoopbackMode>(info[1].As<Napi::Number>().Int32Value());
        client_->Initialize(params);
    }
}

AudioProcessor::~AudioProcessor() {
    thread_->Stop();
}

Napi::Value AudioProcessor::Start(const Napi::CallbackInfo& info) {
    thread_->Start();
    return info.Env().Undefined();
}

Napi::Value AudioProcessor::Stop(const Napi::CallbackInfo& info) {
    thread_->Stop();
    return info.Env().Undefined();
}
