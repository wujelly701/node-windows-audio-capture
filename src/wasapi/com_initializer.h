#pragma once
#include <windows.h>
#include <objbase.h>

class COMInitializer {
public:
    COMInitializer();
    ~COMInitializer();
    bool IsInitialized() const;
private:
    HRESULT init_result_;
    bool initialized_;
};
