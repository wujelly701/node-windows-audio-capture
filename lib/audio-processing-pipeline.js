/**
 * AudioProcessingPipeline - Comprehensive audio format conversion pipeline
 * 
 * Combines multiple audio processing steps:
 * 1. Format conversion (Float32 ↔ Int16)
 * 2. Channel conversion (Stereo → Mono)
 * 3. Sample rate conversion (48kHz → 16kHz, etc.)
 * 4. WAV encoding (optional)
 * 
 * Provides ASR-optimized presets for:
 * - Chinese ASR services (Baidu, Tencent, Xunfei, Aliyun)
 * - OpenAI Whisper
 * - Global ASR services (Azure, Google, AWS)
 * 
 * @module lib/audio-processing-pipeline
 */

const AudioFormatConverter = require('../utils/AudioFormatConverter');
const AudioResampler = require('./audio-resampler');
const WavEncoder = require('./wav-encoder');
const BufferPool = require('./buffer-pool');

/**
 * ASR preset configurations
 */
const ASR_PRESETS = {
  // Raw format (no conversion, original WASAPI output)
  'raw': {
    description: 'Original WASAPI output (Float32, 48kHz, Stereo)',
    sampleRate: null, // No change
    channels: null,   // No change
    bitDepth: null,   // No change
    format: 'float32',
    outputFormat: 'pcm',
    enabled: false
  },
  
  // Chinese ASR services (Baidu, Tencent, Xunfei, Aliyun)
  'china-asr': {
    description: 'Optimized for Chinese ASR services (Int16, 16kHz, Mono)',
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16',
    outputFormat: 'pcm',
    resamplingQuality: 'linear',
    enabled: true
  },
  
  // OpenAI Whisper API
  'openai-whisper': {
    description: 'Optimized for OpenAI Whisper (WAV, Int16, 16kHz, Mono)',
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16',
    outputFormat: 'wav',
    resamplingQuality: 'linear',
    enabled: true
  },
  
  // Global ASR (48kHz support)
  'global-asr-48k': {
    description: 'Optimized for global ASR services (Int16, 48kHz, Mono)',
    sampleRate: 48000,
    channels: 1,
    bitDepth: 16,
    format: 'int16',
    outputFormat: 'pcm',
    resamplingQuality: null, // No resampling
    enabled: true
  },
  
  // Azure Speech Service
  'azure': {
    description: 'Optimized for Azure Speech Service (Int16, 16kHz, Mono)',
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16',
    outputFormat: 'pcm',
    resamplingQuality: 'linear',
    enabled: true
  },
  
  // Google Cloud Speech-to-Text
  'google': {
    description: 'Optimized for Google Cloud STT (Int16, 16kHz, Mono)',
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16',
    outputFormat: 'pcm',
    resamplingQuality: 'linear',
    enabled: true
  }
};

class AudioProcessingPipeline {
  /**
   * Create an AudioProcessingPipeline instance
   * 
   * @param {Object|string} options - Pipeline configuration or preset name
   * @param {number} [options.inputSampleRate=48000] - Input sample rate
   * @param {number} [options.inputChannels=2] - Input channels
   * @param {string} [options.inputFormat='float32'] - Input format
   * @param {number} [options.outputSampleRate] - Output sample rate (null = no change)
   * @param {number} [options.outputChannels] - Output channels (null = no change)
   * @param {string} [options.outputFormat] - Output format ('pcm'|'wav')
   * @param {string} [options.resamplingQuality='linear'] - Resampling quality
   */
  constructor(options = {}) {
    // Handle preset names
    if (typeof options === 'string') {
      const preset = ASR_PRESETS[options];
      if (!preset) {
        throw new Error(`Unknown preset: ${options}. Available: ${Object.keys(ASR_PRESETS).join(', ')}`);
      }
      options = this._applyPreset(preset);
    }
    
    // Input configuration
    this.inputSampleRate = options.inputSampleRate || 48000;
    this.inputChannels = options.inputChannels || 2;
    this.inputFormat = options.inputFormat || 'float32';
    
    // Output configuration
    this.outputSampleRate = options.outputSampleRate || this.inputSampleRate;
    this.outputChannels = options.outputChannels || this.inputChannels;
    this.outputBitDepth = options.outputBitDepth || 16;
    this.outputFormatType = options.outputFormat || 'pcm';
    this.resamplingQuality = options.resamplingQuality || 'linear';
    
    // Determine output audio format
    this.outputAudioFormat = this.outputBitDepth === 16 ? 'int16' : 'float32';
    
    // Initialize processing components
    this._initializeComponents();
    
    // Initialize BufferPool (singleton, shared)
    this.bufferPool = BufferPool.default;
    
    // Statistics
    this.stats = {
      totalInputBytes: 0,
      totalOutputBytes: 0,
      totalProcessingTime: 0,
      chunksProcessed: 0
    };
  }
  
