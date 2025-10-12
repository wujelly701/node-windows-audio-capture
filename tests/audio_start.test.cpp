#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>

class AudioStartTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(AudioStartTest, StartCapture) {
    AudioActivationParams params;
    params.targetProcessId = GetCurrentProcessId();
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    AudioClient client;
    ASSERT_TRUE(client.Initialize(params));
    HANDLE hEvent = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    ASSERT_NE(hEvent, nullptr);
    ASSERT_TRUE(client.SetEventHandle(hEvent));
    bool ok = client.Start();
    EXPECT_TRUE(ok);
    CloseHandle(hEvent);
}
