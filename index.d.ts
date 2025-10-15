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
     * 音频数据事件
     * @event
     */
    on(event: 'data', listener: (data: AudioDataEvent) => void): this;
    
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
    once(event: 'error', listener: (error: Error) => void): this;
    once(event: 'started' | 'stopped' | 'paused' | 'resumed', listener: () => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: 'data', data: AudioDataEvent): boolean;
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