  /**
   * Apply preset configuration
   * @private
   */
  _applyPreset(preset) {
    return {
      inputSampleRate: 48000,
      inputChannels: 2,
      inputFormat: 'float32',
      outputSampleRate: preset.sampleRate || 48000,
      outputChannels: preset.channels || 2,
      outputBitDepth: preset.bitDepth || 32,
      outputFormat: preset.outputFormat || 'pcm',
      resamplingQuality: preset.resamplingQuality || 'linear'
    };
  }
  
  /**
   * Initialize processing components
   * @private
   */
  _initializeComponents() {
    // 1. Format + Channel converter
    const needsFormatConversion = this.inputFormat !== this.outputAudioFormat ||
                                   this.inputChannels !== this.outputChannels;
    
    if (needsFormatConversion) {
      this.formatConverter = new AudioFormatConverter({
        inputChannels: this.inputChannels,
        outputChannels: this.outputChannels,
        inputFormat: this.inputFormat,
        outputFormat: this.outputAudioFormat
      });
    }
    
    // 2. Resampler
    const needsResampling = this.inputSampleRate !== this.outputSampleRate;
    
    if (needsResampling) {
      this.resampler = new AudioResampler({
        inputSampleRate: this.inputSampleRate,
        outputSampleRate: this.outputSampleRate,
        channels: this.outputChannels, // After channel conversion
        quality: this.resamplingQuality,
        inputFormat: this.outputAudioFormat,
        outputFormat: this.outputAudioFormat
      });
    }
    
    // 3. WAV encoder
    if (this.outputFormatType === 'wav') {
      this.wavEncoder = new WavEncoder({
        sampleRate: this.outputSampleRate,
        channels: this.outputChannels,
        bitDepth: this.outputBitDepth,
        format: this.outputAudioFormat
      });
    }
  }
  
  /**
   * Process audio data through the pipeline
   * 
   * @param {Buffer} inputBuffer - Input audio data
   * @returns {Buffer} Processed audio data
   */
  process(inputBuffer) {
    const startTime = Date.now();
    let buffer = inputBuffer;
    
    try {
      // Step 1: Format + Channel conversion
      if (this.formatConverter) {
        buffer = this.formatConverter.convert(buffer);
      }
      
      // Step 2: Resampling
      if (this.resampler) {
        buffer = this.resampler.resample(buffer);
      }
      
      // Step 3: WAV encoding
      if (this.wavEncoder) {
        // For streaming, accumulate chunks
        this.wavEncoder.addChunk(buffer);
      }
      
      // Update statistics
      this.stats.totalInputBytes += inputBuffer.length;
      this.stats.totalOutputBytes += buffer.length;
      this.stats.totalProcessingTime += Date.now() - startTime;
      this.stats.chunksProcessed++;
      
      return buffer;
    } catch (error) {
      throw new Error(`Pipeline processing failed: ${error.message}`);
    }
  }
  
  /**
   * Release buffer back to pool after use
   * Call this method when you're done with a buffer returned by process()
   * 
   * @param {Buffer} buffer - Buffer to release
   * @example
   * const output = pipeline.process(inputBuffer);
   * // ... use output buffer ...
   * pipeline.releaseBuffer(output);
   */
  releaseBuffer(buffer) {
    // Release from resampler if available
    if (this.resampler && buffer) {
      this.resampler.releaseBuffer(buffer);
    }
  }
  
  /**
   * Finalize WAV encoding (for streaming mode)
   * 
   * @returns {Buffer|null} Complete WAV file or null if not using WAV output
   */
  finalize() {
    if (this.wavEncoder) {
      return this.wavEncoder.finalize();
    }
    return null;
  }
  
