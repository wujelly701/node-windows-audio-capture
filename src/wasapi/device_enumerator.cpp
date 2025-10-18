#include "device_enumerator.h"
#include <comdef.h>
#include <propvarutil.h>
#include <iostream>

namespace audio_capture {

AudioDeviceEnumerator::AudioDeviceEnumerator() 
    : initialized_(false) {
}

AudioDeviceEnumerator::~AudioDeviceEnumerator() {
    device_enumerator_.Reset();
}

bool AudioDeviceEnumerator::Initialize() {
    if (initialized_) {
        return true;
    }

    // Initialize COM for this thread if not already initialized
    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        std::cerr << "Failed to initialize COM: 0x" << std::hex << hr << std::endl;
        return false;
    }

    // Create device enumerator
    hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator),
        nullptr,
        CLSCTX_ALL,
        __uuidof(IMMDeviceEnumerator),
        reinterpret_cast<void**>(device_enumerator_.GetAddressOf())
    );

    if (FAILED(hr)) {
        std::cerr << "Failed to create IMMDeviceEnumerator: 0x" << std::hex << hr << std::endl;
        return false;
    }

    initialized_ = true;
    return true;
}

std::vector<AudioDeviceInfo> AudioDeviceEnumerator::EnumerateOutputDevices() {
    std::vector<AudioDeviceInfo> devices;

    if (!initialized_) {
        std::cerr << "Device enumerator not initialized" << std::endl;
        return devices;
    }

    // Get default device
    ComPtr<IMMDevice> default_device = GetDefaultDevice();
    std::string default_device_id;
    if (default_device) {
        LPWSTR device_id_wstr = nullptr;
        if (SUCCEEDED(default_device->GetId(&device_id_wstr))) {
            // Convert LPWSTR to std::string
            int size = WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, nullptr, 0, nullptr, nullptr);
            if (size > 0) {
                std::vector<char> buffer(size);
                WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, buffer.data(), size, nullptr, nullptr);
                default_device_id = buffer.data();
            }
            CoTaskMemFree(device_id_wstr);
        }
    }

    // Enumerate all active render devices
    ComPtr<IMMDeviceCollection> device_collection;
    HRESULT hr = device_enumerator_->EnumAudioEndpoints(
        eRender,              // Render (output) devices
        DEVICE_STATE_ACTIVE,  // Only active devices
        device_collection.GetAddressOf()
    );

    if (FAILED(hr)) {
        std::cerr << "Failed to enumerate audio endpoints: 0x" << std::hex << hr << std::endl;
        return devices;
    }

    // Get device count
    UINT device_count = 0;
    hr = device_collection->GetCount(&device_count);
    if (FAILED(hr)) {
        std::cerr << "Failed to get device count: 0x" << std::hex << hr << std::endl;
        return devices;
    }

    // Iterate through all devices
    for (UINT i = 0; i < device_count; i++) {
        ComPtr<IMMDevice> device;
        hr = device_collection->Item(i, device.GetAddressOf());
        if (FAILED(hr)) {
            continue;
        }

        // Get device ID
        LPWSTR device_id_wstr = nullptr;
        hr = device->GetId(&device_id_wstr);
        if (FAILED(hr)) {
            continue;
        }

        // Convert device ID to std::string
        int size = WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, nullptr, 0, nullptr, nullptr);
        std::string device_id;
        if (size > 0) {
            std::vector<char> buffer(size);
            WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, buffer.data(), size, nullptr, nullptr);
            device_id = buffer.data();
        }

        // Check if this is the default device
        bool is_default = (device_id == default_device_id);

        // Get device info
        AudioDeviceInfo info = GetDeviceInfo(device.Get(), is_default);
        info.id = device_id;
        info.isActive = true; // We only enumerate active devices

        devices.push_back(info);

        CoTaskMemFree(device_id_wstr);
    }

    return devices;
}

std::vector<AudioDeviceInfo> AudioDeviceEnumerator::EnumerateInputDevices() {
    std::vector<AudioDeviceInfo> devices;

    if (!initialized_) {
        std::cerr << "Device enumerator not initialized" << std::endl;
        return devices;
    }

    // Get default input device
    ComPtr<IMMDevice> default_device = GetDefaultInputDevice();
    std::string default_device_id;
    if (default_device) {
        LPWSTR device_id_wstr = nullptr;
        if (SUCCEEDED(default_device->GetId(&device_id_wstr))) {
            // Convert LPWSTR to std::string
            int size = WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, nullptr, 0, nullptr, nullptr);
            if (size > 0) {
                std::vector<char> buffer(size);
                WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, buffer.data(), size, nullptr, nullptr);
                default_device_id = buffer.data();
            }
            CoTaskMemFree(device_id_wstr);
        }
    }

    // Enumerate all active capture devices
    ComPtr<IMMDeviceCollection> device_collection;
    HRESULT hr = device_enumerator_->EnumAudioEndpoints(
        eCapture,             // Capture (input) devices - MICROPHONES
        DEVICE_STATE_ACTIVE,  // Only active devices
        device_collection.GetAddressOf()
    );

    if (FAILED(hr)) {
        std::cerr << "Failed to enumerate audio capture endpoints: 0x" << std::hex << hr << std::endl;
        return devices;
    }

    // Get device count
    UINT device_count = 0;
    hr = device_collection->GetCount(&device_count);
    if (FAILED(hr)) {
        std::cerr << "Failed to get device count: 0x" << std::hex << hr << std::endl;
        return devices;
    }

    // Iterate through all devices
    for (UINT i = 0; i < device_count; i++) {
        ComPtr<IMMDevice> device;
        hr = device_collection->Item(i, device.GetAddressOf());
        if (FAILED(hr)) {
            continue;
        }

        // Get device ID
        LPWSTR device_id_wstr = nullptr;
        hr = device->GetId(&device_id_wstr);
        if (FAILED(hr)) {
            continue;
        }

        // Convert device ID to std::string
        int size = WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, nullptr, 0, nullptr, nullptr);
        std::string device_id;
        if (size > 0) {
            std::vector<char> buffer(size);
            WideCharToMultiByte(CP_UTF8, 0, device_id_wstr, -1, buffer.data(), size, nullptr, nullptr);
            device_id = buffer.data();
        }

        // Check if this is the default device
        bool is_default = (device_id == default_device_id);

        // Get device info
        AudioDeviceInfo info = GetDeviceInfo(device.Get(), is_default);
        info.id = device_id;
        info.isActive = true; // We only enumerate active devices

        devices.push_back(info);

        CoTaskMemFree(device_id_wstr);
    }

    return devices;
}

