#include "audio_params.h"
#include <gtest/gtest.h>
#include <propvarutil.h>
#include <propidl.h>
#include <windows.h>

TEST(AudioActivationParamsTest, ToPropVariant_IncludeMode) {
    AudioActivationParams params;
    params.targetProcessId = 1234;
    params.loopbackMode = ProcessLoopbackMode::INCLUDE;
    PROPVARIANT var = params.ToPropVariant();
    EXPECT_EQ(var.vt, VT_BLOB);
    ASSERT_EQ(var.blob.cbSize, sizeof(DWORD) + sizeof(int));
    struct {
        DWORD pid;
        int loopback;
    } packed;
    memcpy(&packed, var.blob.pBlobData, sizeof(packed));
    EXPECT_EQ(packed.pid, 1234);
    EXPECT_EQ(packed.loopback, 1);
    PropVariantClear(&var);
}

TEST(AudioActivationParamsTest, ToPropVariant_ExcludeMode) {
    AudioActivationParams params;
    params.targetProcessId = 5678;
    params.loopbackMode = ProcessLoopbackMode::EXCLUDE;
    PROPVARIANT var = params.ToPropVariant();
    EXPECT_EQ(var.vt, VT_BLOB);
    ASSERT_EQ(var.blob.cbSize, sizeof(DWORD) + sizeof(int));
    struct {
        DWORD pid;
        int loopback;
    } packed;
    memcpy(&packed, var.blob.pBlobData, sizeof(packed));
    EXPECT_EQ(packed.pid, 5678);
    EXPECT_EQ(packed.loopback, 0);
    PropVariantClear(&var);
}
