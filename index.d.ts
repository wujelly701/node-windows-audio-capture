/**
 * Type definitions for node-windows-audio-capture
 * Windows 音频捕获 Node.js Native Addon
 */

/// <reference types="node" />

import { EventEmitter } from 'events';

/**
 * v2.7: Buffer Pool 策略
 * @since 2.7.0
 */
export type BufferPoolStrategy = 'fixed' | 'adaptive';

/**
 * v2.7: 音频效果配置
 * @since 2.7.0
 */
export interface AudioEffectsOptions {
    /**
     * 启用音频降噪（RNNoise deep learning）
     * - 典型降噪效果：15-25 dB
     * - CPU 开销：3-5%
     * - 延迟：< 10ms（480 samples @ 48kHz）
     * @default false
     */
    denoise?: boolean;
}

/**
 * 音频捕获配置选项
 */
export interface AudioCaptureOptions {
    /**
     * 目标进程 ID（0 表示捕获所有进程音频）
     * @default 0
     */
    processId?: number;
    
    /**
     * v2.3: 音频输出设备 ID
     * 如果不指定，则使用系统默认设备
     * 使用 AudioCapture.getAudioDevices() 获取可用设备列表
     * @since 2.3.0
     */
    deviceId?: string;
    
    /**
     * 采样率（Hz）
     * @default 44100
     */
    sampleRate?: number;
    
    /**
     * 声道数（1=单声道，2=立体声）
     * @default 2
     */
    channels?: number;
    
    /**
     * 位深度（8/16/24/32）
     * @default 16
     */
    bitDepth?: number;
    
    /**
     * Loopback 模式（0=排除目标进程，1=仅包含目标进程）
     * @default 0
     * @since 2.0.0
     */
    loopbackMode?: 0 | 1;
    
    /**
     * v2.6: 使用零拷贝模式（外部缓冲池）
     * 启用后可大幅减少内存拷贝，提升性能约 20-30%
     * @default true
     * @since 2.6.0
     */
    useExternalBuffer?: boolean;
    
    /**
     * v2.7: Buffer Pool 策略
     * - 'fixed': 固定池大小（默认）
     * - 'adaptive': 自适应调整（50-200，目标 hit rate 2-5%）
     * @default 'fixed'
     * @since 2.7.0
     */
    bufferPoolStrategy?: BufferPoolStrategy;
    
    /**
     * v2.7: Buffer Pool 初始/固定大小
     * - 'fixed' 策略：固定池大小
     * - 'adaptive' 策略：初始池大小
     * @default 100 (fixed), 50 (adaptive)
     * @since 2.7.0
     */
    bufferPoolSize?: number;
    
    /**
     * v2.7: Adaptive 策略最小池大小
     * 仅在 bufferPoolStrategy='adaptive' 时生效
     * @default 50
     * @since 2.7.0
     */
    bufferPoolMin?: number;
    
    /**
     * v2.7: Adaptive 策略最大池大小
     * 仅在 bufferPoolStrategy='adaptive' 时生效
     * @default 200
     * @since 2.7.0
     */
    bufferPoolMax?: number;
    
    /**
     * v2.7: 音频效果配置
     * @since 2.7.0
     */
    effects?: AudioEffectsOptions;
}

/**
 * 音频数据事件对象
 */
export interface AudioDataEvent {
    /**
     * PCM 音频数据缓冲区
     */
    buffer: Buffer;
    
    /**
     * 数据字节数
     */
    length: number;
    
    /**
     * 时间戳（毫秒）
     */
    timestamp: number;
}

/**
 * v2.10.0: 音频统计数据
 * @since 2.10.0
 */
export interface AudioStats {
    /**
     * 峰值振幅 (0.0 - 1.0)
     * 表示音频片段中的最大绝对振幅
     */
    peak: number;
    
    /**
     * 均方根 (0.0 - 1.0)
     * 表示音频的平均能量水平
     */
    rms: number;
    
    /**
     * 分贝值 (-∞ to 0 dB)
     * 对数刻度的音量表示，0 dB 为最大值
     */
    db: number;
    
    /**
     * 音量百分比 (0 - 100)
     * 线性刻度的音量表示
     */
    volumePercent: number;
    
    /**
     * 是否静音
     * 当 RMS < 0.001 时为 true
     */
    isSilence: boolean;
    
    /**
     * Unix 时间戳（毫秒）
     */
    timestamp: number;
}

/**
 * v2.10.0: 音频统计选项
 * Phase 2: Added silenceThreshold configuration
 * @since 2.10.0
 */
export interface AudioStatsOptions {
    /**
     * 统计间隔（毫秒）
     * @default 500
     */
    interval?: number;
    
    /**
     * 静音检测阈值（RMS）
     * 当 RMS < silenceThreshold 时，isSilence 为 true
     * @default 0.001
     * @range 0.0 - 1.0
     * @since 2.10.0 Phase 2
     */
    silenceThreshold?: number;
}

/**
 * v2.11.0: 频谱分析配置选项
 * @since 2.11.0
 */
export interface SpectrumAnalyzerOptions {
    /**
     * FFT 大小（必须是 2 的幂）
     * 注意：必须小于音频缓冲区的样本数
     * @default 2048
     * @range 256 - 8192
     */
    fftSize?: number;
    
    /**
     * 频谱更新间隔（毫秒）
     * @default 100
     * @range 10 - 1000
     */
    interval?: number;
    
