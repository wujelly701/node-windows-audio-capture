#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>

class AudioStopTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(AudioStopTest, StopCapture) {
    AudioActivationParams params;
    params.targetProcessId = GetCurrentProcessId();
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    AudioClient client;
    ASSERT_TRUE(client.Initialize(params));
    HANDLE hEvent = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    ASSERT_NE(hEvent, nullptr);
    ASSERT_TRUE(client.SetEventHandle(hEvent));
    ASSERT_TRUE(client.Start());
    bool ok = client.Stop();
    EXPECT_TRUE(ok);
    CloseHandle(hEvent);
}
