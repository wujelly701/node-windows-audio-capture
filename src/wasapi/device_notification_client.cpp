#include "device_notification_client.h"
#include <Functiondiscoverykeys_devpkey.h>
#include <iostream>

namespace wasapi {

DeviceNotificationClient::DeviceNotificationClient()
    : refCount_(1),
      pEnumerator_(nullptr),
      eventCallback_(nullptr),
      isRegistered_(false) {
}

DeviceNotificationClient::~DeviceNotificationClient() {
    Unregister();
}

HRESULT DeviceNotificationClient::Register(IMMDeviceEnumerator* pEnumerator) {
    if (!pEnumerator) {
        return E_INVALIDARG;
    }

    std::lock_guard<std::mutex> lock(mutex_);

    if (isRegistered_) {
        // Already registered
        return S_OK;
    }

    HRESULT hr = pEnumerator->RegisterEndpointNotificationCallback(this);
    if (SUCCEEDED(hr)) {
        pEnumerator_ = pEnumerator;
        pEnumerator_->AddRef();
        isRegistered_ = true;
    }

    return hr;
}

HRESULT DeviceNotificationClient::Unregister() {
    std::lock_guard<std::mutex> lock(mutex_);

    if (!isRegistered_ || !pEnumerator_) {
        return S_OK;
    }

    HRESULT hr = pEnumerator_->UnregisterEndpointNotificationCallback(this);
    
    if (pEnumerator_) {
        pEnumerator_->Release();
        pEnumerator_ = nullptr;
    }

    isRegistered_ = false;
    return hr;
}

void DeviceNotificationClient::SetEventCallback(DeviceEventCallback callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    eventCallback_ = callback;
}

void DeviceNotificationClient::InvokeCallback(const DeviceEvent& event) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (eventCallback_) {
        eventCallback_(event);
    }
}

// IUnknown methods
HRESULT STDMETHODCALLTYPE DeviceNotificationClient::QueryInterface(
    REFIID riid,
    void** ppvObject) {
    if (!ppvObject) {
        return E_POINTER;
    }

    if (riid == IID_IUnknown) {
        *ppvObject = static_cast<IUnknown*>(this);
        AddRef();
        return S_OK;
    }

    if (riid == __uuidof(IMMNotificationClient)) {
        *ppvObject = static_cast<IMMNotificationClient*>(this);
        AddRef();
        return S_OK;
    }

    *ppvObject = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE DeviceNotificationClient::AddRef() {
    return InterlockedIncrement(&refCount_);
}

ULONG STDMETHODCALLTYPE DeviceNotificationClient::Release() {
    ULONG refCount = InterlockedDecrement(&refCount_);
    if (refCount == 0) {
        delete this;
    }
    return refCount;
}

// IMMNotificationClient methods
HRESULT STDMETHODCALLTYPE DeviceNotificationClient::OnDeviceAdded(LPCWSTR deviceId) {
    if (!deviceId) {
        return S_OK;
    }

    DeviceEvent event;
    event.type = DeviceEventType::DEVICE_ADDED;
    event.deviceId = deviceId;

    InvokeCallback(event);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE DeviceNotificationClient::OnDeviceRemoved(LPCWSTR deviceId) {
    if (!deviceId) {
        return S_OK;
    }

    DeviceEvent event;
    event.type = DeviceEventType::DEVICE_REMOVED;
    event.deviceId = deviceId;

    InvokeCallback(event);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE DeviceNotificationClient::OnDefaultDeviceChanged(
    EDataFlow flow,
    ERole role,
    LPCWSTR defaultDeviceId) {
    
    DeviceEvent event;
    event.type = DeviceEventType::DEFAULT_DEVICE_CHANGED;
    event.deviceId = defaultDeviceId ? defaultDeviceId : L"";
    event.dataFlow = flow;
    event.role = role;

    InvokeCallback(event);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE DeviceNotificationClient::OnDeviceStateChanged(
    LPCWSTR deviceId,
    DWORD newState) {
    
    if (!deviceId) {
        return S_OK;
    }

    DeviceEvent event;
    event.type = DeviceEventType::DEVICE_STATE_CHANGED;
    event.deviceId = deviceId;
    event.newState = newState;

    InvokeCallback(event);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE DeviceNotificationClient::OnPropertyValueChanged(
    LPCWSTR deviceId,
    const PROPERTYKEY key) {
    
    if (!deviceId) {
        return S_OK;
    }

    DeviceEvent event;
    event.type = DeviceEventType::DEVICE_PROPERTY_CHANGED;
    event.deviceId = deviceId;
    event.propertyKey = key;

    InvokeCallback(event);
    return S_OK;
}

} // namespace wasapi
