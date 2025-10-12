#include "audio_processor.h"
#include <napi.h>
#include "wasapi/capture_thread.h"
#include "wasapi/audio_client.h"

Napi::Object AudioProcessor::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "AudioProcessor", {
        InstanceMethod("start", &AudioProcessor::Start),
        InstanceMethod("stop", &AudioProcessor::Stop)
    });
    exports.Set("AudioProcessor", func);
    return exports;
}

AudioProcessor::AudioProcessor(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AudioProcessor>(info) {
    client_ = std::make_unique<AudioClient>();
    thread_ = std::make_unique<CaptureThread>(client_.get());
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
