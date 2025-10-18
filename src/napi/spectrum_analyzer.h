// SPDX-License-Identifier: BSD-3-Clause
// Copyright (c) 2025 node-windows-audio-capture contributors

#pragma once

#include <vector>
#include <string>
#include <cmath>
#include <chrono>
#include <algorithm>
#include <numeric>

// Use C wrapper to avoid C++/C linkage issues
#include "kiss_fft_wrapper.h"

namespace audio_capture {

// 频段定义
struct FrequencyBand {
    float min_freq;      // 最低频率 (Hz)
    float max_freq;      // 最高频率 (Hz)
    float energy;        // 能量值 (0-1)
    float db;            // 分贝值
    std::string name;    // 频段名称
};

// 频谱分析结果
struct SpectrumResult {
    std::vector<float> magnitudes;        // 完整频谱幅度
    std::vector<FrequencyBand> bands;     // 频段能量
    float voice_probability;              // 语音概率 (0-1)
    float spectral_centroid;              // 频谱质心 (Hz)
    float dominant_frequency;             // 主导频率 (Hz)
    bool is_voice;                        // 是否为语音
    int64_t timestamp;                    // 时间戳（毫秒）
    
    SpectrumResult() 
        : voice_probability(0.0f),
          spectral_centroid(0.0f),
          dominant_frequency(0.0f),
          is_voice(false),
          timestamp(0) {}
};

// 频谱分析器配置
struct SpectrumConfig {
    int fft_size;                         // FFT 大小
    int sample_rate;                      // 采样率
    float smoothing;                      // 平滑系数 (0-1)
    std::vector<std::pair<float, float>> frequency_bands; // 自定义频段
    
    // 语音检测参数
    float voice_threshold;                // 语音阈值 (0-1)
    float min_voice_freq;                 // 语音最低频率 (Hz)
    float max_voice_freq;                 // 语音最高频率 (Hz)
    
    SpectrumConfig()
        : fft_size(2048),
          sample_rate(48000),
          smoothing(0.8f),
          voice_threshold(0.3f),
          min_voice_freq(300.0f),
          max_voice_freq(3400.0f) {
        // 默认 7 段均衡器频段
        frequency_bands = {
            {20.0f, 60.0f},       // Sub-bass
            {60.0f, 250.0f},      // Bass
            {250.0f, 500.0f},     // Low-mid
            {500.0f, 2000.0f},    // Mid (人声)
            {2000.0f, 4000.0f},   // High-mid
            {4000.0f, 6000.0f},   // Presence
            {6000.0f, 20000.0f}   // Brilliance
        };
    }
};

// 频谱分析器类
class SpectrumAnalyzer {
public:
    explicit SpectrumAnalyzer(const SpectrumConfig& config);
    ~SpectrumAnalyzer();
    
    // 禁用拷贝
    SpectrumAnalyzer(const SpectrumAnalyzer&) = delete;
    SpectrumAnalyzer& operator=(const SpectrumAnalyzer&) = delete;
    
    // 分析音频样本
    SpectrumResult Analyze(const float* samples, size_t count);
    
    // 更新配置
    void SetSmoothingFactor(float factor);
    void SetVoiceDetectionParams(float threshold, float min_freq, float max_freq);
    void SetFrequencyBands(const std::vector<std::pair<float, float>>& bands);
    
    // 获取配置
    const SpectrumConfig& GetConfig() const { return config_; }

private:
    SpectrumConfig config_;
    
    // FFT 相关 (使用 void* 避免类型暴露问题)
    void* fft_cfg_;  // kiss_fft_cfg
    std::vector<float> fft_in_real_;
    std::vector<float> fft_in_imag_;
    std::vector<float> fft_out_real_;
    std::vector<float> fft_out_imag_;
    
    // 窗函数和平滑
    std::vector<float> window_;
    std::vector<float> prev_magnitudes_;
    
    // 频段名称映射
    static const std::vector<std::string> default_band_names_;
    
    // 内部方法
    void InitializeWindow();
    void ApplyWindow(const float* samples, size_t count);
    void CalculateMagnitudes(SpectrumResult& result);
    void CalculateBands(SpectrumResult& result);
    void DetectVoice(SpectrumResult& result);
    void CalculateSpectralFeatures(SpectrumResult& result);
    float CalculateSpectralCentroid(const std::vector<float>& magnitudes);
    float FindDominantFrequency(const std::vector<float>& magnitudes);
};

} // namespace audio_capture
