#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>
#include <wrl/client.h>

class AudioClientCallbackTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(AudioClientCallbackTest, ActivateCompleted_Success) {
    AudioClient client;
    Microsoft::WRL::ComPtr<IAudioClient2> fakeClient = reinterpret_cast<IAudioClient2*>(0x1); // 非空指针模拟
    client.ActivateCompleted(S_OK, fakeClient);
    EXPECT_TRUE(client.GetAudioClient().Get() == fakeClient.Get());
}

TEST_F(AudioClientCallbackTest, ActivateCompleted_Failure) {
    AudioClient client;
    client.ActivateCompleted(E_FAIL, nullptr);
    EXPECT_EQ(client.GetAudioClient().Get(), nullptr);
}
