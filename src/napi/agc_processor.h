#ifndef AGC_PROCESSOR_H
#define AGC_PROCESSOR_H

#include <cmath>
#include <algorithm>

namespace wasapi_capture {

/**
 * @brief Simple Automatic Gain Control (AGC) processor
 * 
 * This implements a basic RMS-based AGC algorithm with configurable parameters.
 * The AGC dynamically adjusts audio gain to maintain a target output level.
 * 
 * Algorithm Overview:
 * 1. Compute RMS (Root Mean Square) of input signal
 * 2. Calculate required gain to reach target level
 * 3. Apply gain smoothing with attack/release times
 * 4. Clamp gain within min/max limits
 * 5. Apply gain to samples
 */
class SimpleAGC {
public:
    struct Options {
        float target_level_db;  // Target output level in dBFS (e.g., -20.0)
        float max_gain_db;      // Maximum allowed gain in dB (e.g., 20.0)
        float min_gain_db;      // Minimum allowed gain in dB (e.g., -10.0)
        float attack_time_ms;   // Attack time in milliseconds (e.g., 10.0)
        float release_time_ms;  // Release time in milliseconds (e.g., 100.0)

        Options()
            : target_level_db(-20.0f),
              max_gain_db(20.0f),
              min_gain_db(-10.0f),
              attack_time_ms(10.0f),
              release_time_ms(100.0f) {}
    };

    struct Stats {
        bool enabled;
        float current_gain_db;   // Current gain being applied
        float average_level_db;  // Recent average input level
        float rms_linear;        // Current RMS value (linear scale)
        bool clipping;           // Whether clipping is detected
        uint64_t frames_processed;
    };

    SimpleAGC();
    ~SimpleAGC();

    /**
     * @brief Initialize AGC with sample rate
     * @param sample_rate Audio sample rate in Hz
     */
    void Initialize(int sample_rate);

    /**
     * @brief Set AGC options
     * @param options AGC configuration parameters
     */
    void SetOptions(const Options& options);

    /**
     * @brief Get current AGC options
     */
    const Options& GetOptions() const { return options_; }

    /**
     * @brief Enable or disable AGC processing
     * @param enabled True to enable, false to disable
     */
    void SetEnabled(bool enabled);

    /**
     * @brief Check if AGC is enabled
     */
    bool IsEnabled() const { return enabled_; }

    /**
     * @brief Process audio samples with AGC
     * @param samples Interleaved audio samples (modified in-place)
     * @param frame_count Number of frames (samples per channel)
     * @param channels Number of audio channels
     */
    void Process(float* samples, int frame_count, int channels);

    /**
     * @brief Get current AGC statistics
     */
    Stats GetStats() const;

    /**
     * @brief Reset AGC state
     */
    void Reset();

private:
    /**
     * @brief Compute RMS (Root Mean Square) of samples
     * @param samples Audio samples
     * @param count Total number of samples (frames * channels)
     * @return RMS value in linear scale
     */
    float ComputeRMS(const float* samples, int count);

    /**
     * @brief Convert linear scale to dB
     */
    float LinearToDb(float linear) const;

    /**
     * @brief Convert dB to linear scale
     */
    float DbToLinear(float db) const;

    /**
     * @brief Compute target gain in dB based on RMS
     * @param rms_db Current RMS level in dB
     * @return Target gain in dB
     */
    float ComputeTargetGain(float rms_db);

    /**
     * @brief Apply gain smoothing with attack/release
     * @param target_gain_db Target gain to reach
     * @return Smoothed gain in linear scale
     */
    float ApplyGainSmoothing(float target_gain_db);

    /**
     * @brief Detect if signal is clipping
     * @param samples Audio samples
     * @param count Total number of samples
     * @return True if clipping detected
     */
    bool DetectClipping(const float* samples, int count);

private:
    bool enabled_;
    Options options_;
    int sample_rate_;

    // State variables
    float current_gain_db_;      // Current gain in dB
    float current_gain_linear_;  // Current gain in linear scale
    float average_rms_db_;       // Exponential average of RMS
    bool clipping_detected_;

    // Smoothing coefficients (computed from attack/release times)
    float attack_coeff_;
    float release_coeff_;

    // Statistics
    uint64_t frames_processed_;
    float recent_rms_;

    // Constants
    static constexpr float kEpsilon = 1e-10f;  // Small value to avoid log(0)
    static constexpr float kClipThreshold = 0.99f;  // Clipping threshold
};

} // namespace wasapi_capture

#endif // AGC_PROCESSOR_H
