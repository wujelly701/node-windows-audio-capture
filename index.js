/**
 * Windows Audio Capture - JavaScript API
 * 高级 JavaScript 封装，提供 EventEmitter 接口
 */

const { EventEmitter } = require('events');
const addon = require('node-gyp-build')(__dirname);

// v2.9.0 - Import MicrophoneCapture from lib/
const { MicrophoneCapture: LibMicrophoneCapture } = require('./lib/microphone-capture');

/**
 * AudioCapture 类 - 音频捕获器
 * @extends EventEmitter
 * @fires AudioCapture#data - 音频数据事件
 * @fires AudioCapture#error - 错误事件
 * @fires AudioCapture#started - 启动事件
 * @fires AudioCapture#stopped - 停止事件
 */
class AudioCapture extends EventEmitter {
    /**
     * 创建音频捕获器实例
     * @param {Object} options - 配置选项
     * @param {number} [options.processId=0] - 目标进程 ID（0 表示捕获所有进程音频）
     * @param {number} [options.sampleRate=44100] - 采样率（Hz）
     * @param {number} [options.channels=2] - 声道数（1=单声道，2=立体声）
     * @param {number} [options.bitDepth=16] - 位深度（8/16/24/32）
     */
    constructor(options = {}) {
        super();
        
        this.options = {
            processId: options.processId || 0,
            sampleRate: options.sampleRate || 44100,
            channels: options.channels || 2,
            bitDepth: options.bitDepth || 16,
            useExternalBuffer: options.useExternalBuffer || false, // v2.6: zero-copy mode
        };
        
        this._processor = null;
        this._isRunning = false;
        this._isPaused = false;
        
        // v2.10.0: 音频统计相关状态
        this._statsEnabled = false;
        this._statsInterval = 500; // 默认 500ms 统计一次
        this._statsBuffer = [];
        this._lastStatsTime = 0;
        this._silenceThreshold = 0.001; // Phase 2: 默认静音阈值
        
        // 创建 Native AudioProcessor 实例
        try {
            const processorOptions = {
                processId: this.options.processId,
                callback: this._onAudioData.bind(this)
            };
            
            // v2.6: Add useExternalBuffer if specified
            if (options.useExternalBuffer !== undefined) {
                processorOptions.useExternalBuffer = Boolean(options.useExternalBuffer);
            }
            
            // v2.7: Add buffer pool configuration
            if (options.bufferPoolStrategy !== undefined) {
                processorOptions.bufferPoolStrategy = options.bufferPoolStrategy;
            }
            if (options.bufferPoolSize !== undefined) {
                processorOptions.bufferPoolSize = options.bufferPoolSize;
            }
            if (options.bufferPoolMin !== undefined) {
                processorOptions.bufferPoolMin = options.bufferPoolMin;
            }
            if (options.bufferPoolMax !== undefined) {
                processorOptions.bufferPoolMax = options.bufferPoolMax;
            }
            
            this._processor = new addon.AudioProcessor(processorOptions);
        } catch (error) {
            this.emit('error', new Error(`Failed to create AudioProcessor: ${error.message}`));
        }
    }
    
