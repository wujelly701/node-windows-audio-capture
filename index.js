/**
 * Windows Audio Capture - JavaScript API
 * 高级 JavaScript 封装，提供 EventEmitter 接口
 */

const { EventEmitter } = require('events');
const addon = require('./build/Release/audio_addon.node');

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
        };
        
        this._processor = null;
        this._isRunning = false;
        this._isPaused = false;
        
        // 创建 Native AudioProcessor 实例
        try {
            this._processor = new addon.AudioProcessor({
                processId: this.options.processId,
                callback: this._onAudioData.bind(this)
            });
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
