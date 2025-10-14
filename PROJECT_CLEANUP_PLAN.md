# 项目结构整理方案

## 📁 目标结构

```
node-windows-audio-capture/
├── .github/                  # GitHub workflows
├── .vscode/                  # VS Code 配置（可选）
├── build/                    # 构建产物（git ignore）
├── coverage/                 # 测试覆盖率（git ignore）
├── docs/                     # 📚 文档
│   ├── api.md
│   ├── device-selection.md
│   ├── FAQ.md
│   ├── troubleshooting.md
│   ├── V2.1_RELEASE_NOTES.md
│   ├── V2.2_RELEASE_NOTES.md
│   └── V2.3_RELEASE_NOTES.md
├── examples/                 # 📝 示例代码
│   ├── basic-capture.js
│   ├── device-selection.js
│   ├── format-conversion-example.js
│   └── ...
├── lib/                      # 📦 JavaScript 源码
│   ├── audio-capture.js
│   ├── audio-processing-pipeline.js
│   └── ...
├── node_modules/             # 依赖（git ignore）
├── prebuilds/               # 预编译二进制
│   └── win32-x64/
├── scripts/                  # 🔧 构建脚本
│   ├── prebuild.js
│   └── electron-rebuild.js
├── src/                      # 💻 C++ 源码
│   ├── napi/
│   └── wasapi/
├── test/                     # 🧪 Jest 测试套件
│   ├── basic.test.js
│   ├── device-selection.test.js
│   ├── integration/
│   └── ...
├── tools/                    # 🛠️ 开发工具（新增）
│   ├── diagnose-chrome.js
│   ├── fix-chrome-mute.js
│   ├── check-audio-status.js
│   └── ...
├── archive/                  # 📦 归档文档（新增）
│   ├── development/          # 开发过程文档
│   │   ├── V2.1_IMPLEMENTATION_PLAN.md
│   │   ├── V2.2_DEVELOPMENT_PROGRESS.md
│   │   ├── V2.3_DEVICE_SELECTION_PROGRESS.md
│   │   └── ...
│   ├── releases/             # 发布相关
│   │   ├── RELEASE_v2.1.0.md
│   │   ├── RELEASE_v2.3.0.md
│   │   └── ...
│   ├── testing/              # 临时测试文件
│   │   ├── test-basic.js
│   │   ├── test-device-selection.js
│   │   └── ...
│   └── legacy/               # 遗留文档
│       ├── node-windows-audio-capture-task.md
│       ├── 分片续写与截断恢复-模板.md
│       └── ...
├── .gitignore
├── .npmignore
├── binding.gyp
├── CHANGELOG.md              # 更新日志
├── index.d.ts                # TypeScript 定义
├── index.js                  # 主入口
├── jest.config.js
├── LICENSE
├── package.json
├── README.md                 # 主文档
├── ROADMAP_2025-2026.md      # 产品路线图
├── TESTING.md                # 测试指南
└── V2.4_DEVELOPMENT_PLAN.md  # 当前开发计划
```

## 🗂️ 整理操作

### 1. 删除不该提交的文件（从 git）
- `build/` 产物文件
- 临时测试文件
- 不必要的文档副本

### 2. 创建新目录
- `tools/` - 存放诊断和修复工具
- `archive/` - 归档历史文档

### 3. 移动文件
- 根目录测试脚本 → `tools/` 或 `archive/testing/`
- 开发文档 → `archive/development/`
- 发布文档 → `archive/releases/`
- 遗留文档 → `archive/legacy/`

### 4. 更新 .gitignore
确保构建产物不会再次提交

## 📋 执行步骤

1. 备份当前状态
2. 创建 archive 目录结构
3. 移动文件到归档
4. 从 git 移除不必要的文件
5. 更新 .gitignore
6. 提交整理结果
7. 推送到远程

## ⚠️ 注意事项

- 不删除任何文件，只是移动到归档
- 保持 git 历史记录
- 确保所有重要文档都被保留
- 测试文件移到归档但保留在文件系统中