    /**
     * 频谱平滑因子（0 = 无平滑，1 = 最大平滑）
     * @default 0.8
     * @range 0.0 - 1.0
     */
    smoothing?: number;
    
    /**
     * 自定义频段配置
     * 如果不指定，使用默认的 7 频段均衡器配置
     */
    frequencyBands?: FrequencyBandConfig[];
    
    /**
     * 语音检测配置
     */
    voiceDetection?: VoiceDetectionConfig;
}

/**
 * v2.11.0: 频段配置
 * @since 2.11.0
 */
export interface FrequencyBandConfig {
    /**
     * 最小频率（Hz）
     */
    minFreq: number;
    
    /**
     * 最大频率（Hz）
     */
    maxFreq: number;
    
    /**
     * 频段名称（可选）
     */
    name?: string;
}

/**
 * v2.11.0: 语音检测配置
 * @since 2.11.0
 */
export interface VoiceDetectionConfig {
    /**
     * 语音检测阈值（0-1）
     * 当语音概率超过此值时，isVoice 为 true
     * @default 0.3
     * @range 0.0 - 1.0
     */
    threshold?: number;
    
    /**
     * 语音频率范围最小值（Hz）
     * 人类语音通常在 300-3400Hz
     * @default 300
     */
    minFreq?: number;
    
    /**
     * 语音频率范围最大值（Hz）
     * @default 3400
     */
    maxFreq?: number;
}

/**
 * v2.11.0: 频段分析结果
 * @since 2.11.0
 */
export interface FrequencyBand {
    /**
     * 最小频率（Hz）
     */
    minFreq: number;
    
    /**
     * 最大频率（Hz）
     */
    maxFreq: number;
    
    /**
     * 频段能量（线性）
     */
    energy: number;
    
    /**
     * 频段能量（分贝）
     */
    db: number;
    
    /**
     * 频段名称
     */
    name: string;
}

/**
 * v2.11.0: 频谱分析结果
 * @since 2.11.0
 */
export interface SpectrumData {
    /**
     * FFT 幅度谱（Float32Array）
     * 长度为 fftSize / 2
     */
    magnitudes: Float32Array;
    
    /**
     * 频段分析结果
     */
    bands: FrequencyBand[];
    
    /**
     * 语音概率（0-1）
     * 表示当前音频中语音成分的占比
     */
    voiceProbability: number;
    
    /**
     * 频谱质心（Hz）
     * 表示频谱能量的"重心"位置
     */
    spectralCentroid: number;
    
    /**
     * 主频率（Hz）
     * 能量最大的频率分量
     */
    dominantFrequency: number;
    
    /**
     * 是否检测到语音
     * 当 voiceProbability > threshold 时为 true
     */
    isVoice: boolean;
    
    /**
     * 时间戳（毫秒）
     */
    timestamp: number;
}

/**
 * v2.11.0: 频谱分析器配置信息（只读）
 * @since 2.11.0
 */
export interface SpectrumConfig {
    /**
     * 是否已启用
     */
    enabled: boolean;
    
    /**
     * FFT 大小
     */
    fftSize: number;
    
    /**
     * 采样率（Hz）
     */
    sampleRate: number;
    
    /**
     * 更新间隔（毫秒）
     */
    interval: number;
    
    /**
     * 平滑因子
     */
    smoothing: number;
    
    /**
     * 频段配置（[minFreq, maxFreq][]）
     */
    frequencyBands: [number, number][];
    
    /**
     * 语音检测配置
     */
    voiceDetection: VoiceDetectionConfig;
}

/**
 * v2.3: 音频设备详细信息
 * @since 2.3.0
 */
export interface AudioDeviceInfo {
    /**
     * 设备唯一标识符
     */
    id: string;
    
    /**
     * 设备友好名称
     */
    name: string;
    
    /**
     * 设备描述
     */
    description: string;
    
    /**
     * 是否为系统默认设备
     */
    isDefault: boolean;
    
    /**
     * 设备是否处于活动状态
     */
    isActive: boolean;
}

/**
 * v2.4: 设备事件类型
 * @since 2.4.0
 */
export type DeviceEventType = 
    | 'deviceAdded'           // 设备已添加（热插拔）
    | 'deviceRemoved'         // 设备已移除（热拔出）
    | 'defaultDeviceChanged'  // 默认设备已更改
    | 'deviceStateChanged'    // 设备状态已更改
    | 'devicePropertyChanged'; // 设备属性已更改

/**
 * v2.4: 设备事件数据
 * @since 2.4.0
 */
export interface DeviceEvent {
    /**
     * 事件类型
     */
    type: DeviceEventType;
    
    /**
     * 设备 ID
     */
    deviceId: string;
    
    /**
     * 设备状态（仅当 type='deviceStateChanged' 时有值）
     * 1=ACTIVE, 2=DISABLED, 4=NOT_PRESENT, 8=UNPLUGGED
     */
    state?: number;
    
    /**
     * 数据流方向（仅当 type='defaultDeviceChanged' 时有值）
     * 0=Render(输出), 1=Capture(输入), 2=All
     */
    dataFlow?: number;
    
    /**
     * 设备角色（仅当 type='defaultDeviceChanged' 时有值）
     * 0=Console, 1=Multimedia, 2=Communications
     */
    role?: number;
}

