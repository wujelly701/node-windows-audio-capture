/**
 * SincInterpolator 单元测试
 */

const SincInterpolator = require('../lib/sinc-interpolator');

describe('SincInterpolator', () => {
  describe('Constructor', () => {
    test('should create with default parameters', () => {
      const interpolator = new SincInterpolator();
      
      expect(interpolator.lobeCount).toBe(16);
      expect(interpolator.phaseCount).toBe(1024);
      expect(interpolator.beta).toBe(7);
      expect(interpolator.filterLength).toBe(32);
      expect(interpolator.coefficients).toBeInstanceOf(Float32Array);
    });
    
    test('should create with custom parameters', () => {
      const interpolator = new SincInterpolator({
        lobeCount: 8,
        phaseCount: 512,
        beta: 5
      });
      
      expect(interpolator.lobeCount).toBe(8);
      expect(interpolator.phaseCount).toBe(512);
      expect(interpolator.beta).toBe(5);
      expect(interpolator.filterLength).toBe(16);
    });
    
    test('should throw error for invalid lobeCount', () => {
      expect(() => new SincInterpolator({ lobeCount: 2 }))
        .toThrow('lobeCount must be in [4, 64]');
      
      expect(() => new SincInterpolator({ lobeCount: 100 }))
        .toThrow('lobeCount must be in [4, 64]');
    });
    
    test('should throw error for invalid phaseCount', () => {
      expect(() => new SincInterpolator({ phaseCount: 32 }))
        .toThrow('phaseCount must be in [64, 8192]');
      
      expect(() => new SincInterpolator({ phaseCount: 10000 }))
        .toThrow('phaseCount must be in [64, 8192]');
    });
    
    test('should throw error for invalid beta', () => {
      expect(() => new SincInterpolator({ beta: -1 }))
        .toThrow('beta must be in [0, 20]');
      
      expect(() => new SincInterpolator({ beta: 25 }))
        .toThrow('beta must be in [0, 20]');
    });
  });
  
  describe('Sinc Function', () => {
    test('should compute sinc(0) = 1', () => {
      const interpolator = new SincInterpolator();
      const result = interpolator._sinc(0);
      expect(result).toBeCloseTo(1.0, 10);
    });
    
    test('should compute sinc(1) = 0', () => {
      const interpolator = new SincInterpolator();
      const result = interpolator._sinc(1);
      expect(result).toBeCloseTo(0.0, 10);
    });
    
    test('should compute sinc(0.5) ≈ 0.637', () => {
      const interpolator = new SincInterpolator();
      const result = interpolator._sinc(0.5);
      expect(result).toBeCloseTo(0.637, 3);
    });
    
    test('should be symmetric', () => {
      const interpolator = new SincInterpolator();
      
      for (let x = 0.1; x <= 2.0; x += 0.1) {
        const pos = interpolator._sinc(x);
        const neg = interpolator._sinc(-x);
        expect(pos).toBeCloseTo(neg, 10);
      }
    });
  });
  
  describe('Coefficient Table', () => {
    test('should generate correct table size', () => {
      const interpolator = new SincInterpolator({
        lobeCount: 8,
        phaseCount: 256
      });
      
      const expectedSize = 256 * 16; // phaseCount * filterLength
      expect(interpolator.coefficients.length).toBe(expectedSize);
    });
    
    test('should have normalized coefficients', () => {
      const interpolator = new SincInterpolator();
      
      // 检查前几个相位的系数和
      for (let phase = 0; phase < 10; phase++) {
        const baseIndex = phase * interpolator.filterLength;
        let sum = 0;
        
        for (let tap = 0; tap < interpolator.filterLength; tap++) {
          sum += interpolator.coefficients[baseIndex + tap];
        }
        
        // 系数和应该接近 1.0
        expect(sum).toBeCloseTo(1.0, 3);
      }
    });
    
    test('should have valid coefficient values', () => {
      const interpolator = new SincInterpolator();
      
      // 检查所有系数都是有限数
      for (let i = 0; i < interpolator.coefficients.length; i++) {
        expect(isFinite(interpolator.coefficients[i])).toBe(true);
        expect(isNaN(interpolator.coefficients[i])).toBe(false);
      }
    });
  });
  
  describe('interpolate() - Single Sample', () => {
    test('should interpolate at integer position', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array([0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      
      // 在整数位置应该返回原值
      const result = interpolator.interpolate(input, 2.0);
      expect(result).toBeCloseTo(1.0, 2);
    });
    
    test('should interpolate at fractional position', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array([0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      
      // 在非整数位置应该返回插值结果
      const result = interpolator.interpolate(input, 2.5);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1.0);
    });
    
    test('should handle impulse response', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(100).fill(0);
      input[50] = 1.0;
      
      // 测试几个位置
      expect(interpolator.interpolate(input, 50.0)).toBeCloseTo(1.0, 2);
      expect(interpolator.interpolate(input, 50.25)).toBeGreaterThan(0.5);
      expect(interpolator.interpolate(input, 50.5)).toBeGreaterThan(0);
    });
    
    test('should handle boundary conditions', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      
      // 在边界附近插值不应该崩溃
      expect(() => {
        interpolator.interpolate(input, 0);
        interpolator.interpolate(input, 5);
        interpolator.interpolate(input, 10);
      }).not.toThrow();
    });
  });
  
  describe('resample() - Mono', () => {
    test('should resample constant signal', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(100).fill(0.5);
      const output = new Float32Array(50);
      
      interpolator.resample(input, output, 2.0);
      
      // 常数信号应该保持不变
      for (let i = 0; i < output.length; i++) {
        expect(output[i]).toBeCloseTo(0.5, 2);
      }
    });
    
    test('should resample sine wave', () => {
      const interpolator = new SincInterpolator();
      
      // 生成 1kHz 正弦波 @ 48kHz
      const inputRate = 48000;
      const freq = 1000;
      const duration = 0.1;
      const inputLength = Math.floor(inputRate * duration);
      const input = new Float32Array(inputLength);
      
      for (let i = 0; i < inputLength; i++) {
        input[i] = Math.sin(2 * Math.PI * freq * i / inputRate);
      }
      
      // 重采样到 44.1kHz
      const outputRate = 44100;
      const outputLength = Math.floor(outputRate * duration);
      const output = new Float32Array(outputLength);
      const ratio = inputRate / outputRate;
      
      interpolator.resample(input, output, ratio);
      
      // 检查输出范围
      for (let i = 0; i < output.length; i++) {
        expect(output[i]).toBeGreaterThanOrEqual(-1.1);
        expect(output[i]).toBeLessThanOrEqual(1.1);
      }
    });
    
    test('should handle upsampling', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array([0, 0.5, 1.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const output = new Float32Array(40);
      
      // 2x 上采样
      interpolator.resample(input, output, 0.5);
      
      // 输出长度应该正确
      expect(output.length).toBe(40);
    });
    
    test('should handle downsampling', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(100).fill(0);
      for (let i = 0; i < 100; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 100);
      }
      
      const output = new Float32Array(50);
      
      // 2x 下采样
      interpolator.resample(input, output, 2.0);
      
      // 输出长度应该正确
      expect(output.length).toBe(50);
    });
  });
  
  describe('resampleStereo() - Stereo Interleaved', () => {
    test('should resample stereo constant signal', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(200); // 100 frames
      
      // L=0.3, R=0.7
      for (let i = 0; i < 100; i++) {
        input[i * 2] = 0.3;
        input[i * 2 + 1] = 0.7;
      }
      
      const output = new Float32Array(100); // 50 frames
      interpolator.resampleStereo(input, output, 2.0);
      
      // 检查常数值保持
      for (let i = 0; i < 50; i++) {
        expect(output[i * 2]).toBeCloseTo(0.3, 2);
        expect(output[i * 2 + 1]).toBeCloseTo(0.7, 2);
      }
    });
    
    test('should handle stereo sine waves', () => {
      const interpolator = new SincInterpolator();
      
      const inputFrames = 4800;
      const input = new Float32Array(inputFrames * 2);
      
      // L: 1kHz, R: 2kHz
      for (let i = 0; i < inputFrames; i++) {
        input[i * 2] = Math.sin(2 * Math.PI * 1000 * i / 48000);
        input[i * 2 + 1] = Math.sin(2 * Math.PI * 2000 * i / 48000);
      }
      
      const outputFrames = 4410;
      const output = new Float32Array(outputFrames * 2);
      const ratio = 48000 / 44100;
      
      interpolator.resampleStereo(input, output, ratio);
      
      // 检查输出范围
      for (let i = 0; i < outputFrames * 2; i++) {
        expect(output[i]).toBeGreaterThanOrEqual(-1.1);
        expect(output[i]).toBeLessThanOrEqual(1.1);
      }
    });
    
    test('should preserve channel separation', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(200);
      
      // L=1.0, R=0.0
      for (let i = 0; i < 100; i++) {
        input[i * 2] = 1.0;
        input[i * 2 + 1] = 0.0;
      }
      
      const output = new Float32Array(100);
      interpolator.resampleStereo(input, output, 2.0);
      
      // 左声道应该有值，右声道应该接近 0
      for (let i = 0; i < 50; i++) {
        expect(output[i * 2]).toBeCloseTo(1.0, 2);
        expect(Math.abs(output[i * 2 + 1])).toBeLessThan(0.1);
      }
    });
  });
  
  describe('getConfig()', () => {
    test('should return correct configuration', () => {
      const interpolator = new SincInterpolator({
        lobeCount: 12,
        phaseCount: 512,
        beta: 8
      });
      
      const config = interpolator.getConfig();
      
      expect(config.lobeCount).toBe(12);
      expect(config.phaseCount).toBe(512);
      expect(config.beta).toBe(8);
      expect(config.filterLength).toBe(24);
      expect(config.tableSize).toBe(12288);
      expect(parseFloat(config.tableSizeKB)).toBeCloseTo(48, 1);
    });
  });
  
  describe('getStats() and resetStats()', () => {
    test('should track interpolation statistics', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(100);
      const output = new Float32Array(50);
      
      interpolator.resample(input, output, 2.0);
      
      const stats = interpolator.getStats();
      expect(stats.interpolationCount).toBe(50);
      expect(stats.totalSamples).toBe(50);
    });
    
    test('should track stereo statistics', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(200);
      const output = new Float32Array(100);
      
      interpolator.resampleStereo(input, output, 2.0);
      
      const stats = interpolator.getStats();
      expect(stats.interpolationCount).toBe(50);
      expect(stats.totalSamples).toBe(100); // 2 channels
    });
    
    test('should reset statistics', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(100);
      const output = new Float32Array(50);
      
      interpolator.resample(input, output, 2.0);
      interpolator.resetStats();
      
      const stats = interpolator.getStats();
      expect(stats.interpolationCount).toBe(0);
      expect(stats.totalSamples).toBe(0);
    });
  });
  
  describe('Performance', () => {
    test('should generate coefficient table quickly', () => {
      const startTime = Date.now();
      const interpolator = new SincInterpolator();
      const elapsedMs = Date.now() - startTime;
      
      // 应该在 100ms 内完成
      expect(elapsedMs).toBeLessThan(100);
      expect(interpolator.coefficients).toBeDefined();
    });
    
    test('should handle large buffers efficiently', () => {
      const interpolator = new SincInterpolator();
      const input = new Float32Array(48000); // 1 second @ 48kHz
      const output = new Float32Array(44100); // 1 second @ 44.1kHz
      
      const startTime = Date.now();
      interpolator.resample(input, output, 48000 / 44100);
      const elapsedMs = Date.now() - startTime;
      
      // 应该在 50ms 内完成
      expect(elapsedMs).toBeLessThan(50);
    });
  });
});
