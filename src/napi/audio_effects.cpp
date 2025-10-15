// audio_effects.cpp - Audio Effects Processing Implementation
// v2.7.0: RNNoise Audio Denoising Support

#include "audio_effects.h"
#include <rnnoise.h>
#include <cstring>
#include <algorithm>
#include <stdexcept>

namespace AudioCapture {

DenoiseProcessor::DenoiseProcessor(int frame_size)
    : state_(nullptr)
    , frame_size_(frame_size)
    , processed_frames_(0)
    , last_vad_prob_(0.0f)
    , frame_buffer_pos_(0)
{
    // RNNoise only supports 480 samples per frame (10ms @ 48kHz)
    if (frame_size != 480) {
        throw std::invalid_argument("RNNoise only supports 480 samples per frame (10ms @ 48kHz)");
    }
    
    // Initialize RNNoise state with default model
    state_ = rnnoise_create(nullptr);
    if (!state_) {
        throw std::runtime_error("Failed to create RNNoise state");
    }
    
    // Allocate buffers
    temp_buffer_.resize(frame_size);
    frame_buffer_.resize(frame_size);
}

DenoiseProcessor::~DenoiseProcessor() {
    if (state_) {
        rnnoise_destroy(state_);
        state_ = nullptr;
    }
}

void DenoiseProcessor::Reset() {
    if (state_) {
        rnnoise_destroy(state_);
        state_ = rnnoise_create(nullptr);
    }
    processed_frames_ = 0;
    last_vad_prob_ = 0.0f;
    frame_buffer_pos_ = 0;
    std::fill(frame_buffer_.begin(), frame_buffer_.end(), 0.0f);
}

float DenoiseProcessor::ProcessFrame(float* frame, int size) {
    if (size != frame_size_) {
        char msg[128];
        snprintf(msg, sizeof(msg), "Frame size must be exactly %d samples", frame_size_);
        throw std::invalid_argument(msg);
    }
    
    if (!state_) {
        throw std::runtime_error("Denoise processor not initialized");
    }
    
    // Process frame with RNNoise
    // Note: rnnoise_process_frame() modifies the input buffer in-place
    // Returns Voice Activity Detection (VAD) probability
    last_vad_prob_ = rnnoise_process_frame(state_, frame, frame);
    processed_frames_++;
    
    return last_vad_prob_;
}

void DenoiseProcessor::ProcessBuffer(float* buffer, int size) {
    int offset = 0;
    
    // Process complete frames
    while (offset + frame_size_ <= size) {
        ProcessFrame(buffer + offset, frame_size_);
        offset += frame_size_;
    }
    
    // Handle remaining samples (if any)
    int remaining = size - offset;
    if (remaining > 0) {
        // Buffer incomplete frame for next call
        std::memcpy(frame_buffer_.data() + frame_buffer_pos_, 
                    buffer + offset, 
                    remaining * sizeof(float));
        frame_buffer_pos_ += remaining;
        
        // If we have a complete frame, process it
        if (frame_buffer_pos_ >= frame_size_) {
            ProcessFrame(frame_buffer_.data(), frame_size_);
            
            // Copy back to original buffer
            std::memcpy(buffer + offset, 
                        frame_buffer_.data(), 
                        remaining * sizeof(float));
            
            frame_buffer_pos_ = 0;
        }
    }
}

float DenoiseProcessor::ProcessFrame(int16_t* frame, int size) {
    if (size != frame_size_) {
        char msg[128];
        snprintf(msg, sizeof(msg), "Frame size must be exactly %d samples", frame_size_);
        throw std::invalid_argument(msg);
    }
    
    // Convert Int16 to Float32 (normalize to [-1, 1])
    for (int i = 0; i < size; i++) {
        temp_buffer_[i] = static_cast<float>(frame[i]) / 32768.0f;
    }
    
    // Process with RNNoise
    float vad = ProcessFrame(temp_buffer_.data(), size);
    
    // Convert back to Int16
    for (int i = 0; i < size; i++) {
        float sample = temp_buffer_[i] * 32768.0f;
        
        // Clamp to Int16 range
        if (sample > 32767.0f) {
            frame[i] = 32767;
        } else if (sample < -32768.0f) {
            frame[i] = -32768;
        } else {
            frame[i] = static_cast<int16_t>(sample);
        }
    }
    
    return vad;
}

void DenoiseProcessor::ProcessBuffer(int16_t* buffer, int size) {
    int offset = 0;
    
    // Process complete frames
    while (offset + frame_size_ <= size) {
        ProcessFrame(buffer + offset, frame_size_);
        offset += frame_size_;
    }
    
    // Handle remaining samples
    int remaining = size - offset;
    if (remaining > 0) {
        // Convert remaining samples to Float32
        for (int i = 0; i < remaining; i++) {
            frame_buffer_[frame_buffer_pos_ + i] = static_cast<float>(buffer[offset + i]) / 32768.0f;
        }
        frame_buffer_pos_ += remaining;
        
        // If we have a complete frame, process it
        if (frame_buffer_pos_ >= frame_size_) {
            ProcessFrame(frame_buffer_.data(), frame_size_);
            
            // Convert back to Int16
            for (int i = 0; i < remaining; i++) {
                float sample = frame_buffer_[i] * 32768.0f;
                if (sample > 32767.0f) {
                    buffer[offset + i] = 32767;
                } else if (sample < -32768.0f) {
                    buffer[offset + i] = -32768;
                } else {
                    buffer[offset + i] = static_cast<int16_t>(sample);
                }
            }
            
            frame_buffer_pos_ = 0;
        }
    }
}

} // namespace AudioCapture
