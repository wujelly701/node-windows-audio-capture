{
  "targets": [
    {
      "target_name": "audio_addon",
      "sources": [
        "src/wasapi/com_initializer.cpp",
        "src/wasapi/audio_params.cpp",
        "src/wasapi/audio_client.cpp",
        "src/wasapi/audio_session_manager.cpp",
        "src/wasapi/activation_handler.cpp",
        "src/wasapi/capture_thread.cpp",
        "src/wasapi/error_handler.cpp",
        "src/wasapi/device_enumerator.cpp",
        "src/wasapi/device_notification_client.cpp",
        "src/napi/addon.cpp",
        "src/napi/audio_processor.cpp",
        "src/napi/process_enumerator.cpp",
        "src/napi/device_manager.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "src/wasapi",
        "src/napi"
      ],
      "defines": [
        "NAPI_VERSION=8",
        "WIN32_LEAN_AND_MEAN",
        "_WIN32_WINNT=0x0A00",
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [
            "/std:c++17"
          ]
        }
      },
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "ole32.lib",
            "oleaut32.lib",
            "uuid.lib",
            "winmm.lib",
            "avrt.lib",
            "mmdevapi.lib",
            "runtimeobject.lib"
          ]
        }]
      ]
    }
  ]
}
