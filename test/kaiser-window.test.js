/**
 * KaiserWindow 单元测试
 */

const KaiserWindow = require('../lib/kaiser-window');

describe('KaiserWindow', () => {
  describe('Constructor', () => {
    test('should create with default parameters', () => {
      const window = new KaiserWindow();
      expect(window.beta).toBe(7);
      expect(window.length).toBe(32);
      expect(window.window).toBeInstanceOf(Float32Array);
      expect(window.window.length).toBe(32);
    });
    
    test('should create with custom parameters', () => {
      const window = new KaiserWindow(10, 64);
      expect(window.beta).toBe(10);
      expect(window.length).toBe(64);
      expect(window.window.length).toBe(64);
    });
    
    test('should throw error for negative beta', () => {
      expect(() => new KaiserWindow(-1)).toThrow('beta must be non-negative');
    });
    
    test('should throw error for length < 2', () => {
      expect(() => new KaiserWindow(7, 1)).toThrow('length must be >= 2');
    });
    
    test('should throw error for odd length', () => {
      expect(() => new KaiserWindow(7, 33)).toThrow('length must be even');
    });
  });
  
  describe('Bessel I0 Function', () => {
    test('should compute I0(0) = 1', () => {
      const window = new KaiserWindow();
      const result = window._besselI0(0);
      expect(result).toBeCloseTo(1.0, 10);
    });
    
    test('should compute I0(1) ≈ 1.266', () => {
      const window = new KaiserWindow();
      const result = window._besselI0(1);
      expect(result).toBeCloseTo(1.266, 3);
    });
    
    test('should compute I0(5) ≈ 27.240', () => {
      const window = new KaiserWindow();
      const result = window._besselI0(5);
      expect(result).toBeCloseTo(27.240, 2);
    });
    
    test('should compute I0(10) ≈ 2815.717', () => {
      const window = new KaiserWindow();
      const result = window._besselI0(10);
      expect(result).toBeCloseTo(2815.717, 1);
    });
  });
  
  describe('Window Generation', () => {
    test('should generate symmetric window', () => {
      const window = new KaiserWindow(7, 32);
      const w = window.window;
      
      // 检查对称性
      for (let i = 0; i < 16; i++) {
        expect(w[i]).toBeCloseTo(w[31 - i], 6);
      }
    });
    
    test('should have maximum at center', () => {
      const window = new KaiserWindow(7, 32);
      const w = window.window;
      const center1 = w[15];
      const center2 = w[16];
      
      // 对于偶数长度，中间两个值应该最大且相等
      expect(center1).toBeCloseTo(center2, 3);
      expect(center1).toBeGreaterThan(0.99); // 接近 1.0
      
      // 中心值应该是最大值
      for (let i = 0; i < 15; i++) {
        expect(w[i]).toBeLessThan(center1);
      }
      for (let i = 17; i < 32; i++) {
        expect(w[i]).toBeLessThan(center1);
      }
    });
    
    test('should have minimum at edges', () => {
      const window = new KaiserWindow(7, 32);
      const w = window.window;
      const edge = w[0];
      
      // 边缘值应该小于中心值
      expect(edge).toBeLessThan(1.0);
      
      // 边缘值应该大于 0
      expect(edge).toBeGreaterThan(0);
    });
    
    test('should generate valid window for beta=5', () => {
      const window = new KaiserWindow(5, 32);
      const stats = window.getStats();
      
      expect(stats.beta).toBe(5);
      expect(stats.centerValue).toBeGreaterThan(0.99); // Close to 1.0
      expect(stats.edgeValue).toBeGreaterThan(0);
      expect(stats.edgeValue).toBeLessThan(1.0);
    });
    
    test('should generate valid window for beta=10', () => {
      const window = new KaiserWindow(10, 32);
      const stats = window.getStats();
      
      expect(stats.beta).toBe(10);
      expect(stats.centerValue).toBeGreaterThan(0.99); // Close to 1.0
      expect(stats.edgeValue).toBeGreaterThan(0);
      expect(stats.edgeValue).toBeLessThan(1.0);
    });
    
    test('should have lower edge value for higher beta', () => {
      const window5 = new KaiserWindow(5, 32);
      const window10 = new KaiserWindow(10, 32);
      
      const edge5 = window5.window[0];
      const edge10 = window10.window[0];
      
      // 更高的 beta 应该有更小的边缘值 (更强的衰减)
      expect(edge10).toBeLessThan(edge5);
    });
  });
  
  describe('getWindow()', () => {
    test('should return Float32Array', () => {
      const window = new KaiserWindow();
      const w = window.getWindow();
      expect(w).toBeInstanceOf(Float32Array);
    });
    
    test('should return correct length', () => {
      const window = new KaiserWindow(7, 64);
      const w = window.getWindow();
      expect(w.length).toBe(64);
    });
  });
  
  describe('getValue()', () => {
    test('should return correct value at index', () => {
      const window = new KaiserWindow(7, 32);
      const centerValue = window.getValue(15);
      expect(centerValue).toBeGreaterThan(0.99); // Close to 1.0
    });
    
    test('should throw error for negative index', () => {
      const window = new KaiserWindow();
      expect(() => window.getValue(-1)).toThrow('out of bounds');
    });
    
    test('should throw error for index >= length', () => {
      const window = new KaiserWindow(7, 32);
      expect(() => window.getValue(32)).toThrow('out of bounds');
    });
  });
  
  describe('getStats()', () => {
    test('should return correct statistics', () => {
      const window = new KaiserWindow(7, 32);
      const stats = window.getStats();
      
      expect(stats).toHaveProperty('beta');
      expect(stats).toHaveProperty('length');
      expect(stats).toHaveProperty('min');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('mean');
      expect(stats).toHaveProperty('centerValue');
      expect(stats).toHaveProperty('edgeValue');
      
      expect(stats.beta).toBe(7);
      expect(stats.length).toBe(32);
      expect(stats.max).toBeGreaterThan(0.99); // Close to 1.0
      expect(stats.min).toBeGreaterThan(0);
      expect(stats.centerValue).toBeGreaterThan(0.99); // Close to 1.0
    });
    
    test('should compute correct mean', () => {
      const window = new KaiserWindow(7, 32);
      const stats = window.getStats();
      
      // 手动计算均值验证
      let sum = 0;
      for (let i = 0; i < window.window.length; i++) {
        sum += window.window[i];
      }
      const expectedMean = sum / window.window.length;
      
      expect(stats.mean).toBeCloseTo(expectedMean, 10);
    });
  });
  
  describe('apply()', () => {
    test('should apply window to signal', () => {
      const window = new KaiserWindow(7, 32);
      const signal = new Float32Array(32).fill(1.0);
      const windowed = window.apply(signal);
      
      expect(windowed).toBeInstanceOf(Float32Array);
      expect(windowed.length).toBe(32);
      
      // 中心应该接近 1.0
      expect(windowed[15]).toBeGreaterThan(0.99);
      
      // 边缘应该小于 1.0
      expect(windowed[0]).toBeLessThan(1.0);
    });
    
    test('should throw error for mismatched length', () => {
      const window = new KaiserWindow(7, 32);
      const signal = new Float32Array(16);
      
      expect(() => window.apply(signal)).toThrow('does not match window length');
    });
    
    test('should work with regular array', () => {
      const window = new KaiserWindow(7, 32);
      const signal = new Array(32).fill(1.0);
      const windowed = window.apply(signal);
      
      expect(windowed).toBeInstanceOf(Float32Array);
      expect(windowed.length).toBe(32);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle minimum length (2)', () => {
      const window = new KaiserWindow(5, 2);
      expect(window.window.length).toBe(2);
      expect(window.window[0]).toBeGreaterThan(0);
      expect(window.window[1]).toBeGreaterThan(0);
    });
    
    test('should handle large length', () => {
      const window = new KaiserWindow(7, 256);
      expect(window.window.length).toBe(256);
      
      const stats = window.getStats();
      expect(stats.max).toBeGreaterThan(0.999); // Very close to 1.0 for large length
    });
    
    test('should handle beta = 0', () => {
      // beta=0 应该产生矩形窗口
      const window = new KaiserWindow(0, 32);
      const w = window.window;
      
      // 所有值应该接近 1.0
      for (let i = 0; i < 32; i++) {
        expect(w[i]).toBeCloseTo(1.0, 3);
      }
    });
  });
});
