#include <napi.h>
#include "../wasapi/device_enumerator.h"
#include "../wasapi/device_notification_client.h"
#include <memory>
#include <mutex>

namespace audio_capture {

using namespace wasapi;

// Global device enumerator instance
static std::unique_ptr<AudioDeviceEnumerator> g_device_enumerator;

// Global device notification client
static DeviceNotificationClient* g_notification_client = nullptr;

// Thread-safe function for device events
static Napi::ThreadSafeFunction g_tsfn;
static std::mutex g_tsfn_mutex;

/**
 * Initialize the device enumerator (called once at startup)
 */
bool InitializeDeviceEnumerator() {
    if (!g_device_enumerator) {
        g_device_enumerator = std::make_unique<AudioDeviceEnumerator>();
        if (!g_device_enumerator->Initialize()) {
            g_device_enumerator.reset();
            return false;
        }
    }
    return true;
}

/**
 * Get list of all audio output devices
 * JavaScript: getAudioDevices() => Promise<AudioDeviceInfo[]>
 */
Napi::Value GetAudioDevices(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Initialize device enumerator if needed
    if (!InitializeDeviceEnumerator()) {
        Napi::Error::New(env, "Failed to initialize device enumerator").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Enumerate devices
    std::vector<AudioDeviceInfo> devices = g_device_enumerator->EnumerateOutputDevices();

    // Convert to JavaScript array
    Napi::Array result = Napi::Array::New(env, devices.size());
    
    for (size_t i = 0; i < devices.size(); i++) {
        const AudioDeviceInfo& device = devices[i];
        
        // Create JavaScript object for each device
        Napi::Object device_obj = Napi::Object::New(env);
        device_obj.Set("id", Napi::String::New(env, device.id));
        device_obj.Set("name", Napi::String::New(env, device.name));
        device_obj.Set("description", Napi::String::New(env, device.description));
        device_obj.Set("isDefault", Napi::Boolean::New(env, device.isDefault));
        device_obj.Set("isActive", Napi::Boolean::New(env, device.isActive));
        
        result[i] = device_obj;
    }

    return result;
}

/**
 * Get the default audio output device ID
 * JavaScript: getDefaultDeviceId() => Promise<string | null>
 */
Napi::Value GetDefaultDeviceId(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Initialize device enumerator if needed
    if (!InitializeDeviceEnumerator()) {
        Napi::Error::New(env, "Failed to initialize device enumerator").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Get default device
    ComPtr<IMMDevice> default_device = g_device_enumerator->GetDefaultDevice();
    if (!default_device) {
        return env.Null();
    }

    // Get device ID
    LPWSTR device_id_wstr = nullptr;
    HRESULT hr = default_device->GetId(&device_id_wstr);
    if (FAILED(hr)) {
        return env.Null();
    }

    // Convert LPWSTR to std::string
    int size = WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, nullptr, 0, nullptr, nullptr);
    std::string device_id;
    if (size > 0) {
        std::vector<char> buffer(size);
        WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, buffer.data(), size, nullptr, nullptr);
        device_id = buffer.data();
    }

    CoTaskMemFree(device_id_wstr);

    return Napi::String::New(env, device_id);
}

/**
 * Verify if a device ID is valid
 * JavaScript: verifyDeviceId(deviceId: string) => Promise<boolean>
 */
Napi::Value VerifyDeviceId(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Check arguments
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string argument (deviceId)").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string device_id = info[0].As<Napi::String>().Utf8Value();

    // Initialize device enumerator if needed
    if (!InitializeDeviceEnumerator()) {
        Napi::Error::New(env, "Failed to initialize device enumerator").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Try to get device by ID
    ComPtr<IMMDevice> device = g_device_enumerator->GetDeviceById(device_id);
    
    return Napi::Boolean::New(env, device != nullptr);
}

/**
 * Convert device event to JavaScript object
 */
void ConvertDeviceEventToJS(Napi::Env env, Napi::Function callback, DeviceEvent* event) {
    if (env == nullptr || callback == nullptr || event == nullptr) {
        return;
    }

    // Create event object
    Napi::Object js_event = Napi::Object::New(env);

    // Add event type
    std::string event_type;
    switch (event->type) {
        case DeviceEventType::DEVICE_ADDED:
            event_type = "deviceAdded";
            break;
        case DeviceEventType::DEVICE_REMOVED:
            event_type = "deviceRemoved";
            break;
        case DeviceEventType::DEFAULT_DEVICE_CHANGED:
            event_type = "defaultDeviceChanged";
            break;
        case DeviceEventType::DEVICE_STATE_CHANGED:
            event_type = "deviceStateChanged";
            break;
        case DeviceEventType::DEVICE_PROPERTY_CHANGED:
            event_type = "devicePropertyChanged";
            break;
        default:
            event_type = "unknown";
    }
    js_event.Set("type", Napi::String::New(env, event_type));

    // Add device ID
    int size = WideCharToMultiByte(CP_UTF8, 0, event->deviceId.c_str(), -1, nullptr, 0, nullptr, nullptr);
    std::string device_id;
    if (size > 0) {
        std::vector<char> buffer(size);
        WideCharToMultiByte(CP_UTF8, 0, event->deviceId.c_str(), -1, buffer.data(), size, nullptr, nullptr);
        device_id = buffer.data();
    }
    js_event.Set("deviceId", Napi::String::New(env, device_id));

    // Add additional data based on event type
    if (event->type == DeviceEventType::DEVICE_STATE_CHANGED) {
        js_event.Set("state", Napi::Number::New(env, event->newState));
    }
    else if (event->type == DeviceEventType::DEFAULT_DEVICE_CHANGED) {
        js_event.Set("dataFlow", Napi::Number::New(env, event->dataFlow));
        js_event.Set("role", Napi::Number::New(env, event->role));
    }

    // v2.7.1: Wrap callback in try-catch to prevent N-API uncaught exception warnings
    try {
        // Call the JavaScript callback
        callback.Call({js_event});
    } catch (const Napi::Error& e) {
        // Silently ignore callback errors to prevent log pollution
        (void)e;
    } catch (const std::exception& e) {
        (void)e;
    } catch (...) {
        // Catch all other exceptions
    }

    delete event;
}

/**
 * Start monitoring device events
 * JavaScript: startDeviceMonitoring(callback: (event) => void) => void
 */
Napi::Value StartDeviceMonitoring(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Check arguments
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected function callback").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Initialize device enumerator if needed
    if (!InitializeDeviceEnumerator()) {
        Napi::Error::New(env, "Failed to initialize device enumerator").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    std::lock_guard<std::mutex> lock(g_tsfn_mutex);

    // Check if already monitoring
    if (g_notification_client && g_notification_client->IsRegistered()) {
        Napi::Error::New(env, "Device monitoring already started").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Create thread-safe function
    Napi::Function callback = info[0].As<Napi::Function>();
    g_tsfn = Napi::ThreadSafeFunction::New(
        env,
        callback,
        "DeviceEventCallback",
        0,  // Unlimited queue
        1   // Initial thread count
    );

    // Create notification client
    if (!g_notification_client) {
        g_notification_client = new DeviceNotificationClient();
    }

    // Set event callback
    g_notification_client->SetEventCallback([](const DeviceEvent& event) {
        std::lock_guard<std::mutex> lock(g_tsfn_mutex);
        if (g_tsfn) {
            DeviceEvent* event_copy = new DeviceEvent(event);
            napi_status status = g_tsfn.BlockingCall(event_copy, ConvertDeviceEventToJS);
            if (status != napi_ok) {
                delete event_copy;
            }
        }
    });

    // Get enumerator COM interface
    ComPtr<IMMDeviceEnumerator> enumerator = g_device_enumerator->GetEnumerator();
    if (!enumerator) {
        Napi::Error::New(env, "Failed to get device enumerator").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Register notification client
    HRESULT hr = g_notification_client->Register(enumerator.Get());
    if (FAILED(hr)) {
        Napi::Error::New(env, "Failed to register device notification client").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    return env.Undefined();
}

/**
 * Stop monitoring device events
 * JavaScript: stopDeviceMonitoring() => void
 */
Napi::Value StopDeviceMonitoring(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    std::lock_guard<std::mutex> lock(g_tsfn_mutex);

    // Unregister notification client
    if (g_notification_client) {
        g_notification_client->Unregister();
        g_notification_client->Release();
        g_notification_client = nullptr;
    }

    // Release thread-safe function
    if (g_tsfn) {
        g_tsfn.Release();
    }

    return env.Undefined();
}

/**
 * Export device management functions
 */
void InitDeviceManager(Napi::Env env, Napi::Object exports) {
    exports.Set("getAudioDevices", Napi::Function::New(env, GetAudioDevices));
    exports.Set("getDefaultDeviceId", Napi::Function::New(env, GetDefaultDeviceId));
    exports.Set("verifyDeviceId", Napi::Function::New(env, VerifyDeviceId));
    
    // v2.4: Device event monitoring
    exports.Set("startDeviceMonitoring", Napi::Function::New(env, StartDeviceMonitoring));
    exports.Set("stopDeviceMonitoring", Napi::Function::New(env, StopDeviceMonitoring));
}

} // namespace audio_capture