  /**
   * Get pipeline statistics
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    const sizeReduction = this.stats.totalInputBytes > 0
      ? ((1 - this.stats.totalOutputBytes / this.stats.totalInputBytes) * 100).toFixed(1)
      : 0;
    
    const averageProcessingTime = this.stats.chunksProcessed > 0
      ? (this.stats.totalProcessingTime / this.stats.chunksProcessed).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      sizeReduction: `${sizeReduction}%`,
      averageProcessingTime: `${averageProcessingTime} ms/chunk`,
      compressionRatio: this.stats.totalInputBytes > 0
        ? (this.stats.totalInputBytes / this.stats.totalOutputBytes).toFixed(2) + ':1'
        : 'N/A'
    };
  }
  
  /**
   * Get pipeline configuration info
   * 
   * @returns {Object} Configuration object
   */
  getInfo() {
    const steps = [];
    
    if (this.formatConverter) {
      steps.push(`Format: ${this.inputFormat} → ${this.outputAudioFormat}`);
    }
    if (this.inputChannels !== this.outputChannels) {
      steps.push(`Channels: ${this.inputChannels} → ${this.outputChannels}`);
    }
    if (this.resampler) {
      steps.push(`Sample Rate: ${this.inputSampleRate}Hz → ${this.outputSampleRate}Hz`);
    }
    if (this.wavEncoder) {
      steps.push(`Output: WAV file`);
    }
    
    return {
      input: {
        sampleRate: this.inputSampleRate,
        channels: this.inputChannels,
        format: this.inputFormat
      },
      output: {
        sampleRate: this.outputSampleRate,
        channels: this.outputChannels,
        bitDepth: this.outputBitDepth,
        format: this.outputAudioFormat,
        outputType: this.outputFormatType
      },
      processingSteps: steps,
      resamplingQuality: this.resampler ? this.resamplingQuality : 'N/A'
    };
  }
  
  /**
   * Get available ASR presets
   * 
   * @returns {Object} Preset configurations
   */
  static getPresets() {
    return ASR_PRESETS;
  }
  
  /**
   * List available preset names
   * 
   * @returns {Array<string>} Preset names
   */
  static listPresets() {
    return Object.keys(ASR_PRESETS);
  }
  
  /**
   * Get preset description
   * 
   * @param {string} presetName - Preset name
   * @returns {string} Description
   */
  static getPresetDescription(presetName) {
    const preset = ASR_PRESETS[presetName];
    return preset ? preset.description : 'Unknown preset';
  }
}

module.exports = AudioProcessingPipeline;

// ============================================================================
// Example usage
// ============================================================================

