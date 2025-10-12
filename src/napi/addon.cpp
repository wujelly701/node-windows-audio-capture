#include <napi.h>
#include "audio_processor.h"
extern Napi::Value EnumerateProcesses(const Napi::CallbackInfo& info);

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    AudioProcessor::Init(env, exports);
    exports.Set("enumerateProcesses", Napi::Function::New(env, EnumerateProcesses));
    return exports;
}

NODE_API_MODULE(node_windows_audio_capture, InitAll)
