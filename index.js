/**
 * Windows Audio Capture - JavaScript API
 * 高级 JavaScript 封装，提供 EventEmitter 接口
 */

const { EventEmitter } = require('events');
const addon = require('node-gyp-build')(__dirname);

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
    enumerateProcesses
};
