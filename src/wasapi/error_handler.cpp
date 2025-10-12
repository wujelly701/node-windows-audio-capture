#include "error_handler.h"
#include <windows.h>
#include <string>

std::string ErrorHandler::GetErrorMessage(HRESULT hr) {
    char* msgBuf = nullptr;
    DWORD flags = FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS;
    DWORD langId = MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT);
    DWORD len = FormatMessageA(flags, nullptr, hr, langId, (LPSTR)&msgBuf, 0, nullptr);
    std::string result;
    if (len && msgBuf) {
        result = msgBuf;
        LocalFree(msgBuf);
    } else {
        result = "Unknown error";
    }
    return result;
}
