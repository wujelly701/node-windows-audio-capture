#pragma once
#include <napi.h>
#include <memory>
#include <chrono>  // v2.7: For pool evaluation timing
#include "../wasapi/capture_thread.h"
#include "../wasapi/audio_client.h"
#include "external_buffer.h"
#include "audio_effects.h"  // v2.7: Audio effects (RNNoise)
#include "agc_processor.h"  // v2.8: AGC (Automatic Gain Control)
#include "eq_processor.h"   // v2.8: 3-Band EQ
#include "audio_stats_calculator.h"  // v2.10 Phase 2: Audio statistics

class AudioProcessor : public Napi::ObjectWrap<AudioProcessor> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    AudioProcessor(const Napi::CallbackInfo& info);
    ~AudioProcessor();

private:
    std::unique_ptr<AudioClient> client_;
    std::unique_ptr<CaptureThread> thread_;
    DWORD processId_ = 0;
    std::string deviceId_;  // v2.9.0: 设备 ID（支持麦克风捕获）
    Napi::ThreadSafeFunction tsfn_;
    bool comInitialized_ = false;
    bool useExternalBuffer_ = false;  // Zero-copy 模式开关
    
    // v2.7: Audio effects
    std::unique_ptr<AudioCapture::DenoiseProcessor> denoise_processor_;
    bool denoise_enabled_ = false;
    
    // v2.8: AGC (Automatic Gain Control)
    std::unique_ptr<wasapi_capture::SimpleAGC> agc_processor_;
    
    // v2.8: 3-Band EQ
    std::unique_ptr<wasapi_capture::ThreeBandEQ> eq_processor_;
    
    // v2.7: Buffer pool adaptive optimization
    bool useAdaptivePool_ = false;  // Adaptive pool strategy enabled
    std::chrono::steady_clock::time_point last_pool_eval_time_;  // Last evaluation time
    
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
    
    // v2.6: Zero-copy buffer pool statistics
    Napi::Value GetPoolStats(const Napi::CallbackInfo& info);
    
    // v2.7: Audio effects (RNNoise denoising)
    Napi::Value SetDenoiseEnabled(const Napi::CallbackInfo& info);
    Napi::Value GetDenoiseEnabled(const Napi::CallbackInfo& info);
    Napi::Value GetDenoiseStats(const Napi::CallbackInfo& info);
    
    // v2.8: AGC (Automatic Gain Control)
    Napi::Value SetAGCEnabled(const Napi::CallbackInfo& info);
    Napi::Value GetAGCEnabled(const Napi::CallbackInfo& info);
    Napi::Value SetAGCOptions(const Napi::CallbackInfo& info);
    Napi::Value GetAGCOptions(const Napi::CallbackInfo& info);
    Napi::Value GetAGCStats(const Napi::CallbackInfo& info);
    
    // v2.8: 3-Band EQ
    Napi::Value SetEQEnabled(const Napi::CallbackInfo& info);
    Napi::Value GetEQEnabled(const Napi::CallbackInfo& info);
    Napi::Value SetEQBandGain(const Napi::CallbackInfo& info);
    Napi::Value GetEQBandGain(const Napi::CallbackInfo& info);
    Napi::Value GetEQStats(const Napi::CallbackInfo& info);
    
    // v2.10: Real-time audio statistics
    Napi::Value CalculateAudioStats(const Napi::CallbackInfo& info);
    
    // v2.10 Phase 2: Silence threshold configuration
    Napi::Value SetSilenceThreshold(const Napi::CallbackInfo& info);
    Napi::Value GetSilenceThreshold(const Napi::CallbackInfo& info);
    
    // v2.10 Phase 2: Audio statistics calculator with configurable threshold
    std::unique_ptr<wasapi_capture::AudioStatsCalculator> stats_calculator_;
    
    // 静态方法：设备枚举
    static Napi::Value GetDeviceInfo(const Napi::CallbackInfo& info);
    
    // 音频数据回调（从捕获线程调用）
    void OnAudioData(const std::vector<uint8_t>& data);
};
