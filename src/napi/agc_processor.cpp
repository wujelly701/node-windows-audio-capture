#include "agc_processor.h"
#include <cstring>

namespace wasapi_capture {

SimpleAGC::SimpleAGC()
    : enabled_(false),
      sample_rate_(48000),
      current_gain_db_(0.0f),
      current_gain_linear_(1.0f),
      average_rms_db_(-60.0f),
      clipping_detected_(false),
      attack_coeff_(0.0f),
      release_coeff_(0.0f),
      frames_processed_(0),
      recent_rms_(0.0f) {
}

SimpleAGC::~SimpleAGC() {
}

void SimpleAGC::Initialize(int sample_rate) {
    sample_rate_ = sample_rate;
    
    // Compute smoothing coefficients based on attack/release times
    // Coefficient formula: 1 - exp(-1 / (time_ms * sample_rate / 1000))
    float attack_samples = options_.attack_time_ms * sample_rate_ / 1000.0f;
    float release_samples = options_.release_time_ms * sample_rate_ / 1000.0f;
    
    attack_coeff_ = 1.0f - std::exp(-1.0f / attack_samples);
    release_coeff_ = 1.0f - std::exp(-1.0f / release_samples);
    
    Reset();
}

void SimpleAGC::SetOptions(const Options& options) {
    options_ = options;
    
    // Recompute smoothing coefficients
    if (sample_rate_ > 0) {
        float attack_samples = options_.attack_time_ms * sample_rate_ / 1000.0f;
        float release_samples = options_.release_time_ms * sample_rate_ / 1000.0f;
        
        attack_coeff_ = 1.0f - std::exp(-1.0f / attack_samples);
        release_coeff_ = 1.0f - std::exp(-1.0f / release_samples);
    }
}

void SimpleAGC::SetEnabled(bool enabled) {
    enabled_ = enabled;
    if (!enabled_) {
        // Reset gain when disabling
        current_gain_db_ = 0.0f;
        current_gain_linear_ = 1.0f;
    }
}

void SimpleAGC::Process(float* samples, int frame_count, int channels) {
    if (!enabled_ || frame_count <= 0 || channels <= 0) {
        return;
    }

    int total_samples = frame_count * channels;

    // Step 1: Compute RMS of input signal
    float rms = ComputeRMS(samples, total_samples);
    recent_rms_ = rms;

    // Step 2: Convert RMS to dB
    float rms_db = LinearToDb(rms);

    // Step 3: Update exponential average of RMS
    const float kAvgCoeff = 0.1f;  // Smoothing for average level
    average_rms_db_ = average_rms_db_ * (1.0f - kAvgCoeff) + rms_db * kAvgCoeff;

    // Step 4: Compute target gain
    float target_gain_db = ComputeTargetGain(rms_db);

    // Step 5: Apply gain smoothing
    float gain_linear = ApplyGainSmoothing(target_gain_db);

    // Step 6: Apply gain to samples
    for (int i = 0; i < total_samples; ++i) {
        samples[i] *= gain_linear;
    }

    // Step 7: Detect clipping
    clipping_detected_ = DetectClipping(samples, total_samples);

    // Step 8: Update statistics
    frames_processed_ += frame_count;
}

SimpleAGC::Stats SimpleAGC::GetStats() const {
    Stats stats;
    stats.enabled = enabled_;
    stats.current_gain_db = current_gain_db_;
    stats.average_level_db = average_rms_db_;
    stats.rms_linear = recent_rms_;
    stats.clipping = clipping_detected_;
    stats.frames_processed = frames_processed_;
    return stats;
}

void SimpleAGC::Reset() {
    current_gain_db_ = 0.0f;
    current_gain_linear_ = 1.0f;
    average_rms_db_ = -60.0f;
    clipping_detected_ = false;
    frames_processed_ = 0;
    recent_rms_ = 0.0f;
}

float SimpleAGC::ComputeRMS(const float* samples, int count) {
    if (count <= 0) {
        return 0.0f;
    }

    double sum_squares = 0.0;
    for (int i = 0; i < count; ++i) {
        float sample = samples[i];
        sum_squares += sample * sample;
    }

    return static_cast<float>(std::sqrt(sum_squares / count));
}

float SimpleAGC::LinearToDb(float linear) const {
    if (linear < kEpsilon) {
        return -60.0f;  // Floor at -60 dB
    }
    return 20.0f * std::log10(linear);
}

float SimpleAGC::DbToLinear(float db) const {
    return std::pow(10.0f, db / 20.0f);
}

float SimpleAGC::ComputeTargetGain(float rms_db) {
    // If signal is too quiet, don't apply gain
    if (rms_db < -60.0f) {
        return 0.0f;
    }

    // Compute required gain to reach target level
    float gain_db = options_.target_level_db - rms_db;

    // Clamp gain within limits
    gain_db = std::max(options_.min_gain_db, std::min(options_.max_gain_db, gain_db));

    return gain_db;
}

float SimpleAGC::ApplyGainSmoothing(float target_gain_db) {
    // Apply attack/release smoothing
    float diff = target_gain_db - current_gain_db_;
    
    float coeff;
    if (diff > 0.0f) {
        // Signal is getting quieter, need to increase gain (use attack time)
        coeff = attack_coeff_;
    } else {
        // Signal is getting louder, need to decrease gain (use release time)
        coeff = release_coeff_;
    }

    // Exponential smoothing
    current_gain_db_ += diff * coeff;

    // Convert to linear scale
    current_gain_linear_ = DbToLinear(current_gain_db_);

    return current_gain_linear_;
}

bool SimpleAGC::DetectClipping(const float* samples, int count) {
    for (int i = 0; i < count; ++i) {
        if (std::abs(samples[i]) >= kClipThreshold) {
            return true;
        }
    }
    return false;
}

} // namespace wasapi_capture
