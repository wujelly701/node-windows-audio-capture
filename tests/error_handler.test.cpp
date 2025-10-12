#include "error_handler.h"
#include <gtest/gtest.h>
#include <windows.h>

TEST(ErrorHandlerTest, KnownErrorMessage) {
    std::string msg = ErrorHandler::GetErrorMessage(E_INVALIDARG);
    EXPECT_FALSE(msg.empty());
    EXPECT_NE(msg, "Unknown error");
}

TEST(ErrorHandlerTest, UnknownErrorMessage) {
    std::string msg = ErrorHandler::GetErrorMessage(0xDEADBEEF);
    EXPECT_EQ(msg, "Unknown error");
}
