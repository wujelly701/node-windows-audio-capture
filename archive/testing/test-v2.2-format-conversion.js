/**
 * Test Suite for v2.2.0 Format Conversion Features
 * 
 * Tests:
 * - AudioResampler (sample rate conversion)
 * - WavEncoder (WAV header generation)
 * - AudioProcessingPipeline (complete pipeline)
 * - ASR presets (china-asr, openai-whisper, etc.)
 * - Error handling
 * - Performance benchmarks
 */

const AudioResampler = require('./lib/audio-resampler');
const WavEncoder = require('./lib/wav-encoder');
const AudioProcessingPipeline = require('./lib/audio-processing-pipeline');
const AudioFormatConverter = require('./utils/AudioFormatConverter');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testHeader(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function testSection(title) {
  console.log('\n' + '─'.repeat(80));
  log(title, 'cyan');
  console.log('─'.repeat(80));
}

function assert(condition, message) {
  results.total++;
  if (condition) {
    results.passed++;
    log(`✓ ${message}`, 'green');
    results.details.push({ status: 'PASS', message });
  } else {
    results.failed++;
    log(`✗ ${message}`, 'red');
    results.details.push({ status: 'FAIL', message });
  }
}

function assertEqual(actual, expected, message) {
  const condition = actual === expected;
  assert(condition, `${message} (expected: ${expected}, actual: ${actual})`);
}

function assertInRange(value, min, max, message) {
  const condition = value >= min && value <= max;
  assert(condition, `${message} (value: ${value}, range: [${min}, ${max}])`);
}

// Generate test audio data
function generateTestAudio(sampleRate, duration, channels, format = 'float32') {
  const samples = sampleRate * duration;
  const bytesPerSample = format === 'float32' ? 4 : 2;
  const buffer = Buffer.alloc(samples * channels * bytesPerSample);
  
  // Generate sine wave at 440 Hz
  for (let i = 0; i < samples; i++) {
    const value = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    
    for (let ch = 0; ch < channels; ch++) {
      const offset = (i * channels + ch) * bytesPerSample;
      
      if (format === 'float32') {
        buffer.writeFloatLE(value * (ch === 0 ? 1.0 : 0.8), offset);
      } else {
        const intValue = Math.round(value * 32767 * (ch === 0 ? 1.0 : 0.8));
        buffer.writeInt16LE(intValue, offset);
      }
    }
  }
  
  return buffer;
}

// ============================================================================
// Test 1: AudioResampler
// ============================================================================

testHeader('Test 1: AudioResampler - Sample Rate Conversion');

testSection('1.1: Basic 48kHz → 16kHz Conversion');

try {
  const resampler = new AudioResampler({
    inputSampleRate: 48000,
    outputSampleRate: 16000,
    channels: 1,
    quality: 'linear',
    inputFormat: 'float32',
    outputFormat: 'int16'
  });
  
  const inputBuffer = generateTestAudio(48000, 1, 1, 'float32');
  const outputBuffer = resampler.resample(inputBuffer);
  
  const expectedOutputSize = 16000 * 1 * 2; // 16kHz, mono, int16
  assertEqual(outputBuffer.length, expectedOutputSize, 'Output buffer size correct');
  
  const stats = resampler.getStats();
  assertEqual(stats.totalInputSamples, 48000, 'Input samples tracked correctly');
  assertEqual(stats.totalOutputSamples, 16000, 'Output samples tracked correctly');
  
  log(`  Input: ${inputBuffer.length} bytes`, 'blue');
  log(`  Output: ${outputBuffer.length} bytes`, 'blue');
  log(`  Reduction: ${((1 - outputBuffer.length / inputBuffer.length) * 100).toFixed(1)}%`, 'blue');
} catch (error) {
  assert(false, `Basic resampling failed: ${error.message}`);
}

testSection('1.2: Quality Levels (simple, linear, sinc)');

['simple', 'linear', 'sinc'].forEach(quality => {
  try {
    const resampler = new AudioResampler({
      inputSampleRate: 48000,
      outputSampleRate: 16000,
      channels: 1,
      quality,
      inputFormat: 'float32',
      outputFormat: 'int16'
    });
    
    const inputBuffer = generateTestAudio(48000, 0.5, 1, 'float32');
    const startTime = Date.now();
    const outputBuffer = resampler.resample(inputBuffer);
    const processingTime = Date.now() - startTime;
    
    assert(outputBuffer.length > 0, `${quality} resampling produces output`);
    assert(processingTime < 50, `${quality} processing time acceptable (<50ms)`);
    
    log(`  ${quality}: ${processingTime}ms`, 'blue');
  } catch (error) {
    assert(false, `${quality} resampling failed: ${error.message}`);
  }
});

testSection('1.3: Error Handling');

try {
  new AudioResampler({ inputSampleRate: -1 });
  assert(false, 'Should reject negative sample rate');
} catch (error) {
  assert(true, 'Rejects negative sample rate');
}

try {
  new AudioResampler({ channels: 3 });
  assert(false, 'Should reject invalid channel count');
} catch (error) {
  assert(true, 'Rejects invalid channel count');
}

// ============================================================================
// Test 2: WavEncoder
// ============================================================================

testHeader('Test 2: WavEncoder - WAV Header Generation');

testSection('2.1: Basic WAV Encoding');

try {
  const encoder = new WavEncoder({
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16'
  });
  
  const pcmData = generateTestAudio(16000, 1, 1, 'int16');
  const wavFile = encoder.encode(pcmData);
  
  assertEqual(wavFile.length, pcmData.length + 44, 'WAV file size correct (data + 44 byte header)');
  
  // Verify RIFF signature
  const riffSignature = wavFile.toString('ascii', 0, 4);
  assertEqual(riffSignature, 'RIFF', 'RIFF signature present');
  
  // Verify WAVE format
  const waveFormat = wavFile.toString('ascii', 8, 12);
  assertEqual(waveFormat, 'WAVE', 'WAVE format present');
  
  log(`  PCM data: ${pcmData.length} bytes`, 'blue');
  log(`  WAV file: ${wavFile.length} bytes`, 'blue');
  log(`  Header overhead: ${((44 / wavFile.length) * 100).toFixed(2)}%`, 'blue');
} catch (error) {
  assert(false, `WAV encoding failed: ${error.message}`);
}

testSection('2.2: Preset Configurations');

try {
  const whisperEncoder = WavEncoder.forWhisper();
  const info = whisperEncoder.getInfo();
  
  assertEqual(info.sampleRate, 16000, 'Whisper preset: 16kHz sample rate');
  assertEqual(info.channels, 1, 'Whisper preset: mono');
  assertEqual(info.bitDepth, 16, 'Whisper preset: 16-bit');
} catch (error) {
  assert(false, `Whisper preset failed: ${error.message}`);
}

try {
  const chinaEncoder = WavEncoder.forChinaASR();
  const info = chinaEncoder.getInfo();
  
  assertEqual(info.sampleRate, 16000, 'China ASR preset: 16kHz sample rate');
  assertEqual(info.channels, 1, 'China ASR preset: mono');
} catch (error) {
  assert(false, `China ASR preset failed: ${error.message}`);
}

testSection('2.3: Streaming Mode');

try {
  const encoder = new WavEncoder({
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16'
  });
  
  // Add 3 chunks
  const chunk1 = generateTestAudio(16000, 0.5, 1, 'int16');
  const chunk2 = generateTestAudio(16000, 0.5, 1, 'int16');
  const chunk3 = generateTestAudio(16000, 0.5, 1, 'int16');
  
  encoder.addChunk(chunk1);
  encoder.addChunk(chunk2);
  encoder.addChunk(chunk3);
  
  const wavFile = encoder.finalize();
  const expectedSize = (chunk1.length + chunk2.length + chunk3.length) + 44;
  
  assertEqual(wavFile.length, expectedSize, 'Streaming mode produces correct size');
  
  log(`  Chunks: 3 x ${chunk1.length} bytes`, 'blue');
  log(`  Total: ${wavFile.length} bytes`, 'blue');
} catch (error) {
  assert(false, `Streaming mode failed: ${error.message}`);
}

testSection('2.4: WAV Header Parsing');

try {
  const encoder = new WavEncoder({
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: 'int16'
  });
  
  const pcmData = generateTestAudio(16000, 1, 1, 'int16');
  const wavFile = encoder.encode(pcmData);
  
  const parsedHeader = WavEncoder.parseHeader(wavFile);
  
  assertEqual(parsedHeader.audioFormat, 'PCM', 'Parsed audio format correct');
  assertEqual(parsedHeader.channels, 1, 'Parsed channels correct');
  assertEqual(parsedHeader.sampleRate, 16000, 'Parsed sample rate correct');
  assertEqual(parsedHeader.bitDepth, 16, 'Parsed bit depth correct');
} catch (error) {
  assert(false, `WAV header parsing failed: ${error.message}`);
}

// ============================================================================
// Test 3: AudioProcessingPipeline
// ============================================================================

testHeader('Test 3: AudioProcessingPipeline - Complete ASR Processing');

testSection('3.1: China ASR Preset');

try {
  const pipeline = new AudioProcessingPipeline('china-asr');
  
  const info = pipeline.getInfo();
  assertEqual(info.output.sampleRate, 16000, 'China ASR: 16kHz output');
  assertEqual(info.output.channels, 1, 'China ASR: mono output');
  assertEqual(info.output.format, 'int16', 'China ASR: int16 format');
  
  const inputBuffer = generateTestAudio(48000, 1, 2, 'float32');
  const outputBuffer = pipeline.process(inputBuffer);
  
  const expectedSize = 16000 * 1 * 2; // 16kHz, mono, int16
  assertEqual(outputBuffer.length, expectedSize, 'China ASR: output size correct');
  
  const stats = pipeline.getStats();
  assertInRange(parseFloat(stats.sizeReduction), 85, 95, 'China ASR: size reduction 85-95%');
  
  log(`  Input: ${inputBuffer.length} bytes (48kHz Stereo Float32)`, 'blue');
  log(`  Output: ${outputBuffer.length} bytes (16kHz Mono Int16)`, 'blue');
  log(`  Reduction: ${stats.sizeReduction}`, 'blue');
} catch (error) {
  assert(false, `China ASR preset failed: ${error.message}`);
}

testSection('3.2: OpenAI Whisper Preset');

try {
  const pipeline = new AudioProcessingPipeline('openai-whisper');
  
  const info = pipeline.getInfo();
  assertEqual(info.output.outputType, 'wav', 'Whisper: WAV output format');
  
  const inputBuffer = generateTestAudio(48000, 1, 2, 'float32');
  pipeline.process(inputBuffer);
  
  const wavFile = pipeline.finalize();
  assert(wavFile !== null, 'Whisper: WAV file generated');
  assert(wavFile.length > 44, 'Whisper: WAV file has header + data');
  
  // Verify WAV header
  const riff = wavFile.toString('ascii', 0, 4);
  assertEqual(riff, 'RIFF', 'Whisper: Valid WAV file');
  
  log(`  Output: ${wavFile.length} bytes (WAV file)`, 'blue');
} catch (error) {
  assert(false, `OpenAI Whisper preset failed: ${error.message}`);
}

testSection('3.3: Global ASR 48k Preset');

try {
  const pipeline = new AudioProcessingPipeline('global-asr-48k');
  
  const info = pipeline.getInfo();
  assertEqual(info.output.sampleRate, 48000, 'Global ASR: keeps 48kHz');
  assertEqual(info.output.channels, 1, 'Global ASR: mono output');
  
  const inputBuffer = generateTestAudio(48000, 1, 2, 'float32');
  const outputBuffer = pipeline.process(inputBuffer);
  
  // No resampling, only channel and format conversion
  const expectedSize = 48000 * 1 * 2; // 48kHz, mono, int16
  assertEqual(outputBuffer.length, expectedSize, 'Global ASR: output size correct');
  
  log(`  Sample rate: 48kHz (preserved)`, 'blue');
  log(`  Output: ${outputBuffer.length} bytes`, 'blue');
} catch (error) {
  assert(false, `Global ASR preset failed: ${error.message}`);
}

testSection('3.4: Custom Configuration');

try {
  const pipeline = new AudioProcessingPipeline({
    inputSampleRate: 48000,
    inputChannels: 2,
    inputFormat: 'float32',
    outputSampleRate: 16000,
    outputChannels: 1,
    outputBitDepth: 16,
    outputFormat: 'pcm',
    resamplingQuality: 'sinc'
  });
  
  const info = pipeline.getInfo();
  assertEqual(info.resamplingQuality, 'sinc', 'Custom: sinc quality');
  assert(info.processingSteps.length === 3, 'Custom: 3 processing steps');
  
  const inputBuffer = generateTestAudio(48000, 1, 2, 'float32');
  const startTime = Date.now();
  const outputBuffer = pipeline.process(inputBuffer);
  const processingTime = Date.now() - startTime;
  
  assert(outputBuffer.length > 0, 'Custom: produces output');
  assert(processingTime < 100, 'Custom: processing time acceptable');
  
  log(`  Processing time: ${processingTime}ms`, 'blue');
} catch (error) {
  assert(false, `Custom configuration failed: ${error.message}`);
}

testSection('3.5: All Preset Configurations');

const presets = AudioProcessingPipeline.listPresets();
log(`  Available presets: ${presets.length}`, 'blue');

presets.forEach(preset => {
  try {
    if (preset === 'raw') {
      log(`  ○ ${preset}: skipped (no processing)`, 'yellow');
      return;
    }
    
    const pipeline = new AudioProcessingPipeline(preset);
    const inputBuffer = generateTestAudio(48000, 0.5, 2, 'float32');
    const outputBuffer = pipeline.process(inputBuffer);
    
    assert(outputBuffer.length > 0, `${preset} preset works`);
    log(`  ✓ ${preset}: ${outputBuffer.length} bytes`, 'green');
  } catch (error) {
    assert(false, `${preset} preset failed: ${error.message}`);
  }
});

// ============================================================================
// Test 4: Performance Benchmarks
// ============================================================================

testHeader('Test 4: Performance Benchmarks');

testSection('4.1: Processing Time');

const audioLengths = [1, 5, 10]; // seconds

audioLengths.forEach(duration => {
  const pipeline = new AudioProcessingPipeline('china-asr');
  const inputBuffer = generateTestAudio(48000, duration, 2, 'float32');
  
  const startTime = Date.now();
  const outputBuffer = pipeline.process(inputBuffer);
  const processingTime = Date.now() - startTime;
  
  const timePerSecond = processingTime / duration;
  
  assert(timePerSecond < 50, `${duration}s audio: <50ms per second`);
  log(`  ${duration}s audio: ${processingTime}ms total (${timePerSecond.toFixed(1)}ms/sec)`, 'blue');
});

testSection('4.2: CPU Efficiency (Quality Levels)');

['simple', 'linear', 'sinc'].forEach(quality => {
  const resampler = new AudioResampler({
    inputSampleRate: 48000,
    outputSampleRate: 16000,
    channels: 1,
    quality,
    inputFormat: 'float32',
    outputFormat: 'int16'
  });
  
  const inputBuffer = generateTestAudio(48000, 5, 1, 'float32');
  
  const startTime = Date.now();
  resampler.resample(inputBuffer);
  const processingTime = Date.now() - startTime;
  
  const timePerSecond = processingTime / 5;
  
  log(`  ${quality}: ${processingTime}ms total (${timePerSecond.toFixed(1)}ms/sec)`, 'blue');
});

testSection('4.3: Memory Efficiency');

try {
  const pipeline = new AudioProcessingPipeline('china-asr');
  const inputBuffer = generateTestAudio(48000, 10, 2, 'float32');
  
  const inputSize = inputBuffer.length;
  const outputBuffer = pipeline.process(inputBuffer);
  const outputSize = outputBuffer.length;
  
  const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);
  const ratio = (inputSize / outputSize).toFixed(2);
  
  assert(parseFloat(reduction) > 85, 'Memory reduction >85%');
  
  log(`  Input: ${(inputSize / 1024).toFixed(1)} KB`, 'blue');
  log(`  Output: ${(outputSize / 1024).toFixed(1)} KB`, 'blue');
  log(`  Reduction: ${reduction}%`, 'blue');
  log(`  Compression: ${ratio}:1`, 'blue');
} catch (error) {
  assert(false, `Memory efficiency test failed: ${error.message}`);
}