    /**
     * 启动音频捕获
     * @returns {Promise<void>}
     */
    async start() {
        if (this._isRunning) {
            throw new Error('AudioCapture is already running');
        }
        
        try {
            // 初始化音频客户端
            const startResult = this._processor.start();
            if (!startResult) {
                throw new Error('Failed to start audio client');
            }
            
            // 启动捕获线程
            const captureResult = this._processor.startCapture();
            if (!captureResult) {
                throw new Error('Failed to start capture thread');
            }
            
            this._isRunning = true;
            this._isPaused = false;
            
            /**
             * 启动事件
             * @event AudioCapture#started
             */
            this.emit('started');
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * 停止音频捕获
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this._isRunning) {
            return;
        }
        
        try {
            // 停止捕获线程
            this._processor.stopCapture();
            
            // 停止音频客户端
            this._processor.stop();
            
            this._isRunning = false;
            this._isPaused = false;
            
            /**
             * 停止事件
             * @event AudioCapture#stopped
             */
            this.emit('stopped');
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * 暂停音频捕获（暂不触发 data 事件）
     */
    pause() {
        if (!this._isRunning) {
            throw new Error('AudioCapture is not running');
        }
        this._isPaused = true;
        this.emit('paused');
    }
    
    /**
     * 恢复音频捕获
     */
    resume() {
        if (!this._isRunning) {
            throw new Error('AudioCapture is not running');
        }
        this._isPaused = false;
        this.emit('resumed');
    }
    
    /**
     * 获取当前运行状态
     * @returns {boolean}
     */
    isRunning() {
        return this._isRunning;
    }
    
    /**
     * 获取暂停状态
     * @returns {boolean}
     */
    isPaused() {
        return this._isPaused;
    }
    
    /**
     * 获取配置选项
     * @returns {Object}
     */
    getOptions() {
        return { ...this.options };
    }
    
    /**
     * 内部音频数据回调（从 Native 层调用）
     * @private
     * @param {Buffer} buffer - 音频数据缓冲区
     */
    _onAudioData(buffer) {
        if (this._isPaused) {
            return;
        }
        
        // v2.10.0: 收集统计数据
        if (this._statsEnabled) {
            this._statsBuffer.push(buffer);
            
            const now = Date.now();
            if (now - this._lastStatsTime >= this._statsInterval) {
                this._calculateAndEmitStats();
                this._lastStatsTime = now;
            }
        }
        
        /**
         * 音频数据事件
         * @event AudioCapture#data
         * @type {Object}
         * @property {Buffer} buffer - PCM 音频数据缓冲区
         * @property {number} length - 数据字节数
         * @property {number} timestamp - 时间戳（毫秒）
         */
        this.emit('data', {
            buffer: buffer,
            length: buffer.length,
            timestamp: Date.now()
        });
    }
    
    /**
     * v2.10.0: 计算并发射音频统计数据
     * @private
     */
    _calculateAndEmitStats() {
        if (this._statsBuffer.length === 0) {
            return;
        }
        
        try {
            // 合并所有缓冲的数据
            const totalBuffer = Buffer.concat(this._statsBuffer);
            this._statsBuffer = [];
            
            // 调用 C++ 层计算统计
            const stats = this._processor.calculateAudioStats(totalBuffer);
            
            /**
             * 音频统计事件
             * @event AudioCapture#stats
             * @type {Object}
             * @property {number} peak - 峰值 (0.0 - 1.0)
             * @property {number} rms - 均方根 (0.0 - 1.0)
             * @property {number} db - 分贝值 (-∞ to 0 dB)
             * @property {number} volumePercent - 音量百分比 (0 - 100)
             * @property {boolean} isSilence - 是否静音 (RMS < 0.001)
             * @property {number} timestamp - Unix 时间戳（毫秒）
             */
            this.emit('stats', stats);
        } catch (error) {
            this.emit('error', new Error(`Failed to calculate audio stats: ${error.message}`));
        }
    }
    
    /**
     * v2.10.0: 启用音频统计
     * Phase 2: Added silenceThreshold configuration
     * @param {Object} options - 统计选项
     * @param {number} [options.interval=500] - 统计间隔（毫秒）
     * @param {number} [options.silenceThreshold=0.001] - 静音检测阈值（RMS，默认 0.001）
     */
    enableStats(options = {}) {
        this._statsEnabled = true;
        this._statsInterval = options.interval || 500;
        this._statsBuffer = [];
        this._lastStatsTime = Date.now();
        
        // Phase 2: 设置静音阈值
        if (options.silenceThreshold !== undefined) {
            this.setSilenceThreshold(options.silenceThreshold);
        }
    }
    
    /**
     * Phase 2: 设置静音检测阈值
     * @param {number} threshold - 静音阈值（RMS，0.0 - 1.0）
     */
    setSilenceThreshold(threshold) {
        if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
            throw new Error('Silence threshold must be a number between 0 and 1');
        }
        this._silenceThreshold = threshold;
        
        // 如果 processor 已初始化，更新 C++ 层阈值
        if (this._processor && this._processor.setSilenceThreshold) {
            this._processor.setSilenceThreshold(threshold);
        }
    }
    
    /**
     * Phase 2: 获取当前静音检测阈值
     * @returns {number} 当前阈值
     */
    getSilenceThreshold() {
        return this._silenceThreshold;
    }
    
    /**
     * v2.10.0: 禁用音频统计
     */
    disableStats() {
        this._statsEnabled = false;
        this._statsBuffer = [];
    }
    
    /**
     * v2.10.0: 获取统计是否启用
     * @returns {boolean}
     */
    isStatsEnabled() {
        return this._statsEnabled;
    }
    
    /**
     * v2.10.0: 手动计算音频统计（一次性）
     * @param {Buffer} buffer - 音频数据缓冲区
     * @returns {Object} 统计数据
     */
    calculateStats(buffer) {
        if (!this._processor) {
            throw new Error('AudioCapture not initialized');
        }
        return this._processor.calculateAudioStats(buffer);
    }

    /**
     * v2.3: 获取所有音频输出设备
     * @static
     * @returns {Promise<Array>} 设备列表
     */
    static async getAudioDevices() {
        try {
            return addon.getAudioDevices();
        } catch (error) {
            throw new Error(`Failed to get audio devices: ${error.message}`);
        }
    }

    /**
     * v2.3: 获取默认音频输出设备 ID
     * @static
     * @returns {Promise<string|null>} 默认设备 ID
     */
    static async getDefaultDeviceId() {
        try {
            const deviceId = addon.getDefaultDeviceId();
            return deviceId || null;
        } catch (error) {
            throw new Error(`Failed to get default device ID: ${error.message}`);
        }
    }

    /**
     * v2.4: 开始监控设备事件（热插拔、设备更改等）
     * @static
     * @param {Function} callback - 设备事件回调函数
     */
    static startDeviceMonitoring(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        
        try {
            addon.startDeviceMonitoring(callback);
        } catch (error) {
            throw new Error(`Failed to start device monitoring: ${error.message}`);
        }
    }

    /**
     * v2.4: 停止监控设备事件
     * @static
     */
    static stopDeviceMonitoring() {
        try {
            addon.stopDeviceMonitoring();
        } catch (error) {
            throw new Error(`Failed to stop device monitoring: ${error.message}`);
        }
    }

    /**
     * 枚举所有运行中的进程（包含音频会话的进程）
     * @static
     * @returns {Array} 进程列表
     */
    static getProcesses() {
        try {
            return addon.enumerateProcesses();
        } catch (error) {
            throw new Error(`Failed to enumerate processes: ${error.message}`);
        }
    }

    /**
     * v2.6: 获取缓冲池统计信息（仅零拷贝模式）
     * @returns {Object|null} 缓冲池统计信息，非零拷贝模式返回 null
     * 
     * 返回对象包含以下属性：
     * - poolHits: 从缓冲池成功获取缓冲区的次数
     * - poolMisses: 缓冲池为空，回退到动态分配的次数
     * - dynamicAllocations: 动态分配的总次数
     * - currentPoolSize: 当前缓冲池中缓冲区数量
     * - maxPoolSize: 缓冲池最大容量
     * - hitRate: 缓冲池命中率百分比（0-100）
     */
    getPoolStats() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getPoolStats();
        } catch (error) {
            throw new Error(`Failed to get pool statistics: ${error.message}`);
        }
    }

    /**
     * v2.7: 启用/禁用 RNNoise 降噪
     * @param {boolean} enabled - true 启用, false 禁用
     * @throws {Error} 如果 AudioProcessor 未初始化或操作失败
     */
    setDenoiseEnabled(enabled) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            this._processor.setDenoiseEnabled(Boolean(enabled));
        } catch (error) {
            throw new Error(`Failed to set denoise: ${error.message}`);
        }
    }

    /**
     * v2.7: 获取 RNNoise 降噪统计信息
     * @returns {Object} 降噪统计信息
     * 
     * 返回对象包含以下属性：
     * - framesProcessed: 已处理的音频帧数
     * - vadProbability: 语音活动检测概率 (0.0-1.0)
     */
    getDenoiseStats() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getDenoiseStats();
        } catch (error) {
            throw new Error(`Failed to get denoise statistics: ${error.message}`);
        }
    }

    /**
     * v2.8: 启用或禁用 AGC (自动增益控制)
     * @param {boolean} enabled - true 启用，false 禁用
     */
    setAGCEnabled(enabled) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        if (typeof enabled !== 'boolean') {
            throw new TypeError('enabled must be a boolean');
        }
        
        try {
            this._processor.setAGCEnabled(enabled);
        } catch (error) {
            throw new Error(`Failed to set AGC state: ${error.message}`);
        }
    }

    /**
     * v2.8: 获取当前 AGC 状态
     * @returns {boolean} true 如果 AGC 已启用，否则 false
     */
    getAGCEnabled() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getAGCEnabled();
        } catch (error) {
            throw new Error(`Failed to get AGC state: ${error.message}`);
        }
    }

    /**
     * v2.8: 设置 AGC 配置选项
     * @param {Object} options - AGC 配置参数
     * @param {number} [options.targetLevel] - 目标输出电平 (dBFS)
     * @param {number} [options.maxGain] - 最大增益 (dB)
     * @param {number} [options.minGain] - 最小增益 (dB)
     * @param {number} [options.attackTime] - 攻击时间 (ms)
     * @param {number} [options.releaseTime] - 释放时间 (ms)
     */
    setAGCOptions(options) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        if (typeof options !== 'object' || options === null) {
            throw new TypeError('options must be an object');
        }
        
        try {
            this._processor.setAGCOptions(options);
        } catch (error) {
            throw new Error(`Failed to set AGC options: ${error.message}`);
        }
    }

    /**
     * v2.8: 获取当前 AGC 配置选项
     * @returns {Object} AGC 配置对象
     */
    getAGCOptions() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getAGCOptions();
        } catch (error) {
            throw new Error(`Failed to get AGC options: ${error.message}`);
        }
    }

    /**
     * v2.8: 获取 AGC 处理统计信息
     * @returns {Object} AGC 统计信息
     * 
     * 返回对象包含以下属性：
     * - enabled: AGC 是否启用
     * - currentGain: 当前应用的增益 (dB)
     * - averageLevel: 平均输入电平 (dBFS)
     * - rmsLinear: 当前 RMS 值（线性）
     * - clipping: 是否检测到削波
     * - framesProcessed: 已处理的音频帧数
     */
    getAGCStats() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getAGCStats();
        } catch (error) {
            throw new Error(`Failed to get AGC statistics: ${error.message}`);
        }
    }

    // ==================== v2.1: 音频会话静音控制 ====================

    /**
     * v2.1: 启用或禁用"静音其他进程"功能
     * 
     * 当启用时，除了目标进程和白名单中的进程外，其他所有音频会话都会被静音。
     * 这对于只捕获特定应用音频非常有用（如游戏音频录制）。
     * 
     * @param {boolean} enabled - true 启用静音其他进程，false 禁用
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * 
     * @example
     * const capture = new AudioCapture({ processId: 1234 });
     * 
     * // 启用静音其他进程（只捕获 PID 1234 的音频）
     * capture.setMuteOtherProcesses(true);
     * 
     * await capture.start();
     */
    setMuteOtherProcesses(enabled) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        if (typeof enabled !== 'boolean') {
            throw new TypeError('enabled must be a boolean');
        }
        
        try {
            this._processor.setMuteOtherProcesses(enabled);
        } catch (error) {
            throw new Error(`Failed to set mute other processes: ${error.message}`);
        }
    }

    /**
     * v2.1: 获取"静音其他进程"功能的当前状态
     * 
     * @returns {boolean} 如果启用了静音其他进程则返回 true
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * 
     * @example
     * const isMuting = capture.isMutingOtherProcesses();
     * console.log('Muting other processes:', isMuting);
     */
    isMutingOtherProcesses() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.isMutingOtherProcesses();
        } catch (error) {
            throw new Error(`Failed to check mute status: ${error.message}`);
        }
    }

    /**
     * v2.1: 设置白名单（允许名单）
     * 
     * 白名单中的进程不会被静音，即使启用了"静音其他进程"功能。
     * 这允许你选择性地允许某些进程的音频通过。
     * 
     * @param {number[]} processIds - 进程 ID 数组
     * @throws {TypeError} 如果参数不是数组
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * 
     * @example
     * // 只允许 PID 1234 和 5678 的音频通过
     * capture.setMuteOtherProcesses(true);
     * capture.setAllowList([1234, 5678]);
     * 
     * // 清空白名单
     * capture.setAllowList([]);
     */
    setAllowList(processIds) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        if (!Array.isArray(processIds)) {
            throw new TypeError('processIds must be an array');
        }
        
        // Validate all elements are numbers
        for (const pid of processIds) {
            if (typeof pid !== 'number' || !Number.isInteger(pid) || pid < 0) {
                throw new TypeError('All process IDs must be non-negative integers');
            }
        }
        
        try {
            this._processor.setAllowList(processIds);
        } catch (error) {
            throw new Error(`Failed to set allow list: ${error.message}`);
        }
    }

    /**
     * v2.1: 获取当前的白名单（允许名单）
     * 
     * @returns {number[]} 进程 ID 数组
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * 
     * @example
     * const allowList = capture.getAllowList();
     * console.log('Allowed process IDs:', allowList);
     */
    getAllowList() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getAllowList();
        } catch (error) {
            throw new Error(`Failed to get allow list: ${error.message}`);
        }
    }

    /**
     * v2.1: 设置黑名单（屏蔽名单）
     * 
     * 黑名单中的进程会被强制静音，无论是否启用"静音其他进程"功能。
     * 这允许你选择性地屏蔽某些进程的音频。
     * 
     * @param {number[]} processIds - 进程 ID 数组
     * @throws {TypeError} 如果参数不是数组
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * 
     * @example
     * // 屏蔽 PID 999 和 888 的音频
     * capture.setBlockList([999, 888]);
     * 
     * // 清空黑名单
     * capture.setBlockList([]);
     */
    setBlockList(processIds) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        if (!Array.isArray(processIds)) {
            throw new TypeError('processIds must be an array');
        }
        
        // Validate all elements are numbers
        for (const pid of processIds) {
            if (typeof pid !== 'number' || !Number.isInteger(pid) || pid < 0) {
                throw new TypeError('All process IDs must be non-negative integers');
            }
        }
        
        try {
            this._processor.setBlockList(processIds);
        } catch (error) {
            throw new Error(`Failed to set block list: ${error.message}`);
        }
    }

    /**
     * v2.1: 获取当前的黑名单（屏蔽名单）
     * 
     * @returns {number[]} 进程 ID 数组
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * 
     * @example
     * const blockList = capture.getBlockList();
     * console.log('Blocked process IDs:', blockList);
     */
    getBlockList() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getBlockList();
        } catch (error) {
            throw new Error(`Failed to get block list: ${error.message}`);
        }
    }

    // ==================== v2.8: 3-Band EQ Methods ====================

    /**
     * 启用或禁用 3-Band EQ
     * @param {boolean} enabled - true 启用，false 禁用
     */
    setEQEnabled(enabled) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            this._processor.setEQEnabled(Boolean(enabled));
        } catch (error) {
            throw new Error(`Failed to set EQ enabled state: ${error.message}`);
        }
    }

    /**
     * 获取 EQ 启用状态
     * @returns {boolean} EQ 是否启用
     */
    getEQEnabled() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getEQEnabled();
        } catch (error) {
            throw new Error(`Failed to get EQ enabled state: ${error.message}`);
        }
    }

    /**
     * 设置 EQ 频段增益
     * @param {string} band - 频段名称: 'low', 'mid', 'high'
     * @param {number} gain - 增益 (dB)，范围 -20 到 +20
     */
    setEQBandGain(band, gain) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }

        // 验证参数
        const validBands = ['low', 'mid', 'high'];
        if (!validBands.includes(band)) {
            throw new Error(`Invalid band name. Expected 'low', 'mid', or 'high', got '${band}'`);
        }

        if (typeof gain !== 'number' || isNaN(gain)) {
            throw new Error(`Invalid gain value. Expected number, got ${typeof gain}`);
        }
        
        try {
            this._processor.setEQBandGain(band, gain);
        } catch (error) {
            throw new Error(`Failed to set EQ band gain: ${error.message}`);
        }
    }

    /**
     * 获取 EQ 频段增益
     * @param {string} band - 频段名称: 'low', 'mid', 'high'
     * @returns {number} 增益 (dB)
     */
    getEQBandGain(band) {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }

        // 验证参数
        const validBands = ['low', 'mid', 'high'];
        if (!validBands.includes(band)) {
            throw new Error(`Invalid band name. Expected 'low', 'mid', or 'high', got '${band}'`);
        }
        
        try {
            return this._processor.getEQBandGain(band);
        } catch (error) {
            throw new Error(`Failed to get EQ band gain: ${error.message}`);
        }
    }

    /**
     * 获取 EQ 统计信息
     * @returns {Object} EQ 统计信息
     * @returns {boolean} .enabled - EQ 是否启用
     * @returns {number} .lowGain - 低频增益 (dB)
     * @returns {number} .midGain - 中频增益 (dB)
     * @returns {number} .highGain - 高频增益 (dB)
     * @returns {number} .framesProcessed - 已处理的帧数
     */
    getEQStats() {
        if (!this._processor) {
            throw new Error('AudioProcessor not initialized');
        }
        
        try {
            return this._processor.getEQStats();
        } catch (error) {
            throw new Error(`Failed to get EQ statistics: ${error.message}`);
        }
    }
}

/**
 * 获取默认音频设备信息
 * @returns {Object} 设备信息 { name: string, id: string }
 */
function getDeviceInfo() {
    try {
        return addon.getDeviceInfo();
    } catch (error) {
        throw new Error(`Failed to get device info: ${error.message}`);
    }
}

/**
 * 枚举所有运行中的进程
 * @returns {Array<Object>} 进程列表 [{ pid: number, name: string }]
 */
function enumerateProcesses() {
    try {
        return addon.enumerateProcesses();
    } catch (error) {
        throw new Error(`Failed to enumerate processes: ${error.message}`);
    }
}

module.exports = {
    AudioCapture,
    getDeviceInfo,
    enumerateProcesses,
    // v2.9.0 - Microphone Capture API
    MicrophoneCapture: LibMicrophoneCapture
};
