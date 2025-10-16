#include "audio_processor.h"
#include "external_buffer.h"
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

using AudioCapture::ExternalBuffer;
using AudioCapture::ExternalBufferFactory;

Napi::Object AudioProcessor::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "AudioProcessor", {
        InstanceMethod("start", &AudioProcessor::Start),
        InstanceMethod("stop", &AudioProcessor::Stop),
        InstanceMethod("startCapture", &AudioProcessor::StartCapture),
        InstanceMethod("stopCapture", &AudioProcessor::StopCapture),
        // v2.1: 动态音频会话静音控制
        InstanceMethod("setMuteOtherProcesses", &AudioProcessor::SetMuteOtherProcesses),
        InstanceMethod("setAllowList", &AudioProcessor::SetAllowList),
        InstanceMethod("setBlockList", &AudioProcessor::SetBlockList),
        InstanceMethod("isMutingOtherProcesses", &AudioProcessor::IsMutingOtherProcesses),
        InstanceMethod("getAllowList", &AudioProcessor::GetAllowList),
        InstanceMethod("getBlockList", &AudioProcessor::GetBlockList),
        // v2.6: Zero-copy buffer pool statistics
        InstanceMethod("getPoolStats", &AudioProcessor::GetPoolStats),
        // v2.7: Audio effects (RNNoise denoising)
        InstanceMethod("setDenoiseEnabled", &AudioProcessor::SetDenoiseEnabled),
        InstanceMethod("getDenoiseEnabled", &AudioProcessor::GetDenoiseEnabled),
        InstanceMethod("getDenoiseStats", &AudioProcessor::GetDenoiseStats),
        // v2.8: AGC (Automatic Gain Control)
        InstanceMethod("setAGCEnabled", &AudioProcessor::SetAGCEnabled),
        InstanceMethod("getAGCEnabled", &AudioProcessor::GetAGCEnabled),
        InstanceMethod("setAGCOptions", &AudioProcessor::SetAGCOptions),
        InstanceMethod("getAGCOptions", &AudioProcessor::GetAGCOptions),
        InstanceMethod("getAGCStats", &AudioProcessor::GetAGCStats),
        // v2.8: 3-Band EQ
        InstanceMethod("setEQEnabled", &AudioProcessor::SetEQEnabled),
        InstanceMethod("getEQEnabled", &AudioProcessor::GetEQEnabled),
        InstanceMethod("setEQBandGain", &AudioProcessor::SetEQBandGain),
        InstanceMethod("getEQBandGain", &AudioProcessor::GetEQBandGain),
        InstanceMethod("getEQStats", &AudioProcessor::GetEQStats)
    });
    exports.Set("AudioProcessor", func);
    exports.Set("getDeviceInfo", Napi::Function::New(env, AudioProcessor::GetDeviceInfo));
    return exports;
}

