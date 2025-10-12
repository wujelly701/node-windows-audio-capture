#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>

class AudioEventTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(AudioEventTest, SetEventHandle) {
    AudioActivationParams params;
    params.targetProcessId = GetCurrentProcessId();
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    AudioClient client;
    ASSERT_TRUE(client.Initialize(params));
    HANDLE hEvent = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    ASSERT_NE(hEvent, nullptr);
    bool ok = client.SetEventHandle(hEvent);
    EXPECT_TRUE(ok);
    CloseHandle(hEvent);
}
