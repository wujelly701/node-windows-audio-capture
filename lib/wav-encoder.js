/**
 * WavEncoder - WAV file header generation utility
 * 
 * Generates standard WAV (RIFF/WAVE) file headers for PCM audio data.
 * Useful for creating WAV files compatible with:
 * - OpenAI Whisper API
 * - Most audio editing software
 * - Standard audio players
 * 
 * Supports:
 * - Int16 PCM (most common)
 * - Float32 PCM (IEEE Float)
 * - Mono and stereo
 * - Various sample rates
 * 
 * @module lib/wav-encoder
 */

class WavEncoder {
  /**
   * Create a WavEncoder instance
   * 
   * @param {Object} options - Encoder configuration
   * @param {number} [options.sampleRate=16000] - Sample rate in Hz
   * @param {number} [options.channels=1] - Number of channels (1=mono, 2=stereo)
   * @param {number} [options.bitDepth=16] - Bit depth (16 or 32)
   * @param {string} [options.format='int16'] - Audio format ('int16'|'float32')
   */
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.channels = options.channels || 1;
    this.bitDepth = options.bitDepth || 16;
    this.format = options.format || 'int16';
    
    // Validate configuration
    this._validate();
    
    // Calculate derived properties
    this.bytesPerSample = this.bitDepth / 8;
    this.blockAlign = this.channels * this.bytesPerSample;
    this.byteRate = this.sampleRate * this.blockAlign;
    
    // Audio format code (1 = PCM, 3 = IEEE Float)
    this.audioFormat = (this.format === 'float32') ? 3 : 1;
    
