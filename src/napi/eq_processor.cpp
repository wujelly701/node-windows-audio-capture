#include "eq_processor.h"
#include <algorithm>
#include <cmath>

namespace wasapi_capture {

ThreeBandEQ::ThreeBandEQ()
    : enabled_(false),
      sample_rate_(48000),
      frames_processed_(0) {
    // Initialize stereo filters
    for (int i = 0; i < 2; ++i) {
        low_filter_[i] = std::make_unique<BiquadFilter>();
        mid_filter_[i] = std::make_unique<BiquadFilter>();
        high_filter_[i] = std::make_unique<BiquadFilter>();
    }
}

ThreeBandEQ::~ThreeBandEQ() = default;

void ThreeBandEQ::Initialize(int sample_rate) {
    sample_rate_ = sample_rate;

    // Initialize all filters with sample rate
    for (int i = 0; i < 2; ++i) {
        low_filter_[i]->Initialize(sample_rate);
        mid_filter_[i]->Initialize(sample_rate);
        high_filter_[i]->Initialize(sample_rate);
    }

    UpdateFilters();
}

void ThreeBandEQ::SetOptions(const Options& options) {
    options_ = options;

    // Clamp gains to valid range
    options_.low_gain_db = std::clamp(options_.low_gain_db, kMinGain, kMaxGain);
    options_.mid_gain_db = std::clamp(options_.mid_gain_db, kMinGain, kMaxGain);
    options_.high_gain_db = std::clamp(options_.high_gain_db, kMinGain, kMaxGain);

    // Clamp frequencies to valid ranges
    options_.low_freq = std::clamp(options_.low_freq, 20.0f, 500.0f);
    options_.mid_freq = std::clamp(options_.mid_freq, 500.0f, 4000.0f);
    options_.high_freq = std::clamp(options_.high_freq, 4000.0f, 20000.0f);

    // Clamp mid Q factor
    options_.mid_q = std::clamp(options_.mid_q, 0.5f, 5.0f);

    UpdateFilters();
}

void ThreeBandEQ::SetEnabled(bool enabled) {
    if (enabled_ != enabled) {
        enabled_ = enabled;
        if (!enabled_) {
            // Reset state when disabled
            Reset();
        }
    }
}

void ThreeBandEQ::SetBandGain(Band band, float gain_db) {
    // Clamp gain to valid range
    gain_db = std::clamp(gain_db, kMinGain, kMaxGain);

    // Update corresponding gain
    switch (band) {
        case Band::Low:
            options_.low_gain_db = gain_db;
            break;
        case Band::Mid:
            options_.mid_gain_db = gain_db;
            break;
        case Band::High:
            options_.high_gain_db = gain_db;
            break;
    }

    UpdateFilters();
}

float ThreeBandEQ::GetBandGain(Band band) const {
    switch (band) {
        case Band::Low:
            return options_.low_gain_db;
        case Band::Mid:
            return options_.mid_gain_db;
        case Band::High:
            return options_.high_gain_db;
        default:
            return 0.0f;
    }
}

void ThreeBandEQ::Process(float* samples, int frame_count, int channels) {
    if (!enabled_ || frame_count <= 0 || channels <= 0) {
        return;
    }

    // Ensure we have stereo channels (or mono duplicated)
    int process_channels = std::min(channels, 2);

    // Process each frame
    for (int frame = 0; frame < frame_count; ++frame) {
        for (int ch = 0; ch < process_channels; ++ch) {
            int index = frame * channels + ch;
            float sample = samples[index];

            // Apply 3-band EQ in series
            // Order: Low shelf -> Mid bell -> High shelf
            sample = low_filter_[ch]->Process(sample);
            sample = mid_filter_[ch]->Process(sample);
            sample = high_filter_[ch]->Process(sample);

            samples[index] = sample;
        }

        // If mono, copy to other channels
        if (channels > process_channels) {
            for (int ch = process_channels; ch < channels; ++ch) {
                samples[frame * channels + ch] = samples[frame * channels + 0];
            }
        }
    }

    frames_processed_ += frame_count;
}

ThreeBandEQ::Stats ThreeBandEQ::GetStats() const {
    Stats stats;
    stats.enabled = enabled_;
    stats.low_gain_db = options_.low_gain_db;
    stats.mid_gain_db = options_.mid_gain_db;
    stats.high_gain_db = options_.high_gain_db;
    stats.frames_processed = frames_processed_;
    return stats;
}

void ThreeBandEQ::Reset() {
    frames_processed_ = 0;

    // Reset all filters
    for (int i = 0; i < 2; ++i) {
        low_filter_[i]->Reset();
        mid_filter_[i]->Reset();
        high_filter_[i]->Reset();
    }
}

void ThreeBandEQ::UpdateFilters() {
    // Update low shelf filter (LowShelf)
    // Default Q = 0.707 (Butterworth)
    for (int i = 0; i < 2; ++i) {
        low_filter_[i]->SetFilter(
            BiquadFilter::Type::LowShelf,
            options_.low_freq,
            0.707f,  // Standard Q for shelf filters
            options_.low_gain_db
        );
    }

    // Update mid parametric filter (Peak)
    for (int i = 0; i < 2; ++i) {
        mid_filter_[i]->SetFilter(
            BiquadFilter::Type::Peak,
            options_.mid_freq,
            options_.mid_q,
            options_.mid_gain_db
        );
    }

    // Update high shelf filter (HighShelf)
    for (int i = 0; i < 2; ++i) {
        high_filter_[i]->SetFilter(
            BiquadFilter::Type::HighShelf,
            options_.high_freq,
            0.707f,  // Standard Q for shelf filters
            options_.high_gain_db
        );
    }
}

} // namespace wasapi_capture
