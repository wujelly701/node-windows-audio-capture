# Electron 集成指南

`node-windows-audio-capture` 完全支持 Electron 应用。由于 Electron 使用自己的 Node.js 版本，原生模块需要重新编译。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install node-windows-audio-capture --save
npm install @electron/rebuild --save-dev
```

### 2. 自动重建（推荐）

安装后会自动检测 Electron 环境并尝试重建。如果自动重建失败，请手动执行：

```bash
npx electron-rebuild -f -m node_modules/node-windows-audio-capture
```

### 3. 在 package.json 中添加脚本（可选）

```json
{
  "scripts": {
    "postinstall": "electron-rebuild"
  }
}
```

## 📋 详细步骤

### 方法一：使用 electron-rebuild（推荐）

1. **安装 electron-rebuild**：
   ```bash
   npm install --save-dev @electron/rebuild
   ```

2. **重建原生模块**：
   ```bash
   npx electron-rebuild -f -m node_modules/node-windows-audio-capture
   ```

3. **添加到 package.json**：
   ```json
   {
     "scripts": {
       "postinstall": "electron-rebuild"
     }
   }
   ```

### 方法二：使用 node-gyp 手动编译

1. **安装构建工具**：
   ```bash
   npm install --global node-gyp
   npm install --global windows-build-tools  # Windows only
   ```

2. **获取 Electron 的 Node.js 版本**：
   ```bash
   node -e "console.log(process.versions)"
   ```

3. **重新编译**：
   ```bash
   cd node_modules/node-windows-audio-capture
   node-gyp rebuild --target=<electron-version> --arch=x64 --dist-url=https://electronjs.org/headers
   ```

   例如：
   ```bash
   node-gyp rebuild --target=28.0.0 --arch=x64 --dist-url=https://electronjs.org/headers
   ```

## 🔧 配置 Electron 项目

### electron-builder 配置

如果使用 `electron-builder`，在 `package.json` 或 `electron-builder.yml` 中添加：

```json
{
  "build": {
    "npmRebuild": true,
    "nodeGypRebuild": true,
    "extraFiles": [
      {
        "from": "node_modules/node-windows-audio-capture/build/Release",
        "to": "node_modules/node-windows-audio-capture/build/Release",
        "filter": ["*.node"]
      }
    ]
  }
}
```

### Electron Forge 配置

如果使用 `@electron-forge`，在 `forge.config.js` 中添加：

```javascript
module.exports = {
  hooks: {
    postInstall: async () => {
      require('@electron/rebuild').rebuild({
        buildPath: process.cwd(),
        electronVersion: process.versions.electron,
        force: true
      });
    }
  }
};
```

## 💡 使用示例

```javascript
const { app, BrowserWindow } = require('electron');
const { AudioCapture } = require('node-windows-audio-capture');

app.whenReady().then(() => {
  const capture = new AudioCapture();
  
  capture.on('data', (audioData) => {
    // 处理音频数据
    console.log('Audio data:', audioData.length);
  });
  
  capture.on('error', (error) => {
    console.error('Capture error:', error);
  });
  
  // 开始捕获
  capture.start().then(() => {
    console.log('Audio capture started');
  });
});

app.on('before-quit', () => {
  // 清理资源
  capture.stop();
});
```

## 🐛 常见问题

### 错误：Cannot find module '../build/Release/audio_addon'

**原因**：原生模块未针对 Electron 重新编译

**解决方案**：
```bash
# 安装 electron-rebuild
npm install --save-dev @electron/rebuild

# 重建原生模块
npx electron-rebuild -f -m node_modules/node-windows-audio-capture
```

### 错误：The module was compiled against a different Node.js version

**原因**：Node.js 版本不匹配

**解决方案**：
```bash
# 清理并重建
cd node_modules/node-windows-audio-capture
node-gyp clean
node-gyp configure --target=<electron-version> --arch=x64 --dist-url=https://electronjs.org/headers
node-gyp build
```

### 错误：A dynamic link library (DLL) initialization routine failed

**原因**：缺少 Visual C++ 运行时

**解决方案**：
安装 [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)

## 📦 开发环境设置

### 安装构建工具（Windows）

```bash
# 安装 Visual Studio Build Tools
npm install --global windows-build-tools

# 或者手动安装：
# 1. Visual Studio 2019/2022 with C++ tools
# 2. Python 3.x
```

### 配置环境变量

```bash
# 设置 Python 路径（如果有多个 Python 版本）
npm config set python "C:\Python39\python.exe"

# 设置 Visual Studio 版本
npm config set msvs_version 2022
```

## 🔄 更新模块

每次更新 `node-windows-audio-capture` 后，需要重新编译：

```bash
npm update node-windows-audio-capture
npx electron-rebuild -f -m node_modules/node-windows-audio-capture
```

## 📚 相关资源

- [Electron 官方文档 - 原生模块](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [@electron/rebuild](https://github.com/electron/rebuild)
- [node-gyp](https://github.com/nodejs/node-gyp)

## ✅ 验证安装

创建测试脚本 `test-audio.js`：

```javascript
const { AudioCapture } = require('node-windows-audio-capture');

console.log('✅ Module loaded successfully');

AudioCapture.getDevices().then(devices => {
  console.log(`✅ Found ${devices.length} audio devices`);
  devices.forEach((device, index) => {
    console.log(`  ${index + 1}. ${device.name} (${device.id})`);
  });
}).catch(error => {
  console.error('❌ Error:', error.message);
});
```

运行测试：
```bash
npm start  # 或 electron .
```

如果看到设备列表，说明安装成功！

## 🆘 获取帮助

如果遇到问题，请提供以下信息：

```bash
# 收集系统信息
node -v
npm -v
npx electron -v
python --version
node-gyp -v

# 检查构建环境
npm config get python
npm config get msvs_version
```

然后在 [GitHub Issues](https://github.com/wujelly701/node-windows-audio-capture/issues) 提交问题。
