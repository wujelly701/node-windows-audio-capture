#include <napi.h>
#include "../wasapi/device_enumerator.h"
#include <memory>

namespace audio_capture {

// Global device enumerator instance
static std::unique_ptr<AudioDeviceEnumerator> g_device_enumerator;

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
 * Export device management functions
 */
void InitDeviceManager(Napi::Env env, Napi::Object exports) {
    exports.Set("getAudioDevices", Napi::Function::New(env, GetAudioDevices));
    exports.Set("getDefaultDeviceId", Napi::Function::New(env, GetDefaultDeviceId));
    exports.Set("verifyDeviceId", Napi::Function::New(env, VerifyDeviceId));
}

} // namespace audio_capture
