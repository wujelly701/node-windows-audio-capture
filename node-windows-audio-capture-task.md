# 开发任务清单（函数级）

**说明**：本任务清单基于附件《Production-Ready Node.js Audio Capture Addon.md》技术需求文档，按照 WASAPI 音频捕获 → N-API 绑定 → JavaScript API → 构建配置 → 测试验证的依赖顺序拆解为函数级任务，覆盖 Windows 进程级音频捕获插件的完整开发流程。

---

## 配置与基础设施任务

- [ ] **id**: T001 | **file**: binding.gyp | **title**: 配置构建文件 | **type**: CONFIG | **depends_on**: []  
  **description**: 创建 binding.gyp 配置文件，定义编译目标、源文件列表、Windows SDK 依赖库（ole32.lib、oleaut32.lib、uuid.lib、winmm.lib）、N-API 版本（v8）及 MSVC 编译选项。  
  **acceptance_criteria**:  
  - 文件包含 target_name: "audio_addon"，sources 列出所有 C++ 源文件路径  
  - Windows 条件块中正确链接 ole32.lib、oleaut32.lib、uuid.lib、winmm.lib  
  - defines 包含 NAPI_VERSION=8、WIN32_LEAN_AND_MEAN、_WIN32_WINNT=0x0A00  
  **output**: `binding.gyp` 文件，包含完整的 node-gyp 构建配置。  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T002 | **file**: package.json | **title**: 初始化项目配置 | **type**: CONFIG | **depends_on**: [T001]  
  **description**: 创建 package.json，声明依赖项（node-addon-api、node-gyp-build）、开发依赖（prebuildify、@electron/rebuild）、脚本命令（install、prebuild、test）及 binary.napi_versions 字段。  
  **acceptance_criteria**:  
  - dependencies 包含 node-addon-api@^8.0.0 和 node-gyp-build@^4.8.0  
  - devDependencies 包含 prebuildify@^6.0.0、@electron/rebuild、jest  
  - scripts 包含 "install": "node-gyp-build"、"prebuild": "prebuildify --napi --strip"  
  **output**: `package.json` 文件，符合 npm 标准。  
  **est_hours**: 1  
  **status**: [ ]

- [ ] **id**: T003 | **file**: tests/package.json | **title**: 测试配置 | **type**: TEST | **depends_on**: [T002]  
  **description**: 验证 package.json 配置正确性，运行 npm install 并检查依赖安装无误。  
  **acceptance_criteria**:  
  - 执行 npm install 无错误输出  
  - node_modules 中存在 node-addon-api、node-gyp-build、prebuildify 目录  
  **output**: 测试报告或命令行输出截图。  
  **status**: [ ]

---

## C++ WASAPI 音频捕获模块

- [ ] **id**: T004 | **file**: src/wasapi/com_initializer.h | **title**: COM 初始化器声明 | **type**: DEV | **depends_on**: []  
  **description**: 定义 COMInitializer 类，封装 CoInitializeEx 和 CoUninitialize 调用，采用 RAII 模式确保 COM 生命周期管理。  
  **acceptance_criteria**:  
  - 类构造函数调用 CoInitializeEx(NULL, COINIT_MULTITHREADED)  
  - 类析构函数调用 CoUninitialize()  
  - 提供 IsInitialized() 方法返回布尔值  
  **output**: `src/wasapi/com_initializer.h`，包含类定义：`class COMInitializer { public: COMInitializer(); ~COMInitializer(); bool IsInitialized() const; }`  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T005 | **file**: src/wasapi/com_initializer.cpp | **title**: COM 初始化器实现 | **type**: DEV | **depends_on**: [T004]  
  **description**: 实现 COMInitializer 类的构造/析构函数，处理 COM 初始化错误（检查 HRESULT）。  
  **acceptance_criteria**:  
  - 构造函数中 CoInitializeEx 失败时记录 HRESULT 错误码  
  - 析构函数只在初始化成功时调用 CoUninitialize  
  **output**: `src/wasapi/com_initializer.cpp`，实现构造/析构函数及错误处理逻辑。  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T006 | **file**: tests/com_initializer.test.cpp | **title**: 单元测试：COM 初始化 | **type**: TEST | **depends_on**: [T005]  
  **description**: 使用 Google Test 测试 COMInitializer 的初始化和清理功能。  
  **acceptance_criteria**:  
  - 创建 COMInitializer 实例后 IsInitialized() 返回 true  
  - 析构后可再次创建新实例无错误  
  **output**: `tests/com_initializer.test.cpp`，包含 TEST(COMInitializer, InitializeAndCleanup) 测试用例。  
  **status**: [ ]

- [ ] **id**: T007 | **file**: src/wasapi/audio_params.h | **title**: 音频参数结构定义 | **type**: DEV | **depends_on**: []  
  **description**: 定义 AudioActivationParams 结构体，封装 AUDIOCLIENT_ACTIVATION_PARAMS 和 PROPVARIANT，包含目标进程 ID、循环模式（INCLUDE/EXCLUDE）等字段。  
  **acceptance_criteria**:  
  - 结构体包含 targetProcessId（DWORD）和 loopbackMode（枚举）字段  
  - 提供 ToPropVariant() 方法返回 PROPVARIANT 结构  
  **output**: `src/wasapi/audio_params.h`，包含 `struct AudioActivationParams { DWORD targetProcessId; ProcessLoopbackMode loopbackMode; PROPVARIANT ToPropVariant(); }`  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T008 | **file**: src/wasapi/audio_params.cpp | **title**: 音频参数转换实现 | **type**: DEV | **depends_on**: [T007]  
  **description**: 实现 ToPropVariant() 方法，将 AudioActivationParams 打包为 PROPVARIANT 结构（vt=VT_BLOB）。  
  **acceptance_criteria**:  
  - ToPropVariant() 返回的 PROPVARIANT.vt 等于 VT_BLOB  
  - blob.cbSize 等于 sizeof(AUDIOCLIENT_ACTIVATION_PARAMS)  
  - blob.pBlobData 指向正确的 activationParams 数据  
  **output**: `src/wasapi/audio_params.cpp`，实现 ToPropVariant() 函数。  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T009 | **file**: tests/audio_params.test.cpp | **title**: 单元测试：参数转换 | **type**: TEST | **depends_on**: [T008]  
  **description**: 测试 AudioActivationParams 转 PROPVARIANT 的正确性。  
  **acceptance_criteria**:  
  - 输入 targetProcessId=1234 后，ToPropVariant().blob.pBlobData 解析出的 ProcessId 为 1234  
  - loopbackMode 正确映射到 AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS 结构  
  **output**: `tests/audio_params.test.cpp`，包含参数验证测试用例。  
  **status**: [ ]

