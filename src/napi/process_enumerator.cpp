#include <napi.h>
#include <windows.h>
#include <tlhelp32.h>
#include <vector>
#include <string>

Napi::Value EnumerateProcesses(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Array result = Napi::Array::New(env);
    HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnap == INVALID_HANDLE_VALUE) return result;
    PROCESSENTRY32 pe32 = {0};
    pe32.dwSize = sizeof(PROCESSENTRY32);
    int idx = 0;
    if (Process32First(hSnap, &pe32)) {
        do {
            Napi::Object obj = Napi::Object::New(env);
            obj.Set("pid", Napi::Number::New(env, pe32.th32ProcessID));
            obj.Set("name", Napi::String::New(env, pe32.szExeFile));
            result.Set(idx++, obj);
        } while (Process32Next(hSnap, &pe32));
    }
    CloseHandle(hSnap);
    return result;
}
