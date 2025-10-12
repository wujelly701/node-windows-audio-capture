#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>

class AudioClientActivateTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(AudioClientActivateTest, Initialize_Success) {
    AudioActivationParams params;
    params.targetProcessId = GetCurrentProcessId();
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    AudioClient client;
    bool ok = client.Initialize(params);
    EXPECT_TRUE(ok);
    auto ac = client.GetAudioClient();
    EXPECT_NE(ac.Get(), nullptr);
}