/**
 * @deprecated Use AudioDeviceInfo instead
 * @since 1.0.0
 */
export interface DeviceInfo {
    /**
     * 设备友好名称
     */
    name: string;
    
    /**
     * 设备唯一标识符
     */
    id: string;
}

/**
 * 进程信息
 */
export interface ProcessInfo {
    /**
     * 进程 ID
     */
    pid: number;
    
    /**
     * 进程名称
     */
    name: string;
}

/**
 * v2.6: Buffer Pool 统计信息（零拷贝模式）
 * @since 2.6.0
 */
export interface BufferPoolStats {
    /**
     * 成功从池中获取 buffer 的次数
     */
    poolHits: number;
    
    /**
     * 池为空，需要动态分配的次数
     */
    poolMisses: number;
    
    /**
     * 总动态分配次数
     */
    dynamicAllocations: number;
    
    /**
     * 当前池中 buffer 数量
     */
    currentPoolSize: number;
    
    /**
     * 池的最大容量（目标大小）
     * v2.7: adaptive 策略下会动态调整
     */
    maxPoolSize: number;
    
    /**
     * 命中率（0-100%）
     * v2.7: adaptive 策略目标 2-5%
     */
    hitRate: number;
}

/**
 * v2.7: 音频降噪统计信息
 * @since 2.7.0
 */
export interface DenoiseStats {
    /**
     * 已处理的音频帧数（每帧 480 samples）
     */
    processedFrames: number;
    
    /**
     * 最后一次检测到的语音概率（0.0-1.0）
     * - > 0.5: 检测到语音
     * - < 0.5: 噪声/静音
     */
    voiceProbability: number;
    
    /**
     * 每帧采样数（固定为 480）
     */
    frameSize: number;
    
    /**
     * 降噪是否启用
     */
    enabled: boolean;
}

/**
 * v2.8: AGC 配置选项
 * @since 2.8.0
 */
export interface AGCOptions {
    /**
     * 目标输出电平（dBFS）
     * - 推荐范围：-30 到 -10 dBFS
     * - 典型值：-20 dBFS
     * @default -20
     */
    targetLevel?: number;
    
    /**
     * 最大增益（dB）
     * - 防止过度放大噪声
     * - 推荐范围：10-30 dB
     * @default 20
     */
    maxGain?: number;
    
    /**
     * 最小增益（dB）
     * - 防止过度衰减
     * - 推荐范围：-20 到 0 dB
     * @default -10
     */
    minGain?: number;
    
    /**
     * 攻击时间（ms）
     * - 增益增加的速度（信号变小时）
     * - 较小值：快速响应，但可能不平滑
     * - 典型值：5-20 ms
     * @default 10
     */
    attackTime?: number;
    
    /**
     * 释放时间（ms）
     * - 增益减少的速度（信号变大时）
     * - 较大值：更平滑，但响应较慢
     * - 典型值：50-200 ms
     * @default 100
     */
    releaseTime?: number;
}

/**
 * v2.8: AGC 统计信息
 * @since 2.8.0
 */
export interface AGCStats {
    /**
     * AGC 是否启用
     */
    enabled: boolean;
    
    /**
     * 当前应用的增益（dB）
     */
    currentGain: number;
    
    /**
     * 平均输入电平（dBFS）
     */
    averageLevel: number;
    
    /**
     * 当前 RMS 值（线性刻度）
     */
    rmsLinear: number;
    
    /**
     * 是否检测到削波（clipping）
     */
    clipping: boolean;
    
    /**
     * 已处理的音频帧数
     */
    framesProcessed: number;
}

/**
 * v2.8: EQ 频段类型
 * @since 2.8.0
 */
export type EQBand = 'low' | 'mid' | 'high';

/**
 * v2.8: EQ 统计信息
 * @since 2.8.0
 */
export interface EQStats {
    /**
     * EQ 是否启用
     */
    enabled: boolean;
    
    /**
     * 低频增益（dB）
     */
    lowGain: number;
    
    /**
     * 中频增益（dB）
     */
    midGain: number;
    
    /**
     * 高频增益（dB）
     */
    highGain: number;
    
    /**
     * 已处理的音频帧数
     */
    framesProcessed: number;
}

/**
 * AudioCapture 类 - 音频捕获器
 * 
 * @example
 * ```typescript
 * const { AudioCapture } = require('node-windows-audio-capture');
 * 
 * const capture = new AudioCapture({ processId: 0 });
 * 
 * capture.on('data', (event) => {
 *   console.log(`Captured ${event.length} bytes`);
 * });
 * 
 * capture.on('error', (error) => {
 *   console.error('Capture error:', error);
 * });
 * 
 * await capture.start();
 * ```
 */
export declare class AudioCapture extends EventEmitter {
    /**
     * 创建音频捕获器实例
     * @param options - 配置选项
     */
    constructor(options?: AudioCaptureOptions);
    
    /**
     * 启动音频捕获
     * @throws {Error} 如果已经在运行或启动失败
     */
    start(): Promise<void>;
    
    /**
     * 停止音频捕获
     */
    stop(): Promise<void>;
    
    /**
     * 暂停音频捕获（不触发 data 事件）
     * @throws {Error} 如果未在运行
     */
    pause(): void;
    
    /**
     * 恢复音频捕获
     * @throws {Error} 如果未在运行
     */
    resume(): void;
    
