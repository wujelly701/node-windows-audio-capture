// 独立测试程序：验证 Process Loopback API 是否在系统上可用
// 编译: cl /EHsc /std:c++17 test-process-loopback-native.cpp ole32.lib oleaut32.lib runtimeobject.lib

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <roapi.h>
#include <wrl/client.h>
#include <stdio.h>

// 简化的激活处理器
class SimpleActivationHandler : public IActivateAudioInterfaceCompletionHandler {
    LONG refCount_ = 1;
    HRESULT result_ = E_FAIL;
    HANDLE event_;
    
public:
    SimpleActivationHandler() {
        event_ = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    }
    
    ~SimpleActivationHandler() {
        CloseHandle(event_);
    }
    
    STDMETHODIMP QueryInterface(REFIID riid, void** ppv) {
        if (riid == __uuidof(IUnknown) || riid == __uuidof(IActivateAudioInterfaceCompletionHandler)) {
            *ppv = this;
            AddRef();
            return S_OK;
        }
        return E_NOINTERFACE;
    }
    
    STDMETHODIMP_(ULONG) AddRef() { return InterlockedIncrement(&refCount_); }
    STDMETHODIMP_(ULONG) Release() {
        LONG ref = InterlockedDecrement(&refCount_);
        if (ref == 0) delete this;
        return ref;
    }
    
    STDMETHODIMP ActivateCompleted(IActivateAudioInterfaceAsyncOperation* operation) {
        operation->GetActivateResult(&result_, nullptr);
        SetEvent(event_);
        return S_OK;
    }
    
    bool Wait(DWORD timeout = 5000) {
        return WaitForSingleObject(event_, timeout) == WAIT_OBJECT_0;
    }
    
    HRESULT GetResult() { return result_; }
};

int main(int argc, char* argv[]) {
    DWORD targetPid = 0;
    
    if (argc > 1) {
        targetPid = atoi(argv[1]);
    }
    
    printf("=== Process Loopback Native Test ===\n");
    printf("Target PID: %lu (0 = test activation only)\n\n", targetPid);
    
    // 1. 初始化 Windows Runtime
    HRESULT hr = RoInitialize(RO_INIT_MULTITHREADED);
    if (FAILED(hr)) {
        printf("❌ RoInitialize failed: 0x%08X\n", hr);
        return 1;
    }
    printf("✅ Windows Runtime initialized\n");
    
    // 2. 初始化 COM
    hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE && hr != S_FALSE) {
        printf("❌ CoInitializeEx failed: 0x%08X\n", hr);
        RoUninitialize();
        return 1;
    }
    printf("✅ COM initialized\n");
    
    // 3. 获取默认渲染设备
    Microsoft::WRL::ComPtr<IMMDeviceEnumerator> enumerator;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
                         __uuidof(IMMDeviceEnumerator), &enumerator);
    if (FAILED(hr)) {
        printf("❌ Create enumerator failed: 0x%08X\n", hr);
        CoUninitialize();
        RoUninitialize();
        return 1;
    }
    
    Microsoft::WRL::ComPtr<IMMDevice> device;
    hr = enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &device);
    if (FAILED(hr)) {
        printf("❌ Get default device failed: 0x%08X\n", hr);
        CoUninitialize();
        RoUninitialize();
        return 1;
    }
    
    LPWSTR deviceId = nullptr;
    hr = device->GetId(&deviceId);
    if (FAILED(hr)) {
        printf("❌ Get device ID failed: 0x%08X\n", hr);
        CoUninitialize();
        RoUninitialize();
        return 1;
    }
    
    printf("✅ Default render device: %S\n", deviceId);
    
    // 4. 构造 Process Loopback 参数
    AUDIOCLIENT_ACTIVATION_PARAMS activationParams = {};
    activationParams.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
    activationParams.ProcessLoopbackParams.ProcessLoopbackMode = PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;
    activationParams.ProcessLoopbackParams.TargetProcessId = targetPid;
    
    PROPVARIANT activateParams = {};
    activateParams.vt = VT_BLOB;
    activateParams.blob.cbSize = sizeof(activationParams);
    activateParams.blob.pBlobData = (BYTE*)&activationParams;
    
    printf("\n📞 Calling ActivateAudioInterfaceAsync...\n");
    
    // 5. 创建激活处理器
    SimpleActivationHandler* handler = new SimpleActivationHandler();
    handler->AddRef();
    
    // 6. 异步激活
    Microsoft::WRL::ComPtr<IActivateAudioInterfaceAsyncOperation> asyncOp;
    hr = ActivateAudioInterfaceAsync(
        deviceId,
        __uuidof(IAudioClient3),
        &activateParams,
        handler,
        &asyncOp
    );
    
    CoTaskMemFree(deviceId);
    
    if (FAILED(hr)) {
        printf("❌ ActivateAudioInterfaceAsync failed: 0x%08X\n", hr);
        printf("\n分析:\n");
        printf("  0x8000000E = E_ILLEGAL_METHOD_CALL\n");
        printf("  可能原因:\n");
        printf("  1. API 需要特殊的线程上下文或消息循环\n");
        printf("  2. 系统配置限制了 Process Loopback\n");
        printf("  3. 需要特殊的应用清单或权限\n");
        handler->Release();
        CoUninitialize();
        RoUninitialize();
        return 1;
    }
    
    printf("✅ ActivateAudioInterfaceAsync called successfully\n");
    printf("⏳ Waiting for activation...\n");
    
    // 7. 等待激活完成
    if (!handler->Wait()) {
        printf("❌ Activation timeout\n");
        handler->Release();
        CoUninitialize();
        RoUninitialize();
        return 1;
    }
    
    HRESULT activationResult = handler->GetResult();
    if (FAILED(activationResult)) {
        printf("❌ Activation result failed: 0x%08X\n", activationResult);
        handler->Release();
        CoUninitialize();
        RoUninitialize();
        return 1;
    }
    
    printf("✅ Activation successful!\n");
    printf("\n🎉 Process Loopback API 在你的系统上完全可用！\n");
    printf("   这意味着问题出在 Node.js Native Addon 的环境限制上。\n");
    
    handler->Release();
    CoUninitialize();
    RoUninitialize();
    return 0;
}
