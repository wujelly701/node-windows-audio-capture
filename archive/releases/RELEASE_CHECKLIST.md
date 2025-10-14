# 📦 Release Checklist

## Pre-Release Verification

### ✅ 代码质量
- [x] 所有测试通过 (42/42)
- [x] 代码覆盖率 ≥ 80% (83.63%)
- [x] 无编译警告或错误
- [x] 代码已格式化和整理
- [x] 无明显的代码异味或技术债

### ✅ 文档
- [x] README.md 完整且准确
- [x] API 文档详细清晰
- [x] 示例代码可运行
- [x] TESTING.md 存在
- [x] LICENSE 存在 (MIT)
- [x] TypeScript 定义 (index.d.ts)

### ✅ 配置文件
- [x] package.json 配置正确
  - [x] version: "1.0.0"
  - [x] main, types 指向正确
  - [x] scripts 完整
  - [x] repository, bugs, homepage 设置
  - [x] engines, os, cpu 限制
  - [x] files 列表
  - [x] keywords 设置
- [x] binding.gyp 正确
- [x] .npmignore 存在
- [x] jest.config.js 存在

### ✅ 功能验证
- [x] 基础音频捕获工作
- [x] 事件系统正常 (data, error, started, stopped, paused, resumed)
- [x] pause/resume 功能正常
- [x] getDeviceInfo() 工作
- [x] enumerateProcesses() 工作
- [x] 状态管理正确 (isRunning, isPaused)

### ✅ 性能验证
- [x] 30秒长时间运行稳定
- [x] 无内存泄漏
- [x] CPU 占用 < 5%
- [x] 数据率稳定 (CV < 1%)
- [x] 延迟 < 50ms

### ✅ 示例代码
- [x] examples/basic.js
- [x] examples/process-capture.js
- [x] examples/events.js

## Release Steps

### 1. 最终验证

```powershell
# 清理构建
npx node-gyp clean

# 重新编译
npx node-gyp rebuild

# 运行所有测试
npm test

# 生成覆盖率报告
npm test -- --coverage

# 运行示例
npm run example:basic
```

### 2. 版本检查

```powershell
# 查看当前版本
node -p "require('./package.json').version"

# 如需更新版本（根据需要）
# npm version patch   # 1.0.0 -> 1.0.1
# npm version minor   # 1.0.0 -> 1.1.0
# npm version major   # 1.0.0 -> 2.0.0
```

### 3. Git 提交和标签

```powershell
# 查看未提交的更改
git status

# 添加更改
git add .

# 提交
git commit -m "chore: prepare for v1.0.0 release"

# 创建标签
git tag -a v1.0.0 -m "Release v1.0.0"

# 推送
git push origin main
git push origin v1.0.0
```

### 4. npm 发布（可选）

```powershell
# 登录 npm（首次）
npm login

# 测试打包（不实际发布）
npm pack

# 查看将要发布的文件
tar -tzf node-windows-audio-capture-1.0.0.tgz

# 发布到 npm（谨慎！）
npm publish

# 或发布为 beta 版本
npm publish --tag beta
```

### 5. GitHub Release（推荐）

1. 访问 https://github.com/wujelly701/node-windows-audio-capture/releases
2. 点击 "Draft a new release"
3. 选择标签 `v1.0.0`
4. 填写发布说明：

```markdown
# Release v1.0.0

## 🎉 首次发布

Production-ready Windows 音频捕获 Node.js Native Addon。

### ✨ 主要特性

- 🎵 WASAPI Loopback 模式系统音频捕获
- 🔄 EventEmitter 事件驱动架构
- ⚡ 高性能（< 5% CPU，~100 packets/s）
- 🎛️ Pause/Resume 状态控制
- 📊 设备和进程枚举
- 🧪 完整测试覆盖（42 个测试，83.63%）
- 📝 TypeScript 类型定义
- 📚 详细文档和示例

### 📋 系统要求

- Windows 10/11
- Node.js >= 16.x
- Visual Studio 2022 (编译时)

### 📦 安装

\`\`\`bash
npm install node-windows-audio-capture
\`\`\`

### 🚀 快速开始

\`\`\`javascript
const { AudioCapture } = require('node-windows-audio-capture');

const capture = new AudioCapture({ processId: 0 });
capture.on('data', (event) => {
  console.log(`Captured ${event.length} bytes`);
});
await capture.start();
\`\`\`

### 📈 性能指标

- 吞吐量: 85-100 packets/s, 295-345 KB/s
- 内存: ~30 MB（无泄漏）
- 延迟: < 50ms
- 稳定性: CV < 1%

查看完整文档：[README.md](README.md)
```

5. 上传构建产物（可选）:
   - `node-windows-audio-capture-1.0.0.tgz`
   - 预构建二进制文件（如果有）

6. 点击 "Publish release"

## Post-Release

### 验证发布

```powershell
# 验证 npm 包（如果发布到 npm）
npm view node-windows-audio-capture

# 在新目录测试安装
mkdir test-install
cd test-install
npm install node-windows-audio-capture
node -e "console.log(require('node-windows-audio-capture'))"
```

### 更新文档

- [ ] 更新 README.md badges（如果有 CI/CD）
- [ ] 更新 CHANGELOG.md（如果有）
- [ ] 在 GitHub Discussions/Issues 中宣布发布

### 监控

- [ ] 监控 GitHub Issues
- [ ] 监控 npm 下载量（如果发布）
- [ ] 收集用户反馈

## Known Issues / Limitations

### 当前限制
- 仅支持 Windows 10/11
- 仅支持 Loopback 模式（processId=0）
- 使用系统默认音频格式（通常 Float32, 48kHz, 2ch）

### 计划改进
- v2.0: 进程隔离模式（IAudioClient3）
- v2.0: 设备选择
- v2.0: 音频格式配置
- v3.0: 音频可视化和处理
- v4.0: macOS/Linux 支持

## Contact

如有问题或建议：
- GitHub Issues: https://github.com/wujelly701/node-windows-audio-capture/issues
- Email: wujelly701@example.com

---

**最后更新**: 2025-10-13
**状态**: ✅ Ready for v1.0.0 Release