    /**
     * 获取当前运行状态
     */
    isRunning(): boolean;
    
    /**
     * 获取暂停状态
     */
    isPaused(): boolean;
    
    /**
     * 获取配置选项
     */
    getOptions(): AudioCaptureOptions;
    
    /**
     * v2.3: 获取当前使用的设备 ID
     * @returns 设备 ID，如果使用默认设备则返回 undefined
     * @since 2.3.0
     */
    getDeviceId(): string | undefined;
    
    /**
     * v2.3: 获取所有音频输出设备
     * @returns Promise 包含设备信息数组
     * @throws {Error} 如果枚举设备失败
     * @since 2.3.0
     */
    static getAudioDevices(): Promise<AudioDeviceInfo[]>;
    
    /**
     * v2.3: 获取默认音频输出设备 ID
     * @returns Promise 包含默认设备 ID，如果未找到则为 null
     * @throws {Error} 如果获取失败
     * @since 2.3.0
     */
    static getDefaultDeviceId(): Promise<string | null>;
    
    /**
     * v2.4: 开始监控设备事件（热插拔、设备更改等）
     * @param callback 设备事件回调函数
     * @throws {Error} 如果已经在监控或启动失败
     * @since 2.4.0
     */
    static startDeviceMonitoring(callback: (event: DeviceEvent) => void): void;
    
    /**
     * v2.4: 停止监控设备事件
     * @since 2.4.0
     */
    static stopDeviceMonitoring(): void;
    
    /**
     * 枚举所有运行中的进程（包含音频会话的进程）
     * @returns Promise 包含进程信息数组
     * @throws {Error} 如果枚举进程失败
     * @since 2.0.0
     */
    static getProcesses(): Promise<ProcessInfo[]>;
    
    /**
     * v2.1: 启用或禁用"静音其他进程"功能
     * 
     * 当启用时，除了目标进程和白名单中的进程外，其他所有音频会话都会被静音
     * 
     * @param enabled - true 启用静音其他进程，false 禁用
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * @example
     * ```typescript
     * const capture = new AudioCapture({ processId: 1234 });
     * capture.setMuteOtherProcesses(true); // 只捕获 PID 1234
     * ```
     */
    setMuteOtherProcesses(enabled: boolean): void;
    
    /**
     * v2.1: 获取"静音其他进程"功能的当前状态
     * 
     * @returns 如果启用了静音其他进程则返回 true
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     */
    isMutingOtherProcesses(): boolean;
    
    /**
     * v2.1: 设置白名单（允许名单）
     * 
     * 白名单中的进程不会被静音，即使启用了"静音其他进程"功能
     * 
     * @param processIds - 进程 ID 数组
     * @throws {TypeError} 如果参数不是数组或包含无效的进程 ID
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * @example
     * ```typescript
     * // 允许 PID 1234 和 5678
     * capture.setAllowList([1234, 5678]);
     * ```
     */
    setAllowList(processIds: number[]): void;
    
    /**
     * v2.1: 获取当前的白名单（允许名单）
     * 
     * @returns 进程 ID 数组
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     */
    getAllowList(): number[];
    
    /**
     * v2.1: 设置黑名单（屏蔽名单）
     * 
     * 黑名单中的进程会被强制静音，无论是否启用"静音其他进程"功能
     * 
     * @param processIds - 进程 ID 数组
     * @throws {TypeError} 如果参数不是数组或包含无效的进程 ID
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     * @example
     * ```typescript
     * // 屏蔽 PID 999 和 888
     * capture.setBlockList([999, 888]);
     * ```
     */
    setBlockList(processIds: number[]): void;
    
    /**
     * v2.1: 获取当前的黑名单（屏蔽名单）
     * 
     * @returns 进程 ID 数组
     * @throws {Error} 如果 AudioProcessor 未初始化
     * @since 2.1.0
     */
    getBlockList(): number[];
    
    /**
     * v2.6: 获取 Buffer Pool 统计信息（零拷贝模式）
     * @returns 统计信息对象，如果未使用零拷贝模式则返回 null
     * @since 2.6.0
     */
    getPoolStats(): BufferPoolStats | null;
    
    /**
     * v2.7: 启用或禁用音频降噪（RNNoise）
     * @param enabled - true 启用，false 禁用
     * @throws {Error} 如果降噪处理器初始化失败
     * @since 2.7.0
     */
    setDenoiseEnabled(enabled: boolean): void;
    
    /**
     * v2.7: 获取当前降噪状态
     * @returns 如果启用返回 true，否则返回 false
     * @since 2.7.0
     */
    getDenoiseEnabled(): boolean;
    
    /**
     * v2.7: 获取降噪处理统计信息
     * @returns 统计信息对象，如果降噪未启用则返回 null
     * @since 2.7.0
     */
    getDenoiseStats(): DenoiseStats | null;
    
    /**
     * v2.8: 启用或禁用 AGC（自动增益控制）
     * @param enabled - true 启用，false 禁用
     * @since 2.8.0
     */
    setAGCEnabled(enabled: boolean): void;
    
    /**
     * v2.8: 获取当前 AGC 状态
     * @returns 如果启用返回 true，否则返回 false
     * @since 2.8.0
     */
    getAGCEnabled(): boolean;
    
