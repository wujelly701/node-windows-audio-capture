#pragma once

#ifndef NOMINMAX
#define NOMINMAX
#endif

#include <cstdint>
#include <cmath>
#include <algorithm>
#include <chrono>

// Prevent Windows.h min/max macro conflicts
#ifdef min
#undef min
#endif
#ifdef max
#undef max
#endif

namespace wasapi_capture {

/**
 * v2.10: Real-time audio statistics
 * v2.10 Phase 2: Added configurable silence threshold
 * 
 * Provides real-time audio level monitoring:
 * - Peak: Maximum absolute amplitude
 * - RMS: Root Mean Square (average energy)
 * - dB: Decibel level (logarithmic scale)
 * - Volume: User-friendly percentage (0-100%)
 * - Silence Detection: Configurable threshold (default 0.001)
 */
struct AudioStats {
    float peak;            // Peak amplitude (0.0 - 1.0)
    float rms;             // Root Mean Square (0.0 - 1.0)
    float db;              // Decibel level (-∞ to 0 dB)
    float volumePercent;   // Volume percentage (0 - 100%)
    bool isSilence;        // Is silence (based on threshold)
    int64_t timestamp;     // Unix timestamp in milliseconds
};

class AudioStatsCalculator {
private:
    float silenceThreshold_;  // Silence detection threshold (default 0.001)

public:
    AudioStatsCalculator() : silenceThreshold_(0.001f) {}
    explicit AudioStatsCalculator(float silenceThreshold) 
        : silenceThreshold_(silenceThreshold) {}
    ~AudioStatsCalculator() = default;

    // Phase 2: Set custom silence threshold
    void SetSilenceThreshold(float threshold) {
        silenceThreshold_ = threshold;
    }

    float GetSilenceThreshold() const {
        return silenceThreshold_;
    }

    /**
     * Calculate audio statistics from Float32 PCM samples
     * 
     * @param samples - Float32 PCM samples (-1.0 to 1.0)
     * @param numSamples - Number of samples
     * @return AudioStats structure with calculated values
     */
    AudioStats Calculate(const float* samples, size_t numSamples) {
        AudioStats stats = {};
        
        if (!samples || numSamples == 0) {
            stats.timestamp = GetCurrentTimestamp();
            stats.db = -INFINITY;
            stats.isSilence = true;
            return stats;
        }
        
        // 1. Calculate Peak (maximum absolute amplitude)
        float maxAbsValue = 0.0f;
        for (size_t i = 0; i < numSamples; i++) {
            float absValue = std::abs(samples[i]);
            if (absValue > maxAbsValue) {
                maxAbsValue = absValue;
            }
        }
        stats.peak = std::min(maxAbsValue, 1.0f);  // Clamp to [0, 1]
        
        // 2. Calculate RMS (Root Mean Square)
        double sumSquares = 0.0;
        for (size_t i = 0; i < numSamples; i++) {
            sumSquares += static_cast<double>(samples[i]) * static_cast<double>(samples[i]);
        }
        stats.rms = std::min(static_cast<float>(std::sqrt(sumSquares / numSamples)), 1.0f);
        
        // 3. Calculate dB (Decibel, reference level = 1.0)
        const float kMinRMS = 1e-10f;  // -200 dB
        if (stats.rms > kMinRMS) {
            stats.db = 20.0f * std::log10(stats.rms);
        } else {
            stats.db = -200.0f;  // Practical minimum
        }
        
        // 4. Calculate volume percentage (0 - 100%)
        stats.volumePercent = stats.rms * 100.0f;
        
        // 5. Detect silence (Phase 2: use configurable threshold)
        stats.isSilence = (stats.rms < silenceThreshold_);
        
        // 6. Timestamp
        stats.timestamp = GetCurrentTimestamp();
        
        return stats;
    }
    
    /**
     * Calculate audio statistics from Int16 PCM samples
     * 
     * @param samples - Int16 PCM samples (-32768 to 32767)
     * @param numSamples - Number of samples
     * @return AudioStats structure with calculated values
     */
    AudioStats Calculate(const int16_t* samples, size_t numSamples) {
        AudioStats stats = {};
        
        if (!samples || numSamples == 0) {
            stats.timestamp = GetCurrentTimestamp();
            stats.db = -INFINITY;
            stats.isSilence = true;
            return stats;
        }
        
        // Convert Int16 to Float32 range and calculate
        const float kInt16ToFloat = 1.0f / 32768.0f;
        
        // 1. Calculate Peak
        int16_t maxAbsValue = 0;
        for (size_t i = 0; i < numSamples; i++) {
            int16_t absValue = std::abs(samples[i]);
            if (absValue > maxAbsValue) {
                maxAbsValue = absValue;
            }
        }
        stats.peak = std::min(maxAbsValue * kInt16ToFloat, 1.0f);
        
        // 2. Calculate RMS
        double sumSquares = 0.0;
        for (size_t i = 0; i < numSamples; i++) {
            double normalized = samples[i] * kInt16ToFloat;
            sumSquares += normalized * normalized;
        }
        stats.rms = std::min(static_cast<float>(std::sqrt(sumSquares / numSamples)), 1.0f);
        
        // 3-6. Same as Float32 version
        const float kMinRMS = 1e-10f;
        if (stats.rms > kMinRMS) {
            stats.db = 20.0f * std::log10(stats.rms);
        } else {
            stats.db = -200.0f;
        }
        
        stats.volumePercent = stats.rms * 100.0f;
        
        // Phase 2: use configurable threshold
        stats.isSilence = (stats.rms < silenceThreshold_);
        
        stats.timestamp = GetCurrentTimestamp();
        
        return stats;
    }

private:
    int64_t GetCurrentTimestamp() const {
        using namespace std::chrono;
        auto now = system_clock::now();
        auto duration = now.time_since_epoch();
        auto millis = duration_cast<milliseconds>(duration);
        return millis.count();
    }
};

}  // namespace wasapi_capture
