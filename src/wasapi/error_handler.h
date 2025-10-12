#pragma once
#include <string>
#include <windows.h>

class ErrorHandler {
public:
    // 获取错误消息字符串
    static std::string GetErrorMessage(HRESULT hr);
};