    /**
     * v2.8: 设置 AGC 配置选项
     * @param options - AGC 配置参数
     * @throws {TypeError} 如果参数类型不正确
     * @throws {Error} 如果 AGC 处理器未初始化
     * @since 2.8.0
     */
    setAGCOptions(options: AGCOptions): void;
    
    /**
     * v2.8: 获取当前 AGC 配置选项
     * @returns AGC 配置对象，如果 AGC 未初始化则返回 null
     * @since 2.8.0
     */
    getAGCOptions(): AGCOptions | null;
    
    /**
     * v2.8: 获取 AGC 处理统计信息
     * @returns 统计信息对象，如果 AGC 未初始化则返回 null
     * @since 2.8.0
     */
    getAGCStats(): AGCStats | null;
    
    // ==================== v2.8: 3-Band EQ Methods ====================
    
    /**
     * v2.8: 启用或禁用 3-Band EQ
     * @param enabled - true 启用，false 禁用
     * @throws {Error} 如果设置失败
     * @since 2.8.0
     * @example
     * ```typescript
     * capture.setEQEnabled(true);  // 启用 EQ
     * ```
     */
    setEQEnabled(enabled: boolean): void;
    
    /**
     * v2.8: 获取 EQ 启用状态
     * @returns EQ 是否启用
     * @since 2.8.0
     */
    getEQEnabled(): boolean;
    
    /**
     * v2.8: 设置 EQ 频段增益
     * @param band - 频段名称: 'low' (低频 < 500 Hz), 'mid' (中频 500-4000 Hz), 'high' (高频 > 4000 Hz)
     * @param gain - 增益 (dB)，范围 -20 到 +20
     * @throws {Error} 如果参数无效或设置失败
     * @since 2.8.0
     * @example
     * ```typescript
     * capture.setEQBandGain('low', 5);   // 低频 +5dB (增强低音)
     * capture.setEQBandGain('mid', -3);  // 中频 -3dB (减少人声)
     * capture.setEQBandGain('high', 8);  // 高频 +8dB (增强高音)
     * ```
     */
    setEQBandGain(band: EQBand, gain: number): void;
    
    /**
     * v2.8: 获取 EQ 频段增益
     * @param band - 频段名称: 'low', 'mid', 'high'
     * @returns 增益 (dB)
     * @throws {Error} 如果参数无效
     * @since 2.8.0
     */
    getEQBandGain(band: EQBand): number;
    
    /**
     * v2.8: 获取 EQ 处理统计信息
     * @returns 统计信息对象，如果 EQ 未初始化则返回 null
     * @since 2.8.0
     */
    getEQStats(): EQStats | null;
    
    // ==================== v2.10: Real-time Audio Statistics ====================
    
    /**
     * v2.10.0: 启用实时音频统计
     * 启用后会定期（根据 interval）触发 'stats' 事件
     * @param options - 统计选项
     * @since 2.10.0
     * @example
     * ```typescript
     * capture.enableStats({ interval: 500 }); // 每 500ms 触发一次统计
     * capture.on('stats', (stats) => {
     *   console.log('Peak:', stats.peak);
     *   console.log('RMS:', stats.rms);
     *   console.log('dB:', stats.db);
     *   console.log('Volume:', stats.volumePercent);
     * });
     * ```
     */
    enableStats(options?: AudioStatsOptions): void;
    
    /**
     * v2.10.0: 禁用实时音频统计
     * @since 2.10.0
     */
    disableStats(): void;
    
    /**
     * v2.10.0: 获取统计是否启用
     * @returns 如果启用返回 true，否则返回 false
     * @since 2.10.0
     */
    isStatsEnabled(): boolean;
    
    /**
     * Phase 2: 设置静音检测阈值
     * @param threshold - 静音阈值（RMS，0.0 - 1.0）
     * @throws {Error} 如果阈值不在有效范围内
     * @since 2.10.0 Phase 2
     * @example
     * ```typescript
     * // 设置更高的阈值（更容易检测为静音）
     * capture.setSilenceThreshold(0.005);
     * 
     * // 设置更低的阈值（更难检测为静音）
     * capture.setSilenceThreshold(0.0001);
     * ```
     */
    setSilenceThreshold(threshold: number): void;
    
    /**
     * Phase 2: 获取当前静音检测阈值
     * @returns 当前阈值
     * @since 2.10.0 Phase 2
     */
    getSilenceThreshold(): number;
    
    /**
     * v2.10.0: 手动计算音频统计（一次性）
     * 用于对单个音频缓冲区进行统计计算，不需要启用持续统计
     * @param buffer - 音频数据缓冲区（Float32 PCM 格式）
     * @returns 统计数据对象
     * @throws {Error} 如果 AudioCapture 未初始化或 buffer 无效
     * @since 2.10.0
     * @example
     * ```typescript
     * capture.on('data', (data) => {
     *   const stats = capture.calculateStats(data.buffer);
     *   if (!stats.isSilence) {
     *     console.log('Volume:', stats.volumePercent);
     *   }
     * });
     * ```
     */
    calculateStats(buffer: Buffer): AudioStats;
    
    // ==================== v2.11: Spectrum Analyzer Methods ====================
    
