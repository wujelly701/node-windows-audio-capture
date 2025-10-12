#include <gtest/gtest.h>
#include "../src/wasapi/com_initializer.h"

TEST(COMInitializer, InitializeAndCleanup) {
    // 第一次创建，应该初始化成功
    COMInitializer com1;
    EXPECT_TRUE(com1.IsInitialized());
    // 析构后再次创建新实例
    {
        COMInitializer com2;
        EXPECT_TRUE(com2.IsInitialized());
    }
}
