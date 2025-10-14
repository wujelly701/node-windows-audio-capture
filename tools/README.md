# Development Tools

This directory contains diagnostic and utility scripts for development and troubleshooting.

## 🛠️ Available Tools

### Audio System Diagnostics

#### `check-audio-status.js`
Check current audio device status and session states.

```bash
node tools/check-audio-status.js
```

**Use when**: Verifying audio system configuration before testing.

---

#### `diagnose-chrome.js`
Diagnose Chrome audio sessions and process information.

```bash
node tools/diagnose-chrome.js
```

**Use when**: Debugging Chrome-specific audio capture issues.

---

#### `diagnose-api-call.js`
Test and diagnose raw API calls to the native addon.

```bash
node tools/diagnose-api-call.js
```

**Use when**: Debugging N-API bindings or low-level issues.

---

#### `diagnose-process-loopback.js`
Diagnose process-specific loopback capture issues.

```bash
node tools/diagnose-process-loopback.js
```

**Use when**: Troubleshooting process filtering functionality.

---

### Audio System Fixes

#### `fix-chrome-mute.js`
Fix Chrome being stuck in muted state after testing.

```bash
node tools/fix-chrome-mute.js
```

**Use when**: Chrome has no sound after running v2.1 mute control tests.

---

### Utility Scripts

#### `find-chrome-main.js`
Find the main Chrome process among multiple Chrome processes.

```bash
node tools/find-chrome-main.js
```

**Use when**: Need to identify the main Chrome process for testing.

---

#### `simple-test-process-filter.js`
Simple test for process filtering functionality.

```bash
node tools/simple-test-process-filter.js
```

**Use when**: Quick validation of process filter feature.

---

## 📋 Common Workflows

### Before Testing
1. Run `check-audio-status.js` to verify system state
2. Ensure audio is playing
3. Check target process is running

### After v2.1 Testing
1. If Chrome is muted, run `fix-chrome-mute.js`
2. Verify with `check-audio-status.js`
3. Restart Chrome if needed

### Debugging Issues
1. Use appropriate diagnostic script
2. Check console output for errors
3. Compare with expected behavior
4. Report issues with diagnostic output

---

## ⚠️ Important Notes

- These tools are for **development only**
- Do not use in production code
- Some tools require admin privileges
- Tools may modify system audio state
- Always verify system state after running tools

---

## 🤝 Contributing

When adding new tools:
1. Follow existing naming convention (`verb-noun.js`)
2. Add clear documentation here
3. Include usage examples
4. Document side effects
5. Add error handling

---

## 📞 Support

If you encounter issues with these tools:
- Check tool output for error messages
- Verify prerequisites (running processes, admin rights)
- Consult `/docs/FAQ.md` for common issues
- Report bugs with full diagnostic output
