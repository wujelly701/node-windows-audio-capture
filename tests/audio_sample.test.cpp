#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>

class AudioSampleTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(AudioSampleTest, ProcessAudioSample) {
    AudioActivationParams params;
    params.targetProcessId = GetCurrentProcessId();
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    AudioClient client;
    ASSERT_TRUE(client.Initialize(params));
    BYTE sampleData[256] = {0};
    UINT32 numFrames = 128;
    bool ok = client.ProcessAudioSample(sampleData, numFrames);
    EXPECT_TRUE(ok);
}
