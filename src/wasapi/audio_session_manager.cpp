// audio_session_manager.cpp - 音频会话管理器实现

#include "audio_session_manager.h"
#include <stdio.h>
#include <algorithm>

// 调试输出宏（复用现有的）
#define DEBUG_LOG(msg) do { \
    OutputDebugStringA(msg); \
    fprintf(stderr, "%s", msg); \
    fflush(stderr); \
} while(0)

#define DEBUG_LOGF(fmt, ...) do { \
    char debugMsg[512]; \
    sprintf_s(debugMsg, fmt, __VA_ARGS__); \
    OutputDebugStringA(debugMsg); \
    fprintf(stderr, "%s", debugMsg); \
    fflush(stderr); \
} while(0)

namespace audio_capture {

AudioSessionManager::AudioSessionManager() {
}

AudioSessionManager::~AudioSessionManager() {
    sessionEnumerator_.Reset();
    sessionManager_.Reset();
}

bool AudioSessionManager::Initialize(IMMDevice* device) {
    if (!device) {
        DEBUG_LOG("[AudioSessionManager] Device is null\n");
        return false;
    }

    // 激活 IAudioSessionManager2 接口
    HRESULT hr = device->Activate(
        __uuidof(IAudioSessionManager2),
        CLSCTX_ALL,
        nullptr,
        (void**)&sessionManager_
    );

    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioSessionManager] Failed to activate IAudioSessionManager2: 0x%08X\n", hr);
        return false;
    }

    DEBUG_LOG("[AudioSessionManager] Initialized successfully\n");
    return true;
}

bool AudioSessionManager::EnumerateSessions(std::vector<AudioSessionInfo>& sessions) {
    sessions.clear();

    if (!sessionManager_) {
        DEBUG_LOG("[AudioSessionManager] Not initialized\n");
        return false;
    }

    // 获取会话枚举器
    HRESULT hr = sessionManager_->GetSessionEnumerator(&sessionEnumerator_);
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioSessionManager] Failed to get session enumerator: 0x%08X\n", hr);
        return false;
    }

    // 获取会话数量
    int sessionCount = 0;
    hr = sessionEnumerator_->GetCount(&sessionCount);
    if (FAILED(hr)) {
        DEBUG_LOGF("[AudioSessionManager] Failed to get session count: 0x%08X\n", hr);
        return false;
    }

    DEBUG_LOGF("[AudioSessionManager] Found %d audio sessions\n", sessionCount);

    // 枚举所有会话
    for (int i = 0; i < sessionCount; i++) {
        Microsoft::WRL::ComPtr<IAudioSessionControl> sessionControl;
        hr = sessionEnumerator_->GetSession(i, &sessionControl);
        if (FAILED(hr)) {
            DEBUG_LOGF("[AudioSessionManager] Failed to get session %d: 0x%08X\n", i, hr);
            continue;
        }

        AudioSessionInfo info;
        if (GetSessionInfo(sessionControl.Get(), info)) {
            // 只添加活动的会话
            if (info.state == AudioSessionStateActive) {
                sessions.push_back(info);
                DEBUG_LOGF("[AudioSessionManager] Session %d: PID=%lu, Name=%S, State=%d\n",
                          i, info.processId, info.displayName.c_str(), info.state);
            }
        }
    }

    return true;
}

bool AudioSessionManager::IsProcessPlayingAudio(DWORD processId) {
    std::vector<AudioSessionInfo> sessions;
    if (!EnumerateSessions(sessions)) {
        return false;
    }

    for (const auto& session : sessions) {
        if (session.processId == processId && session.state == AudioSessionStateActive) {
            return true;
        }
    }

    return false;
}

bool AudioSessionManager::GetProcessSessionInfo(DWORD processId, AudioSessionInfo& info) {
    std::vector<AudioSessionInfo> sessions;
    if (!EnumerateSessions(sessions)) {
        return false;
    }

    for (const auto& session : sessions) {
        if (session.processId == processId) {
            info = session;
            return true;
        }
    }

    return false;
}

