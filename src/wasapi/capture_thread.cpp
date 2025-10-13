#include "capture_thread.h"
#include <thread>
#include <atomic>
#include <windows.h>
#include <audioclient.h>
#include <avrt.h>
#include "audio_client.h"

CaptureThread::CaptureThread(AudioClient* client) : client_(client), sampleReadyEvent_(nullptr) {
    // 创建事件对象（手动重置，非信号状态）
    sampleReadyEvent_ = CreateEvent(nullptr, FALSE, FALSE, nullptr);
}

CaptureThread::~CaptureThread() { 
    Stop(); 
    if (sampleReadyEvent_) {
        CloseHandle(sampleReadyEvent_);
        sampleReadyEvent_ = nullptr;
    }
}

void CaptureThread::Start() {
    if (running_) return;
    
    // 设置事件句柄到 AudioClient
    if (client_ && sampleReadyEvent_) {
        client_->SetEventHandle(sampleReadyEvent_);
    }
    
    running_ = true;
    thread_ = std::thread(&CaptureThread::ThreadProc, this);
}

void CaptureThread::Stop() {
    if (!running_) return;
    running_ = false;
    
    // 触发事件以唤醒等待线程
    if (sampleReadyEvent_) {
        SetEvent(sampleReadyEvent_);
    }
    
    if (thread_.joinable()) thread_.join();
}

bool CaptureThread::IsRunning() const {
    return running_;
}

void CaptureThread::ThreadProc() {
    // 设置 MMCSS 线程优先级（提升音频线程优先级）
    DWORD taskIndex = 0;
    HANDLE hTask = AvSetMmThreadCharacteristics(TEXT("Pro Audio"), &taskIndex);
    if (hTask) {
        AvSetMmThreadPriority(hTask, AVRT_PRIORITY_CRITICAL);
    }
    
    auto captureClient = client_->GetCaptureClient();
    if (!captureClient) {
        running_ = false;
        if (hTask) AvRevertMmThreadCharacteristics(hTask);
        return;
    }
    
    while (running_) {
        // 等待音频数据就绪（超时 2 秒）
        DWORD waitResult = WaitForSingleObject(sampleReadyEvent_, 2000);
        
        if (waitResult != WAIT_OBJECT_0) {
            continue;  // 超时或错误，继续循环
        }
        
        if (!running_) break;
        
        // 获取可用数据包大小
        UINT32 packetLength = 0;
        HRESULT hr = captureClient->GetNextPacketSize(&packetLength);
        if (FAILED(hr)) {
            continue;
        }
        
        while (packetLength > 0) {
            BYTE* pData = nullptr;
            UINT32 numFramesAvailable = 0;
            DWORD flags = 0;
            
            // 获取缓冲区
            hr = captureClient->GetBuffer(&pData, &numFramesAvailable, &flags, nullptr, nullptr);
            if (FAILED(hr)) {
                break;
            }
            
            // 处理静音标志
            if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
                pData = nullptr;  // 静音数据，传递 nullptr
            }
            
            // 处理音频样本（回调到 AudioClient）
            if (numFramesAvailable > 0) {
                client_->ProcessAudioSample(pData, numFramesAvailable);
            }
            
            // 释放缓冲区
            hr = captureClient->ReleaseBuffer(numFramesAvailable);
            if (FAILED(hr)) {
                break;
            }
            
            // 获取下一个数据包大小
            hr = captureClient->GetNextPacketSize(&packetLength);
            if (FAILED(hr)) {
                break;
            }
        }
    }
    
    // 恢复线程优先级
    if (hTask) {
        AvRevertMmThreadCharacteristics(hTask);
    }
}
