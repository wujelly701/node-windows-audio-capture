# 示例代码说明

本目录包含 `node-windows-audio-capture` 的各种使用示例。

---

## 🎵 音频录制示例

### 1. process-capture-wav.js ⭐ 推荐

**直接录制为 WAV 格式，可立即播放**

```bash
node examples/process-capture-wav.js
```

**功能**:
- ✅ 自动查找运行中的浏览器/播放器进程
- ✅ 录制 30 秒音频
- ✅ 保存为标准 WAV 格式（48kHz, 立体声, 32-bit Float）
- ✅ 可用任何播放器播放（Windows Media Player, VLC 等）

**输出文件**: `capture_<进程名>_<时间戳>.wav`

**播放方式**:
```bash
# Windows Media Player
wmplayer.exe "capture_chrome.exe_2025-10-16T12-30-00.wav"

# VLC
vlc.exe "capture_chrome.exe_2025-10-16T12-30-00.wav"

# 双击文件即可播放
```

---

### 2. process-capture.js

**录制为 RAW PCM 格式（需要转换才能播放）**

```bash
node examples/process-capture.js
```

**功能**:
- 录制 30 秒音频
- 保存为 RAW PCM 格式（Float32LE, 48kHz, 立体声）

**输出文件**: `capture_<PID>.raw`

**⚠️ 无法直接播放！** 需要使用以下方法之一：

#### 方法 1: 转换为 WAV（推荐）

```bash
node examples/convert-raw-to-wav.js capture_12345.raw
# 生成 capture_12345.wav，可直接播放
```

#### 方法 2: 使用 FFmpeg 播放

```bash
ffplay -f f32le -ar 48000 -ac 2 capture_12345.raw
```

**参数说明**:
- `-f f32le`: Float32 Little Endian 格式
- `-ar 48000`: 采样率 48kHz
- `-ac 2`: 2 声道（立体声）

#### 方法 3: 使用 FFmpeg 转换

```bash
ffmpeg -f f32le -ar 48000 -ac 2 -i capture_12345.raw output.wav
```

---

### 3. convert-raw-to-wav.js

**RAW 转 WAV 工具**

```bash
node examples/convert-raw-to-wav.js <input.raw> [output.wav] [options]
```

**选项**:
- `--sample-rate <Hz>`: 采样率（默认: 48000）
- `--channels <n>`: 声道数（默认: 2）
- `--bits <n>`: 位深度（默认: 32）

**示例**:
```bash
# 使用默认参数转换
node examples/convert-raw-to-wav.js capture_12345.raw

# 指定输出文件名
node examples/convert-raw-to-wav.js capture_12345.raw my_audio.wav

# 自定义音频参数
node examples/convert-raw-to-wav.js capture_12345.raw output.wav --sample-rate 44100 --channels 1
```

---

## 📝 其他示例

### basic-capture.js

基础音频捕获示例

```bash
node examples/basic-capture.js
```

### agc-example.js

AGC（自动增益控制）示例

```bash
node examples/agc-example.js
```

### eq-example.js

EQ（均衡器）示例

```bash
node examples/eq-example.js
```

### format-conversion-example.js

ASR 格式转换示例

```bash
node examples/format-conversion-example.js
```

---

## 🎯 推荐工作流

### 快速录制（推荐）

```bash
# 1. 直接录制 WAV
node examples/process-capture-wav.js

# 2. 播放录制的文件
vlc.exe capture_chrome.exe_2025-10-16T12-30-00.wav
```

### RAW 格式工作流

```bash
# 1. 录制 RAW 文件
node examples/process-capture.js

# 2. 转换为 WAV
node examples/convert-raw-to-wav.js capture_12345.raw

# 3. 播放 WAV 文件
vlc.exe capture_12345.wav
```

---

## 🔧 音频格式说明

### WAV 格式 (推荐)

**优点**:
- ✅ 标准格式，所有播放器支持
- ✅ 包含文件头，自动识别参数
- ✅ 无需额外工具即可播放

**缺点**:
- ❌ 文件稍大（包含 44 字节文件头）

### RAW PCM 格式

**优点**:
- ✅ 纯音频数据，无额外开销
- ✅ 处理速度快
- ✅ 适合进一步处理

**缺点**:
- ❌ 无法直接播放
- ❌ 需要手动指定音频参数
- ❌ 需要转换或特殊播放器

---

## 🎧 播放器推荐

### Windows Media Player

Windows 内置播放器

```bash
wmplayer.exe "audio.wav"
```

### VLC Media Player

功能强大的开源播放器

下载: https://www.videolan.org/vlc/

```bash
vlc.exe "audio.wav"
```

### FFplay (FFmpeg)

命令行播放器

下载: https://ffmpeg.org/download.html

```bash
# 播放 WAV
ffplay audio.wav

# 播放 RAW
ffplay -f f32le -ar 48000 -ac 2 audio.raw
```

---

## 📊 音频参数参考

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 采样率 | 48000 Hz | CD 质量: 44100 Hz |
| 声道数 | 2 (立体声) | 单声道: 1 |
| 位深度 | 32-bit Float | 16-bit Int: 更小体积 |
| 格式 | IEEE Float PCM | 标准浮点格式 |

### 数据大小计算

```
大小 (字节/秒) = 采样率 × 声道数 × (位深度 / 8)

默认 (48kHz, 立体声, 32-bit):
= 48000 × 2 × 4 = 384,000 字节/秒 ≈ 375 KB/秒

30 秒录音 ≈ 11.25 MB
```

---

## ❓ 常见问题

### Q: 为什么 RAW 文件无法播放？

**A**: RAW 文件没有文件头，播放器不知道音频参数（采样率、声道数等）。需要：
1. 使用支持 RAW 的播放器（如 FFplay）并手动指定参数
2. 转换为 WAV 格式

### Q: 如何减小文件大小？

**A**: 修改音频参数：
```javascript
const capture = new AudioCapture({
    processId: pid,
    sampleRate: 16000,  // 降低采样率
    channels: 1,        // 使用单声道
    format: 'int16'     // 使用 16-bit 整数
});
```

大小减少到: 16000 × 1 × 2 = 32 KB/秒 (原来的 8.5%)

### Q: 录制时间可以更改吗？

**A**: 可以，修改 setTimeout 的时间：
```javascript
// 录制 60 秒
setTimeout(async () => {
    await capture.stop();
}, 60000);  // 60 * 1000 毫秒
```

### Q: 可以同时录制多个进程吗？

**A**: 需要创建多个 AudioCapture 实例：
```javascript
const capture1 = new AudioCapture({ processId: pid1 });
const capture2 = new AudioCapture({ processId: pid2 });

await capture1.start();
await capture2.start();
```

---

## 🔗 相关文档

- [快速入门指南](../docs/QUICK_START_GUIDE.md)
- [API 索引](../docs/API_INDEX.md)
- [完整 API 文档](../docs/api.md)

---

## 💡 提示

**推荐使用 `process-capture-wav.js` 进行录制**，它：
- ✅ 直接生成可播放的 WAV 文件
- ✅ 无需额外转换步骤
- ✅ 兼容所有播放器

如果您需要 RAW 格式用于特殊处理，可以使用 `process-capture.js`，然后用 `convert-raw-to-wav.js` 转换。
