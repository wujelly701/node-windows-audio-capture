# 构建说明文档

本文档详细说明如何配置开发环境、构建项目以及常见构建问题的解决方案。

## 目录

- [系统要求](#系统要求)
- [开发工具](#开发工具)
- [环境配置](#环境配置)
- [构建步骤](#构建步骤)
- [预构建 (Prebuild)](#预构建-prebuild)
- [Electron 集成构建](#electron-集成构建)
- [常见构建错误](#常见构建错误)
- [CI/CD 配置](#cicd-配置)

---

## 系统要求

### 操作系统
- **Windows 10** 或更高版本
- **架构**: x64 或 ARM64

### Node.js
- **版本**: 16.x 或更高（推荐 18.x LTS）
- **包管理器**: npm 7.x 或更高

### Python
- **版本**: Python 3.x（推荐 3.10 或 3.11）
- **用途**: node-gyp 构建工具依赖

---

## 开发工具

### 1. Visual Studio 2022

**必需组件：**

- **Desktop development with C++**（C++ 桌面开发）
- **MSVC v143 或更高版本** 的 C++ 编译器
- **Windows SDK** (10.0.19041.0 或更高)

**安装步骤：**

1. 下载 [Visual Studio 2022 Community](https://visualstudio.microsoft.com/vs/)
2. 运行安装程序，选择 **"Desktop development with C++"** 工作负载
3. 在右侧 "Installation details" 中确保勾选：
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 10 SDK (10.0.19041.0 或更高)
   - C++ CMake tools for Windows
4. 点击 "Install" 开始安装（约 6-8 GB）

**验证安装：**

```powershell
# 检查 Visual Studio
where cl
# 输出示例: C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.xx.xxxxx\bin\Hostx64\x64\cl.exe

# 检查 Windows SDK
dir "C:\Program Files (x86)\Windows Kits\10\Include"
```

---

### 2. Windows SDK

**推荐版本：** 10.0.19041.0 或更高

Windows SDK 通常随 Visual Studio 一起安装。如果需要单独安装：

1. 下载 [Windows SDK](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)
2. 安装时至少选择以下组件：
   - Windows SDK for Desktop C++ Apps
   - Windows SDK Signing Tools

**验证安装：**

```powershell
dir "C:\Program Files (x86)\Windows Kits\10\Include\10.0.*"
```

---

### 3. Python

**推荐版本：** Python 3.10 或 3.11

**安装步骤：**

1. 下载 [Python](https://www.python.org/downloads/windows/)
2. 运行安装程序，**勾选 "Add Python to PATH"**
3. 选择 "Customize installation"，确保勾选 "pip"
4. 完成安装

**验证安装：**

```powershell
python --version
# 输出: Python 3.10.x 或 3.11.x

pip --version
# 输出: pip 23.x.x from ...
```

**配置 npm 使用的 Python：**

```powershell
npm config set python "C:\Python310\python.exe"
```

---

### 4. node-gyp

`node-gyp` 是 Node.js 原生扩展的构建工具。

**安装：**

```powershell
npm install -g node-gyp
```

**验证安装：**

```powershell
node-gyp --version
# 输出: v9.x.x
```

---

## 环境配置

### 配置环境变量

**设置 Visual Studio 路径（可选）：**

```powershell
# 设置 MSBuild 路径
$env:PATH += ";C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin"

# 设置 Windows SDK 路径
$env:WindowsSDKDir = "C:\Program Files (x86)\Windows Kits\10\"
$env:WindowsSDKVersion = "10.0.19041.0\"
```

**持久化配置（添加到系统环境变量）：**

1. 右键 "此电脑" → "属性" → "高级系统设置"
2. 点击 "环境变量"
3. 在 "系统变量" 中添加：
   - `WindowsSDKDir`: `C:\Program Files (x86)\Windows Kits\10\`
   - `WindowsSDKVersion`: `10.0.19041.0\`

---

### npm 配置

**配置 npm 使用 Visual Studio 2022：**

```powershell
npm config set msvs_version 2022
```

**查看当前配置：**

```powershell
npm config list
```

---

## 构建步骤

### 1. 克隆仓库

```powershell
git clone https://github.com/wujelly701/node-windows-audio-capture.git
cd node-windows-audio-capture
```

---

### 2. 安装依赖

```powershell
npm install
```

这将自动执行以下步骤：

1. 安装 Node.js 依赖（`package.json` 中的 `dependencies` 和 `devDependencies`）
2. 运行 `install` 脚本（如果配置了 `prebuild-install`）
3. 如果没有预构建版本，自动调用 `node-gyp rebuild`

---

### 3. 构建原生扩展

#### 手动构建

```powershell
npm run build
```

等效命令：

```powershell
node-gyp rebuild
```

#### 清理并重新构建

```powershell
npm run rebuild
```

等效命令：

```powershell
node-gyp clean
node-gyp configure
node-gyp build
```

---

### 4. 运行测试

```powershell
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试（需要音频设备）
npm run test:integration

# 运行性能测试
npm run test:performance
```

---

### 5. 验证构建

**检查生成的文件：**

```powershell
dir build\Release
```

应该看到：

- `audio_capture.node` - 原生扩展模块

**测试加载：**

```powershell
node -e "console.log(require('./index.js'))"
```

输出应该包含 `AudioCapture` 类和相关导出。

---

## 预构建 (Prebuild)

为了让用户无需安装编译工具即可使用，我们提供预构建的二进制文件。

### 生成预构建文件

```powershell
npm run prebuild
```

这将为当前平台生成预构建文件，并保存到 `prebuilds/` 目录。

**生成多个 Node.js 版本的预构建文件：**

```powershell
npm run prebuild -- --all
```

这将为以下 Node.js 版本生成预构建文件：

- Node.js 16.x
- Node.js 18.x
- Node.js 20.x

**生成特定 Node.js 版本：**

```powershell
npm run prebuild -- --target 18.0.0
```

---

### 上传预构建文件

```powershell
npm run prebuild -- --upload YOUR_GITHUB_TOKEN
```

将预构建文件上传到 GitHub Releases。

**要求：**

- 需要 GitHub Personal Access Token
- Token 需要 `repo` 权限

---

### 测试预构建安装

```powershell
# 清理本地构建
npm run clean

# 删除 node_modules
rm -r node_modules

# 重新安装（应该使用预构建文件）
npm install

# 验证
node -e "console.log(require('./index.js'))"
```

如果成功，应该看到模块正常加载，且没有运行 `node-gyp rebuild`。

---

## Electron 集成构建

### Electron 重构建

由于 Electron 使用不同版本的 Node.js ABI，需要重新构建原生扩展。

#### 安装 electron-rebuild

```powershell
npm install --save-dev electron-rebuild
```

#### 手动重构建

```powershell
npm run electron:rebuild
```

等效命令：

```powershell
.\node_modules\.bin\electron-rebuild.cmd
```

#### 自动重构建（推荐）

在 `package.json` 中配置 `postinstall` 脚本：

```json
{
  "scripts": {
    "postinstall": "electron-rebuild"
  }
}
```

这样每次 `npm install` 后会自动重构建。

---

### 指定 Electron 版本

```powershell
.\node_modules\.bin\electron-rebuild.cmd --version 27.0.0
```

---

### Electron 应用示例

**main.js：**

```javascript
const { app, BrowserWindow } = require('electron');
const { AudioCapture } = require('node-windows-audio-capture');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 使用 AudioCapture
  AudioCapture.getProcesses().then(processes => {
    console.log('进程列表:', processes);
  });

  win.loadFile('index.html');
});
```

**运行：**

```powershell
npm run electron:rebuild
electron .
```

---

## 常见构建错误

### 错误 1: `MSBuild.exe` 未找到

**错误信息：**

```
gyp ERR! stack Error: Could not find MSBuild.exe
```

**原因：** 未安装 Visual Studio 或路径配置错误

**解决方案：**

1. 确保已安装 Visual Studio 2022 和 "Desktop development with C++" 工作负载
2. 手动设置 MSBuild 路径：

```powershell
npm config set msbuild_path "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
```

---

### 错误 2: `python` 未找到

**错误信息：**

```
gyp ERR! stack Error: Can't find Python executable "python"
```

**原因：** Python 未安装或不在 PATH 中

**解决方案：**

1. 安装 Python 3.x
2. 配置 npm 使用 Python：

```powershell
npm config set python "C:\Python310\python.exe"
```

3. 或者添加 Python 到 PATH：

```powershell
$env:PATH += ";C:\Python310"
```

---

### 错误 3: Windows SDK 版本不匹配

**错误信息：**

```
error C1083: Cannot open include file: 'windows.h': No such file or directory
```

**原因：** Windows SDK 未安装或版本不兼容

**解决方案：**

1. 安装 Windows SDK 10.0.19041.0 或更高
2. 设置环境变量：

```powershell
$env:WindowsSDKDir = "C:\Program Files (x86)\Windows Kits\10\"
$env:WindowsSDKVersion = "10.0.19041.0\"
```

3. 清理并重新构建：

```powershell
npm run rebuild
```

---

### 错误 4: C++ 编译器错误

**错误信息：**

```
error C2039: 'xxx': is not a member of 'yyy'
```

**原因：** C++ 代码兼容性问题或编译器版本不匹配

**解决方案：**

1. 确保使用 MSVC v143 或更高
2. 清理构建缓存：

```powershell
npm run clean
rm -r node_modules
npm install
```

3. 如果问题持续，尝试使用 Visual Studio Developer Command Prompt：

```powershell
# 打开 Developer Command Prompt for VS 2022
"C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"

# 在 Developer Command Prompt 中重新构建
cd D:\node-windows-audio-capture
npm run rebuild
```

---

### 错误 5: `node-gyp` 配置失败

**错误信息：**

```
gyp ERR! configure error
```

**原因：** 环境配置不完整

**解决方案：**

1. 删除 node-gyp 缓存：

```powershell
rm -r $env:USERPROFILE\.node-gyp
```

2. 重新配置：

```powershell
node-gyp configure
```

3. 检查配置：

```powershell
npm config list
```

确保以下配置正确：

- `msvs_version = 2022`
- `python = C:\Python310\python.exe`

---

### 错误 6: Electron 重构建失败

**错误信息：**

```
Error: The module was compiled against a different Node.js version
```

**原因：** Electron 使用的 Node.js ABI 版本与当前不匹配

**解决方案：**

1. 运行 Electron 重构建：

```powershell
npm run electron:rebuild
```

2. 指定 Electron 版本：

```powershell
.\node_modules\.bin\electron-rebuild.cmd --version 27.0.0
```

3. 清理并重新构建：

```powershell
npm run clean
npm install
npm run electron:rebuild
```

---

### 错误 7: 权限不足

**错误信息：**

```
Error: EPERM: operation not permitted
```

**原因：** 文件被占用或权限不足

**解决方案：**

1. 关闭所有使用该模块的进程（Node.js、Electron 等）
2. 以管理员身份运行 PowerShell
3. 重新构建：

```powershell
npm run rebuild
```

---

### 错误 8: 内存不足

**错误信息：**

```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**原因：** 构建过程消耗大量内存

**解决方案：**

1. 增加 Node.js 内存限制：

```powershell
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run rebuild
```

2. 关闭其他占用内存的程序
3. 使用单线程构建：

```powershell
node-gyp rebuild --jobs=1
```

---

## CI/CD 配置

### GitHub Actions

项目已配置 GitHub Actions 自动构建和测试。

**配置文件：** `.github/workflows/build.yml`

**触发条件：**

- Push 到 `main` 分支
- Pull Request 到 `main` 分支
- 手动触发

**构建矩阵：**

- **操作系统**: Windows Server 2022
- **Node.js 版本**: 16.x, 18.x, 20.x
- **架构**: x64

**构建步骤：**

1. 检出代码
2. 设置 Node.js 环境
3. 安装依赖
4. 运行构建
5. 运行测试
6. 生成预构建文件
7. 上传构建产物

**查看构建状态：**

访问项目的 GitHub Actions 页面：
`https://github.com/wujelly701/node-windows-audio-capture/actions`

---

### 本地模拟 CI 构建

```powershell
# 安装依赖
npm ci

# 运行构建
npm run build

# 运行测试
npm test

# 生成预构建文件
npm run prebuild
```

---

## 构建优化

### 加速构建

**1. 使用 ccache（C/C++ 编译缓存）：**

```powershell
# 安装 ccache (需要 Chocolatey)
choco install ccache

# 配置 node-gyp 使用 ccache
$env:CC = "ccache cl"
$env:CXX = "ccache cl"
```

**2. 使用并行编译：**

```powershell
node-gyp rebuild --jobs=max
```

**3. 禁用不必要的警告：**

编辑 `binding.gyp`，添加：

```json
{
  "msvs_settings": {
    "VCCLCompilerTool": {
      "WarningLevel": "3"
    }
  }
}
```

---

### 减小二进制大小

**1. 启用链接时代码生成（LTCG）：**

编辑 `binding.gyp`：

```json
{
  "msvs_settings": {
    "VCLinkerTool": {
      "LinkTimeCodeGeneration": 1
    }
  }
}
```

**2. 移除调试符号：**

```powershell
node-gyp rebuild --release
```

---

## 故障排除清单

当遇到构建问题时，按以下顺序检查：

- [ ] ✅ **Visual Studio 2022** 已安装（包含 "Desktop development with C++"）
- [ ] ✅ **Windows SDK** 已安装（10.0.19041.0 或更高）
- [ ] ✅ **Python 3.x** 已安装并在 PATH 中
- [ ] ✅ **Node.js** 版本 >= 16.x
- [ ] ✅ npm 配置正确（`msvs_version`, `python`）
- [ ] ✅ 清理缓存（`npm run clean`）
- [ ] ✅ 删除 `node_modules` 并重新安装
- [ ] ✅ 重启 PowerShell（刷新环境变量）
- [ ] ✅ 使用 Visual Studio Developer Command Prompt
- [ ] ✅ 检查 GitHub Issues 是否有类似问题

---

## 参考资源

### 官方文档

- [node-gyp 文档](https://github.com/nodejs/node-gyp)
- [N-API 文档](https://nodejs.org/api/n-api.html)
- [Visual Studio C++ 文档](https://docs.microsoft.com/en-us/cpp/)
- [Windows SDK 文档](https://docs.microsoft.com/en-us/windows/win32/)

### 工具下载

- [Visual Studio 2022](https://visualstudio.microsoft.com/vs/)
- [Windows SDK](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)
- [Python](https://www.python.org/downloads/windows/)
- [Node.js](https://nodejs.org/)

### 相关项目

- [node-gyp](https://github.com/nodejs/node-gyp) - Node.js 原生扩展构建工具
- [prebuildify](https://github.com/prebuild/prebuildify) - 预构建工具
- [electron-rebuild](https://github.com/electron/rebuild) - Electron 重构建工具

---

## 获取帮助

如果遇到本文档未涵盖的问题：

1. 查看 [GitHub Issues](https://github.com/wujelly701/node-windows-audio-capture/issues)
2. 搜索 [node-gyp Issues](https://github.com/nodejs/node-gyp/issues)
3. 提交新的 Issue（请包含完整的错误日志和环境信息）

**提交 Issue 时请包含：**

- 操作系统版本（`winver`）
- Node.js 版本（`node -v`）
- npm 版本（`npm -v`）
- Python 版本（`python --version`）
- Visual Studio 版本
- 完整的错误日志
- 已尝试的解决方案

---

**最后更新**: 2025-10-13
