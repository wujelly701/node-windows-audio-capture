#ifndef DEVICE_ENUMERATOR_H
#define DEVICE_ENUMERATOR_H

#include <mmdeviceapi.h>
#include <functiondiscoverykeys_devpkey.h>
#include <wrl/client.h>
#include <string>
#include <vector>

using Microsoft::WRL::ComPtr;

namespace audio_capture {

/**
 * Audio device information structure
 */
struct AudioDeviceInfo {
    std::string id;           // Device ID (unique identifier)
    std::string name;         // Device friendly name
    std::string description;  // Device description
    bool isDefault;           // Whether this is the default device
    bool isActive;            // Whether the device is currently active (DEVICE_STATE_ACTIVE)
    
    AudioDeviceInfo() 
        : isDefault(false), isActive(false) {}
};

/**
 * Audio device enumerator class
 * Enumerates all audio output (render) devices on the system
 */
class AudioDeviceEnumerator {
public:
    AudioDeviceEnumerator();
    ~AudioDeviceEnumerator();

    /**
     * Initialize the device enumerator
     * Must be called before any other methods
     * @return true if initialization succeeded, false otherwise
     */
    bool Initialize();

    /**
     * Enumerate all audio output devices
     * @return Vector of AudioDeviceInfo structures
     */
    std::vector<AudioDeviceInfo> EnumerateOutputDevices();

    /**
     * Enumerate all audio input (capture) devices (microphones)
     * @return Vector of AudioDeviceInfo structures
     * @since v2.9.0
     */
    std::vector<AudioDeviceInfo> EnumerateInputDevices();

    /**
     * Get a device by its ID
     * @param deviceId Device ID string
     * @return IMMDevice pointer, or nullptr if not found
     */
    ComPtr<IMMDevice> GetDeviceById(const std::string& deviceId);

    /**
     * Get the default audio output device
     * @return IMMDevice pointer, or nullptr if not found
     */
    ComPtr<IMMDevice> GetDefaultDevice();

    /**
     * Get the default audio input (capture) device (default microphone)
     * @return IMMDevice pointer, or nullptr if not found
     * @since v2.9.0
     */
    ComPtr<IMMDevice> GetDefaultInputDevice();

    /**
     * Get the underlying device enumerator COM interface
     * @return IMMDeviceEnumerator pointer
     */
    ComPtr<IMMDeviceEnumerator> GetEnumerator() const { return device_enumerator_; }

private:
    ComPtr<IMMDeviceEnumerator> device_enumerator_;
    bool initialized_;

    /**
     * Extract device information from IMMDevice
     * @param device IMMDevice pointer
     * @param isDefault Whether this is the default device
     * @return AudioDeviceInfo structure
     */
    AudioDeviceInfo GetDeviceInfo(IMMDevice* device, bool isDefault);

    /**
     * Get string property from device
     * @param device IMMDevice pointer
     * @param key Property key
     * @return Property value as string
     */
    std::string GetDeviceProperty(IMMDevice* device, const PROPERTYKEY& key);
};

} // namespace audio_capture

#endif // DEVICE_ENUMERATOR_H