if (require.main === module) {
  console.log('='.repeat(80));
  console.log('AudioProcessingPipeline Example - Complete ASR Processing');
  console.log('='.repeat(80));
  
  // List available presets
  console.log('\n📋 Available ASR Presets:');
  console.log('─'.repeat(80));
  
  AudioProcessingPipeline.listPresets().forEach(name => {
    const description = AudioProcessingPipeline.getPresetDescription(name);
    console.log(`  • ${name.padEnd(20)} - ${description}`);
  });
  
  // Test 1: China ASR preset
  console.log('\n📝 Test 1: China ASR Preset (48kHz Stereo → 16kHz Mono)');
  console.log('─'.repeat(80));
  
  const chinaPipeline = new AudioProcessingPipeline('china-asr');
  const info1 = chinaPipeline.getInfo();
  
  console.log('Input Configuration:');
  console.log(`  Sample Rate: ${info1.input.sampleRate} Hz`);
  console.log(`  Channels: ${info1.input.channels}`);
  console.log(`  Format: ${info1.input.format}`);
  
  console.log('\nOutput Configuration:');
  console.log(`  Sample Rate: ${info1.output.sampleRate} Hz`);
  console.log(`  Channels: ${info1.output.channels}`);
  console.log(`  Bit Depth: ${info1.output.bitDepth}`);
  console.log(`  Format: ${info1.output.format}`);
  console.log(`  Output Type: ${info1.output.outputType}`);
  
  console.log('\nProcessing Steps:');
  info1.processingSteps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
  
  // Generate test data (1 second of audio)
  const inputSamples = 48000;
  const bufferSize = inputSamples * 2 * 4; // Stereo Float32
  const inputBuffer = BufferPool.default.acquire(bufferSize);
  
  for (let i = 0; i < inputSamples; i++) {
    const value = Math.sin(2 * Math.PI * 440 * i / 48000);
    inputBuffer.writeFloatLE(value, i * 8);     // Left
    inputBuffer.writeFloatLE(value * 0.8, i * 8 + 4); // Right
  }
  
  console.log('\nProcessing audio...');
  const startTime = Date.now();
  const outputBuffer = chinaPipeline.process(inputBuffer);
  const processingTime = Date.now() - startTime;
  
  // Release buffers back to pool
  BufferPool.default.release(inputBuffer);
  chinaPipeline.releaseBuffer(outputBuffer);
  
  console.log('\nResults:');
  console.log(`  Input Size: ${inputBuffer.length} bytes`);
  console.log(`  Output Size: ${outputBuffer.length} bytes`);
  console.log(`  Size Reduction: ${((1 - outputBuffer.length / inputBuffer.length) * 100).toFixed(1)}%`);
  console.log(`  Processing Time: ${processingTime} ms`);
  
  const stats1 = chinaPipeline.getStats();
  console.log(`\nStatistics:`);
  console.log(`  Chunks Processed: ${stats1.chunksProcessed}`);
  console.log(`  Compression Ratio: ${stats1.compressionRatio}`);
  console.log(`  Average Processing Time: ${stats1.averageProcessingTime}`);
  
  // Test 2: OpenAI Whisper preset
  console.log('\n📝 Test 2: OpenAI Whisper Preset (with WAV encoding)');
  console.log('─'.repeat(80));
  
  const whisperPipeline = new AudioProcessingPipeline('openai-whisper');
  const info2 = whisperPipeline.getInfo();
  
  console.log('Configuration:');
  console.log(`  Output Type: ${info2.output.outputType.toUpperCase()}`);
  console.log(`  Sample Rate: ${info2.output.sampleRate} Hz`);
  console.log(`  Channels: ${info2.output.channels}`);
  
  console.log('\nProcessing audio...');
  const inputBuffer2 = BufferPool.default.acquire(bufferSize);
  
  // Copy test data to new buffer
  for (let i = 0; i < inputSamples; i++) {
    const value = Math.sin(2 * Math.PI * 440 * i / 48000);
    inputBuffer2.writeFloatLE(value, i * 8);
    inputBuffer2.writeFloatLE(value * 0.8, i * 8 + 4);
  }
  
  const whisperOutput = whisperPipeline.process(inputBuffer2);
  BufferPool.default.release(inputBuffer2);
  whisperPipeline.releaseBuffer(whisperOutput);
  
  const wavFile = whisperPipeline.finalize();
  console.log('\nWAV File Generated:');
  console.log(`  Total Size: ${wavFile.length} bytes`);
  console.log(`  Header Size: 44 bytes`);
  console.log(`  Audio Data: ${wavFile.length - 44} bytes`);
  
  // Test 3: Custom configuration
  console.log('\n📝 Test 3: Custom Configuration (48kHz Stereo → 16kHz Mono, High Quality)');
  console.log('─'.repeat(80));
  
  const customPipeline = new AudioProcessingPipeline({
    inputSampleRate: 48000,
    inputChannels: 2,
    inputFormat: 'float32',
    outputSampleRate: 16000,
    outputChannels: 1,
    outputBitDepth: 16,
    outputFormat: 'pcm',
    resamplingQuality: 'sinc' // Best quality
  });
  
  const info3 = customPipeline.getInfo();
  console.log('Custom Pipeline:');
  console.log(`  Resampling Quality: ${info3.resamplingQuality} (Best quality)`);
  console.log(`  Processing Steps: ${info3.processingSteps.length}`);
  
  info3.processingSteps.forEach((step, i) => {
    console.log(`    ${i + 1}. ${step}`);
  });
  
  // Show BufferPool statistics
  const poolStats = BufferPool.default.getStats();
  console.log('\n📊 BufferPool Statistics:');
  console.log(`  Total Acquires: ${poolStats.totalAcquires}`);
  console.log(`  Total Releases: ${poolStats.totalReleases}`);
  console.log(`  Hit Rate: ${(poolStats.hitRate * 100).toFixed(1)}%`);
  console.log(`  Reuse Rate: ${(poolStats.reuseRate * 100).toFixed(1)}%`);
  console.log(`  Pool Memory: ${(poolStats.totalMemory / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Pool Sizes:`, poolStats.poolSizes);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ All tests completed successfully!');
  console.log('='.repeat(80));
  
  console.log('\n💡 Usage Tips:');
  console.log('  • Use "china-asr" preset for Baidu/Tencent/Xunfei/Aliyun');
  console.log('  • Use "openai-whisper" preset for OpenAI Whisper API');
  console.log('  • Use "global-asr-48k" for Azure/Google/AWS (if 48kHz supported)');
  console.log('  • Use custom configuration for specific requirements');
  console.log('  • WAV output is buffered; call finalize() to get complete file');
}