- [ ] **id**: T010 | **file**: src/wasapi/audio_client.h | **title**: 音频客户端类声明 | **type**: DEV | **depends_on**: [T007]  
  **description**: 定义 AudioClient 类，封装 IAudioClient 和 IAudioCaptureClient 接口，提供 ActivateAsync、Initialize、Start、Stop 等方法声明。  
  **acceptance_criteria**:  
  - 类包含私有成员 IAudioClient* m_AudioClient 和 IAudioCaptureClient* m_CaptureClient  
  - 公开方法：ActivateAsync(const AudioActivationParams&), Initialize(), Start(), Stop()  
  - 实现 IActivateAudioInterfaceCompletionHandler 接口  
  **output**: `src/wasapi/audio_client.h`，包含类定义和方法签名。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T011 | **file**: src/wasapi/audio_client.cpp - ActivateAsync | **title**: 异步激活实现 | **type**: DEV | **depends_on**: [T010]  
  **description**: 实现 ActivateAsync 函数，调用 ActivateAudioInterfaceAsync API，传入虚拟设备字符串 VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK 和 PROPVARIANT 参数。  
  **acceptance_criteria**:  
  - 函数调用 ActivateAudioInterfaceAsync，传入正确的设备字符串和激活参数  
  - 返回 HRESULT，成功时为 S_OK  
  - 保存 IActivateAudioInterfaceAsyncOperation* 指针到成员变量  
  **output**: `src/wasapi/audio_client.cpp` 中 ActivateAsync 函数，签名：`HRESULT ActivateAsync(const AudioActivationParams& params)`  
  **est_hours**: 5  
  **status**: [ ]

- [ ] **id**: T012 | **file**: tests/audio_client_activate.test.cpp | **title**: 单元测试：异步激活 | **type**: TEST | **depends_on**: [T011]  
  **description**: 使用 mock IAudioClient 测试 ActivateAsync 调用流程。  
  **acceptance_criteria**:  
  - ActivateAsync 返回 S_OK 或预期错误码  
  - 验证传入 ActivateAudioInterfaceAsync 的参数正确性（使用 mock）  
  **output**: `tests/audio_client_activate.test.cpp`，包含 mock 和断言。  
  **status**: [ ]

- [ ] **id**: T013 | **file**: src/wasapi/audio_client.cpp - ActivateCompleted | **title**: 激活完成回调 | **type**: DEV | **depends_on**: [T011]  
  **description**: 实现 IActivateAudioInterfaceCompletionHandler::ActivateCompleted 回调方法，获取 IAudioClient 接口并释放异步操作对象（防止内存泄漏）。  
  **acceptance_criteria**:  
  - 从 IActivateAudioInterfaceAsyncOperation 中查询 IAudioClient 接口  
  - 显式调用 asyncOp->Release() 释放异步操作对象  
  - 设置激活完成事件（SetEvent）通知主线程  
  **output**: `src/wasapi/audio_client.cpp` 中 ActivateCompleted 函数。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T014 | **file**: tests/audio_client_callback.test.cpp | **title**: 单元测试：激活回调 | **type**: TEST | **depends_on**: [T013]  
  **description**: 测试 ActivateCompleted 回调的资源释放和接口获取逻辑。  
  **acceptance_criteria**:  
  - 验证 asyncOp->Release() 被调用  
  - m_AudioClient 指针不为空  
  **output**: `tests/audio_client_callback.test.cpp`，使用 mock 验证回调行为。  
  **status**: [ ]

- [ ] **id**: T015 | **file**: src/wasapi/audio_client.cpp - Initialize | **title**: 音频客户端初始化 | **type**: DEV | **depends_on**: [T013]  
  **description**: 实现 Initialize 函数，调用 IAudioClient::Initialize 配置共享模式、环回标志、事件回调标志，使用硬编码的 PCM 格式（44.1kHz, 16bit, 立体声）。  
  **acceptance_criteria**:  
  - 调用 Initialize 时传入 AUDCLNT_SHAREMODE_SHARED 和 AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK  
  - WAVEFORMATEX 结构硬编码：nSamplesPerSec=44100, wBitsPerSample=16, nChannels=2  
  - 初始化成功后获取 IAudioCaptureClient 接口  
  **output**: `src/wasapi/audio_client.cpp` 中 Initialize 函数，签名：`HRESULT Initialize()`  
  **est_hours**: 5  
  **status**: [ ]

- [ ] **id**: T016 | **file**: tests/audio_client_init.test.cpp | **title**: 单元测试：客户端初始化 | **type**: TEST | **depends_on**: [T015]  
  **description**: 测试 Initialize 函数的参数配置和接口获取。  
  **acceptance_criteria**:  
  - Initialize 返回 S_OK 或 AUDCLNT_E_UNSUPPORTED_FORMAT（预期错误）  
  - m_CaptureClient 指针初始化成功  
  **output**: `tests/audio_client_init.test.cpp`，验证初始化流程。  
  **status**: [ ]

- [ ] **id**: T017 | **file**: src/wasapi/audio_client.cpp - SetEventHandle | **title**: 设置事件句柄 | **type**: DEV | **depends_on**: [T015]  
  **description**: 实现 SetEventHandle 函数，创建 Windows 事件对象并设置到 IAudioClient。  
  **acceptance_criteria**:  
  - 使用 CreateEvent 创建手动重置事件（第二个参数 FALSE）  
  - 调用 m_AudioClient->SetEventHandle(m_SampleReadyEvent)  
  - 保存事件句柄到成员变量  
  **output**: `src/wasapi/audio_client.cpp` 中 SetEventHandle 函数。  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T018 | **file**: tests/audio_event.test.cpp | **title**: 单元测试：事件句柄 | **type**: TEST | **depends_on**: [T017]  
  **description**: 测试事件对象的创建和设置。  
  **acceptance_criteria**:  
  - SetEventHandle 后事件句柄不为 NULL  
  - 可以使用 WaitForSingleObject 等待事件  
  **output**: `tests/audio_event.test.cpp`，验证事件对象创建。  
  **status**: [ ]

- [ ] **id**: T019 | **file**: src/wasapi/audio_client.cpp - Start | **title**: 开始音频捕获 | **type**: DEV | **depends_on**: [T017]  
  **description**: 实现 Start 函数，调用 IAudioClient::Start() 开始音频流，并启动 MMCSS 线程优先级提升。  
  **acceptance_criteria**:  
  - 调用 m_AudioClient->Start() 返回 S_OK  
  - 使用 AvSetMmThreadCharacteristics(TEXT("Pro Audio"), &taskIndex) 设置 MMCSS  
  - 使用 AvSetMmThreadPriority(hTask, AVRT_PRIORITY_CRITICAL) 提升优先级  
  **output**: `src/wasapi/audio_client.cpp` 中 Start 函数，签名：`HRESULT Start()`  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T020 | **file**: tests/audio_start.test.cpp | **title**: 单元测试：开始捕获 | **type**: TEST | **depends_on**: [T019]  
  **description**: 测试 Start 函数的调用流程和 MMCSS 设置。  
  **acceptance_criteria**:  
  - Start 返回 S_OK  
  - MMCSS 线程句柄不为 NULL（模拟环境可跳过）  
  **output**: `tests/audio_start.test.cpp`，验证启动逻辑。  
  **status**: [ ]

- [ ] **id**: T021 | **file**: src/wasapi/audio_client.cpp - Stop | **title**: 停止音频捕获 | **type**: DEV | **depends_on**: [T019]  
  **description**: 实现 Stop 函数，调用 IAudioClient::Stop() 停止流，并恢复线程优先级（AvRevertMmThreadCharacteristics）。  
  **acceptance_criteria**:  
  - 调用 m_AudioClient->Stop() 返回 S_OK  
  - 调用 AvRevertMmThreadCharacteristics(hTask) 恢复线程优先级  
  - 关闭事件句柄（CloseHandle）  
  **output**: `src/wasapi/audio_client.cpp` 中 Stop 函数，签名：`HRESULT Stop()`  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T022 | **file**: tests/audio_stop.test.cpp | **title**: 单元测试：停止捕获 | **type**: TEST | **depends_on**: [T021]  
  **description**: 测试 Stop 函数的清理逻辑。  
  **acceptance_criteria**:  
  - Stop 返回 S_OK  
  - 事件句柄已关闭（通过检查句柄是否为 INVALID_HANDLE_VALUE）  
  **output**: `tests/audio_stop.test.cpp`，验证停止和清理流程。  
  **status**: [ ]

