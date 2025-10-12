{
  "targets": [
    {
      "target_name": "audio_addon",
      "sources": [
  "src/wasapi/com_initializer.cpp",
  "src/wasapi/audio_params.cpp"
  // 后续 C++ 源文件可补充
      ],
      "defines": [
        "NAPI_VERSION=8",
        "WIN32_LEAN_AND_MEAN",
        "_WIN32_WINNT=0x0A00"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "ole32.lib",
            "oleaut32.lib",
            "uuid.lib",
            "winmm.lib"
          ]
        }]
      ]
    }
  ]
}