// ============================================================================
// Test 5: Error Handling & Edge Cases
// ============================================================================

testHeader('Test 5: Error Handling & Edge Cases');

testSection('5.1: Invalid Preset Names');

try {
  new AudioProcessingPipeline('invalid-preset');
  assert(false, 'Should reject invalid preset');
} catch (error) {
  assert(true, 'Rejects invalid preset name');
}

testSection('5.2: Invalid Configurations');

try {
  new AudioResampler({ inputSampleRate: 0 });
  assert(false, 'Should reject zero sample rate');
} catch (error) {
  assert(true, 'Rejects zero sample rate');
}

try {
  new WavEncoder({ bitDepth: 24 });
  assert(false, 'Should reject unsupported bit depth');
} catch (error) {
  assert(true, 'Rejects unsupported bit depth');
}

testSection('5.3: Empty Buffers');

try {
  const pipeline = new AudioProcessingPipeline('china-asr');
  const emptyBuffer = Buffer.alloc(0);
  const outputBuffer = pipeline.process(emptyBuffer);
  
  assertEqual(outputBuffer.length, 0, 'Handles empty buffer gracefully');
} catch (error) {
  // Some implementations might throw, which is also acceptable
  assert(true, 'Handles empty buffer (threw error as expected)');
}

// ============================================================================
// Test Summary
// ============================================================================

testHeader('Test Summary');

console.log('\n' + '─'.repeat(80));
log(`Total Tests: ${results.total}`, 'bright');
log(`Passed: ${results.passed}`, 'green');
log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
    results.failed === 0 ? 'green' : 'yellow');
console.log('─'.repeat(80));

if (results.failed > 0) {
  console.log('\n' + '─'.repeat(80));
  log('Failed Tests:', 'red');
  console.log('─'.repeat(80));
  
  results.details
    .filter(r => r.status === 'FAIL')
    .forEach(r => log(`  ✗ ${r.message}`, 'red'));
}

console.log('\n' + '='.repeat(80));
if (results.failed === 0) {
  log('✅ ALL TESTS PASSED!', 'green');
  log('v2.2.0 format conversion features are production-ready! 🎉', 'green');
} else {
  log('⚠️  SOME TESTS FAILED', 'yellow');
  log(`Please review the ${results.failed} failed test(s) above.`, 'yellow');
}
console.log('='.repeat(80));

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