- [ ] **id**: T023 | **file**: src/wasapi/audio_client.cpp - ProcessAudioSample | **title**: 处理音频样本 | **type**: DEV | **depends_on**: [T019]  
  **description**: 实现 ProcessAudioSample 函数，从 IAudioCaptureClient 获取音频缓冲区（GetBuffer），处理静音标志和数据不连续标志，然后释放缓冲区（ReleaseBuffer）。  
  **acceptance_criteria**:  
  - 调用 m_CaptureClient->GetBuffer(&data, &framesToRead, &flags, NULL, NULL)  
  - 检查 AUDCLNT_BUFFERFLAGS_SILENT 和 AUDCLNT_BUFFERFLAGS_DATA_DISCONTINUITY 标志  
  - 调用 m_CaptureClient->ReleaseBuffer(framesToRead) 立即释放缓冲区  
  - GetBuffer 和 ReleaseBuffer 之间不分配内存、不加锁  
  **output**: `src/wasapi/audio_client.cpp` 中 ProcessAudioSample 函数，签名：`HRESULT ProcessAudioSample()`  
  **est_hours**: 6  
  **status**: [ ]

- [ ] **id**: T024 | **file**: tests/audio_sample.test.cpp | **title**: 单元测试：样本处理 | **type**: TEST | **depends_on**: [T023]  
  **description**: 使用 mock IAudioCaptureClient 测试 ProcessAudioSample 的缓冲区获取和释放。  
  **acceptance_criteria**:  
  - GetBuffer 返回的 framesToRead > 0 时，ReleaseBuffer 必须被调用  
  - 标志位正确处理（静音和数据不连续）  
  **output**: `tests/audio_sample.test.cpp`，包含 mock 和断言。  
  **status**: [ ]

- [ ] **id**: T025 | **file**: src/wasapi/capture_thread.h | **title**: 捕获线程类声明 | **type**: DEV | **depends_on**: [T023]  
  **description**: 定义 CaptureThread 类，封装音频捕获线程逻辑，包含事件等待循环、样本处理回调接口。  
  **acceptance_criteria**:  
  - 类包含 std::thread 成员和原子布尔变量 m_IsCapturing  
  - 提供 Start() 和 Stop() 方法  
  - 提供 SetSampleCallback(std::function<void(const BYTE*, UINT32)>) 方法  
  **output**: `src/wasapi/capture_thread.h`，包含类定义。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T026 | **file**: src/wasapi/capture_thread.cpp - ThreadProc | **title**: 捕获线程主循环 | **type**: DEV | **depends_on**: [T025]  
  **description**: 实现捕获线程的主循环 ThreadProc，使用 WaitForSingleObject 等待音频事件，调用 ProcessAudioSample，并通过回调传递数据。  
  **acceptance_criteria**:  
  - while 循环检查 m_IsCapturing 原子变量  
  - WaitForSingleObject(m_SampleReadyEvent, 2000) 等待事件或超时  
  - 事件触发时调用 ProcessAudioSample() 并通过回调函数传递数据  
  **output**: `src/wasapi/capture_thread.cpp` 中 ThreadProc 函数。  
  **est_hours**: 5  
  **status**: [ ]

- [ ] **id**: T027 | **file**: tests/capture_thread.test.cpp | **title**: 单元测试：捕获线程 | **type**: TEST | **depends_on**: [T026]  
  **description**: 测试捕获线程的启动、数据回调和停止。  
  **acceptance_criteria**:  
  - 启动线程后 m_IsCapturing 为 true  
  - 回调函数在 1 秒内至少被调用一次（使用模拟事件）  
  - Stop 后线程正常退出  
  **output**: `tests/capture_thread.test.cpp`，验证线程逻辑。  
  **status**: [ ]

- [ ] **id**: T028 | **file**: src/wasapi/error_handler.h | **title**: 错误处理器声明 | **type**: DEV | **depends_on**: []  
  **description**: 定义 ErrorHandler 类，提供将 HRESULT 错误码转换为可读错误消息的静态方法。  
  **acceptance_criteria**:  
  - 静态方法 GetErrorMessage(HRESULT hr) 返回 std::string  
  - 支持常见错误码映射：AUDCLNT_E_DEVICE_INVALIDATED、AUDCLNT_E_UNSUPPORTED_FORMAT 等  
  **output**: `src/wasapi/error_handler.h`，包含 `class ErrorHandler { public: static std::string GetErrorMessage(HRESULT hr); }`  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T029 | **file**: src/wasapi/error_handler.cpp | **title**: 错误消息映射实现 | **type**: DEV | **depends_on**: [T028]  
  **description**: 实现 GetErrorMessage 函数，使用 switch-case 或 map 将错误码映射为描述性字符串。  
  **acceptance_criteria**:  
  - 输入 0x88890004 返回 "Device invalidated"  
  - 输入 0x88890008 返回 "Unsupported format"  
  - 未知错误码返回十六进制表示  
  **output**: `src/wasapi/error_handler.cpp`，实现错误码映射逻辑。  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T030 | **file**: tests/error_handler.test.cpp | **title**: 单元测试：错误处理 | **type**: TEST | **depends_on**: [T029]  
  **description**: 测试错误码到消息的映射正确性。  
  **acceptance_criteria**:  
  - GetErrorMessage(0x88890004) 返回包含 "invalidated" 的字符串  
  - GetErrorMessage(0x12345678) 返回十六进制格式  
  **output**: `tests/error_handler.test.cpp`，验证映射逻辑。  
  **status**: [ ]

---

## N-API 绑定层

- [ ] **id**: T031 | **file**: src/napi/audio_processor.h | **title**: N-API 包装类声明 | **type**: DEV | **depends_on**: [T026]  
  **description**: 定义 AudioProcessor 类，继承 Napi::ObjectWrap，封装 WASAPI 音频捕获功能为 N-API 对象。  
  **acceptance_criteria**:  
  - 类继承自 Napi::ObjectWrap<AudioProcessor>  
  - 包含私有成员 AudioClient* m_Client 和 Napi::ThreadSafeFunction m_Callback  
  - 声明公开方法：StartCapture、StopCapture、GetDeviceInfo  
  **output**: `src/napi/audio_processor.h`，包含类定义。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T032 | **file**: src/napi/audio_processor.cpp - Init | **title**: N-API 类初始化 | **type**: DEV | **depends_on**: [T031]  
  **description**: 实现 Init 静态方法，向 N-API 环境注册 AudioProcessor 类及其方法。  
  **acceptance_criteria**:  
  - 调用 DefineClass 定义类名为 "AudioProcessor"  
  - 注册实例方法：InstanceMethod("startCapture", &AudioProcessor::StartCapture)  
  - 返回 Napi::Function 构造函数  
  **output**: `src/napi/audio_processor.cpp` 中 Init 函数，签名：`static Napi::Function Init(Napi::Env env, Napi::Object exports)`  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T033 | **file**: tests/napi_init.test.js | **title**: 单元测试：N-API 初始化 | **type**: TEST | **depends_on**: [T032]  
  **description**: 测试 AudioProcessor 类能够正确加载和实例化。  
  **acceptance_criteria**:  
  - require('node-gyp-build')(__dirname) 返回对象  
  - new AudioProcessor() 不抛出异常  
  **output**: `tests/napi_init.test.js`，使用 Jest 测试类加载。  
  **status**: [ ]

