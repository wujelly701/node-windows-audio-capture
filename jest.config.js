/**
 * Jest configuration for node-windows-audio-capture
 */

module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/**/*.test.js',
        '**/__tests__/**/*.test.js'
    ],
    collectCoverageFrom: [
        'index.js',
        'src/**/*.{js,ts}',
        '!src/**/*.d.ts',
        '!**/node_modules/**',
        '!**/build/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000, // 30 seconds (音频测试需要时间)
    verbose: true,
    bail: false,
    maxWorkers: 1 // 串行执行测试避免音频设备冲突
};
