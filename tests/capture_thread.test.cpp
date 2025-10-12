#include "capture_thread.h"
#include "audio_client.h"
#include <gtest/gtest.h>
#include <windows.h>
#include <objbase.h>

class CaptureThreadTest : public ::testing::Test {
protected:
    void SetUp() override {
        CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    }
    void TearDown() override {
        CoUninitialize();
    }
};

TEST_F(CaptureThreadTest, ThreadStartStop) {
    AudioActivationParams params;
    params.targetProcessId = GetCurrentProcessId();
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    AudioClient client;
    ASSERT_TRUE(client.Initialize(params));
    CaptureThread thread(&client);
    EXPECT_FALSE(thread.IsRunning());
    thread.Start();
    EXPECT_TRUE(thread.IsRunning());
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    thread.Stop();
    EXPECT_FALSE(thread.IsRunning());
}
