#pragma once

#include <mmdeviceapi.h>
#include <windows.h>
#include <string>
#include <functional>
#include <mutex>

namespace wasapi {

// Device event types
enum class DeviceEventType {
    DEVICE_ADDED,
    DEVICE_REMOVED,
    DEFAULT_DEVICE_CHANGED,
    DEVICE_STATE_CHANGED,
    DEVICE_PROPERTY_CHANGED
};

// Device event structure
struct DeviceEvent {
    DeviceEventType type;
    std::wstring deviceId;
    DWORD newState;              // For state changes
    EDataFlow dataFlow;          // For default device changes
    ERole role;                  // For default device changes
    PROPERTYKEY propertyKey;     // For property changes
    
    DeviceEvent() : type(DeviceEventType::DEVICE_ADDED), 
                    newState(0), 
                    dataFlow(eAll), 
                    role(eConsole),
                    propertyKey({}) {}
};

// Callback function type for device events
using DeviceEventCallback = std::function<void(const DeviceEvent&)>;

/**
 * IMMNotificationClient implementation for device hot-plug detection
 * 
 * This class implements the Windows COM interface IMMNotificationClient
 * to receive notifications about audio device changes:
 * - Device added/removed (hot-plug)
 * - Default device changed
 * - Device state changed (enabled/disabled)
 * - Device property changed
 */
class DeviceNotificationClient : public IMMNotificationClient {
public:
    DeviceNotificationClient();
    virtual ~DeviceNotificationClient();

    // Prevent copy and assignment
    DeviceNotificationClient(const DeviceNotificationClient&) = delete;
    DeviceNotificationClient& operator=(const DeviceNotificationClient&) = delete;

    /**
     * Register this client with the device enumerator
     * @param pEnumerator Pointer to IMMDeviceEnumerator
     * @return HRESULT S_OK on success
     */
    HRESULT Register(IMMDeviceEnumerator* pEnumerator);

    /**
     * Unregister this client from the device enumerator
     * @return HRESULT S_OK on success
     */
    HRESULT Unregister();

    /**
     * Set callback function for device events
     * @param callback Function to call when device events occur
     */
    void SetEventCallback(DeviceEventCallback callback);

    /**
     * Check if the client is currently registered
     * @return true if registered
     */
    bool IsRegistered() const { return isRegistered_; }

    // IUnknown methods
    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppvObject) override;
    ULONG STDMETHODCALLTYPE AddRef() override;
    ULONG STDMETHODCALLTYPE Release() override;

    // IMMNotificationClient methods
    HRESULT STDMETHODCALLTYPE OnDeviceAdded(LPCWSTR deviceId) override;
    HRESULT STDMETHODCALLTYPE OnDeviceRemoved(LPCWSTR deviceId) override;
    HRESULT STDMETHODCALLTYPE OnDefaultDeviceChanged(
        EDataFlow flow,
        ERole role,
        LPCWSTR defaultDeviceId) override;
    HRESULT STDMETHODCALLTYPE OnDeviceStateChanged(
        LPCWSTR deviceId,
        DWORD newState) override;
    HRESULT STDMETHODCALLTYPE OnPropertyValueChanged(
        LPCWSTR deviceId,
        const PROPERTYKEY key) override;

private:
    LONG refCount_;
    IMMDeviceEnumerator* pEnumerator_;
    DeviceEventCallback eventCallback_;
    bool isRegistered_;
    mutable std::mutex mutex_;

    /**
     * Helper to safely invoke the event callback
     * @param event Device event to send
     */
    void InvokeCallback(const DeviceEvent& event);
};

} // namespace wasapi