- [ ] **id**: T034 | **file**: src/napi/audio_processor.cpp - Constructor | **title**: 构造函数实现 | **type**: DEV | **depends_on**: [T032]  
  **description**: 实现 AudioProcessor 构造函数，接收配置对象（processId、mode、sampleRate 等），验证参数并初始化内部状态。  
  **acceptance_criteria**:  
  - 从 CallbackInfo 解析配置对象（Napi::Object）  
  - 验证 processId 存在且为数字，否则抛出 TypeError  
  - 初始化 AudioClient 实例（调用 new AudioClient）  
  **output**: `src/napi/audio_processor.cpp` 中构造函数，签名：`AudioProcessor(const Napi::CallbackInfo& info)`  
  **est_hours**: 5  
  **status**: [ ]

- [ ] **id**: T035 | **file**: tests/napi_constructor.test.js | **title**: 单元测试：构造函数验证 | **type**: TEST | **depends_on**: [T034]  
  **description**: 测试构造函数的参数验证逻辑。  
  **acceptance_criteria**:  
  - 无参数调用时抛出 TypeError  
  - 传入 { processId: 1234 } 时成功创建实例  
  **output**: `tests/napi_constructor.test.js`，测试参数验证。  
  **status**: [ ]

- [ ] **id**: T036 | **file**: src/napi/audio_processor.cpp - StartCapture | **title**: 开始捕获方法 | **type**: DEV | **depends_on**: [T034]  
  **description**: 实现 StartCapture 方法，接收 JavaScript 回调函数，创建 ThreadSafeFunction，启动音频捕获线程。  
  **acceptance_criteria**:  
  - 解析参数获取 Napi::Function 回调  
  - 调用 Napi::ThreadSafeFunction::New 创建 TSFN，资源名为 "AudioProcessor"  
  - 调用 m_Client->ActivateAsync() 和 Start()  
  - 设置捕获线程的样本回调为 TSFN 调用  
  **output**: `src/napi/audio_processor.cpp` 中 StartCapture 函数，签名：`Napi::Value StartCapture(const Napi::CallbackInfo& info)`  
  **est_hours**: 8  
  **status**: [ ]

- [ ] **id**: T037 | **file**: tests/napi_start.test.js | **title**: 单元测试：开始捕获 | **type**: TEST | **depends_on**: [T036]  
  **description**: 测试 StartCapture 方法的调用和回调触发。  
  **acceptance_criteria**:  
  - 调用 startCapture((data) => { /* 回调 */ }) 不抛出异常  
  - 在 5 秒内回调至少被触发一次（集成测试，CI 可跳过）  
  **output**: `tests/napi_start.test.js`，测试启动逻辑。  
  **status**: [ ]

- [ ] **id**: T038 | **file**: src/napi/audio_processor.cpp - StopCapture | **title**: 停止捕获方法 | **type**: DEV | **depends_on**: [T036]  
  **description**: 实现 StopCapture 方法，调用 m_Client->Stop()，释放 ThreadSafeFunction。  
  **acceptance_criteria**:  
  - 调用 m_Client->Stop()  
  - 调用 m_Callback.Release() 释放 TSFN  
  - 等待捕获线程退出（join）  
  **output**: `src/napi/audio_processor.cpp` 中 StopCapture 函数，签名：`void StopCapture(const Napi::CallbackInfo& info)`  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T039 | **file**: tests/napi_stop.test.js | **title**: 单元测试：停止捕获 | **type**: TEST | **depends_on**: [T038]  
  **description**: 测试 StopCapture 方法的清理逻辑。  
  **acceptance_criteria**:  
  - 调用 stopCapture() 后不再触发数据回调  
  - 第二次调用 stopCapture() 不抛出异常  
  **output**: `tests/napi_stop.test.js`，测试停止逻辑。  
  **status**: [ ]

- [ ] **id**: T040 | **file**: src/napi/audio_processor.cpp - OnAudioData | **title**: ThreadSafeFunction 回调 | **type**: DEV | **depends_on**: [T036]  
  **description**: 实现 OnAudioData 函数（ThreadSafeFunction 的 lambda 回调），将 C++ 音频数据转换为 Napi::Buffer 并传递给 JavaScript。  
  **acceptance_criteria**:  
  - 从 CallbackData 结构获取 samples 和 length  
  - 创建 Napi::Buffer<uint8_t>::Copy(env, samples, length)  
  - 调用 jsCallback.Call({buffer})  
  - 清理 CallbackData 内存（delete）  
  **output**: `src/napi/audio_processor.cpp` 中 OnAudioData lambda 函数。  
  **est_hours**: 5  
  **status**: [ ]

- [ ] **id**: T041 | **file**: tests/napi_callback.test.js | **title**: 单元测试：数据回调 | **type**: TEST | **depends_on**: [T040]  
  **description**: 测试 JavaScript 回调接收到的数据格式。  
  **acceptance_criteria**:  
  - 回调参数为 Buffer 类型  
  - Buffer 长度大于 0  
  - 连续两次回调的时间戳递增  
  **output**: `tests/napi_callback.test.js`，验证回调数据。  
  **status**: [ ]

- [ ] **id**: T042 | **file**: src/napi/audio_processor.cpp - GetDeviceInfo | **title**: 静态方法：设备枚举 | **type**: DEV | **depends_on**: [T032]  
  **description**: 实现 GetDeviceInfo 静态方法，返回可用音频设备列表（使用 IMMDeviceEnumerator）。  
  **acceptance_criteria**:  
  - 创建 IMMDeviceEnumerator 实例  
  - 枚举 eCapture 设备类型  
  - 返回 Napi::Array，每个元素包含设备 ID 和友好名称  
  **output**: `src/napi/audio_processor.cpp` 中 GetDeviceInfo 静态函数，签名：`static Napi::Value GetDeviceInfo(const Napi::CallbackInfo& info)`  
  **est_hours**: 6  
  **status**: [ ]

- [ ] **id**: T043 | **file**: tests/napi_device.test.js | **title**: 单元测试：设备枚举 | **type**: TEST | **depends_on**: [T042]  
  **description**: 测试 GetDeviceInfo 返回的设备列表。  
  **acceptance_criteria**:  
  - 返回值为数组  
  - 数组元素包含 id 和 name 字段  
  **output**: `tests/napi_device.test.js`，验证设备列表格式。  
  **status**: [ ]

- [ ] **id**: T044 | **file**: src/napi/process_enumerator.cpp | **title**: 进程枚举实现 | **type**: DEV | **depends_on**: []  
  **description**: 实现 EnumerateProcesses 函数，使用 Windows Toolhelp API（CreateToolhelp32Snapshot）枚举当前运行的进程。  
  **acceptance_criteria**:  
  - 调用 CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)  
  - 遍历进程快照获取进程 ID 和名称  
  - 返回 Napi::Array，每个元素包含 pid 和 name  
  **output**: `src/napi/process_enumerator.cpp`，函数签名：`Napi::Value EnumerateProcesses(const Napi::CallbackInfo& info)`  
  **est_hours**: 5  
  **status**: [ ]

