#include "activation_handler.h"
#include <audioclientactivationparams.h>

ActivationHandler::ActivationHandler() 
    : refCount_(1), 
      completed_(false), 
      activationResult_(E_PENDING) {
}

ActivationHandler::~ActivationHandler() {
}

// IUnknown::QueryInterface
HRESULT ActivationHandler::QueryInterface(REFIID riid, void** ppvObject) {
    if (riid == IID_IUnknown || 
        riid == __uuidof(IActivateAudioInterfaceCompletionHandler)) {
        *ppvObject = static_cast<IActivateAudioInterfaceCompletionHandler*>(this);
        AddRef();
        return S_OK;
    }
    *ppvObject = nullptr;
    return E_NOINTERFACE;
}

// IUnknown::AddRef
ULONG ActivationHandler::AddRef() {
    return ++refCount_;
}

// IUnknown::Release
ULONG ActivationHandler::Release() {
    ULONG count = --refCount_;
    if (count == 0) {
        delete this;
    }
    return count;
}

// IActivateAudioInterfaceCompletionHandler::ActivateCompleted
HRESULT ActivationHandler::ActivateCompleted(
    IActivateAudioInterfaceAsyncOperation* operation) {
    
    std::lock_guard<std::mutex> lock(mutex_);
    
    HRESULT hr;
    IUnknown* pUnknown = nullptr;
    
    // 获取激活结果
    hr = operation->GetActivateResult(&activationResult_, &pUnknown);
    
    if (SUCCEEDED(hr) && SUCCEEDED(activationResult_)) {
        // 查询 IAudioClient3 接口
        hr = pUnknown->QueryInterface(IID_PPV_ARGS(&audioClient3_));
        
        if (FAILED(hr)) {
            activationResult_ = hr;
        }
    }
    
    if (pUnknown) {
        pUnknown->Release();
    }
    
    // 标记完成并通知等待线程
    completed_ = true;
    cv_.notify_all();
    
    return S_OK;
}

// 等待激活完成（带超时）
bool ActivationHandler::WaitForActivation(DWORD timeoutMs) {
    std::unique_lock<std::mutex> lock(mutex_);
    return cv_.wait_for(
        lock, 
        std::chrono::milliseconds(timeoutMs),
        [this] { return completed_.load(); }
    );
}