AudioProcessor::AudioProcessor(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AudioProcessor>(info) {
    Napi::Env env = info.Env();
    
    // 初始化 COM (v2.0: 使用 APARTMENTTHREADED 以支持 ActivateAudioInterfaceAsync)
    // 注意: 如果已经初始化则会返回 S_FALSE 或 RPC_E_CHANGED_MODE
    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    comInitialized_ = (hr == S_OK || hr == S_FALSE);
    
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
    
    // v2.6: 获取 zero-copy 模式开关（可选，默认 false 保持向后兼容）
    if (options.Has("useExternalBuffer")) {
        useExternalBuffer_ = options.Get("useExternalBuffer").As<Napi::Boolean>().Value();
    } else {
        useExternalBuffer_ = false;
    }
    
    // v2.7: Check if adaptive pool is requested
    if (options.Has("bufferPoolStrategy") && 
        options.Get("bufferPoolStrategy").IsString()) {
        std::string strategy = options.Get("bufferPoolStrategy").As<Napi::String>().Utf8Value();
        useAdaptivePool_ = (strategy == "adaptive");
    }
    
    // v2.6/v2.7: Initialize External Buffer Factory based on strategy
    if (useExternalBuffer_) {
        if (useAdaptivePool_) {
            // v2.7: Adaptive strategy - dynamically adjust pool size (50-200)
            size_t initial_pool_size = 50;  // Start conservative
            size_t min_pool_size = 50;
            size_t max_pool_size = 200;
            
            // Allow user to override defaults
            if (options.Has("bufferPoolSize")) {
                initial_pool_size = options.Get("bufferPoolSize").As<Napi::Number>().Uint32Value();
            }
            if (options.Has("bufferPoolMin")) {
                min_pool_size = options.Get("bufferPoolMin").As<Napi::Number>().Uint32Value();
            }
            if (options.Has("bufferPoolMax")) {
                max_pool_size = options.Get("bufferPoolMax").As<Napi::Number>().Uint32Value();
            }
            
            ExternalBufferFactory::Instance().InitializeAdaptive(
                4096, initial_pool_size, min_pool_size, max_pool_size
            );
            
            // Initialize evaluation timer
            last_pool_eval_time_ = std::chrono::steady_clock::now();
            
        } else {
            // v2.6: Fixed strategy - use explicit pool size or default to 100
            size_t pool_size = 100;
            if (options.Has("bufferPoolSize")) {
                pool_size = options.Get("bufferPoolSize").As<Napi::Number>().Uint32Value();
            }
            
            ExternalBufferFactory::Instance().Initialize(4096, pool_size);
        }
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
    
    // v2.8: Initialize AGC processor
    agc_processor_ = std::make_unique<wasapi_capture::SimpleAGC>();
    agc_processor_->Initialize(48000);  // Default sample rate, will be updated in Start()
    
    // v2.8: Initialize 3-Band EQ processor
    eq_processor_ = std::make_unique<wasapi_capture::ThreeBandEQ>();
    eq_processor_->Initialize(48000);  // Default sample rate, will be updated in Start()
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
    
    // Get callback function from argument (if provided)
    if (info.Length() > 0 && info[0].IsFunction()) {
        Napi::Function callback = info[0].As<Napi::Function>();
        
        // Create ThreadSafeFunction if not already created
        if (!tsfn_) {
            tsfn_ = Napi::ThreadSafeFunction::New(
                env,
                callback,
                "AudioDataCallback",
                0,      // Unlimited queue
                1       // Single thread
            );
        }
    }
    
    // v2.0: 根据 processId 选择初始化模式
    bool initSuccess = false;
    
    if (processId_ > 0) {
        // v2.0: 使用进程过滤模式（标准 Loopback + 音频会话过滤）
        // 这种方式从 Windows 7 开始就支持，无需特殊版本检查
        
        // v2.0: 使用进程过滤方式（标准 Loopback + 会话过滤）
        initSuccess = client_->InitializeWithProcessFilter(processId_);
        
        if (!initSuccess) {
            Napi::Error::New(env, 
                "Failed to initialize process filter. "
                "Make sure the process ID is valid and the process is running."
            ).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    } else {
        // 使用标准 Loopback 模式（向后兼容 v1.0）
        AudioActivationParams params;
        params.targetProcessId = 0;
        params.loopbackMode = ProcessLoopbackMode::INCLUDE;
        
        initSuccess = client_->Initialize(params);
        
        if (!initSuccess) {
            Napi::Error::New(env, "Failed to initialize audio client").ThrowAsJavaScriptException();
            return env.Undefined();
        }
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
    
    // v2.7: Periodic buffer pool evaluation (every 10 seconds)
    if (useExternalBuffer_ && useAdaptivePool_) {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
            now - last_pool_eval_time_
        ).count();
        
        if (elapsed >= 10) {
            // 10 seconds passed - evaluate and adjust pool
            ExternalBufferFactory::Instance().EvaluatePool();
            last_pool_eval_time_ = now;
        }
    }
    
    // v2.7: Apply audio denoising if enabled
    std::vector<uint8_t> processedData = data;  // Copy for modification
    if (denoise_enabled_ && denoise_processor_) {
        // Assuming audio data is Float32 PCM
        // Note: May need to check format and handle conversion
        size_t sampleCount = processedData.size() / sizeof(float);
        if (sampleCount > 0) {
            try {
                float* audioData = reinterpret_cast<float*>(processedData.data());
                denoise_processor_->ProcessBuffer(audioData, static_cast<int>(sampleCount));
            } catch (const std::exception& e) {
                // Denoise failed, continue with original data
                // Could log error here if needed
            }
        }
    }
    
    // v2.8: Apply AGC (Automatic Gain Control) if enabled
    if (agc_processor_ && agc_processor_->IsEnabled()) {
        size_t sampleCount = processedData.size() / sizeof(float);
        if (sampleCount > 0) {
            try {
                float* audioData = reinterpret_cast<float*>(processedData.data());
                // Assuming stereo audio (2 channels) - adjust if needed
                int frameCount = static_cast<int>(sampleCount / 2);
                int channels = 2;
                agc_processor_->Process(audioData, frameCount, channels);
            } catch (const std::exception& e) {
                // AGC failed, continue with original data
            }
        }
    }
    
    // v2.8: Apply 3-Band EQ if enabled
    if (eq_processor_ && eq_processor_->IsEnabled()) {
        size_t sampleCount = processedData.size() / sizeof(float);
        if (sampleCount > 0) {
            try {
                float* audioData = reinterpret_cast<float*>(processedData.data());
                // Assuming stereo audio (2 channels) - adjust if needed
                int frameCount = static_cast<int>(sampleCount / 2);
                int channels = 2;
                eq_processor_->Process(audioData, frameCount, channels);
            } catch (const std::exception& e) {
                // EQ failed, continue with original data
            }
        }
    }
    
    if (useExternalBuffer_) {
        // v2.6: Zero-Copy 模式 - 使用 External Buffer
        // 创建 External Buffer（由 Buffer Pool 管理）
        auto extBuffer = ExternalBufferFactory::Instance().Create();
        if (!extBuffer) {
            // Pool exhausted, fallback to copy mode
            auto* dataPtr = new std::vector<uint8_t>(processedData);
            tsfn_.NonBlockingCall(dataPtr, [](Napi::Env env, Napi::Function jsCallback, std::vector<uint8_t>* data) {
                try {
                    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, data->data(), data->size());
                    jsCallback.Call({ buffer });
                } catch (...) {
                    // Silently ignore callback errors
                }
                delete data;
            });
            return;
        }
        
        // 检查缓冲区大小是否足够
        if (processedData.size() > extBuffer->size()) {
            // Buffer too small, fallback to copy mode
            auto* dataPtr = new std::vector<uint8_t>(processedData);
            tsfn_.NonBlockingCall(dataPtr, [](Napi::Env env, Napi::Function jsCallback, std::vector<uint8_t>* data) {
                try {
                    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, data->data(), data->size());
                    jsCallback.Call({ buffer });
                } catch (...) {
                    // Silently ignore callback errors
                }
                delete data;
            });
            return;
        }
        
        // 拷贝数据到 External Buffer (use processed data)
        size_t actualSize = processedData.size();
        memcpy(extBuffer->data(), processedData.data(), actualSize);
        
        // CRITICAL FIX: Capture shared_ptr in lambda to keep buffer alive
        // Use the new ToBufferFromShared method that properly handles ownership
        tsfn_.NonBlockingCall(extBuffer.get(), [extBuffer, actualSize](Napi::Env env, Napi::Function jsCallback, ExternalBuffer*) {
            // v2.7.1: Wrap callback in try-catch to prevent N-API uncaught exception warnings
            try {
                // Use new method that properly transfers shared_ptr ownership to V8
                Napi::Value buffer = ExternalBuffer::ToBufferFromShared(env, extBuffer, actualSize);
                jsCallback.Call({ buffer });
                // shared_ptr extBuffer goes out of scope, but ownership transferred to V8's finalize callback
            } catch (const Napi::Error& e) {
                // Silently ignore callback errors to prevent log pollution
                // The error is already handled by N-API and reported to JavaScript
                (void)e;  // Suppress unused variable warning
            } catch (const std::exception& e) {
                // Catch standard exceptions
                (void)e;
            } catch (...) {
                // Catch all other exceptions
            }
        });
    } else {
        // 传统模式：复制数据到堆（保持向后兼容，use processed data）
        auto* dataPtr = new std::vector<uint8_t>(processedData);
        
        // 调用 ThreadSafeFunction（异步传递数据到 JS 线程）
        tsfn_.NonBlockingCall(dataPtr, [](Napi::Env env, Napi::Function jsCallback, std::vector<uint8_t>* data) {
            try {
                // 创建 Buffer 传递给 JS
                Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, data->data(), data->size());
                jsCallback.Call({ buffer });
            } catch (...) {
                // Silently ignore callback errors
            }
            delete data;  // 释放堆内存
        });
    }
}