- [ ] **id**: T045 | **file**: tests/process_enum.test.js | **title**: 单元测试：进程枚举 | **type**: TEST | **depends_on**: [T044]  
  **description**: 测试进程枚举功能。  
  **acceptance_criteria**:  
  - 返回数组长度大于 0  
  - 数组包含当前进程（process.pid）  
  **output**: `tests/process_enum.test.js`，验证进程列表。  
  **status**: [ ]

- [ ] **id**: T046 | **file**: src/napi/addon.cpp | **title**: 模块入口点 | **type**: DEV | **depends_on**: [T032, T044]  
  **description**: 实现 NODE_API_MODULE 入口函数，导出 AudioProcessor 类和静态方法。  
  **acceptance_criteria**:  
  - 调用 AudioProcessor::Init 注册类  
  - 导出 enumerateProcesses 静态函数  
  - 返回 exports 对象  
  **output**: `src/napi/addon.cpp`，包含 NODE_API_MODULE(addon, Init) 宏。  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T047 | **file**: tests/addon_module.test.js | **title**: 单元测试：模块加载 | **type**: TEST | **depends_on**: [T046]  
  **description**: 测试原生模块能否正确加载。  
  **acceptance_criteria**:  
  - require 模块不抛出异常  
  - 导出对象包含 AudioProcessor 和 enumerateProcesses  
  **output**: `tests/addon_module.test.js`，验证模块导出。  
  **status**: [ ]

---

## JavaScript API 封装层

- [ ] **id**: T048 | **file**: lib/audio-capture.js | **title**: AudioCapture 类定义 | **type**: DEV | **depends_on**: [T046]  
  **description**: 定义 AudioCapture 类，继承 Node.js Readable 流，封装原生 AudioProcessor 实例。  
  **acceptance_criteria**:  
  - 继承自 stream.Readable  
  - 构造函数接收 options 对象（processId、mode、sampleRate 等）  
  - 实现 _read() 方法触发数据读取  
  **output**: `lib/audio-capture.js`，类定义：`class AudioCapture extends Readable { constructor(options) { /* ... */ } }`  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T049 | **file**: lib/audio-capture.js - _validateConfig | **title**: 配置验证方法 | **type**: DEV | **depends_on**: [T048]  
  **description**: 实现 _validateConfig 私有方法，验证配置参数的有效性。  
  **acceptance_criteria**:  
  - processId 必须为正整数，否则抛出 TypeError  
  - mode 必须为 'include' 或 'exclude'  
  - sampleRate 必须在 [8000, 16000, 44100, 48000] 中  
  **output**: `lib/audio-capture.js` 中 _validateConfig 方法。  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T050 | **file**: tests/capture_validate.test.js | **title**: 单元测试：配置验证 | **type**: TEST | **depends_on**: [T049]  
  **description**: 测试配置验证逻辑。  
  **acceptance_criteria**:  
  - new AudioCapture({}) 抛出 TypeError: "processId is required"  
  - new AudioCapture({ processId: 1234, mode: 'invalid' }) 抛出 TypeError  
  **output**: `tests/capture_validate.test.js`，测试各种无效配置。  
  **status**: [ ]

- [ ] **id**: T051 | **file**: lib/audio-capture.js - start | **title**: 启动捕获方法 | **type**: DEV | **depends_on**: [T048]  
  **description**: 实现 start() 公开方法，调用原生模块的 startCapture，设置数据回调。  
  **acceptance_criteria**:  
  - 调用 this._native.startCapture(this._onData.bind(this))  
  - 触发 'started' 事件  
  - 防止重复调用（检查 _isStarted 标志）  
  **output**: `lib/audio-capture.js` 中 start 方法，签名：`start() { /* ... */ }`  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T052 | **file**: tests/capture_start.test.js | **title**: 单元测试：启动方法 | **type**: TEST | **depends_on**: [T051]  
  **description**: 测试 start 方法的调用和事件触发。  
  **acceptance_criteria**:  
  - 调用 start() 触发 'started' 事件  
  - 重复调用 start() 抛出错误  
  **output**: `tests/capture_start.test.js`，使用 mock 原生模块测试。  
  **status**: [ ]

- [ ] **id**: T053 | **file**: lib/audio-capture.js - stop | **title**: 停止捕获方法 | **type**: DEV | **depends_on**: [T051]  
  **description**: 实现 stop() 方法，调用原生 stopCapture，清理资源并触发 'stopped' 事件。  
  **acceptance_criteria**:  
  - 调用 this._native.stopCapture()  
  - 触发 'stopped' 事件  
  - 调用 this.push(null) 结束流  
  **output**: `lib/audio-capture.js` 中 stop 方法，签名：`stop() { /* ... */ }`  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T054 | **file**: tests/capture_stop.test.js | **title**: 单元测试：停止方法 | **type**: TEST | **depends_on**: [T053]  
  **description**: 测试 stop 方法的清理逻辑。  
  **acceptance_criteria**:  
  - 调用 stop() 触发 'stopped' 事件  
  - 流结束（'end' 事件触发）  
  **output**: `tests/capture_stop.test.js`，验证停止流程。  
  **status**: [ ]

- [ ] **id**: T055 | **file**: lib/audio-capture.js - _onData | **title**: 数据回调处理 | **type**: DEV | **depends_on**: [T051]  
  **description**: 实现 _onData 私有方法，接收原生模块传递的音频数据，推送到 Readable 流。  
  **acceptance_criteria**:  
  - 参数为 Buffer 类型  
  - 调用 this.push(buffer) 推送数据  
  - 错误时触发 'error' 事件  
  **output**: `lib/audio-capture.js` 中 _onData 方法。  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T056 | **file**: tests/capture_data.test.js | **title**: 单元测试：数据推送 | **type**: TEST | **depends_on**: [T055]  
  **description**: 测试数据回调和流推送。  
  **acceptance_criteria**:  
  - 监听 'data' 事件接收到 Buffer  
  - Buffer 长度大于 0  
  **output**: `tests/capture_data.test.js`，验证数据流。  
  **status**: [ ]

- [ ] **id**: T057 | **file**: lib/audio-capture.js - getDevices | **title**: 静态方法：获取设备 | **type**: DEV | **depends_on**: [T048]  
  **description**: 实现 getDevices 静态方法，调用原生模块的 GetDeviceInfo。  
  **acceptance_criteria**:  
  - 返回设备列表数组  
  - 每个元素包含 { id: string, name: string }  
  **output**: `lib/audio-capture.js` 中静态方法，签名：`static getDevices() { /* ... */ }`  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T058 | **file**: tests/capture_devices.test.js | **title**: 单元测试：设备枚举 | **type**: TEST | **depends_on**: [T057]  
  **description**: 测试 getDevices 静态方法。  
  **acceptance_criteria**:  
  - AudioCapture.getDevices() 返回数组  
  - 数组元素结构正确  
  **output**: `tests/capture_devices.test.js`，验证设备列表格式。  
  **status**: [ ]

