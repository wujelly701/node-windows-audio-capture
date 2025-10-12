#include "capture_thread.h"
#include <thread>
#include <atomic>
#include <windows.h>
#include "audio_client.h"

CaptureThread::CaptureThread(AudioClient* client) : client_(client) {}
CaptureThread::~CaptureThread() { Stop(); }

void CaptureThread::Start() {
    if (running_) return;
    running_ = true;
    thread_ = std::thread(&CaptureThread::ThreadProc, this);
}

void CaptureThread::Stop() {
    if (!running_) return;
    running_ = false;
    if (thread_.joinable()) thread_.join();
}

bool CaptureThread::IsRunning() const {
    return running_;
}

void CaptureThread::ThreadProc() {
    while (running_) {
        // TODO: 实际音频捕获循环
        if (client_) {
            // 示例：处理假样本
            BYTE dummyData[256] = {0};
            client_->ProcessAudioSample(dummyData, 128);
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}
