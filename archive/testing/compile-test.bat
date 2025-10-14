@echo off
REM 编译 Process Loopback 独立测试程序

echo === 正在编译 test-process-loopback-native.exe ===
echo.

REM 尝试找到 VS 2022 Build Tools
set VSWHERE="C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"
if exist %VSWHERE% (
    for /f "usebackq tokens=*" %%i in (`%VSWHERE% -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
        set VS_PATH=%%i
    )
)

if defined VS_PATH (
    echo 找到 Visual Studio: %VS_PATH%
    call "%VS_PATH%\VC\Auxiliary\Build\vcvars64.bat"
    echo.
    echo 编译中...
    cl /EHsc /std:c++17 /Fe:test-process-loopback-native.exe test-process-loopback-native.cpp ole32.lib oleaut32.lib runtimeobject.lib mmdevapi.lib
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ 编译成功！
        echo.
        echo 运行测试:
        echo   test-process-loopback-native.exe
        echo   test-process-loopback-native.exe 18052  ^(测试 PotPlayer PID^)
    ) else (
        echo.
        echo ❌ 编译失败
    )
) else (
    echo ❌ 找不到 Visual Studio 2022 Build Tools
    echo.
    echo 请在 "x64 Native Tools Command Prompt for VS 2022" 中运行:
    echo   cl /EHsc /std:c++17 /Fe:test-process-loopback-native.exe test-process-loopback-native.cpp ole32.lib oleaut32.lib runtimeobject.lib mmdevapi.lib
)

pause
