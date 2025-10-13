/**
 * Type definitions for node-windows-audio-capture
 * Windows 音频捕获 Node.js Native Addon
 */

/// <reference types="node" />

import { EventEmitter } from 'events';

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
 * 音频设备信息
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
 * 获取默认音频设备信息
 * @throws {Error} 如果获取设备信息失败
 */
export declare function getDeviceInfo(): DeviceInfo;

/**
 * 枚举所有运行中的进程
 * @throws {Error} 如果枚举进程失败
 */
export declare function enumerateProcesses(): ProcessInfo[];