bool AudioSessionManager::SetProcessMute(DWORD processId, bool mute) {
    if (!sessionManager_) {
        return false;
    }

    // 获取会话枚举器
    HRESULT hr = sessionManager_->GetSessionEnumerator(&sessionEnumerator_);
    if (FAILED(hr)) {
        return false;
    }

    int sessionCount = 0;
    hr = sessionEnumerator_->GetCount(&sessionCount);
    if (FAILED(hr)) {
        return false;
    }

    // 查找并静音目标进程的会话
    bool found = false;
    for (int i = 0; i < sessionCount; i++) {
        Microsoft::WRL::ComPtr<IAudioSessionControl> sessionControl;
        hr = sessionEnumerator_->GetSession(i, &sessionControl);
        if (FAILED(hr)) continue;

        // 获取 IAudioSessionControl2 以查询进程 ID
        Microsoft::WRL::ComPtr<IAudioSessionControl2> sessionControl2;
        hr = sessionControl.As(&sessionControl2);
        if (FAILED(hr)) continue;

        DWORD sessionPid = 0;
        hr = sessionControl2->GetProcessId(&sessionPid);
        if (FAILED(hr)) continue;

        if (sessionPid == processId) {
            // 获取 ISimpleAudioVolume 接口
            Microsoft::WRL::ComPtr<ISimpleAudioVolume> simpleVolume;
            hr = sessionControl.As(&simpleVolume);
            if (SUCCEEDED(hr)) {
                hr = simpleVolume->SetMute(mute ? TRUE : FALSE, nullptr);
                if (SUCCEEDED(hr)) {
                    found = true;
                    DEBUG_LOGF("[AudioSessionManager] Set mute=%d for PID=%lu\n", mute, processId);
                }
            }
        }
    }

    return found;
}

bool AudioSessionManager::SetProcessVolume(DWORD processId, float volume) {
    if (!sessionManager_) {
        return false;
    }

    // 限制音量范围
    if (volume < 0.0f) volume = 0.0f;
    if (volume > 1.0f) volume = 1.0f;

    // 获取会话枚举器
    HRESULT hr = sessionManager_->GetSessionEnumerator(&sessionEnumerator_);
    if (FAILED(hr)) {
        return false;
    }

    int sessionCount = 0;
    hr = sessionEnumerator_->GetCount(&sessionCount);
    if (FAILED(hr)) {
        return false;
    }

    // 查找并设置目标进程的音量
    bool found = false;
    for (int i = 0; i < sessionCount; i++) {
        Microsoft::WRL::ComPtr<IAudioSessionControl> sessionControl;
        hr = sessionEnumerator_->GetSession(i, &sessionControl);
        if (FAILED(hr)) continue;

        Microsoft::WRL::ComPtr<IAudioSessionControl2> sessionControl2;
        hr = sessionControl.As(&sessionControl2);
        if (FAILED(hr)) continue;

        DWORD sessionPid = 0;
        hr = sessionControl2->GetProcessId(&sessionPid);
        if (FAILED(hr)) continue;

        if (sessionPid == processId) {
            Microsoft::WRL::ComPtr<ISimpleAudioVolume> simpleVolume;
            hr = sessionControl.As(&simpleVolume);
            if (SUCCEEDED(hr)) {
                hr = simpleVolume->SetMasterVolume(volume, nullptr);
                if (SUCCEEDED(hr)) {
                    found = true;
                    DEBUG_LOGF("[AudioSessionManager] Set volume=%.2f for PID=%lu\n", volume, processId);
                }
            }
        }
    }

    return found;
}

bool AudioSessionManager::GetSessionInfo(IAudioSessionControl* sessionControl, AudioSessionInfo& info) {
    if (!sessionControl) {
        return false;
    }

    // 获取 IAudioSessionControl2 (扩展接口)
    Microsoft::WRL::ComPtr<IAudioSessionControl2> sessionControl2;
    HRESULT hr = sessionControl->QueryInterface(__uuidof(IAudioSessionControl2), &sessionControl2);
    if (FAILED(hr)) {
        return false;
    }

    // 获取进程 ID
    hr = sessionControl2->GetProcessId(&info.processId);
    if (FAILED(hr)) {
        return false;
    }

    // 获取会话状态
    hr = sessionControl->GetState(&info.state);
    if (FAILED(hr)) {
        info.state = AudioSessionStateInactive;
    }

    // 获取显示名称
    LPWSTR displayName = nullptr;
    hr = sessionControl->GetDisplayName(&displayName);
    if (SUCCEEDED(hr) && displayName) {
        info.displayName = displayName;
        CoTaskMemFree(displayName);
    }

    // 获取图标路径
    LPWSTR iconPath = nullptr;
    hr = sessionControl->GetIconPath(&iconPath);
    if (SUCCEEDED(hr) && iconPath) {
        info.iconPath = iconPath;
        CoTaskMemFree(iconPath);
    }

    // 获取音量信息
    Microsoft::WRL::ComPtr<ISimpleAudioVolume> simpleVolume;
    hr = sessionControl->QueryInterface(__uuidof(ISimpleAudioVolume), &simpleVolume);
    if (SUCCEEDED(hr)) {
        simpleVolume->GetMasterVolume(&info.volume);
        BOOL muted = FALSE;
        simpleVolume->GetMute(&muted);
        info.isMuted = (muted == TRUE);
    } else {
        info.volume = 1.0f;
        info.isMuted = false;
    }

    return true;
}

