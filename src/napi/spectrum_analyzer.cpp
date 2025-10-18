// SPDX-License-Identifier: BSD-3-Clause
// Copyright (c) 2025 node-windows-audio-capture contributors

#include "spectrum_analyzer.h"
#include <cstring>

namespace audio_capture {

// 默认频段名称
const std::vector<std::string> SpectrumAnalyzer::default_band_names_ = {
    "Sub-bass",
    "Bass",
    "Low-mid",
    "Mid",
    "High-mid",
    "Presence",
    "Brilliance"
};

SpectrumAnalyzer::SpectrumAnalyzer(const SpectrumConfig& config)
    : config_(config), fft_cfg_(nullptr) {
    
    // 初始化 FFT (使用 C 包装器)
    fft_cfg_ = kiss_fft_wrapper_alloc(config_.fft_size);
    if (!fft_cfg_) {
        throw std::runtime_error("Failed to allocate FFT configuration");
    }
    
    // 分配缓冲区
    fft_in_real_.resize(config_.fft_size, 0.0f);
    fft_in_imag_.resize(config_.fft_size, 0.0f);
    fft_out_real_.resize(config_.fft_size, 0.0f);
    fft_out_imag_.resize(config_.fft_size, 0.0f);
    prev_magnitudes_.resize(config_.fft_size / 2, 0.0f);
    
    // 初始化窗函数
    InitializeWindow();
}

SpectrumAnalyzer::~SpectrumAnalyzer() {
    if (fft_cfg_) {
        kiss_fft_wrapper_free(fft_cfg_);
        fft_cfg_ = nullptr;
    }
}

void SpectrumAnalyzer::InitializeWindow() {
    // Hanning 窗函数
    window_.resize(config_.fft_size);
    const float pi = 3.14159265358979323846f;
    
    for (int i = 0; i < config_.fft_size; i++) {
        window_[i] = 0.5f * (1.0f - std::cos(2.0f * pi * i / (config_.fft_size - 1)));
    }
}

void SpectrumAnalyzer::ApplyWindow(const float* samples, size_t count) {
    // 应用窗函数到输入数据
    size_t samples_to_process = std::min(count, static_cast<size_t>(config_.fft_size));
    
    for (size_t i = 0; i < samples_to_process; i++) {
        fft_in_real_[i] = samples[i] * window_[i];
        fft_in_imag_[i] = 0.0f;
    }
    
    // 如果样本不足，填充零
    for (size_t i = samples_to_process; i < static_cast<size_t>(config_.fft_size); i++) {
        fft_in_real_[i] = 0.0f;
        fft_in_imag_[i] = 0.0f;
    }
}

void SpectrumAnalyzer::CalculateMagnitudes(SpectrumResult& result) {
    // 计算幅度谱
    result.magnitudes.resize(config_.fft_size / 2);
    
    for (int i = 0; i < config_.fft_size / 2; i++) {
        float real = fft_out_real_[i];
        float imag = fft_out_imag_[i];
        float magnitude = std::sqrt(real * real + imag * imag) / config_.fft_size;
        
        // 指数平滑
        result.magnitudes[i] = config_.smoothing * magnitude + 
                               (1.0f - config_.smoothing) * prev_magnitudes_[i];
        prev_magnitudes_[i] = result.magnitudes[i];
    }
}

void SpectrumAnalyzer::CalculateBands(SpectrumResult& result) {
    result.bands.clear();
    result.bands.reserve(config_.frequency_bands.size());
    
    for (size_t band_idx = 0; band_idx < config_.frequency_bands.size(); band_idx++) {
        const auto& [min_freq, max_freq] = config_.frequency_bands[band_idx];
        
        // 计算频段对应的 FFT bin 范围
        int min_bin = static_cast<int>(min_freq * config_.fft_size / config_.sample_rate);
        int max_bin = static_cast<int>(max_freq * config_.fft_size / config_.sample_rate);
        
        // 确保不超出范围
        min_bin = std::max(0, std::min(min_bin, config_.fft_size / 2 - 1));
        max_bin = std::max(0, std::min(max_bin, config_.fft_size / 2 - 1));
        
        // 计算频段能量
        float energy = 0.0f;
        int bin_count = 0;
        
        for (int i = min_bin; i <= max_bin; i++) {
            energy += result.magnitudes[i];
            bin_count++;
        }
        
        float avg_energy = bin_count > 0 ? energy / bin_count : 0.0f;
        
        // 创建频段对象
        FrequencyBand band;
        band.min_freq = min_freq;
        band.max_freq = max_freq;
        band.energy = avg_energy;
        band.db = avg_energy > 1e-10f ? 20.0f * std::log10(avg_energy) : -100.0f;
        
        // 设置频段名称
        if (band_idx < default_band_names_.size()) {
            band.name = default_band_names_[band_idx];
        } else {
            band.name = "Band " + std::to_string(band_idx + 1);
        }
        
        result.bands.push_back(band);
    }
}

void SpectrumAnalyzer::DetectVoice(SpectrumResult& result) {
    // 计算语音频段的能量占比
    int min_bin = static_cast<int>(config_.min_voice_freq * config_.fft_size / config_.sample_rate);
    int max_bin = static_cast<int>(config_.max_voice_freq * config_.fft_size / config_.sample_rate);
    
    min_bin = std::max(0, std::min(min_bin, config_.fft_size / 2 - 1));
    max_bin = std::max(0, std::min(max_bin, config_.fft_size / 2 - 1));
    
    float voice_energy = 0.0f;
    float total_energy = 0.0f;
    
    for (size_t i = 0; i < result.magnitudes.size(); i++) {
        float mag = result.magnitudes[i];
        total_energy += mag;
        
        if (static_cast<int>(i) >= min_bin && static_cast<int>(i) <= max_bin) {
            voice_energy += mag;
        }
    }
    
    // 语音概率 = 语音频段能量 / 总能量
    result.voice_probability = total_energy > 1e-10f ? voice_energy / total_energy : 0.0f;
    result.is_voice = result.voice_probability > config_.voice_threshold;
}

void SpectrumAnalyzer::CalculateSpectralFeatures(SpectrumResult& result) {
    // 计算频谱质心
    result.spectral_centroid = CalculateSpectralCentroid(result.magnitudes);
    
    // 计算主导频率
    result.dominant_frequency = FindDominantFrequency(result.magnitudes);
}

float SpectrumAnalyzer::CalculateSpectralCentroid(const std::vector<float>& magnitudes) {
    float weighted_sum = 0.0f;
    float total_energy = 0.0f;
    
    for (size_t i = 0; i < magnitudes.size(); i++) {
        float freq = i * config_.sample_rate / static_cast<float>(config_.fft_size);
        weighted_sum += freq * magnitudes[i];
        total_energy += magnitudes[i];
    }
    
    return total_energy > 1e-10f ? weighted_sum / total_energy : 0.0f;
}

float SpectrumAnalyzer::FindDominantFrequency(const std::vector<float>& magnitudes) {
    // 找到最大幅度对应的频率
    auto max_it = std::max_element(magnitudes.begin(), magnitudes.end());
    
    if (max_it == magnitudes.end()) {
        return 0.0f;
    }
    
    size_t max_idx = std::distance(magnitudes.begin(), max_it);
    return max_idx * config_.sample_rate / static_cast<float>(config_.fft_size);
}

SpectrumResult SpectrumAnalyzer::Analyze(const float* samples, size_t count) {
    SpectrumResult result;
    
    if (count < static_cast<size_t>(config_.fft_size)) {
        // 样本不足，返回空结果
        return result;
    }
    
    // 1. 应用窗函数
    ApplyWindow(samples, count);
    
    // 2. 执行 FFT (使用 C 包装器)
    kiss_fft_wrapper_transform(fft_cfg_, 
                                fft_in_real_.data(), fft_in_imag_.data(),
                                fft_out_real_.data(), fft_out_imag_.data(),
                                config_.fft_size);
    
    // 3. 计算幅度谱
    CalculateMagnitudes(result);
    
    // 4. 计算频段能量
    CalculateBands(result);
    
    // 5. 语音检测
    DetectVoice(result);
    
    // 6. 计算频谱特征
    CalculateSpectralFeatures(result);
    
    // 7. 设置时间戳
    auto now = std::chrono::system_clock::now();
    auto duration = now.time_since_epoch();
    result.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
    
    return result;
}

void SpectrumAnalyzer::SetSmoothingFactor(float factor) {
    config_.smoothing = std::max(0.0f, std::min(1.0f, factor));
}

void SpectrumAnalyzer::SetVoiceDetectionParams(float threshold, float min_freq, float max_freq) {
    config_.voice_threshold = std::max(0.0f, std::min(1.0f, threshold));
    config_.min_voice_freq = std::max(0.0f, min_freq);
    config_.max_voice_freq = std::max(config_.min_voice_freq, max_freq);
}

void SpectrumAnalyzer::SetFrequencyBands(const std::vector<std::pair<float, float>>& bands) {
    config_.frequency_bands = bands;
}

} // namespace audio_capture
