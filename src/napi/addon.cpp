#include <napi.h>
#include "audio_processor.h"
#include "../wasapi/audio_client.h"
extern Napi::Value EnumerateProcesses(const Napi::CallbackInfo& info);

// v2.0: 检测进程过滤支持（基于音频会话API，Windows 7+ 都支持）
Napi::Value IsProcessLoopbackSupported(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    // 音频会话API从 Windows 7 开始支持，现代系统都可用
    return Napi::Boolean::New(env, true);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    AudioProcessor::Init(env, exports);
    exports.Set("enumerateProcesses", Napi::Function::New(env, EnumerateProcesses));
    exports.Set("isProcessLoopbackSupported", Napi::Function::New(env, IsProcessLoopbackSupported));
    return exports;
}

NODE_API_MODULE(node_windows_audio_capture, InitAll)