- [ ] **id**: T059 | **file**: lib/audio-capture.js - getProcesses | **title**: 静态方法：获取进程 | **type**: DEV | **depends_on**: [T048]  
  **description**: 实现 getProcesses 静态方法，调用原生 enumerateProcesses。  
  **acceptance_criteria**:  
  - 返回进程列表数组  
  - 每个元素包含 { pid: number, name: string }  
  **output**: `lib/audio-capture.js` 中静态方法，签名：`static getProcesses() { /* ... */ }`  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T060 | **file**: tests/capture_processes.test.js | **title**: 单元测试：进程枚举 | **type**: TEST | **depends_on**: [T059]  
  **description**: 测试 getProcesses 静态方法。  
  **acceptance_criteria**:  
  - AudioCapture.getProcesses() 返回数组  
  - 数组包含当前进程  
  **output**: `tests/capture_processes.test.js`，验证进程列表。  
  **status**: [ ]

- [ ] **id**: T061 | **file**: lib/errors.js | **title**: 自定义错误类 | **type**: DEV | **depends_on**: []  
  **description**: 定义 AudioError 自定义错误类，包含错误码和详细信息。  
  **acceptance_criteria**:  
  - 继承自 Error 类  
  - 包含 code 和 details 属性  
  - 导出标准错误码常量（INVALID_PROCESS、DEVICE_DISCONNECTED 等）  
  **output**: `lib/errors.js`，类定义：`class AudioError extends Error { constructor(message, code, details) { /* ... */ } }`  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T062 | **file**: tests/errors.test.js | **title**: 单元测试：错误类 | **type**: TEST | **depends_on**: [T061]  
  **description**: 测试 AudioError 类的实例化和属性。  
  **acceptance_criteria**:  
  - new AudioError('msg', 'CODE') 实例包含 message 和 code  
  - instanceof Error 返回 true  
  **output**: `tests/errors.test.js`，验证错误类结构。  
  **status**: [ ]

- [ ] **id**: T063 | **file**: lib/index.js | **title**: 模块导出 | **type**: DEV | **depends_on**: [T048, T061]  
  **description**: 创建主入口文件，导出 AudioCapture 类和 AudioError 类。  
  **acceptance_criteria**:  
  - 导出 AudioCapture 类  
  - 导出 AudioError 类和错误码常量  
  - 包含模块版本号  
  **output**: `lib/index.js`，导出语句：`module.exports = { AudioCapture, AudioError, ErrorCodes }`  
  **est_hours**: 1  
  **status**: [ ]

- [ ] **id**: T064 | **file**: tests/index.test.js | **title**: 单元测试：模块导出 | **type**: TEST | **depends_on**: [T063]  
  **description**: 测试主模块的导出完整性。  
  **acceptance_criteria**:  
  - require('..') 返回对象包含 AudioCapture 和 AudioError  
  - 可以实例化导出的类  
  **output**: `tests/index.test.js`，验证模块导出。  
  **status**: [ ]

---

## 构建脚本与工具链

- [ ] **id**: T065 | **file**: scripts/prebuild.js | **title**: 预构建脚本 | **type**: SCRIPT | **depends_on**: [T002]  
  **description**: 创建预构建脚本，自动化多平台、多 Node.js 版本的 prebuildify 调用。  
  **acceptance_criteria**:  
  - 脚本调用 prebuildify --napi --strip --arch x64 --arch arm64  
  - 支持通过环境变量指定 Electron 版本（ELECTRON_VERSION）  
  - 生成 prebuilds 目录包含各平台二进制文件  
  **output**: `scripts/prebuild.js`，Node.js 脚本文件。  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T066 | **file**: tests/prebuild.test.js | **title**: 单元测试：预构建脚本 | **type**: TEST | **depends_on**: [T065]  
  **description**: 测试预构建脚本的执行和输出。  
  **acceptance_criteria**:  
  - 执行脚本后 prebuilds 目录存在  
  - 包含至少一个 .node 文件  
  **output**: `tests/prebuild.test.js`，验证构建产物。  
  **status**: [ ]

- [ ] **id**: T067 | **file**: .github/workflows/build.yml | **title**: CI 构建工作流 | **type**: CONFIG | **depends_on**: [T002]  
  **description**: 创建 GitHub Actions 工作流配置，自动化多平台构建和测试。  
  **acceptance_criteria**:  
  - 矩阵构建包含 Node.js 18/20/22 和 Windows/macOS/Ubuntu  
  - 步骤包括：checkout、setup-node、npm ci、npm run build、npm test  
  - 上传构建产物（artifacts）  
  **output**: `.github/workflows/build.yml`，YAML 配置文件。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T068 | **file**: .github/workflows/prebuild.yml | **title**: 预构建工作流 | **type**: CONFIG | **depends_on**: [T065]  
  **description**: 创建预构建发布工作流，在打 tag 时自动构建多平台二进制并发布。  
  **acceptance_criteria**:  
  - 触发条件为 push tag v*  
  - 调用 npm run prebuild  
  - 上传 prebuilds 目录作为 artifacts  
  **output**: `.github/workflows/prebuild.yml`，YAML 配置文件。  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T069 | **file**: scripts/electron-rebuild.js | **title**: Electron 重构建脚本 | **type**: SCRIPT | **depends_on**: [T002]  
  **description**: 创建 Electron 专用重构建脚本，支持多版本 Electron。  
  **acceptance_criteria**:  
  - 调用 electron-rebuild -f -w audio-addon  
  - 支持通过参数指定 Electron 版本  
  - 脚本输出构建状态和路径  
  **output**: `scripts/electron-rebuild.js`，Node.js 脚本文件。  
  **est_hours**: 2  
  **status**: [ ]

- [ ] **id**: T070 | **file**: tests/electron_rebuild.test.js | **title**: 单元测试：Electron 构建 | **type**: TEST | **depends_on**: [T069]  
  **description**: 测试 Electron 重构建脚本的执行（CI 可跳过）。  
  **acceptance_criteria**:  
  - 脚本执行无错误  
  - 生成 Electron 特定的 .node 文件  
  **output**: `tests/electron_rebuild.test.js`，条件测试。  
  **status**: [ ]

---

## 集成测试与示例

- [ ] **id**: T071 | **file**: examples/basic-capture.js | **title**: 基础捕获示例 | **type**: DEV | **depends_on**: [T063]  
  **description**: 创建基础使用示例，演示如何捕获指定进程的音频并保存到文件。  
  **acceptance_criteria**:  
  - 示例代码包含进程枚举、选择目标进程、启动捕获  
  - 使用流管道将音频数据写入文件：capture.pipe(fs.createWriteStream('output.raw'))  
  - 包含错误处理和优雅退出逻辑  
  **output**: `examples/basic-capture.js`，可执行的 Node.js 示例脚本。  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T072 | **file**: tests/integration_basic.test.js | **title**: 集成测试：基础捕获 | **type**: TEST | **depends_on**: [T071]  
  **description**: 集成测试基础捕获流程（需要实际音频设备，CI 跳过）。  
  **acceptance_criteria**:  
  - 启动示例脚本，捕获 5 秒音频  
  - 生成的 output.raw 文件大小大于 0  
  **output**: `tests/integration_basic.test.js`，条件集成测试。  
  **status**: [ ]

- [ ] **id**: T073 | **file**: examples/stream-processing.js | **title**: 流处理示例 | **type**: DEV | **depends_on**: [T063]  
  **description**: 创建流处理示例，演示如何在捕获过程中实时处理音频数据（如音量检测）。  
  **acceptance_criteria**:  
  - 监听 'data' 事件进行实时处理  
  - 计算音频块的 RMS 音量值  
  - 输出音量变化到控制台  
  **output**: `examples/stream-processing.js`，示例脚本。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T074 | **file**: tests/integration_stream.test.js | **title**: 集成测试：流处理 | **type**: TEST | **depends_on**: [T073]  
  **description**: 测试流处理示例的执行（CI 跳过）。  
  **acceptance_criteria**:  
  - 示例脚本运行 3 秒无错误  
  - 输出包含音量数值  
  **output**: `tests/integration_stream.test.js`，条件测试。  
  **status**: [ ]

