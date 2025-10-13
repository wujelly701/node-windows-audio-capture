# 测试文档

## 测试套件

本项目包含完整的测试套件，覆盖所有核心功能、边界情况和性能测试。

### 测试统计

- **总计**: 42 个测试
- **覆盖率**: 83.63%
  - 语句: 83.63%
  - 分支: 91.3%
  - 函数: 100%
  - 行: 83.63%

### 测试分类

#### 1. 基础功能测试 (`test/basic.test.js`)

测试 Native addon 加载、构造函数、EventEmitter 接口和状态管理。

**测试用例 (12):**
- ✅ Native addon 加载
- ✅ 设备信息获取
- ✅ 进程枚举
- ✅ AudioCapture 实例创建（默认/自定义选项）
- ✅ EventEmitter 接口
- ✅ 状态管理（isRunning, isPaused）

#### 2. 集成测试 (`test/integration.test.js`)

测试完整的音频捕获流程和多实例支持。

**测试用例 (7):**
- ✅ 启动和停止捕获
- ✅ 音频数据捕获（验证数据格式）
- ✅ 暂停和恢复功能
- ✅ 防止重复启动
- ✅ 错误处理
- ✅ 数据统计计算
- ✅ 多实例并发捕获

**测试数据示例:**
- 3 秒捕获: ~300 个数据包
- 2 秒捕获: ~200 个数据包（709 KB）
- 平均包大小: 3528 字节

#### 3. 性能测试 (`test/performance.test.js`)

测试长时间运行、内存使用、稳定性和压力场景。

**测试用例 (7):**

##### 长时间运行测试 (30 秒)
- ✅ 捕获 ~3000 个数据包
- ✅ 数据量 ~10 MB
- ✅ 吞吐量 ~100 包/秒（~345 KB/秒）

##### 快速启停测试
- ✅ 5 次连续 start/stop 循环
- ✅ 10 次连续 pause/resume 循环

##### 内存测试
- ✅ 10 秒捕获后无内存泄漏
- ✅ 堆内存增长 < 1 MB

##### 数据率稳定性测试
- ✅ 5 秒持续捕获
- ✅ 数据率标准差 < 1 包/秒
- ✅ 变异系数 < 1%

##### 压力测试
- ✅ 100 个事件监听器
- ✅ 大量缓冲区处理

#### 4. 错误处理测试 (`test/error-handling.test.js`)

测试边界情况、错误处理和并发场景。

**测试用例 (16):**
- ✅ 无效构造函数参数
- ✅ 重复停止操作
- ✅ 未启动就停止
- ✅ 零长度捕获
- ✅ 极短时间捕获（100ms）
- ✅ 立即暂停/恢复
- ✅ 移除所有监听器
- ✅ Native 函数错误处理
- ✅ 并发启停操作
- ✅ 运行时添加监听器

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试套件

```bash
# 基础测试
npm test -- test/basic.test.js

# 集成测试
npm test -- test/integration.test.js

# 性能测试
npm test -- test/performance.test.js

# 错误处理测试
npm test -- test/error-handling.test.js
```

### 生成覆盖率报告

```bash
npm test -- --coverage
```

覆盖率报告将生成在 `coverage/` 目录。

### 查看详细输出

```bash
npm test -- --verbose
```

## 测试环境要求

- **Node.js**: >= 16.0.0
- **操作系统**: Windows 10/11
- **音频设备**: 需要默认音频输出设备
- **权限**: 无需管理员权限

## 测试注意事项

### 音频数据测试

某些测试需要系统正在播放音频才能捕获到数据。如果系统静音，相关测试会跳过验证或显示警告：

```
⚠️  No audio data captured (system may be silent)
```

这是正常行为，不影响测试通过。

### 性能测试

性能测试可能需要较长时间（最长 30 秒），请耐心等待。测试会输出详细的性能指标：

```
Performance (30s):
  - Packets: 3001 (99.98/s)
  - Bytes: 10.10 MB (344.47 KB/s)
  - Duration: 30.02s
```

### 内存泄漏检测

运行内存测试时，建议使用 `--expose-gc` 标志启用手动垃圾回收：

```bash
node --expose-gc node_modules/.bin/jest test/performance.test.js
```

### 并发测试

测试配置为串行执行（`maxWorkers: 1`），避免多个测试同时访问音频设备导致冲突。

## 持续集成

建议在 CI/CD 管道中运行测试：

```yaml
# GitHub Actions 示例
- name: Run tests
  run: npm test -- --coverage --forceExit

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## 调试测试

### 启用调试日志

在测试文件中添加 `console.log` 输出：

```javascript
capture.on('data', (event) => {
    console.log(`Received ${event.length} bytes`);
});
```

### 使用 Node.js 调试器

```bash
node --inspect-brk node_modules/.bin/jest test/basic.test.js
```

然后在 Chrome 中打开 `chrome://inspect` 进行调试。

### 检测未关闭的句柄

```bash
npm test -- --detectOpenHandles
```

这会显示测试结束后仍在运行的异步操作。

## 贡献测试

欢迎添加新的测试用例！请遵循以下指南：

1. **命名规范**: 使用描述性的测试名称
2. **隔离性**: 每个测试应该独立运行
3. **清理**: 使用 `afterEach` 清理资源
4. **超时**: 为长时间运行的测试设置适当的超时
5. **断言**: 使用清晰的断言消息

示例：

```javascript
test('should handle custom scenario', async () => {
    const capture = new AudioCapture({ processId: 0 });
    
    try {
        await capture.start();
        // 测试逻辑
        expect(capture.isRunning()).toBe(true);
    } finally {
        await capture.stop();
    }
}, 5000); // 5 秒超时
```

## 已知问题

1. **MaxListenersExceededWarning**: 在压力测试中添加 100 个监听器时会出现此警告，这是预期行为，用于测试大量监听器的处理能力。

2. **测试超时**: 某些性能测试可能在慢速机器上超时，可以在 `jest.config.js` 中增加 `testTimeout`。

3. **COM 初始化**: 在某些罕见情况下，COM 初始化可能失败，测试会跳过或显示警告。

## 测试覆盖率目标

- **当前**: 83.63%
- **目标**: > 85%
- **未覆盖区域**: 主要是错误处理分支和极端边界情况

## 许可证

测试代码遵循与项目相同的 MIT 许可证。