    // Statistics
    this.stats = {
      headersGenerated: 0,
      totalDataSize: 0,
      totalOutputSize: 0
    };
  }
  
  /**
   * Validate encoder configuration
   * @private
   */
  _validate() {
    if (this.sampleRate <= 0) {
      throw new Error('Sample rate must be a positive number');
    }
    
    if (this.channels < 1 || this.channels > 2) {
      throw new Error('Only mono (1) and stereo (2) are supported');
    }
    
    if (![16, 32].includes(this.bitDepth)) {
      throw new Error('Only 16-bit and 32-bit are supported');
    }
    
    if (!['int16', 'float32'].includes(this.format)) {
      throw new Error('Format must be "int16" or "float32"');
    }
    
    // Validate format and bit depth combination
    if (this.format === 'int16' && this.bitDepth !== 16) {
      throw new Error('int16 format requires 16-bit depth');
    }
    
    if (this.format === 'float32' && this.bitDepth !== 32) {
      throw new Error('float32 format requires 32-bit depth');
    }
  }
  
  /**
   * Generate WAV header for given PCM data
   * 
   * @param {Buffer} pcmData - PCM audio data
   * @returns {Buffer} Complete WAV file (header + data)
   */
  encode(pcmData) {
    const header = this.generateHeader(pcmData.length);
    const wavFile = Buffer.concat([header, pcmData]);
    
    // Update statistics
    this.stats.headersGenerated++;
    this.stats.totalDataSize += pcmData.length;
    this.stats.totalOutputSize += wavFile.length;
    
    return wavFile;
  }
  
  /**
   * Generate WAV header only
   * 
   * @param {number} dataSize - Size of PCM data in bytes
   * @returns {Buffer} WAV header (44 bytes for PCM)
   */
  generateHeader(dataSize) {
    const headerSize = 44; // Standard WAV header size
    const header = Buffer.alloc(headerSize);
    
    let offset = 0;
    
    // RIFF chunk descriptor
    header.write('RIFF', offset); offset += 4;
    header.writeUInt32LE(36 + dataSize, offset); offset += 4; // File size - 8
    header.write('WAVE', offset); offset += 4;
    
    // fmt sub-chunk
    header.write('fmt ', offset); offset += 4;
    header.writeUInt32LE(16, offset); offset += 4; // fmt chunk size
    header.writeUInt16LE(this.audioFormat, offset); offset += 2; // Audio format (1=PCM, 3=Float)
    header.writeUInt16LE(this.channels, offset); offset += 2;
    header.writeUInt32LE(this.sampleRate, offset); offset += 4;
    header.writeUInt32LE(this.byteRate, offset); offset += 4;
    header.writeUInt16LE(this.blockAlign, offset); offset += 2;
    header.writeUInt16LE(this.bitDepth, offset); offset += 2;
    
    // data sub-chunk
    header.write('data', offset); offset += 4;
    header.writeUInt32LE(dataSize, offset); offset += 4;
    
    return header;
  }
  
  /**
   * Encode streaming audio chunks
   * 
   * For streaming scenarios, this method accumulates chunks and
   * generates a complete WAV file when finalize() is called.
   * 
   * @param {Buffer} chunk - Audio data chunk
   */
  addChunk(chunk) {
    if (!this._chunks) {
      this._chunks = [];
    }
    this._chunks.push(chunk);
  }
  
  /**
   * Finalize streaming and generate complete WAV file
   * 
   * @returns {Buffer} Complete WAV file
   */
  finalize() {
    if (!this._chunks || this._chunks.length === 0) {
      throw new Error('No chunks to finalize');
    }
    
    const pcmData = Buffer.concat(this._chunks);
    this._chunks = []; // Reset chunks
    
    return this.encode(pcmData);
  }
  
  /**
   * Get encoder statistics
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      averageDataSize: this.stats.headersGenerated > 0
        ? Math.round(this.stats.totalDataSize / this.stats.headersGenerated)
        : 0,
      headerOverhead: this.stats.totalDataSize > 0
        ? ((this.stats.totalOutputSize - this.stats.totalDataSize) / this.stats.totalOutputSize * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  /**
   * Get encoder information
   * 
   * @returns {Object} Configuration object
   */
  getInfo() {
    return {
      sampleRate: this.sampleRate,
      channels: this.channels,
      bitDepth: this.bitDepth,
      format: this.format,
      audioFormat: this.audioFormat === 1 ? 'PCM' : 'IEEE Float',
      bytesPerSample: this.bytesPerSample,
      blockAlign: this.blockAlign,
      byteRate: this.byteRate,
      headerSize: 44
    };
  }
  
  /**
   * Create a WavEncoder with preset for OpenAI Whisper
   * 
   * @param {number} [channels=1] - Number of channels
   * @returns {WavEncoder} Configured encoder
   */
  static forWhisper(channels = 1) {
    return new WavEncoder({
      sampleRate: 16000,
      channels: channels,
      bitDepth: 16,
      format: 'int16'
    });
  }
  
  /**
   * Create a WavEncoder with preset for Chinese ASR services
   * (Baidu, Tencent, Xunfei, Aliyun)
   * 
   * @returns {WavEncoder} Configured encoder
   */
  static forChinaASR() {
    return new WavEncoder({
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      format: 'int16'
    });
  }
  
  /**
   * Parse WAV header from buffer
   * 
   * @param {Buffer} buffer - WAV file buffer
   * @returns {Object} Parsed header information
   */
  static parseHeader(buffer) {
    if (buffer.length < 44) {
      throw new Error('Buffer too small to contain WAV header');
    }
    
    // Verify RIFF signature
    const riff = buffer.toString('ascii', 0, 4);
    if (riff !== 'RIFF') {
      throw new Error('Invalid WAV file: missing RIFF signature');
    }
    
    // Verify WAVE format
    const wave = buffer.toString('ascii', 8, 12);
    if (wave !== 'WAVE') {
      throw new Error('Invalid WAV file: missing WAVE format');
    }
    
    // Parse fmt chunk
    const audioFormat = buffer.readUInt16LE(20);
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const byteRate = buffer.readUInt32LE(28);
    const blockAlign = buffer.readUInt16LE(32);
    const bitDepth = buffer.readUInt16LE(34);
    
    // Parse data chunk
    const dataSize = buffer.readUInt32LE(40);
    
    return {
      audioFormat: audioFormat === 1 ? 'PCM' : (audioFormat === 3 ? 'IEEE Float' : `Unknown (${audioFormat})`),
      channels,
      sampleRate,
      byteRate,
      blockAlign,
      bitDepth,
      dataSize,
      duration: sampleRate > 0 ? (dataSize / byteRate).toFixed(2) + ' seconds' : 'Unknown'
    };
  }
}