- [ ] **id**: T075 | **file**: examples/error-handling.js | **title**: 错误处理示例 | **type**: DEV | **depends_on**: [T063]  
  **description**: 创建错误处理示例，演示各种错误场景的处理（设备断开、进程终止等）。  
  **acceptance_criteria**:  
  - 示例包含 autoReconnect 配置  
  - 监听 'error' 事件并根据错误码执行不同逻辑  
  - 包含重试机制的演示  
  **output**: `examples/error-handling.js`，示例脚本。  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T076 | **file**: tests/integration_error.test.js | **title**: 集成测试：错误处理 | **type**: TEST | **depends_on**: [T075]  
  **description**: 测试错误处理逻辑（模拟错误场景）。  
  **acceptance_criteria**:  
  - 模拟设备断开触发 'error' 事件  
  - 验证重试逻辑执行  
  **output**: `tests/integration_error.test.js`，使用 mock 测试错误流程。  
  **status**: [ ]

---

## 内存泄漏测试与性能验证

- [ ] **id**: T077 | **file**: tests/memory-leak.test.js | **title**: 内存泄漏测试 | **type**: TEST | **depends_on**: [T063]  
  **description**: 创建长时间运行的内存泄漏测试，使用堆快照检测内存增长。  
  **acceptance_criteria**:  
  - 测试运行 100 次启动-捕获-停止循环  
  - 使用 v8.writeHeapSnapshot 生成前后快照  
  - 验证内存增长小于阈值（如 10MB）  
  **output**: `tests/memory-leak.test.js`，包含堆快照生成和对比逻辑。  
  **est_hours**: 6  
  **status**: [ ]

- [ ] **id**: T078 | **file**: tests/performance.test.js | **title**: 性能基准测试 | **type**: TEST | **depends_on**: [T063]  
  **description**: 创建性能测试，测量音频捕获延迟和 CPU 使用率。  
  **acceptance_criteria**:  
  - 测量从音频事件触发到 JavaScript 回调的延迟  
  - 延迟中位数小于 50ms  
  - CPU 使用率小于 10%（单核）  
  **output**: `tests/performance.test.js`，输出性能指标报告。  
  **est_hours**: 5  
  **status**: [ ]

---

## 文档编写

- [ ] **id**: T079 | **file**: README.md | **title**: 项目主文档 | **type**: DOC | **depends_on**: [T063, T071]  
  **description**: 编写项目 README，包含安装说明、快速开始、API 参考和示例链接。  
  **acceptance_criteria**:  
  - 包含安装步骤（npm install）  
  - 快速开始代码示例（5-10 行）  
  - API 概览表格（方法名、参数、返回值）  
  - 链接到详细 API 文档和 examples 目录  
  **output**: `README.md`，Markdown 格式文档。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T080 | **file**: docs/api.md | **title**: API 详细文档 | **type**: DOC | **depends_on**: [T063]  
  **description**: 编写完整 API 文档，详细说明每个类、方法、事件和配置选项。  
  **acceptance_criteria**:  
  - 每个方法包含：签名、参数说明、返回值、示例代码  
  - 事件列表：started、stopped、data、error，包含参数说明  
  - 配置选项表格：名称、类型、默认值、说明  
  **output**: `docs/api.md`，结构化 Markdown 文档。  
  **est_hours**: 6  
  **status**: [ ]

- [ ] **id**: T081 | **file**: docs/build.md | **title**: 构建说明文档 | **type**: DOC | **depends_on**: [T001, T067]  
  **description**: 编写构建和开发环境配置文档。  
  **acceptance_criteria**:  
  - 列出所需工具：Visual Studio 2022、Windows SDK、Python  
  - 构建步骤：克隆仓库、npm install、npm run build  
  - 预构建步骤和 Electron 构建说明  
  - 常见构建错误和解决方案  
  **output**: `docs/build.md`，Markdown 文档。  
  **est_hours**: 3  
  **status**: [ ]

- [ ] **id**: T082 | **file**: docs/troubleshooting.md | **title**: 故障排查文档 | **type**: DOC | **depends_on**: [T061]  
  **description**: 编写常见问题和故障排查指南。  
  **acceptance_criteria**:  
  - 错误码列表及解决方案  
  - 常见问题 FAQ（如：无法捕获某进程、音频断断续续等）  
  - 调试技巧（启用详细日志、使用调试构建）  
  **output**: `docs/troubleshooting.md`，Markdown 文档。  
  **est_hours**: 4  
  **status**: [ ]

- [ ] **id**: T083 | **file**: CHANGELOG.md | **title**: 变更日志 | **type**: DOC | **depends_on**: []  
  **description**: 创建变更日志文件，记录版本历史和变更内容。  
  **acceptance_criteria**:  
  - 遵循 Keep a Changelog 格式  
  - 初始版本 v0.1.0 条目包含核心功能列表  
  - 包含 Unreleased 段落用于未来更新  
  **output**: `CHANGELOG.md`，Markdown 格式。  
  **est_hours**: 2  
  **status**: [ ]

---

## 任务概览表格