// ====== v2.1: 动态音频会话静音控制 ======

Napi::Value AudioProcessor::SetMuteOtherProcesses(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!client_) {
        Napi::Error::New(env, "Audio client not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 参数验证：需要 boolean
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Expected boolean argument").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    bool enable = info[0].As<Napi::Boolean>().Value();
    client_->SetMuteOtherProcesses(enable);
    
    return env.Undefined();
}

Napi::Value AudioProcessor::SetAllowList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!client_) {
        Napi::Error::New(env, "Audio client not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 参数验证：需要 number 数组
    if (info.Length() < 1 || !info[0].IsArray()) {
        Napi::TypeError::New(env, "Expected array of process IDs").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    Napi::Array arr = info[0].As<Napi::Array>();
    std::vector<DWORD> pids;
    pids.reserve(arr.Length());
    
    for (uint32_t i = 0; i < arr.Length(); i++) {
        Napi::Value val = arr[i];
        if (val.IsNumber()) {
            pids.push_back(val.As<Napi::Number>().Uint32Value());
        }
    }
    
    client_->SetAllowList(pids);
    
    return env.Undefined();
}

Napi::Value AudioProcessor::SetBlockList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!client_) {
        Napi::Error::New(env, "Audio client not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // 参数验证：需要 number 数组
    if (info.Length() < 1 || !info[0].IsArray()) {
        Napi::TypeError::New(env, "Expected array of process IDs").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    Napi::Array arr = info[0].As<Napi::Array>();
    std::vector<DWORD> pids;
    pids.reserve(arr.Length());
    
    for (uint32_t i = 0; i < arr.Length(); i++) {
        Napi::Value val = arr[i];
        if (val.IsNumber()) {
            pids.push_back(val.As<Napi::Number>().Uint32Value());
        }
    }
    
    client_->SetBlockList(pids);
    
    return env.Undefined();
}

Napi::Value AudioProcessor::IsMutingOtherProcesses(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!client_) {
        Napi::Error::New(env, "Audio client not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    bool isMuting = client_->IsMutingOtherProcesses();
    return Napi::Boolean::New(env, isMuting);
}

Napi::Value AudioProcessor::GetAllowList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!client_) {
        Napi::Error::New(env, "Audio client not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    std::vector<DWORD> pids = client_->GetAllowList();
    Napi::Array result = Napi::Array::New(env, pids.size());
    
    for (size_t i = 0; i < pids.size(); i++) {
        result[static_cast<uint32_t>(i)] = Napi::Number::New(env, pids[i]);
    }
    
    return result;
}

Napi::Value AudioProcessor::GetBlockList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!client_) {
        Napi::Error::New(env, "Audio client not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    std::vector<DWORD> pids = client_->GetBlockList();
    Napi::Array result = Napi::Array::New(env, pids.size());
    
    for (size_t i = 0; i < pids.size(); i++) {
        result[static_cast<uint32_t>(i)] = Napi::Number::New(env, pids[i]);
    }
    
    return result;
}

// ====== v2.6: Zero-copy buffer pool statistics ======

Napi::Value AudioProcessor::GetPoolStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!useExternalBuffer_) {
        // Not using external buffer mode - return null
        return env.Null();
    }
    
    // Get statistics from ExternalBufferFactory
    auto stats = ExternalBufferFactory::Instance().GetStats();
    
    // Create JavaScript object with statistics
    Napi::Object result = Napi::Object::New(env);
    result.Set("poolHits", Napi::Number::New(env, stats.pool_hits));
    result.Set("poolMisses", Napi::Number::New(env, stats.pool_misses));
    result.Set("dynamicAllocations", Napi::Number::New(env, stats.dynamic_allocations));
    result.Set("currentPoolSize", Napi::Number::New(env, stats.current_pool_size));
    result.Set("maxPoolSize", Napi::Number::New(env, stats.max_pool_size));
    
    // Calculate hit rate
    uint64_t total_requests = stats.pool_hits + stats.pool_misses;
    double hit_rate = (total_requests > 0) ? 
        (static_cast<double>(stats.pool_hits) / total_requests * 100.0) : 0.0;
    result.Set("hitRate", Napi::Number::New(env, hit_rate));
    
    return result;
}

// ====== v2.7: Audio Effects (RNNoise Denoising) ======

Napi::Value AudioProcessor::SetDenoiseEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Boolean argument expected").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    bool enabled = info[0].As<Napi::Boolean>().Value();
    
    if (enabled && !denoise_processor_) {
        // Create denoise processor on first enable
        try {
            denoise_processor_ = std::make_unique<AudioCapture::DenoiseProcessor>(480);
            denoise_enabled_ = true;
        } catch (const std::exception& e) {
            Napi::Error::New(env, std::string("Failed to create denoise processor: ") + e.what())
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
    } else if (!enabled && denoise_processor_) {
        // Disable denoising
        denoise_enabled_ = false;
    } else {
        // Just update enabled state
        denoise_enabled_ = enabled;
    }
    
    return env.Undefined();
}

Napi::Value AudioProcessor::GetDenoiseEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, denoise_enabled_);
}