module.exports = WavEncoder;

// ============================================================================
// Example usage
// ============================================================================

if (require.main === module) {
  console.log('='.repeat(80));
  console.log('WavEncoder Example - WAV Header Generation');
  console.log('='.repeat(80));
  
  // Test 1: Basic encoding
  console.log('\n📝 Test 1: Basic Int16 PCM Encoding');
  console.log('─'.repeat(80));
  
  const encoder = new WavEncoder({
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16'
  });
  
  console.log('Encoder Configuration:');
  const info = encoder.getInfo();
  Object.entries(info).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Generate test PCM data (1 second of silence)
  const sampleCount = 16000;
  const pcmData = Buffer.alloc(sampleCount * 2); // Int16 = 2 bytes per sample
  
  // Add some test tone (440 Hz sine wave)
  for (let i = 0; i < sampleCount; i++) {
    const value = Math.sin(2 * Math.PI * 440 * i / 16000) * 32767 * 0.5;
    pcmData.writeInt16LE(Math.round(value), i * 2);
  }
  
  const wavFile = encoder.encode(pcmData);
  
  console.log('\nOutput:');
  console.log(`  PCM data size: ${pcmData.length} bytes`);
  console.log(`  WAV file size: ${wavFile.length} bytes`);
  console.log(`  Header size: ${wavFile.length - pcmData.length} bytes`);
  console.log(`  Overhead: ${((wavFile.length - pcmData.length) / wavFile.length * 100).toFixed(2)}%`);
  
  // Test 2: OpenAI Whisper preset
  console.log('\n📝 Test 2: OpenAI Whisper Preset');
  console.log('─'.repeat(80));
  
  const whisperEncoder = WavEncoder.forWhisper();
  console.log('Whisper-optimized configuration:');
  const whisperInfo = whisperEncoder.getInfo();
  Object.entries(whisperInfo).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Test 3: China ASR preset
  console.log('\n📝 Test 3: China ASR Services Preset');
  console.log('─'.repeat(80));
  
  const chinaEncoder = WavEncoder.forChinaASR();
  console.log('China ASR-optimized configuration:');
  const chinaInfo = chinaEncoder.getInfo();
  Object.entries(chinaInfo).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Test 4: Streaming mode
  console.log('\n📝 Test 4: Streaming Mode');
  console.log('─'.repeat(80));
  
  const streamEncoder = new WavEncoder({
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16'
  });
  
  console.log('Adding chunks in streaming mode...');
  
  // Simulate 3 chunks of 0.5 seconds each
  for (let i = 0; i < 3; i++) {
    const chunkSize = 16000 * 0.5 * 2; // 0.5 sec * 2 bytes
    const chunk = Buffer.alloc(chunkSize);
    streamEncoder.addChunk(chunk);
    console.log(`  Chunk ${i + 1}: ${chunkSize} bytes added`);
  }
  
  const finalWav = streamEncoder.finalize();
  console.log(`\nFinalized WAV file: ${finalWav.length} bytes`);
  
  // Test 5: Parse WAV header
  console.log('\n📝 Test 5: Parse WAV Header');
  console.log('─'.repeat(80));
  
  const parsedHeader = WavEncoder.parseHeader(wavFile);
  console.log('Parsed header information:');
  Object.entries(parsedHeader).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Statistics
  console.log('\n📊 Encoder Statistics');
  console.log('─'.repeat(80));
  
  const stats = encoder.getStats();
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ All tests completed successfully!');
  console.log('='.repeat(80));
  
  console.log('\n💡 Usage Tips:');
  console.log('  • Use WavEncoder.forWhisper() for OpenAI Whisper API');
  console.log('  • Use WavEncoder.forChinaASR() for Baidu/Tencent/Xunfei/Aliyun');
  console.log('  • Use streaming mode for real-time audio capture');
  console.log('  • WAV files can be directly uploaded to most ASR services');
}
