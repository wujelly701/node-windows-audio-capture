// audio_session_manager.h - 音频会话管理器
// 用于枚举和管理系统音频会话，实现进程级音频过滤

#ifndef AUDIO_SESSION_MANAGER_H_
#define AUDIO_SESSION_MANAGER_H_

#include <windows.h>
#include <mmdeviceapi.h>
#include <audiopolicy.h>
#include <wrl/client.h>
#include <vector>
#include <string>
#include <map>

namespace audio_capture {

// 音频会话信息
struct AudioSessionInfo {
    DWORD processId;                    // 进程 ID
    std::wstring displayName;           // 显示名称
    std::wstring iconPath;              // 图标路径
    AudioSessionState state;            // 会话状态
    float volume;                       // 音量 (0.0-1.0)
    bool isMuted;                       // 是否静音
};

// 音频会话管理器
class AudioSessionManager {
public:
    AudioSessionManager();
    ~AudioSessionManager();

    // 初始化（绑定到指定设备）
    bool Initialize(IMMDevice* device);

    // 枚举所有活动的音频会话
    bool EnumerateSessions(std::vector<AudioSessionInfo>& sessions);

    // 检查指定进程是否有活动的音频会话
    bool IsProcessPlayingAudio(DWORD processId);

    // 获取指定进程的音频会话信息
    bool GetProcessSessionInfo(DWORD processId, AudioSessionInfo& info);

    // 静音/取消静音指定进程的音频
    bool SetProcessMute(DWORD processId, bool mute);

    // 设置指定进程的音量
    bool SetProcessVolume(DWORD processId, float volume);

    // ====== v2.1 新增方法 ======

    // 静音所有进程，除了目标进程和白名单进程
    bool MuteAllExcept(DWORD targetProcessId, 
                       const std::vector<DWORD>& allowList = {});

    // 取消所有静音，恢复原始状态
    bool UnmuteAll();

    // 保存当前所有会话的静音状态
    bool SaveMuteStates();

    // 恢复之前保存的静音状态
    bool RestoreMuteStates();

    // 检查是否正在管理静音状态
    bool IsManagingMuteStates() const { return isManagingMuteStates_; }

private:
    Microsoft::WRL::ComPtr<IAudioSessionManager2> sessionManager_;
    Microsoft::WRL::ComPtr<IAudioSessionEnumerator> sessionEnumerator_;

    // v2.1: 静音状态管理
    std::map<DWORD, bool> originalMuteStates_;  // PID -> 原始静音状态
    bool isManagingMuteStates_ = false;

    // 辅助方法：从会话控制器获取信息
    bool GetSessionInfo(IAudioSessionControl* sessionControl, AudioSessionInfo& info);
};

}  // namespace audio_capture

#endif  // AUDIO_SESSION_MANAGER_H_
