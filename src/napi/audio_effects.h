// audio_effects.h - Audio Effects Processing
// v2.7.0: RNNoise Audio Denoising Support

#pragma once

#include <memory>
#include <vector>
#include <cstdint>

// Forward declare RNNoise type
typedef struct DenoiseState DenoiseState;

namespace AudioCapture {

/**
 * @brief Audio Denoise Processor using RNNoise
 * 
 * RNNoise expects 48kHz mono audio in 10ms frames (480 samples).
 * This class handles frame buffering and processing.
 */
class DenoiseProcessor {
public:
    /**
     * @brief Construct a new Denoise Processor
     * @param frame_size Number of samples per frame (must be 480 for RNNoise)
     */
    explicit DenoiseProcessor(int frame_size = 480);
    
    /**
     * @brief Destroy the Denoise Processor
     */
    ~DenoiseProcessor();
    
    // Disable copy
    DenoiseProcessor(const DenoiseProcessor&) = delete;
    DenoiseProcessor& operator=(const DenoiseProcessor&) = delete;
    
    /**
     * @brief Process a single frame of Float32 audio
     * @param frame Pointer to audio data (must be exactly frame_size samples)
     * @param size Number of samples (must equal frame_size)
     * @return Voice Activity Detection probability (0.0 - 1.0)
     */
    float ProcessFrame(float* frame, int size);
    
    /**
     * @brief Process a buffer of Float32 audio (multiple frames)
     * @param buffer Pointer to audio data
     * @param size Number of samples
     * @note If size is not a multiple of frame_size, remaining samples are buffered
     */
    void ProcessBuffer(float* buffer, int size);
    
    /**
     * @brief Process a single frame of Int16 audio
     * @param frame Pointer to audio data
     * @param size Number of samples
     * @return Voice Activity Detection probability (0.0 - 1.0)
     */
    float ProcessFrame(int16_t* frame, int size);
    
    /**
     * @brief Process a buffer of Int16 audio (multiple frames)
     * @param buffer Pointer to audio data
     * @param size Number of samples
     */
    void ProcessBuffer(int16_t* buffer, int size);
    
    /**
     * @brief Get the last Voice Activity Detection probability
     * @return float Probability that last frame contained voice (0.0 - 1.0)
     */
    float GetLastVoiceProbability() const { return last_vad_prob_; }
    
    /**
     * @brief Get the total number of frames processed
     * @return int Frame count
     */
    int GetProcessedFrames() const { return processed_frames_; }
    
    /**
     * @brief Get the configured frame size
     * @return int Frame size in samples
     */
    int GetFrameSize() const { return frame_size_; }
    
    /**
     * @brief Reset the processor state
     */
    void Reset();

private:
    DenoiseState* state_;           // RNNoise state
    int frame_size_;                // Samples per frame (480)
    int processed_frames_;          // Total frames processed
    float last_vad_prob_;           // Last VAD probability
    
    std::vector<float> temp_buffer_; // Temporary buffer for Int16 conversion
    std::vector<float> frame_buffer_; // Buffer for incomplete frames
    int frame_buffer_pos_;          // Current position in frame buffer
};

} // namespace AudioCapture
