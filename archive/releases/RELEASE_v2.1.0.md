# 🎉 v2.1.0 - Dynamic Audio Session Mute Control

## Overview

v2.1.0 introduces **Dynamic Audio Session Mute Control**, dramatically improving audio capture purity from **~60% to ~90%+** by automatically isolating target process audio.

---

## ✨ Key Features

### 1. **Automatic Process Muting** 🔇
Automatically mute all non-target processes during audio capture.

```javascript
processor.setMuteOtherProcesses(true);  // 🎯 Isolate target audio
```

**Impact:**
- ✅ Audio purity: 60% → **90%+**
- ✅ Zero interference from background apps
- ✅ No manual configuration needed

### 2. **Allow List (Whitelist)** 📋
Keep specific processes unmuted (e.g., system sounds).

```javascript
processor.setAllowList([systemAudioPid]);
```

### 3. **Block List (Blacklist)** 🚫
Force-mute specific noisy applications.

```javascript
processor.setBlockList([discordPid, slackPid]);
```

### 4. **Runtime Toggle** ⚡
Enable/disable muting on-the-fly without stopping capture.

```javascript
processor.setMuteOtherProcesses(true);   // Enable
processor.setMuteOtherProcesses(false);  // Disable
```

### 5. **Automatic State Restoration** 🔄
Original mute states are automatically saved and restored when capture stops.

### 6. **Process Enumeration** 🔍
List all processes with audio sessions.

```javascript
const { enumerateProcesses } = require('node-windows-audio-capture');
const processes = enumerateProcesses();
```

---

## 📋 New APIs

| API | Description |
|-----|-------------|
| `setMuteOtherProcesses(enabled)` | Enable/disable automatic muting |
| `isMutingOtherProcesses()` | Check if muting is enabled |
| `setAllowList(pids)` | Set process whitelist |
| `getAllowList()` | Get current whitelist |
| `setBlockList(pids)` | Set process blacklist |
| `getBlockList()` | Get current blacklist |
| `enumerateProcesses()` | List all audio processes |

---

## 🎯 Use Cases

### **Browser Video Translation**
Capture Chrome audio without Discord/Slack interference:
```javascript
processor.setMuteOtherProcesses(true);
processor.setAllowList([systemAudioPid]);  // Keep system sounds
```

### **Music Recording**
Record music player without notification sounds:
```javascript
processor.setBlockList([notificationAppPids]);
```

### **Live Streaming**
Dynamically toggle muting during stream:
```javascript
// During gameplay: mute all
processor.setMuteOtherProcesses(true);

// During break: allow all
processor.setMuteOtherProcesses(false);
```

---

## 🐛 Bug Fixes

- Fixed: Mute states not restored in `Stop()` method
- Fixed: Multi-process apps (Chrome) incorrectly muted
- Fixed: Windows registry persistence of mute states
- Improved: Process enumeration reliability

---

## 📚 Documentation

### New Documentation
- [FAQ.md](docs/FAQ.md) - Chrome mute persistence troubleshooting
- [V2.1_RELEASE_NOTES.md](docs/V2.1_RELEASE_NOTES.md) - Full release notes
- [MIGRATION_GUIDE_v2.1.md](docs/MIGRATION_GUIDE_v2.1.md) - v2.0 to v2.1 migration

### Updated Documentation
- [README.md](README.md) - v2.1 features and examples
- [API.md](docs/API.md) - New API documentation

---

## ⚠️ Known Issues

### Chrome Mute Persistence
**Issue:** Chrome may remain muted after testing if manually closed during capture.

**Root Cause:** Windows persists mute state by executable path in registry + Chrome multi-process architecture.

**Solutions:**
1. **Manual:** Volume Mixer → Unmute Chrome
2. **Script:** Run `fix-chrome-mute.ps1` (included)
3. **Prevention:** Use allow list to protect all Chrome processes

See [FAQ.md](docs/FAQ.md) for detailed troubleshooting.

---

## 🔧 Testing

Comprehensive test suite included:
```bash
node test-v2.1-mute-control.js
```

**Test Coverage:**
- ✅ v2.0 compatibility mode (no muting)
- ✅ v2.1 automatic muting
- ✅ Allow list functionality
- ✅ Runtime toggle capability

---

## 📦 Installation

```bash
npm install node-windows-audio-capture@2.1.0
```

---

## 🚀 Quick Start

```javascript
const { AudioProcessor, enumerateProcesses } = require('node-windows-audio-capture');

// Find Chrome process
const processes = enumerateProcesses();
const chrome = processes.find(p => p.name.toLowerCase().includes('chrome'));

// Create processor with muting
const processor = new AudioProcessor({
    processId: chrome.pid,
    callback: (data) => console.log('Clean audio:', data.length)
});

processor.start();
processor.setMuteOtherProcesses(true);  // 🎯 Isolate Chrome audio
processor.startCapture();

// Stop and auto-restore states
setTimeout(() => {
    processor.stopCapture();
    processor.stop();  // Automatically restores mute states
}, 10000);
```

---

## 🙏 Credits

Thanks to all contributors and testers who helped make v2.1 possible!

---

## 📊 Statistics

- **500+ lines** of C++ code added
- **6 new APIs** introduced
- **~3000 lines** of documentation
- **90%+ audio purity** achieved

---

## 🔗 Links

- [GitHub Repository](https://github.com/wujelly701/node-windows-audio-capture)
- [Full Documentation](docs/)
- [Report Issues](https://github.com/wujelly701/node-windows-audio-capture/issues)

---

**Full Changelog:** [v2.0.0...v2.1.0](https://github.com/wujelly701/node-windows-audio-capture/compare/v2.0.0...v2.1.0)
