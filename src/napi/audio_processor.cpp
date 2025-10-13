#include "audio_processor.h"
#include <napi.h>
#include <vector>
#include <windows.h>
#include <mmdeviceapi.h>
#include <functiondiscoverykeys_devpkey.h>
#include <propvarutil.h>
#include <wrl/client.h>
#include "../wasapi/capture_thread.h"
#include "../wasapi/audio_client.h"
#include "../wasapi/audio_params.h"

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
    Napi::Env env = info.Env();
    
    // 初始化 COM
    HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    comInitialized_ = SUCCEEDED(hr);
    
    // 参数验证：需要传入 { processId: number, callback: function }
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Expected options object as first argument").ThrowAsJavaScriptException();
        return;
    }
    
    Napi::Object options = info[0].As<Napi::Object>();
    
    // 获取目标进程 ID（可选，默认 0 表示捕获所有音频）
    if (options.Has("processId")) {
        processId_ = options.Get("processId").As<Napi::Number>().Uint32Value();
    } else {
        processId_ = 0;  // 默认捕获所有进程音频
    }
    
    // 获取音频数据回调函数（可选）
    if (options.Has("callback") && options.Get("callback").IsFunction()) {
        Napi::Function callback = options.Get("callback").As<Napi::Function>();
        // 创建 ThreadSafeFunction（异步回调）
        tsfn_ = Napi::ThreadSafeFunction::New(
            env,
            callback,
            "AudioDataCallback",
            0,      // 无限队列
            1       // 单线程
        );
    }
    
    client_ = std::make_unique<AudioClient>();
    thread_ = std::make_unique<CaptureThread>(client_.get());
    
    // 设置 AudioClient 的音频数据回调
    client_->SetAudioDataCallback([this](const std::vector<uint8_t>& data) {
        this->OnAudioData(data);
    });
}

AudioProcessor::~AudioProcessor() {
    // 确保停止捕获和清理资源
    if (thread_ && thread_->IsRunning()) {
        thread_->Stop();
    }
    if (client_ && client_->IsInitialized()) {
        client_->Stop();
    }
    // 释放 ThreadSafeFunction
    if (tsfn_) {
        tsfn_.Release();
    }
    // 清理 COM
    if (comInitialized_) {
        CoUninitialize();
    }
}

Napi::Value AudioProcessor::Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 初始化 AudioClient（使用指定的进程 ID）
    AudioActivationParams params;
    params.targetProcessId = processId_;
    params.loopbackMode = ProcessLoopbackMode::INCLUDE;
    
    if (!client_->Initialize(params)) {
        Napi::Error::New(env, "Failed to initialize audio client").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 设置事件句柄（在 Start() 之前必须设置）
    HANDLE sampleReadyEvent = thread_->GetEventHandle();
    if (sampleReadyEvent && !client_->SetEventHandle(sampleReadyEvent)) {
        Napi::Error::New(env, "Failed to set event handle").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 开始音频流
    if (!client_->Start()) {
        Napi::Error::New(env, "Failed to start audio client").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    return Napi::Boolean::New(env, true);
}

Napi::Value AudioProcessor::Stop(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 停止音频流
    if (client_ && client_->IsInitialized()) {
        if (!client_->Stop()) {
            Napi::Error::New(env, "Failed to stop audio client").ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }
    
    return Napi::Boolean::New(env, true);
}

Napi::Value AudioProcessor::StartCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 启动捕获线程
    if (!client_ || !client_->IsInitialized()) {
        Napi::Error::New(env, "Audio client not initialized. Call start() first").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    if (thread_->IsRunning()) {
        Napi::Error::New(env, "Capture already running").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    thread_->Start();
    return Napi::Boolean::New(env, true);
}

Napi::Value AudioProcessor::StopCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 停止捕获线程
    if (thread_ && thread_->IsRunning()) {
        thread_->Stop();
    }
    
    return Napi::Boolean::New(env, true);
}

Napi::Value AudioProcessor::GetDeviceInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 初始化 COM（调用前需要确保 COM 已初始化）
    HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    bool comInitialized = SUCCEEDED(hr);
    
    // 枚举音频设备（返回默认渲染设备信息）
    Microsoft::WRL::ComPtr<IMMDeviceEnumerator> enumerator;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) {
        if (comInitialized) CoUninitialize();
        Napi::Error::New(env, "Failed to create device enumerator").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    Microsoft::WRL::ComPtr<IMMDevice> device;
    hr = enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &device);
    if (FAILED(hr)) {
        Napi::Error::New(env, "Failed to get default audio endpoint").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 获取设备 ID
    LPWSTR deviceId = nullptr;
    hr = device->GetId(&deviceId);
    if (FAILED(hr)) {
        Napi::Error::New(env, "Failed to get device ID").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 获取设备属性
    Microsoft::WRL::ComPtr<IPropertyStore> propertyStore;
    hr = device->OpenPropertyStore(STGM_READ, &propertyStore);
    if (FAILED(hr)) {
        CoTaskMemFree(deviceId);
        Napi::Error::New(env, "Failed to open property store").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 获取设备友好名称
    PROPVARIANT varName;
    PropVariantInit(&varName);
    hr = propertyStore->GetValue(PKEY_Device_FriendlyName, &varName);
    
    Napi::Object result = Napi::Object::New(env);
    
    if (SUCCEEDED(hr) && varName.vt == VT_LPWSTR) {
        // 转换宽字符到 UTF-8
        int size = WideCharToMultiByte(CP_UTF8, 0, varName.pwszVal, -1, nullptr, 0, nullptr, nullptr);
        std::vector<char> buffer(size);
        WideCharToMultiByte(CP_UTF8, 0, varName.pwszVal, -1, buffer.data(), size, nullptr, nullptr);
        result.Set("name", Napi::String::New(env, buffer.data()));
    } else {
        result.Set("name", Napi::String::New(env, "Unknown Device"));
    }
    
    // 转换设备 ID
    int size = WideCharToMultiByte(CP_UTF8, 0, deviceId, -1, nullptr, 0, nullptr, nullptr);
    std::vector<char> idBuffer(size);
    WideCharToMultiByte(CP_UTF8, 0, deviceId, -1, idBuffer.data(), size, nullptr, nullptr);
    result.Set("id", Napi::String::New(env, idBuffer.data()));
    
    PropVariantClear(&varName);
    CoTaskMemFree(deviceId);
    
    // 清理 COM
    if (comInitialized) {
        CoUninitialize();
    }
    
    return result;
}

// 音频数据回调（从捕获线程调用）
void AudioProcessor::OnAudioData(const std::vector<uint8_t>& data) {
    if (!tsfn_) {
        return;  // 没有设置回调函数
    }
    
    // 复制数据到堆（避免栈数据被释放）
    auto* dataPtr = new std::vector<uint8_t>(data);
    
    // 调用 ThreadSafeFunction（异步传递数据到 JS 线程）
    tsfn_.NonBlockingCall(dataPtr, [](Napi::Env env, Napi::Function jsCallback, std::vector<uint8_t>* data) {
        // 创建 Buffer 传递给 JS
        Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, data->data(), data->size());
        jsCallback.Call({ buffer });
        delete data;  // 释放堆内存
    });
}