Napi::Value AudioProcessor::GetDenoiseStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Return null if denoise is not enabled or processor doesn't exist
    if (!denoise_enabled_ || !denoise_processor_) {
        return env.Null();
    }
    
    Napi::Object result = Napi::Object::New(env);
    // Use consistent naming: framesProcessed (not processedFrames) and vadProbability (not voiceProbability)
    result.Set("framesProcessed", Napi::Number::New(env, denoise_processor_->GetProcessedFrames()));
    result.Set("vadProbability", Napi::Number::New(env, denoise_processor_->GetLastVoiceProbability()));
    result.Set("frameSize", Napi::Number::New(env, denoise_processor_->GetFrameSize()));
    result.Set("enabled", Napi::Boolean::New(env, denoise_enabled_));
    
    return result;
}

// ====== v2.8: AGC (Automatic Gain Control) ======

Napi::Value AudioProcessor::SetAGCEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Boolean argument expected").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    bool enabled = info[0].As<Napi::Boolean>().Value();
    
    if (agc_processor_) {
        agc_processor_->SetEnabled(enabled);
    }
    
    return env.Undefined();
}

Napi::Value AudioProcessor::GetAGCEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (agc_processor_) {
        return Napi::Boolean::New(env, agc_processor_->IsEnabled());
    }
    
    return Napi::Boolean::New(env, false);
}