    /**
     * v2.11.0: 启用原生 C++ FFT 频谱分析
     * 
     * 使用 kiss_fft 库进行实时频谱分析，支持：
     * - 快速傅里叶变换（FFT）
     * - 多频段能量分析
     * - 语音检测（300-3400Hz）
     * - 频谱质心和主频率计算
     * 
     * @param options - 频谱分析配置选项
     * @returns 是否成功启用
     * @throws {Error} 如果 AudioProcessor 未初始化或配置无效
     * @since 2.11.0
     * @example
     * ```typescript
     * capture.enableSpectrum({
     *   fftSize: 512,        // FFT 大小（必须 < 音频缓冲区样本数）
     *   interval: 100,       // 100ms 更新一次
     *   smoothing: 0.8,      // 平滑因子
     *   frequencyBands: [
     *     { minFreq: 20, maxFreq: 250, name: 'Bass' },
     *     { minFreq: 250, maxFreq: 2000, name: 'Midrange' },
     *     { minFreq: 2000, maxFreq: 20000, name: 'Treble' }
     *   ],
     *   voiceDetection: {
     *     threshold: 0.3,    // 语音检测阈值
     *     minFreq: 300,
     *     maxFreq: 3400
     *   }
     * });
     * 
     * capture.on('spectrum', (data) => {
     *   console.log('Voice probability:', data.voiceProbability);
     *   console.log('Dominant frequency:', data.dominantFrequency);
     * });
     * ```
     */
    enableSpectrum(options?: SpectrumAnalyzerOptions): boolean;
    
    /**
     * v2.11.0: 禁用频谱分析
     * 停止 FFT 计算并释放相关资源
     * @returns 是否成功禁用
     * @since 2.11.0
     */
    disableSpectrum(): boolean;
    
    /**
     * v2.11.0: 检查频谱分析是否已启用
     * @returns 频谱分析是否启用
     * @since 2.11.0
     */
    isSpectrumEnabled(): boolean;
    
    /**
     * v2.11.0: 动态更新频谱分析配置
     * 可以在运行时更改平滑因子、更新间隔、语音检测参数等
     * 注意：无法更改 FFT 大小和频段配置，需要先禁用后重新启用
     * @param config - 要更新的配置项
     * @returns 是否成功更新
     * @throws {Error} 如果频谱分析未启用或配置无效
     * @since 2.11.0
     * @example
     * ```typescript
     * // 调整平滑度
     * capture.setSpectrumConfig({ smoothing: 0.9 });
     * 
     * // 改变更新频率
     * capture.setSpectrumConfig({ interval: 50 });
     * 
     * // 调整语音检测灵敏度
     * capture.setSpectrumConfig({
     *   voiceDetection: { threshold: 0.4 }
     * });
     * ```
     */
    setSpectrumConfig(config: Partial<SpectrumAnalyzerOptions>): boolean;
    
    /**
     * v2.11.0: 获取当前频谱分析配置
     * @returns 当前配置对象，如果未启用则返回 null
     * @since 2.11.0
     * @example
     * ```typescript
     * const config = capture.getSpectrumConfig();
     * if (config) {
     *   console.log('FFT Size:', config.fftSize);
     *   console.log('Sample Rate:', config.sampleRate);
     *   console.log('Voice Detection:', config.voiceDetection);
     * }
     * ```
     */
    getSpectrumConfig(): SpectrumConfig | null;
    
    /**
     * 音频数据事件
     * @event
     */
    on(event: 'data', listener: (data: AudioDataEvent) => void): this;
    
    /**
     * v2.10.0: 音频统计事件
     * 当启用 enableStats() 后，会定期触发此事件
     * @event
     * @since 2.10.0
     */
    on(event: 'stats', listener: (stats: AudioStats) => void): this;
    
    /**
     * v2.11.0: 频谱分析事件
     * 当启用 enableSpectrum() 后，会定期触发此事件
     * @event
     * @since 2.11.0
     * @example
     * ```typescript
     * capture.on('spectrum', (data) => {
     *   // 检测语音
     *   if (data.isVoice) {
     *     console.log('Voice detected!', data.voiceProbability);
     *   }
     *   
     *   // 显示频段能量
     *   data.bands.forEach(band => {
     *     console.log(`${band.name}: ${band.db.toFixed(1)} dB`);
     *   });
     *   
     *   // 显示主频率
     *   console.log('Dominant frequency:', data.dominantFrequency, 'Hz');
     * });
     * ```
     */
    on(event: 'spectrum', listener: (data: SpectrumData) => void): this;
    
    /**
     * 错误事件
     * @event
     */
    on(event: 'error', listener: (error: Error) => void): this;
    
    /**
     * 启动事件
     * @event
     */
    on(event: 'started', listener: () => void): this;
    
    /**
     * 停止事件
     * @event
     */
    on(event: 'stopped', listener: () => void): this;
    
    /**
     * 暂停事件
     * @event
     */
    on(event: 'paused', listener: () => void): this;
    
    /**
     * 恢复事件
     * @event
     */
    on(event: 'resumed', listener: () => void): this;
    
    // EventEmitter 重载
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: 'data', listener: (data: AudioDataEvent) => void): this;
    once(event: 'stats', listener: (stats: AudioStats) => void): this;
    once(event: 'spectrum', listener: (data: SpectrumData) => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
    once(event: 'started' | 'stopped' | 'paused' | 'resumed', listener: () => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: 'data', data: AudioDataEvent): boolean;
    emit(event: 'stats', stats: AudioStats): boolean;
    emit(event: 'spectrum', data: SpectrumData): boolean;
    emit(event: 'error', error: Error): boolean;
    emit(event: 'started' | 'stopped' | 'paused' | 'resumed'): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}

