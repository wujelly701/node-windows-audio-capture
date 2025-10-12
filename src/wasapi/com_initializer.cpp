#include "com_initializer.h"
#include <iostream>

COMInitializer::COMInitializer() {
    init_result_ = CoInitializeEx(NULL, COINIT_MULTITHREADED);
    initialized_ = SUCCEEDED(init_result_);
    if (!initialized_) {
        std::cerr << "CoInitializeEx failed, HRESULT: " << std::hex << init_result_ << std::endl;
    }
}

COMInitializer::~COMInitializer() {
    if (initialized_) {
        CoUninitialize();
    }
}

bool COMInitializer::IsInitialized() const {
    return initialized_;
}
