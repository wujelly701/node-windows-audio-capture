#ifndef BIQUAD_FILTER_H
#define BIQUAD_FILTER_H

#include <cmath>
#include <algorithm>

namespace wasapi_capture {

/**
 * @brief Biquad IIR Filter
 * 
 * Implements a second-order IIR (Infinite Impulse Response) filter.
 * Commonly used for EQ (equalizer), high-pass, low-pass, band-pass filters.
 * 
 * Transfer function:
 * H(z) = (b0 + b1*z^-1 + b2*z^-2) / (a0 + a1*z^-1 + a2*z^-2)
 * 
 * Normalized form (a0 = 1):
 * y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
 */
class BiquadFilter {
public:
    /**
     * Filter types
     */
    enum class Type {
        LowPass,        // Low-pass filter
        HighPass,       // High-pass filter
        BandPass,       // Band-pass filter
        Notch,          // Notch (band-stop) filter
        Peak,           // Peaking (parametric) EQ
        LowShelf,       // Low shelf EQ
        HighShelf       // High shelf EQ
    };

    BiquadFilter();
    ~BiquadFilter();

    /**
     * @brief Initialize filter with sample rate
     * @param sample_rate Audio sample rate in Hz
     */
    void Initialize(int sample_rate);

    /**
     * @brief Set filter type and parameters
     * @param type Filter type
     * @param freq Center/cutoff frequency in Hz
     * @param q Q factor (bandwidth)
     * @param gain_db Gain in dB (for peaking and shelf filters)
     */
    void SetFilter(Type type, float freq, float q, float gain_db = 0.0f);

    /**
     * @brief Process a single audio sample
     * @param input Input sample
     * @return Filtered output sample
     */
    float Process(float input);

    /**
     * @brief Process an audio buffer
     * @param samples Audio samples (modified in-place)
     * @param count Number of samples
     */
    void ProcessBuffer(float* samples, int count);

    /**
     * @brief Reset filter state (clear history)
     */
    void Reset();

    /**
     * @brief Get current filter type
     */
    Type GetType() const { return type_; }

    /**
     * @brief Get center frequency
     */
    float GetFrequency() const { return freq_; }

    /**
     * @brief Get Q factor
     */
    float GetQ() const { return q_; }

    /**
     * @brief Get gain (for peaking/shelf filters)
     */
    float GetGain() const { return gain_db_; }

private:
    /**
     * @brief Calculate filter coefficients based on type and parameters
     */
    void CalculateCoefficients();

    /**
     * @brief Calculate coefficients for low-pass filter
     */
    void CalculateLowPass();

    /**
     * @brief Calculate coefficients for high-pass filter
     */
    void CalculateHighPass();

    /**
     * @brief Calculate coefficients for band-pass filter
     */
    void CalculateBandPass();

    /**
     * @brief Calculate coefficients for notch filter
     */
    void CalculateNotch();

    /**
     * @brief Calculate coefficients for peaking EQ
     */
    void CalculatePeak();

    /**
     * @brief Calculate coefficients for low shelf EQ
     */
    void CalculateLowShelf();

    /**
     * @brief Calculate coefficients for high shelf EQ
     */
    void CalculateHighShelf();

private:
    // Filter configuration
    Type type_;
    int sample_rate_;
    float freq_;        // Center/cutoff frequency (Hz)
    float q_;           // Q factor
    float gain_db_;     // Gain (dB)

    // Biquad coefficients (normalized, a0 = 1)
    float b0_, b1_, b2_;  // Numerator coefficients
    float a1_, a2_;       // Denominator coefficients (a0 omitted)

    // Filter state (history)
    float x1_, x2_;  // Input history: x[n-1], x[n-2]
    float y1_, y2_;  // Output history: y[n-1], y[n-2]

    // Constants
    static constexpr float kPi = 3.14159265358979323846f;
    static constexpr float kMinFreq = 20.0f;    // Minimum frequency (Hz)
    static constexpr float kMaxFreq = 20000.0f; // Maximum frequency (Hz)
    static constexpr float kMinQ = 0.1f;        // Minimum Q factor
    static constexpr float kMaxQ = 20.0f;       // Maximum Q factor
};

} // namespace wasapi_capture

#endif // BIQUAD_FILTER_H
