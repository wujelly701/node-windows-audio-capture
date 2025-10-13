#pragma once
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <wrl/client.h>
#include <atomic>
#include <condition_variable>
#include <mutex>

// 异步激活完成处理器
// 用于 ActivateAudioInterfaceAsync 的回调
class ActivationHandler : public IActivateAudioInterfaceCompletionHandler {
public:
    ActivationHandler();
    virtual ~ActivationHandler();

    // IUnknown 接口
    STDMETHOD(QueryInterface)(REFIID riid, void** ppvObject) override;
    STDMETHOD_(ULONG, AddRef)() override;
    STDMETHOD_(ULONG, Release)() override;

    // IActivateAudioInterfaceCompletionHandler 接口
    STDMETHOD(ActivateCompleted)(IActivateAudioInterfaceAsyncOperation* operation) override;

    // 等待激活完成
    bool WaitForActivation(DWORD timeoutMs = 5000);
    
    // 获取激活结果
    HRESULT GetActivationResult() const { return activationResult_; }
    
    // 获取激活的 IAudioClient3 接口
    Microsoft::WRL::ComPtr<IAudioClient3> GetAudioClient3() const { return audioClient3_; }
    
    // 检查是否已完成
    bool IsCompleted() const { return completed_.load(); }

private:
    std::atomic<ULONG> refCount_;
    std::atomic<bool> completed_;
    HRESULT activationResult_;
    Microsoft::WRL::ComPtr<IAudioClient3> audioClient3_;
    std::mutex mutex_;
    std::condition_variable cv_;
};