/**
 * @deprecated Use AudioCapture.getAudioDevices() instead
 * 获取默认音频设备信息
 * @throws {Error} 如果获取设备信息失败
 * @since 1.0.0
 */
export declare function getDeviceInfo(): DeviceInfo;

/**
 * @deprecated Use AudioCapture.getProcesses() instead
 * 枚举所有运行中的进程
 * @throws {Error} 如果枚举进程失败
 * @since 2.0.0
 */
export declare function enumerateProcesses(): ProcessInfo[];

// ==================== v2.9.0 Microphone Capture API ====================

/**
 * EQ 预设类型
 * @since 2.9.0
 */
export type EQPreset = 'flat' | 'voice' | 'music';

/**
 * 麦克风设备信息
 * @since 2.9.0
 */
export interface Microphone {
    /** 设备唯一标识符 */
    id: string;
    /** 设备名称 */
    name: string;
    /** 是否为系统默认麦克风 */
    isDefault: boolean;
    /** 是否当前正在使用 */
    isActive: boolean;
    /** 支持的最大声道数 */
    channelCount: number;
    /** 设备支持的采样率 */
    sampleRate: number;
    /** 设备制造商（如果可用） */
    manufacturer?: string;
}

/**
 * 麦克风捕获配置选项
 * @since 2.9.0
 */
export interface MicrophoneConfig {
    /**
     * 麦克风设备 ID
     * 如果不指定，则使用系统默认麦克风
     * 使用 MicrophoneCapture.getMicrophones() 获取可用设备列表
     */
    deviceId?: string;
    
    /**
     * 采样率（Hz）
     * @default 48000
     */
    sampleRate?: number;
    
    /**
     * 声道数（麦克风通常是单声道）
     * @default 1
     */
    channels?: 1 | 2;
    
    /**
     * 启用音频降噪（RNNoise deep learning）
     * @default false
     */
    denoise?: boolean;
    
    /**
     * 启用 AGC（自动增益控制）
     * @default false
     */
    agc?: boolean;
    
    /**
     * AGC 配置参数
     */
    agcOptions?: AGCOptions;
    
    /**
     * 启用 EQ（3-Band 均衡器）
     * @default false
     */
    eq?: boolean;
    
    /**
     * EQ 预设
     * - 'flat': 平坦响应（无增益）
     * - 'voice': 人声增强（低频-3dB, 中频+5dB, 高频+2dB）
     * - 'music': 音乐增强（低频+4dB, 中频0dB, 高频+3dB）
     * @default 'flat'
     */
    eqPreset?: EQPreset;
    
    /**
     * 使用外部缓冲池
     * @default false
     */
    useExternalBuffer?: boolean;
    
    /**
     * 缓冲池策略
     * @default 'fixed'
     */
    bufferPoolStrategy?: BufferPoolStrategy;
    
    /**
     * 缓冲池大小（fixed 策略）
     */
    bufferPoolSize?: number;
    
    /**
     * 缓冲池最小值（adaptive 策略）
     */
    bufferPoolMin?: number;
    
    /**
     * 缓冲池最大值（adaptive 策略）
     */
    bufferPoolMax?: number;
}

/**
 * 麦克风音频捕获类
 * 
 * 专门用于捕获麦克风音频，提供比 AudioCapture 更简洁的接口
 * 
 * @example
 * ```typescript
 * import { MicrophoneCapture } from 'node-windows-audio-capture';
 * 
 * // 最简单的用法
 * const mic = new MicrophoneCapture();
 * mic.on('data', (chunk) => console.log('音频数据:', chunk.length));
 * await mic.start();
 * ```
 * 
 * @example
 * ```typescript
 * // 选择特定麦克风
 * const microphones = await MicrophoneCapture.getMicrophones();
 * const usbMic = microphones.find(m => m.name.includes('USB'));
 * const mic = new MicrophoneCapture({ deviceId: usbMic.id });
 * await mic.start();
 * ```
 * 
 * @example
 * ```typescript
 * // 启用音频效果
 * const mic = new MicrophoneCapture({
 *   denoise: true,
 *   agc: true,
 *   eq: true,
 *   eqPreset: 'voice'
 * });
 * await mic.start();
 * ```
 * 
 * @since 2.9.0
 */
export declare class MicrophoneCapture extends EventEmitter {
    /**
     * 创建麦克风捕获实例
     * 
     * @param config - 配置选项
     * @throws {TypeError} 配置参数类型错误
     * @throws {Error} 设备 ID 无效
     */
    constructor(config?: MicrophoneConfig);
    
    /**
     * 启动麦克风捕获
     * 
     * @throws {AudioError} 启动失败
     */
    start(): Promise<void>;
    
    /**
     * 停止麦克风捕获
     */
    stop(): void;
    
    // ==================== 音频效果 - 降噪 ====================
    
    /**
     * 启用或禁用降噪
     * 
     * @param enabled - true 启用，false 禁用
     */
    setDenoiseEnabled(enabled: boolean): void;
    
    /**
     * 获取降噪状态
     * 
     * @returns true 如果降噪已启用
     */
    getDenoiseEnabled(): boolean;
    
    /**
     * 获取降噪统计信息
     * 
     * @returns 统计信息对象，如果未启用则返回 null
     */
    getDenoiseStats(): DenoiseStats | null;
    