Napi::Value AudioProcessor::SetAGCOptions(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Object argument expected").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    if (!agc_processor_) {
        Napi::Error::New(env, "AGC processor not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    Napi::Object options = info[0].As<Napi::Object>();
    wasapi_capture::SimpleAGC::Options agc_options = agc_processor_->GetOptions();
    
    // Update options from JavaScript object
    if (options.Has("targetLevel")) {
        agc_options.target_level_db = options.Get("targetLevel").As<Napi::Number>().FloatValue();
    }
    if (options.Has("maxGain")) {
        agc_options.max_gain_db = options.Get("maxGain").As<Napi::Number>().FloatValue();
    }
    if (options.Has("minGain")) {
        agc_options.min_gain_db = options.Get("minGain").As<Napi::Number>().FloatValue();
    }
    if (options.Has("attackTime")) {
        agc_options.attack_time_ms = options.Get("attackTime").As<Napi::Number>().FloatValue();
    }
    if (options.Has("releaseTime")) {
        agc_options.release_time_ms = options.Get("releaseTime").As<Napi::Number>().FloatValue();
    }
    
    agc_processor_->SetOptions(agc_options);
    
    return env.Undefined();
}

Napi::Value AudioProcessor::GetAGCOptions(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!agc_processor_) {
        return env.Null();
    }
    
    const auto& options = agc_processor_->GetOptions();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("targetLevel", Napi::Number::New(env, options.target_level_db));
    result.Set("maxGain", Napi::Number::New(env, options.max_gain_db));
    result.Set("minGain", Napi::Number::New(env, options.min_gain_db));
    result.Set("attackTime", Napi::Number::New(env, options.attack_time_ms));
    result.Set("releaseTime", Napi::Number::New(env, options.release_time_ms));
    
    return result;
}

