#ifndef EQ_PROCESSOR_H
#define EQ_PROCESSOR_H

#include "biquad_filter.h"
#include <memory>

namespace wasapi_capture {

/**
 * @brief 3-Band Equalizer Processor
 * 
 * Implements a 3-band parametric equalizer:
 * - Low band: Low shelf filter (< 500 Hz)
 * - Mid band: Parametric (bell) filter (500-4000 Hz)
 * - High band: High shelf filter (> 4000 Hz)
 * 
 * Each band has adjustable gain (-20 to +20 dB).
 * Suitable for voice enhancement, music EQ, and general audio processing.
 */
class ThreeBandEQ {
public:
    /**
     * EQ band identifiers
     */
    enum class Band {
        Low,   // Low frequencies (< 500 Hz)
        Mid,   // Mid frequencies (500-4000 Hz)
        High   // High frequencies (> 4000 Hz)
    };

    /**
     * EQ configuration options
     */
    struct Options {
        float low_gain_db;      // Low band gain (-20 to +20 dB)
        float mid_gain_db;      // Mid band gain (-20 to +20 dB)
        float high_gain_db;     // High band gain (-20 to +20 dB)
        float low_freq;         // Low shelf frequency (20-500 Hz)
        float mid_freq;         // Mid peak frequency (500-4000 Hz)
        float high_freq;        // High shelf frequency (4000-20000 Hz)
        float mid_q;            // Mid band Q factor (0.5-5.0)

        Options()
            : low_gain_db(0.0f),
              mid_gain_db(0.0f),
              high_gain_db(0.0f),
              low_freq(200.0f),
              mid_freq(1000.0f),
              high_freq(8000.0f),
              mid_q(1.0f) {}
    };

    /**
     * EQ statistics
     */
    struct Stats {
        bool enabled;
        float low_gain_db;
        float mid_gain_db;
        float high_gain_db;
        uint64_t frames_processed;
    };

    ThreeBandEQ();
    ~ThreeBandEQ();

    /**
     * @brief Initialize EQ with sample rate
     * @param sample_rate Audio sample rate in Hz
     */
    void Initialize(int sample_rate);

    /**
     * @brief Set EQ options
     * @param options EQ configuration parameters
     */
    void SetOptions(const Options& options);

    /**
     * @brief Get current EQ options
     */
    const Options& GetOptions() const { return options_; }

    /**
     * @brief Enable or disable EQ processing
     * @param enabled True to enable, false to disable
     */
    void SetEnabled(bool enabled);

    /**
     * @brief Check if EQ is enabled
     */
    bool IsEnabled() const { return enabled_; }

    /**
     * @brief Set gain for a specific band
     * @param band Band identifier
     * @param gain_db Gain in dB (-20 to +20)
     */
    void SetBandGain(Band band, float gain_db);

    /**
     * @brief Get gain for a specific band
     * @param band Band identifier
     * @return Gain in dB
     */
    float GetBandGain(Band band) const;

    /**
     * @brief Process audio samples with EQ
     * @param samples Interleaved audio samples (modified in-place)
     * @param frame_count Number of frames (samples per channel)
     * @param channels Number of audio channels
     */
    void Process(float* samples, int frame_count, int channels);

    /**
     * @brief Get current EQ statistics
     */
    Stats GetStats() const;

    /**
     * @brief Reset EQ state
     */
    void Reset();

private:
    /**
     * @brief Update filter parameters based on options
     */
    void UpdateFilters();

private:
    bool enabled_;
    Options options_;
    int sample_rate_;
    uint64_t frames_processed_;

    // Biquad filters for each band (stereo)
    std::unique_ptr<BiquadFilter> low_filter_[2];   // Low shelf
    std::unique_ptr<BiquadFilter> mid_filter_[2];   // Parametric
    std::unique_ptr<BiquadFilter> high_filter_[2];  // High shelf

    // Constants
    static constexpr float kMinGain = -20.0f;  // Minimum gain (dB)
    static constexpr float kMaxGain = 20.0f;   // Maximum gain (dB)
};

} // namespace wasapi_capture

#endif // EQ_PROCESSOR_H
