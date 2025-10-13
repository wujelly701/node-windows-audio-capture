#pragma once
#include <thread>
#include <atomic>
#include <windows.h>
#include "audio_client.h"

class CaptureThread {
public:
    CaptureThread(AudioClient* client);
    ~CaptureThread();

    // 启动捕获线程
    void Start();
    // 停止捕获线程
    void Stop();
    // 查询是否正在运行
    bool IsRunning() const;

private:
    void ThreadProc();
    std::thread thread_;
    std::atomic<bool> running_ = false;
    AudioClient* client_;
    HANDLE sampleReadyEvent_;
};
