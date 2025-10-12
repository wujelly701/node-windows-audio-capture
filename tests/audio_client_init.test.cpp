#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>

class AudioClientInitTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(AudioClientInitTest, InitializeAndStatus) {
    AudioActivationParams params;
    params.targetProcessId = GetCurrentProcessId();
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    AudioClient client;
    EXPECT_FALSE(client.IsInitialized());
    bool ok = client.Initialize(params);
    EXPECT_TRUE(ok);
    EXPECT_TRUE(client.IsInitialized());
    auto ac = client.GetAudioClient();
    EXPECT_NE(ac.Get(), nullptr);
}