| id | file | title | type | depends_on | est_hours |
|----|------|-------|------|------------|-----------|
| T001 | binding.gyp | 配置构建文件 | CONFIG | [] | 2 |
| T002 | package.json | 初始化项目配置 | CONFIG | [T001] | 1 |
| T003 | tests/package.json | 测试配置 | TEST | [T002] | - |
| T004 | src/wasapi/com_initializer.h | COM 初始化器声明 | DEV | [] | 2 |
| T005 | src/wasapi/com_initializer.cpp | COM 初始化器实现 | DEV | [T004] | 2 |
| T006 | tests/com_initializer.test.cpp | 单元测试：COM 初始化 | TEST | [T005] | - |
| T007 | src/wasapi/audio_params.h | 音频参数结构定义 | DEV | [] | 3 |
| T008 | src/wasapi/audio_params.cpp | 音频参数转换实现 | DEV | [T007] | 3 |
| T009 | tests/audio_params.test.cpp | 单元测试:参数转换 | TEST | [T008] | - |
| T010 | src/wasapi/audio_client.h | 音频客户端类声明 | DEV | [T007] | 4 |
| T011 | src/wasapi/audio_client.cpp - ActivateAsync | 异步激活实现 | DEV | [T010] | 5 |
| T012 | tests/audio_client_activate.test.cpp | 单元测试：异步激活 | TEST | [T011] | - |
| T013 | src/wasapi/audio_client.cpp - ActivateCompleted | 激活完成回调 | DEV | [T011] | 4 |
| T014 | tests/audio_client_callback.test.cpp | 单元测试：激活回调 | TEST | [T013] | - |
| T015 | src/wasapi/audio_client.cpp - Initialize | 音频客户端初始化 | DEV | [T013] | 5 |
| T016 | tests/audio_client_init.test.cpp | 单元测试：客户端初始化 | TEST | [T015] | - |
| T017 | src/wasapi/audio_client.cpp - SetEventHandle | 设置事件句柄 | DEV | [T015] | 2 |
| T018 | tests/audio_event.test.cpp | 单元测试：事件句柄 | TEST | [T017] | - |
| T019 | src/wasapi/audio_client.cpp - Start | 开始音频捕获 | DEV | [T017] | 4 |
| T020 | tests/audio_start.test.cpp | 单元测试：开始捕获 | TEST | [T019] | - |
| T021 | src/wasapi/audio_client.cpp - Stop | 停止音频捕获 | DEV | [T019] | 3 |
| T022 | tests/audio_stop.test.cpp | 单元测试：停止捕获 | TEST | [T021] | - |
| T023 | src/wasapi/audio_client.cpp - ProcessAudioSample | 处理音频样本 | DEV | [T019] | 6 |
| T024 | tests/audio_sample.test.cpp | 单元测试：样本处理 | TEST | [T023] | - |
| T025 | src/wasapi/capture_thread.h | 捕获线程类声明 | DEV | [T023] | 4 |
| T026 | src/wasapi/capture_thread.cpp - ThreadProc | 捕获线程主循环 | DEV | [T025] | 5 |
| T027 | tests/capture_thread.test.cpp | 单元测试：捕获线程 | TEST | [T026] | - |
| T028 | src/wasapi/error_handler.h | 错误处理器声明 | DEV | [] | 2 |
| T029 | src/wasapi/error_handler.cpp | 错误消息映射实现 | DEV | [T028] | 3 |
| T030 | tests/error_handler.test.cpp | 单元测试：错误处理 | TEST | [T029] | - |
| T031 | src/napi/audio_processor.h | N-API 包装类声明 | DEV | [T026] | 4 |
| T032 | src/napi/audio_processor.cpp - Init | N-API 类初始化 | DEV | [T031] | 3 |
| T033 | tests/napi_init.test.js | 单元测试：N-API 初始化 | TEST | [T032] | - |
| T034 | src/napi/audio_processor.cpp - Constructor | 构造函数实现 | DEV | [T032] | 5 |
| T035 | tests/napi_constructor.test.js | 单元测试：构造函数验证 | TEST | [T034] | - |
| T036 | src/napi/audio_processor.cpp - StartCapture | 开始捕获方法 | DEV | [T034] | 8 |
| T037 | tests/napi_start.test.js | 单元测试：开始捕获 | TEST | [T036] | - |
| T038 | src/napi/audio_processor.cpp - StopCapture | 停止捕获方法 | DEV | [T036] | 4 |
| T039 | tests/napi_stop.test.js | 单元测试：停止捕获 | TEST | [T038] | - |
| T040 | src/napi/audio_processor.cpp - OnAudioData | ThreadSafeFunction 回调 | DEV | [T036] | 5 |
| T041 | tests/napi_callback.test.js | 单元测试：数据回调 | TEST | [T040] | - |
| T042 | src/napi/audio_processor.cpp - GetDeviceInfo | 静态方法：设备枚举 | DEV | [T032] | 6 |
| T043 | tests/napi_device.test.js | 单元测试：设备枚举 | TEST | [T042] | - |
| T044 | src/napi/process_enumerator.cpp | 进程枚举实现 | DEV | [] | 5 |
| T045 | tests/process_enum.test.js | 单元测试：进程枚举 | TEST | [T044] | - |
| T046 | src/napi/addon.cpp | 模块入口点 | DEV | [T032,T044] | 2 |
| T047 | tests/addon_module.test.js | 单元测试：模块加载 | TEST | [T046] | - |
| T048 | lib/audio-capture.js | AudioCapture 类定义 | DEV | [T046] | 4 |
| T049 | lib/audio-capture.js - _validateConfig | 配置验证方法 | DEV | [T048] | 2 |
| T050 | tests/capture_validate.test.js | 单元测试：配置验证 | TEST | [T049] | - |
| T051 | lib/audio-capture.js - start | 启动捕获方法 | DEV | [T048] | 3 |
| T052 | tests/capture_start.test.js | 单元测试：启动方法 | TEST | [T051] | - |
| T053 | lib/audio-capture.js - stop | 停止捕获方法 | DEV | [T051] | 2 |
| T054 | tests/capture_stop.test.js | 单元测试：停止方法 | TEST | [T053] | - |
| T055 | lib/audio-capture.js - _onData | 数据回调处理 | DEV | [T051] | 2 |
| T056 | tests/capture_data.test.js | 单元测试：数据推送 | TEST | [T055] | - |
| T057 | lib/audio-capture.js - getDevices | 静态方法：获取设备 | DEV | [T048] | 2 |
| T058 | tests/capture_devices.test.js | 单元测试：设备枚举 | TEST | [T057] | - |
| T059 | lib/audio-capture.js - getProcesses | 静态方法：获取进程 | DEV | [T048] | 2 |
| T060 | tests/capture_processes.test.js | 单元测试：进程枚举 | TEST | [T059] | - |
| T061 | lib/errors.js | 自定义错误类 | DEV | [] | 2 |
| T062 | tests/errors.test.js | 单元测试：错误类 | TEST | [T061] | - |
| T063 | lib/index.js | 模块导出 | DEV | [T048,T061] | 1 |
| T064 | tests/index.test.js | 单元测试：模块导出 | TEST | [T063] | - |
| T065 | scripts/prebuild.js | 预构建脚本 | SCRIPT | [T002] | 3 |
| T066 | tests/prebuild.test.js | 单元测试：预构建脚本 | TEST | [T065] | - |
| T067 | .github/workflows/build.yml | CI 构建工作流 | CONFIG | [T002] | 4 |
| T068 | .github/workflows/prebuild.yml | 预构建工作流 | CONFIG | [T065] | 3 |
| T069 | scripts/electron-rebuild.js | Electron 重构建脚本 | SCRIPT | [T002] | 2 |
| T070 | tests/electron_rebuild.test.js | 单元测试：Electron 构建 | TEST | [T069] | - |
| T071 | examples/basic-capture.js | 基础捕获示例 | DEV | [T063] | 3 |
| T072 | tests/integration_basic.test.js | 集成测试：基础捕获 | TEST | [T071] | - |
| T073 | examples/stream-processing.js | 流处理示例 | DEV | [T063] | 4 |
| T074 | tests/integration_stream.test.js | 集成测试：流处理 | TEST | [T073] | - |
| T075 | examples/error-handling.js | 错误处理示例 | DEV | [T063] | 3 |
| T076 | tests/integration_error.test.js | 集成测试：错误处理 | TEST | [T075] | - |
| T077 | tests/memory-leak.test.js | 内存泄漏测试 | TEST | [T063] | 6 |
| T078 | tests/performance.test.js | 性能基准测试 | TEST | [T063] | 5 |
| T079 | README.md | 项目主文档 | DOC | [T063,T071] | 4 |
| T080 | docs/api.md | API 详细文档 | DOC | [T063] | 6 |
| T081 | docs/build.md | 构建说明文档 | DOC | [T001,T067] | 3 |
| T082 | docs/troubleshooting.md | 故障排查文档 | DOC | [T061] | 4 |
| T083 | CHANGELOG.md | 变更日志 | DOC | [] | 2 |

**总计任务数**：83 个（包含 DEV、TEST、DOC、CONFIG、SCRIPT）  
**预估总工时**：约 240 小时（不含 TEST 任务，TEST 任务工时视具体实现而定）