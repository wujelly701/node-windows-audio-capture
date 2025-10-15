# Installation Guide - 安装指南

## 📦 安装方式

### 方式 1: 从 GitHub 安装（推荐用于开发）

```bash
npm install wujelly701/node-windows-audio-capture
```

**注意**: 此方式需要本地编译环境

### 方式 2: 从 npm 安装（即将支持）

```bash
npm install node-windows-audio-capture
```

**注意**: 目前尚未发布到 npm registry

---

## 🔧 编译环境要求

### Windows 10/11

1. **Node.js** (>= 16.0.0)
   - 下载: https://nodejs.org/

2. **Visual Studio 2019/2022** (Community Edition 免费)
   - 下载: https://visualstudio.microsoft.com/downloads/
   - 必选组件: "Desktop development with C++"
   - 可选: Windows 10/11 SDK

3. **Python 3.x**
   - 下载: https://www.python.org/downloads/
   - 用于 node-gyp

4. **Git**
   - 下载: https://git-scm.com/

---

## 📥 安装步骤

### Step 1: 克隆仓库

```powershell
git clone --recursive https://github.com/wujelly701/node-windows-audio-capture.git
cd node-windows-audio-capture
```

**注意**: `--recursive` 会自动克隆 RNNoise 子模块

### Step 2: 初始化子模块（如果忘记 --recursive）

```powershell
git submodule update --init --recursive
```

### Step 3: 安装依赖

```powershell
npm install
```

**这一步会自动执行**: `node-gyp-build`，如果没有预编译包，会自动调用 `node-gyp rebuild` 编译

### Step 4: 编译（如果 Step 3 没有自动编译）

```powershell
npm run build
```

---

## ✅ 验证安装

### 测试基础功能

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 0 });

capture.on('data', (buffer) => {
    console.log('Received audio data:', buffer.length, 'bytes');
});

capture.start();
console.log('✅ Audio capture started successfully!');

setTimeout(() => {
    capture.stop();
    console.log('✅ Installation verified!');
}, 3000);
```

### 运行示例

```powershell
# 基础捕获示例
node examples/basic.js

# RNNoise 降噪示例
node examples/basic-denoise.js

# 完整功能演示
node examples/format-conversion-example.js
```

---

## ❓ 常见问题

### 问题 1: `node-gyp` 编译失败

**错误**: `gyp ERR! find VS msvs_version not set from command line or npm config`

**解决方案**:
```powershell
# 手动指定 Visual Studio 版本
npm config set msvs_version 2022

# 或者重新安装 windows-build-tools
npm install --global windows-build-tools
```

### 问题 2: 找不到 Python

**错误**: `gyp ERR! find Python Python is not set from command line or npm configuration`

**解决方案**:
```powershell
# 手动指定 Python 路径
npm config set python C:\Python311\python.exe

# 或者安装 Python 3.x 并添加到 PATH
```

### 问题 3: RNNoise 子模块未初始化

**错误**: `fatal: not a git repository (or any of the parent directories): .git`

**解决方案**:
```powershell
# 重新初始化子模块
git submodule update --init --recursive

# 或者手动克隆 RNNoise
git clone https://github.com/xiph/rnnoise.git deps/rnnoise

# 重新编译
npm run build
```

### 问题 4: 编译后找不到 `.node` 文件

**错误**: `Error: Cannot find module 'build/Release/audio_addon.node'`

**解决方案**:
```powershell
# 检查编译输出目录
dir build\Release\audio_addon.node

# 如果不存在，重新编译
npm run clean
npm run build
```

### 问题 5: 从 GitHub 安装失败（本次用户遇到的问题）

**错误**: `npm install wujelly701/node-windows-audio-capture` 失败

**原因**: 
- 预编译包 `prebuilds/win32-x64/node-windows-audio-capture.node` 被 `.gitignore` 忽略
- 用户环境没有编译工具

**解决方案 A** (临时 - 手动编译):
```powershell
# 1. 克隆仓库
git clone --recursive https://github.com/wujelly701/node-windows-audio-capture.git
cd node-windows-audio-capture

# 2. 安装依赖 + 编译
npm install

# 3. 在你的项目中使用本地路径
cd ..
cd your-project
npm install ../node-windows-audio-capture
```

**解决方案 B** (长期 - 等待 npm 发布):
```powershell
# 等待 v2.7.0 发布到 npm registry 后
npm install node-windows-audio-capture
```

**解决方案 C** (推荐 - GitHub Release):
1. 访问 https://github.com/wujelly701/node-windows-audio-capture/releases/tag/v2.7.0
2. 下载预编译包 `node-windows-audio-capture-v2.7.0-win32-x64.tar.gz`（如果可用）
3. 手动安装

---

## 🚀 开发环境设置

### 配置 npm 脚本

```json
{
  "scripts": {
    "install": "node-gyp-build",
    "build": "node-gyp rebuild",
    "configure": "node-gyp configure",
    "clean": "node-gyp clean",
    "test": "jest",
    "example": "node examples/basic.js"
  }
}
```

### 配置 IDE (Visual Studio Code)

安装推荐扩展:
- C/C++ (Microsoft)
- Node.js Extension Pack
- Jest Runner

---

## 📚 下一步

- 阅读 [README.md](README.md) 了解功能
- 查看 [API 文档](docs/api.md) 学习 API 使用
- 运行 [示例代码](examples/) 快速上手
- 加入 [Discussions](https://github.com/wujelly701/node-windows-audio-capture/discussions) 获取帮助

---

## 📝 反馈

如果遇到安装问题，请:
1. 查看 [FAQ](docs/FAQ.md)
2. 搜索 [Issues](https://github.com/wujelly701/node-windows-audio-capture/issues)
3. 提交新 Issue（附带错误日志）

**日志收集命令**:
```powershell
# 获取详细安装日志
npm install --verbose > install-log.txt 2>&1

# 获取编译日志
npm run build --verbose > build-log.txt 2>&1
```
