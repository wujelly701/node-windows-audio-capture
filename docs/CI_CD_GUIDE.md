# CI/CD 配置指南

## 📋 概述

本项目使用 GitHub Actions 进行持续集成和持续部署（CI/CD）。

---

## 🔧 工作流程

### 1. Build and Test (`.github/workflows/build.yml`)

**触发条件**:
- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支
- 手动触发

**功能**:
- 多平台构建（Windows/Linux/macOS）
- 多Node.js版本测试（18/20/22）
- 运行测试套件
- 生成代码覆盖率报告
- 上传构建产物

**状态**: ✅ 已配置

---

### 2. Prebuild Release (`.github/workflows/prebuild.yml`)

**触发条件**:
- Push 带有 `v*` 标签
- 手动触发

**功能**:
- 为多个平台预编译二进制文件
- 上传到GitHub Release

**状态**: ✅ 已配置

---

### 3. Release and Publish (`.github/workflows/release.yml`) 🆕

**触发条件**:
- Push 带有 `v*` 标签（如 `v2.3.0`）
- 手动触发

**流程**:

```
1. 创建 GitHub Release
   ↓
2. 构建预编译二进制
   ↓
3. 运行完整测试套件
   ↓
4. 发布到 npm
   ↓
5. 发送通知
```

**功能**:
- ✅ 自动创建 GitHub Release
- ✅ 从 CHANGELOG.md 提取发布说明
- ✅ 构建并上传预编译二进制
- ✅ 运行完整测试
- ✅ 上传代码覆盖率到 Codecov
- ✅ 自动发布到 npm
- ✅ 支持 alpha/beta 版本（发布到 `next` tag）

**状态**: ✅ 已配置

---

## 🔐 必需的 Secrets

在 GitHub 仓库设置中配置以下 Secrets：

### 1. CODECOV_TOKEN（可选）

**用途**: 上传代码覆盖率报告到 Codecov  
**获取方式**:
1. 访问 https://codecov.io
2. 使用 GitHub 账号登录
3. 添加 `node-windows-audio-capture` 仓库
4. 复制生成的 token

**配置路径**: Settings → Secrets and variables → Actions → New repository secret

**名称**: `CODECOV_TOKEN`  
**值**: `从 Codecov 复制的 token`

---

### 2. NPM_TOKEN（必需，用于发布）

**用途**: 自动发布到 npm registry  
**获取方式**:
1. 访问 https://www.npmjs.com
2. 登录账号
3. 点击头像 → Access Tokens
4. Generate New Token → Classic Token
5. 类型选择: **Automation**
6. 复制生成的 token

**配置路径**: Settings → Secrets and variables → Actions → New repository secret

**名称**: `NPM_TOKEN`  
**值**: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **重要**: 请妥善保管 token，不要泄露！

---

## 🚀 发布流程

### 手动发布 v2.3.0

1. **更新版本号**

```bash
npm version 2.3.0 -m "Release v2.3.0"
```

这会：
- 更新 `package.json` 中的版本号
- 创建 git commit
- 创建 git tag `v2.3.0`

2. **推送到 GitHub**

```bash
git push origin main --tags
```

3. **自动流程**

GitHub Actions 会自动：
- ✅ 创建 GitHub Release
- ✅ 构建预编译二进制
- ✅ 运行测试
- ✅ 发布到 npm
- ✅ 发送通知

4. **验证发布**

- GitHub Release: https://github.com/wujelly701/node-windows-audio-capture/releases/tag/v2.3.0
- npm: https://www.npmjs.com/package/node-windows-audio-capture/v/2.3.0

---

### 发布 alpha/beta 版本

```bash
# Alpha 版本
npm version 2.3.0-alpha.1 -m "Release v2.3.0-alpha.1"
git push origin main --tags

# Beta 版本
npm version 2.3.0-beta.1 -m "Release v2.3.0-beta.1"
git push origin main --tags
```

这些版本会：
- 标记为 **prerelease** 在 GitHub
- 发布到 npm 的 **next** tag

用户安装方式：
```bash
# 安装 alpha/beta 版本
npm install node-windows-audio-capture@next

# 或指定具体版本
npm install node-windows-audio-capture@2.3.0-alpha.1
```

---

## 📊 代码覆盖率

### Codecov 集成

每次 push 和 PR 都会自动上传代码覆盖率报告到 Codecov。

**查看报告**:
- 访问: https://codecov.io/gh/wujelly701/node-windows-audio-capture
- 在 PR 中会自动显示覆盖率变化

**徽章**:

在 README.md 中添加：

```markdown
[![codecov](https://codecov.io/gh/wujelly701/node-windows-audio-capture/branch/main/graph/badge.svg)](https://codecov.io/gh/wujelly701/node-windows-audio-capture)
```

---

## 🐛 故障排查

### 1. npm 发布失败

**错误**: `npm ERR! need auth`

**解决**:
- 检查 `NPM_TOKEN` 是否正确配置
- 检查 token 是否有 **Automation** 权限
- 检查 token 是否过期

---

### 2. 预编译二进制构建失败

**错误**: `node-gyp rebuild failed`

**解决**:
- 检查 `binding.gyp` 配置
- 检查系统依赖是否安装
- 查看 Actions 日志详细错误

---

### 3. 测试失败

**错误**: `Test suite failed to run`

**解决**:
- 本地运行 `npm test` 验证
- 检查 Windows 特定的测试用例
- 确保 WASAPI 相关功能在 CI 环境可用

---

### 4. Codecov 上传失败

**错误**: `Codecov token not found`

**解决**:
- 配置 `CODECOV_TOKEN` secret
- 或移除 Codecov 步骤（可选功能）

---

## 📝 最佳实践

### 1. 发布前检查清单

- [ ] 运行 `npm test` 确保所有测试通过
- [ ] 更新 `CHANGELOG.md`
- [ ] 更新版本号相关文档
- [ ] 检查 `README.md` 中的版本号
- [ ] 本地构建验证 `npm run build`

### 2. 版本号规范

遵循 [Semantic Versioning](https://semver.org/):

- **Major (3.0.0)**: 破坏性变更
- **Minor (2.3.0)**: 新功能，向后兼容
- **Patch (2.2.1)**: Bug 修复

### 3. Git Tag 规范

- 正式版: `v2.3.0`
- Alpha版: `v2.3.0-alpha.1`
- Beta版: `v2.3.0-beta.1`

### 4. CHANGELOG 维护

每次发布前更新 `CHANGELOG.md`:

```markdown
## [2.3.0] - 2025-10-XX

### Added
- 设备选择功能
- 降采样算法优化

### Changed
- 内存使用优化

### Fixed
- 修复某个bug
```

---

## 🔄 工作流程状态

| 工作流程 | 状态 | 最后运行 |
|---------|------|---------|
| Build and Test | [![Build](https://github.com/wujelly701/node-windows-audio-capture/workflows/Build%20and%20Test/badge.svg)](https://github.com/wujelly701/node-windows-audio-capture/actions) | - |
| Prebuild | [![Prebuild](https://github.com/wujelly701/node-windows-audio-capture/workflows/Prebuild%20Release/badge.svg)](https://github.com/wujelly701/node-windows-audio-capture/actions) | - |
| Release | [![Release](https://github.com/wujelly701/node-windows-audio-capture/workflows/Release%20and%20Publish/badge.svg)](https://github.com/wujelly701/node-windows-audio-capture/actions) | - |

---

## 📚 参考资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [npm Publishing](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Codecov](https://docs.codecov.com/)
- [Semantic Versioning](https://semver.org/)

---

**文档版本**: v1.0  
**最后更新**: 2025-10-14