// ====== v2.1 新增方法实现 ======

bool AudioSessionManager::SaveMuteStates() {
    DEBUG_LOG("[AudioSessionManager] Saving mute states...\n");
    
    originalMuteStates_.clear();
    
    std::vector<AudioSessionInfo> sessions;
    if (!EnumerateSessions(sessions)) {
        DEBUG_LOG("[AudioSessionManager] Failed to enumerate sessions\n");
        return false;
    }
    
    for (const auto& session : sessions) {
        originalMuteStates_[session.processId] = session.isMuted;
        DEBUG_LOGF("[AudioSessionManager] Saved state: PID %d, Muted: %d\n", 
                   session.processId, session.isMuted);
    }
    
    DEBUG_LOGF("[AudioSessionManager] Saved %d mute states\n", 
               originalMuteStates_.size());
    return true;
}

bool AudioSessionManager::RestoreMuteStates() {
    DEBUG_LOG("[AudioSessionManager] Restoring mute states...\n");
    
    if (originalMuteStates_.empty()) {
        DEBUG_LOG("[AudioSessionManager] No saved states to restore\n");
        return true;
    }
    
    int restored = 0;
    for (const auto& [processId, wasMuted] : originalMuteStates_) {
        if (SetProcessMute(processId, wasMuted)) {
            restored++;
            DEBUG_LOGF("[AudioSessionManager] Restored PID %d to muted=%d\n", 
                       processId, wasMuted);
        }
    }
    
    DEBUG_LOGF("[AudioSessionManager] Restored %d/%d states\n", 
               restored, originalMuteStates_.size());
    
    originalMuteStates_.clear();
    isManagingMuteStates_ = false;
    
    return restored > 0;
}

bool AudioSessionManager::MuteAllExcept(
    DWORD targetProcessId,
    const std::vector<DWORD>& allowList) {
    
    DEBUG_LOGF("[AudioSessionManager] MuteAllExcept: target=%d, allowList size=%d\n",
               targetProcessId, allowList.size());
    
    if (!sessionManager_) {
        DEBUG_LOG("[AudioSessionManager] Session manager not initialized\n");
        return false;
    }
    
    // 首次调用时保存原始状态
    if (!isManagingMuteStates_) {
        if (!SaveMuteStates()) {
            DEBUG_LOG("[AudioSessionManager] Failed to save mute states\n");
            return false;
        }
        isManagingMuteStates_ = true;
    }
    
    // 枚举所有会话
    std::vector<AudioSessionInfo> sessions;
    if (!EnumerateSessions(sessions)) {
        DEBUG_LOG("[AudioSessionManager] Failed to enumerate sessions\n");
        return false;
    }
    
    int mutedCount = 0;
    int unmutedCount = 0;
    
    // 应用静音规则
    for (const auto& session : sessions) {
        bool shouldMute = true;
        
        // 规则1: 目标进程不静音
        if (session.processId == targetProcessId) {
            shouldMute = false;
            DEBUG_LOGF("[AudioSessionManager] Target process %d - will not mute\n", 
                       session.processId);
        }
        // 规则2: 白名单进程不静音
        else if (std::find(allowList.begin(), allowList.end(), 
                          session.processId) != allowList.end()) {
            shouldMute = false;
            DEBUG_LOGF("[AudioSessionManager] Allow-listed process %d - will not mute\n",
                       session.processId);
        }
        else {
            DEBUG_LOGF("[AudioSessionManager] Process %d - will mute\n",
                       session.processId);
        }
        
        // 应用静音设置
        if (SetProcessMute(session.processId, shouldMute)) {
            if (shouldMute) {
                mutedCount++;
            } else {
                unmutedCount++;
            }
        }
    }
    
    DEBUG_LOGF("[AudioSessionManager] MuteAllExcept complete: muted=%d, unmuted=%d\n",
               mutedCount, unmutedCount);
    
    return true;
}

bool AudioSessionManager::UnmuteAll() {
    DEBUG_LOG("[AudioSessionManager] UnmuteAll called\n");
    
    if (!isManagingMuteStates_) {
        DEBUG_LOG("[AudioSessionManager] Not managing mute states, nothing to restore\n");
        return true;
    }
    
    return RestoreMuteStates();
}

}  // namespace audio_capture
