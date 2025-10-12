#pragma once
#include <windows.h>
#include <propvarutil.h>
#include <propidl.h>

// 循环模式枚举
enum class ProcessLoopbackMode {
    INCLUDE,
    EXCLUDE
};

struct AudioActivationParams {
    DWORD targetProcessId;
    ProcessLoopbackMode loopbackMode;
    PROPVARIANT ToPropVariant() const;
};