    // ==================== 音频效果 - AGC ====================
    
    /**
     * 启用或禁用 AGC
     * 
     * @param enabled - true 启用，false 禁用
     */
    setAGCEnabled(enabled: boolean): void;
    
    /**
     * 获取 AGC 状态
     * 
     * @returns true 如果 AGC 已启用
     */
    getAGCEnabled(): boolean;
    
    /**
     * 设置 AGC 配置参数
     * 
     * @param options - AGC 配置
     */
    setAGCOptions(options: AGCOptions): void;
    
    /**
     * 获取 AGC 配置参数
     * 
     * @returns 配置对象，如果未初始化则返回 null
     */
    getAGCOptions(): AGCOptions | null;
    
    /**
     * 获取 AGC 统计信息
     * 
     * @returns 统计信息对象，如果未初始化则返回 null
     */
    getAGCStats(): AGCStats | null;
    
    // ==================== 音频效果 - EQ ====================
    
    /**
     * 启用或禁用 EQ
     * 
     * @param enabled - true 启用，false 禁用
     */
    setEQEnabled(enabled: boolean): void;
    
    /**
     * 获取 EQ 状态
     * 
     * @returns true 如果 EQ 已启用
     */
    getEQEnabled(): boolean;
    
    /**
     * 设置指定频段的增益
     * 
     * @param band - 频段名称
     * @param gain - 增益 (dB)，范围 -20 到 +20
     */
    setEQBandGain(band: 'low' | 'mid' | 'high', gain: number): void;
    
    /**
     * 获取指定频段的增益
     * 
     * @param band - 频段名称
     * @returns 增益 (dB)
     */
    getEQBandGain(band: 'low' | 'mid' | 'high'): number;
    
    /**
     * 获取 EQ 统计信息
     * 
     * @returns 统计信息对象，如果未启用则返回 null
     */
    getEQStats(): EQStats | null;
    
    // ==================== 静态方法 ====================
    
    /**
     * 枚举系统中所有麦克风设备
     * 
     * @returns 麦克风设备数组
     * 
     * @example
     * ```typescript
     * const microphones = await MicrophoneCapture.getMicrophones();
     * microphones.forEach(mic => {
     *   console.log(`${mic.name} (${mic.isDefault ? '默认' : ''})`);
     * });
     * ```
     */
    static getMicrophones(): Promise<Microphone[]>;
    
    /**
     * 获取系统默认麦克风
     * 
     * @returns 默认麦克风设备，如果没有则返回 null
     * 
     * @example
     * ```typescript
     * const defaultMic = await MicrophoneCapture.getDefaultMicrophone();
     * if (defaultMic) {
     *   console.log('默认麦克风:', defaultMic.name);
     * }
     * ```
     */
    static getDefaultMicrophone(): Promise<Microphone | null>;
    
    // ==================== 事件 ====================
    
    /**
     * 音频数据事件
     * @event
     */
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    
    /**
     * 错误事件
     * @event
     */
    on(event: 'error', listener: (error: Error) => void): this;
    
    /**
     * 结束事件
     * @event
     */
    on(event: 'end', listener: () => void): this;
    
    // EventEmitter 重载
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: 'data', listener: (chunk: Buffer) => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
    once(event: 'end', listener: () => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: 'data', chunk: Buffer): boolean;
    emit(event: 'error', error: Error): boolean;
    emit(event: 'end'): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
}

// =====================================================================
// MicrophoneCapture �� (v2.9.0)
// =====================================================================

/**
 * v2.9.0: ��˷粶������ѡ��
 * @since 2.9.0
 */
export interface MicrophoneCaptureOptions {
    deviceId?: string;
    sampleRate?: number;
    channels?: number;
    denoise?: boolean;
    denoiseStrength?: number;
    agc?: boolean;
    agcTarget?: number;
    agcMaxGain?: number;
    eq?: boolean;
    eqLowGain?: number;
    eqMidGain?: number;
    eqHighGain?: number;
    useExternalBuffer?: boolean;
    bufferPoolStrategy?: BufferPoolStrategy;
    bufferPoolSize?: number;
    bufferPoolMin?: number;
    bufferPoolMax?: number;
}

/**
 * v2.9.0: ��˷粶����
 * @since 2.9.0
 */
export declare class MicrophoneCapture extends EventEmitter {
    constructor(options?: MicrophoneCaptureOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    pause(): void;
    resume(): void;
    isRunning(): boolean;
    isPaused(): boolean;
    getOptions(): MicrophoneCaptureOptions;
    getDeviceId(): string | undefined;
    setDenoiseEnabled(enabled: boolean): void;
    getDenoiseEnabled(): boolean;
    setDenoiseStrength(strength: number): void;
    getDenoiseStats(): DenoiseStats | null;
    setAGCEnabled(enabled: boolean): void;
    getAGCEnabled(): boolean;
    setAGCOptions(options: AGCOptions): void;
    getAGCOptions(): AGCOptions | null;
    getAGCStats(): AGCStats | null;
    setEQEnabled(enabled: boolean): void;
    getEQEnabled(): boolean;
    setEQBandGain(band: 'low' | 'mid' | 'high', gain: number): void;
    getEQBandGain(band: 'low' | 'mid' | 'high'): number;
    getEQStats(): EQStats | null;
    getPoolStats(): BufferPoolStats;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}