ComPtr<IMMDevice> AudioDeviceEnumerator::GetDeviceById(const std::string& deviceId) {
    if (!initialized_) {
        std::cerr << "Device enumerator not initialized" << std::endl;
        return nullptr;
    }

    // Convert std::string to LPWSTR
    int size = MultiByteToWideChar(CP_UTF8, 0, deviceId.c_str(), -1, nullptr, 0);
    if (size <= 0) {
        return nullptr;
    }

    std::vector<wchar_t> device_id_wstr(size);
    MultiByteToWideChar(CP_UTF8, 0, deviceId.c_str(), -1, device_id_wstr.data(), size);

    // Get device by ID
    ComPtr<IMMDevice> device;
    HRESULT hr = device_enumerator_->GetDevice(device_id_wstr.data(), device.GetAddressOf());
    
    if (FAILED(hr)) {
        std::cerr << "Failed to get device by ID: 0x" << std::hex << hr << std::endl;
        return nullptr;
    }

    return device;
}

ComPtr<IMMDevice> AudioDeviceEnumerator::GetDefaultDevice() {
    if (!initialized_) {
        std::cerr << "Device enumerator not initialized" << std::endl;
        return nullptr;
    }

    ComPtr<IMMDevice> device;
    HRESULT hr = device_enumerator_->GetDefaultAudioEndpoint(
        eRender,       // Render (output) device
        eConsole,      // Console role (default for most applications)
        device.GetAddressOf()
    );

    if (FAILED(hr)) {
        std::cerr << "Failed to get default audio endpoint: 0x" << std::hex << hr << std::endl;
        return nullptr;
    }

    return device;
}

ComPtr<IMMDevice> AudioDeviceEnumerator::GetDefaultInputDevice() {
    if (!initialized_) {
        std::cerr << "Device enumerator not initialized" << std::endl;
        return nullptr;
    }

    ComPtr<IMMDevice> device;
    HRESULT hr = device_enumerator_->GetDefaultAudioEndpoint(
        eCapture,      // Capture (input) device - MICROPHONE
        eConsole,      // Console role (default for most applications)
        device.GetAddressOf()
    );

    if (FAILED(hr)) {
        std::cerr << "Failed to get default audio capture endpoint: 0x" << std::hex << hr << std::endl;
        return nullptr;
    }

    return device;
}

AudioDeviceInfo AudioDeviceEnumerator::GetDeviceInfo(IMMDevice* device, bool isDefault) {
    AudioDeviceInfo info;
    info.isDefault = isDefault;

    if (!device) {
        return info;
    }

    // Get friendly name
    info.name = GetDeviceProperty(device, PKEY_Device_FriendlyName);
    
    // Get device description
    info.description = GetDeviceProperty(device, PKEY_Device_DeviceDesc);
    
    // If description is empty, use friendly name
    if (info.description.empty()) {
        info.description = info.name;
    }

    return info;
}

std::string AudioDeviceEnumerator::GetDeviceProperty(IMMDevice* device, const PROPERTYKEY& key) {
    if (!device) {
        return "";
    }

    ComPtr<IPropertyStore> properties;
    HRESULT hr = device->OpenPropertyStore(STGM_READ, properties.GetAddressOf());
    if (FAILED(hr)) {
        return "";
    }

    PROPVARIANT prop_var;
    PropVariantInit(&prop_var);

    hr = properties->GetValue(key, &prop_var);
    if (FAILED(hr)) {
        PropVariantClear(&prop_var);
        return "";
    }

    std::string result;
    if (prop_var.vt == VT_LPWSTR && prop_var.pwszVal) {
        // Convert LPWSTR to std::string
        int size = WideCharToMultiByte(CP_UTF8, 0, prop_var.pwszVal, -1, nullptr, 0, nullptr, nullptr);
        if (size > 0) {
            std::vector<char> buffer(size);
            WideCharToMultiByte(CP_UTF8, 0, prop_var.pwszVal, -1, buffer.data(), size, nullptr, nullptr);
            result = buffer.data();
        }
    }

    PropVariantClear(&prop_var);
    return result;
}

} // namespace audio_capture
