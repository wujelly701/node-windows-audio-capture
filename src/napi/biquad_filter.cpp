#include "biquad_filter.h"

namespace wasapi_capture {

BiquadFilter::BiquadFilter()
    : type_(Type::LowPass),
      sample_rate_(48000),
      freq_(1000.0f),
      q_(0.707f),
      gain_db_(0.0f),
      b0_(1.0f), b1_(0.0f), b2_(0.0f),
      a1_(0.0f), a2_(0.0f),
      x1_(0.0f), x2_(0.0f),
      y1_(0.0f), y2_(0.0f) {
}

BiquadFilter::~BiquadFilter() {
}

void BiquadFilter::Initialize(int sample_rate) {
    sample_rate_ = sample_rate;
    Reset();
    CalculateCoefficients();
}

void BiquadFilter::SetFilter(Type type, float freq, float q, float gain_db) {
    type_ = type;
    
    // Clamp parameters to valid ranges
    freq_ = std::max(kMinFreq, std::min(kMaxFreq, freq));
    q_ = std::max(kMinQ, std::min(kMaxQ, q));
    gain_db_ = gain_db;
    
    CalculateCoefficients();
}

float BiquadFilter::Process(float input) {
    // Direct Form II Transposed implementation
    // y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
    
    float output = b0_ * input + b1_ * x1_ + b2_ * x2_ - a1_ * y1_ - a2_ * y2_;
    
    // Update state
    x2_ = x1_;
    x1_ = input;
    y2_ = y1_;
    y1_ = output;
    
    return output;
}

void BiquadFilter::ProcessBuffer(float* samples, int count) {
    for (int i = 0; i < count; ++i) {
        samples[i] = Process(samples[i]);
    }
}

void BiquadFilter::Reset() {
    x1_ = x2_ = 0.0f;
    y1_ = y2_ = 0.0f;
}

void BiquadFilter::CalculateCoefficients() {
    switch (type_) {
        case Type::LowPass:
            CalculateLowPass();
            break;
        case Type::HighPass:
            CalculateHighPass();
            break;
        case Type::BandPass:
            CalculateBandPass();
            break;
        case Type::Notch:
            CalculateNotch();
            break;
        case Type::Peak:
            CalculatePeak();
            break;
        case Type::LowShelf:
            CalculateLowShelf();
            break;
        case Type::HighShelf:
            CalculateHighShelf();
            break;
    }
}

void BiquadFilter::CalculateLowPass() {
    // Low-pass filter using Q factor
    float omega = 2.0f * kPi * freq_ / sample_rate_;
    float sin_omega = std::sin(omega);
    float cos_omega = std::cos(omega);
    float alpha = sin_omega / (2.0f * q_);
    
    float a0 = 1.0f + alpha;
    b0_ = (1.0f - cos_omega) / (2.0f * a0);
    b1_ = (1.0f - cos_omega) / a0;
    b2_ = b0_;
    a1_ = (-2.0f * cos_omega) / a0;
    a2_ = (1.0f - alpha) / a0;
}

void BiquadFilter::CalculateHighPass() {
    // High-pass filter using Q factor
    float omega = 2.0f * kPi * freq_ / sample_rate_;
    float sin_omega = std::sin(omega);
    float cos_omega = std::cos(omega);
    float alpha = sin_omega / (2.0f * q_);
    
    float a0 = 1.0f + alpha;
    b0_ = (1.0f + cos_omega) / (2.0f * a0);
    b1_ = -(1.0f + cos_omega) / a0;
    b2_ = b0_;
    a1_ = (-2.0f * cos_omega) / a0;
    a2_ = (1.0f - alpha) / a0;
}

void BiquadFilter::CalculateBandPass() {
    // Band-pass filter (constant 0 dB peak gain)
    float omega = 2.0f * kPi * freq_ / sample_rate_;
    float sin_omega = std::sin(omega);
    float cos_omega = std::cos(omega);
    float alpha = sin_omega / (2.0f * q_);
    
    float a0 = 1.0f + alpha;
    b0_ = alpha / a0;
    b1_ = 0.0f;
    b2_ = -alpha / a0;
    a1_ = (-2.0f * cos_omega) / a0;
    a2_ = (1.0f - alpha) / a0;
}

void BiquadFilter::CalculateNotch() {
    // Notch (band-stop) filter
    float omega = 2.0f * kPi * freq_ / sample_rate_;
    float sin_omega = std::sin(omega);
    float cos_omega = std::cos(omega);
    float alpha = sin_omega / (2.0f * q_);
    
    float a0 = 1.0f + alpha;
    b0_ = 1.0f / a0;
    b1_ = (-2.0f * cos_omega) / a0;
    b2_ = 1.0f / a0;
    a1_ = (-2.0f * cos_omega) / a0;
    a2_ = (1.0f - alpha) / a0;
}

void BiquadFilter::CalculatePeak() {
    // Peaking EQ filter (parametric)
    float A = std::pow(10.0f, gain_db_ / 40.0f);  // sqrt of gain in linear
    float omega = 2.0f * kPi * freq_ / sample_rate_;
    float sin_omega = std::sin(omega);
    float cos_omega = std::cos(omega);
    float alpha = sin_omega / (2.0f * q_);
    
    float a0 = 1.0f + alpha / A;
    b0_ = (1.0f + alpha * A) / a0;
    b1_ = (-2.0f * cos_omega) / a0;
    b2_ = (1.0f - alpha * A) / a0;
    a1_ = (-2.0f * cos_omega) / a0;
    a2_ = (1.0f - alpha / A) / a0;
}

void BiquadFilter::CalculateLowShelf() {
    // Low shelf EQ filter
    float A = std::pow(10.0f, gain_db_ / 40.0f);
    float omega = 2.0f * kPi * freq_ / sample_rate_;
    float sin_omega = std::sin(omega);
    float cos_omega = std::cos(omega);
    float alpha = sin_omega / (2.0f * q_);
    float beta = std::sqrt(A) / q_;
    
    float a0 = (A + 1.0f) + (A - 1.0f) * cos_omega + beta * sin_omega;
    b0_ = (A * ((A + 1.0f) - (A - 1.0f) * cos_omega + beta * sin_omega)) / a0;
    b1_ = (2.0f * A * ((A - 1.0f) - (A + 1.0f) * cos_omega)) / a0;
    b2_ = (A * ((A + 1.0f) - (A - 1.0f) * cos_omega - beta * sin_omega)) / a0;
    a1_ = (-2.0f * ((A - 1.0f) + (A + 1.0f) * cos_omega)) / a0;
    a2_ = ((A + 1.0f) + (A - 1.0f) * cos_omega - beta * sin_omega) / a0;
}

void BiquadFilter::CalculateHighShelf() {
    // High shelf EQ filter
    float A = std::pow(10.0f, gain_db_ / 40.0f);
    float omega = 2.0f * kPi * freq_ / sample_rate_;
    float sin_omega = std::sin(omega);
    float cos_omega = std::cos(omega);
    float alpha = sin_omega / (2.0f * q_);
    float beta = std::sqrt(A) / q_;
    
    float a0 = (A + 1.0f) - (A - 1.0f) * cos_omega + beta * sin_omega;
    b0_ = (A * ((A + 1.0f) + (A - 1.0f) * cos_omega + beta * sin_omega)) / a0;
    b1_ = (-2.0f * A * ((A - 1.0f) + (A + 1.0f) * cos_omega)) / a0;
    b2_ = (A * ((A + 1.0f) + (A - 1.0f) * cos_omega - beta * sin_omega)) / a0;
    a1_ = (2.0f * ((A - 1.0f) - (A + 1.0f) * cos_omega)) / a0;
    a2_ = ((A + 1.0f) - (A - 1.0f) * cos_omega - beta * sin_omega) / a0;
}

} // namespace wasapi_capture