Napi::Value AudioProcessor::GetAGCStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!agc_processor_) {
        return env.Null();
    }
    
    auto stats = agc_processor_->GetStats();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("enabled", Napi::Boolean::New(env, stats.enabled));
    result.Set("currentGain", Napi::Number::New(env, stats.current_gain_db));
    result.Set("averageLevel", Napi::Number::New(env, stats.average_level_db));
    result.Set("rmsLinear", Napi::Number::New(env, stats.rms_linear));
    result.Set("clipping", Napi::Boolean::New(env, stats.clipping));
    result.Set("framesProcessed", Napi::Number::New(env, static_cast<double>(stats.frames_processed)));
    
    return result;
}

// ====== v2.8: 3-Band EQ Methods ======

Napi::Value AudioProcessor::SetEQEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!eq_processor_) {
        Napi::Error::New(env, "EQ processor not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Expected boolean argument").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    bool enabled = info[0].As<Napi::Boolean>().Value();
    eq_processor_->SetEnabled(enabled);
    
    return env.Undefined();
}

Napi::Value AudioProcessor::GetEQEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!eq_processor_) {
        return Napi::Boolean::New(env, false);
    }
    
    return Napi::Boolean::New(env, eq_processor_->IsEnabled());
}

Napi::Value AudioProcessor::SetEQBandGain(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!eq_processor_) {
        Napi::Error::New(env, "EQ processor not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    // Parameters: band (string), gain (number)
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected (band: string, gain: number)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    std::string bandStr = info[0].As<Napi::String>().Utf8Value();
    float gain = info[1].As<Napi::Number>().FloatValue();
    
    // Map string to Band enum
    wasapi_capture::ThreeBandEQ::Band band;
    if (bandStr == "low") {
        band = wasapi_capture::ThreeBandEQ::Band::Low;
    } else if (bandStr == "mid") {
        band = wasapi_capture::ThreeBandEQ::Band::Mid;
    } else if (bandStr == "high") {
        band = wasapi_capture::ThreeBandEQ::Band::High;
    } else {
        Napi::TypeError::New(env, "Invalid band name. Expected 'low', 'mid', or 'high'").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    eq_processor_->SetBandGain(band, gain);
    
    return env.Undefined();
}

Napi::Value AudioProcessor::GetEQBandGain(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!eq_processor_) {
        return Napi::Number::New(env, 0.0);
    }
    
    // Parameter: band (string)
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected band: string").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    std::string bandStr = info[0].As<Napi::String>().Utf8Value();
    
    // Map string to Band enum
    wasapi_capture::ThreeBandEQ::Band band;
    if (bandStr == "low") {
        band = wasapi_capture::ThreeBandEQ::Band::Low;
    } else if (bandStr == "mid") {
        band = wasapi_capture::ThreeBandEQ::Band::Mid;
    } else if (bandStr == "high") {
        band = wasapi_capture::ThreeBandEQ::Band::High;
    } else {
        Napi::TypeError::New(env, "Invalid band name. Expected 'low', 'mid', or 'high'").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    float gain = eq_processor_->GetBandGain(band);
    
    return Napi::Number::New(env, gain);
}

Napi::Value AudioProcessor::GetEQStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!eq_processor_) {
        return env.Null();
    }
    
    auto stats = eq_processor_->GetStats();
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("enabled", Napi::Boolean::New(env, stats.enabled));
    result.Set("lowGain", Napi::Number::New(env, stats.low_gain_db));
    result.Set("midGain", Napi::Number::New(env, stats.mid_gain_db));
    result.Set("highGain", Napi::Number::New(env, stats.high_gain_db));
    result.Set("framesProcessed", Napi::Number::New(env, static_cast<double>(stats.frames_processed)));
    
    return result;
}
