# v2.6.0 Release Checklist

## Pre-Release Validation

### Testing ✅
- [x] Performance tests (5 iterations × 10s) - PASSED
- [x] Crash reproduction test (30s) - PASSED
- [x] Stability test (5 min, pool 10) - PASSED
- [x] Stability test (5 min, pool 100) - PASSED
- [ ] Extended stability test (1 hour) - IN PROGRESS
- [x] Pool statistics validation - PASSED
- [x] Memory leak detection - PASSED

### Documentation ✅
- [x] V2.6_RELEASE_NOTES.md created
- [x] README.md updated with v2.6 features
- [x] CHANGELOG.md updated with v2.6 entry
- [x] API documentation updated (AudioCaptureOptions, BufferPoolStats)
- [x] TypeScript definitions reviewed (index.d.ts)
- [x] Technical documentation complete:
  - [x] V2.6_ZERO_COPY_TEST_REPORT.md
  - [x] V2.6_BUFFER_POOL_STATS_API.md
  - [x] V2.6_ZERO_COPY_CRASH_FIX.md
  - [x] V2.6_POOL_HIT_RATE_ANALYSIS.md
  - [x] V2.6_DEVELOPMENT_COMPLETE.md
  - [x] V2.6_FINAL_TEST_REPORT.md
  - [x] V2.6_STABILITY_PROGRESS.md

### Code Quality ✅
- [x] Zero-copy implementation complete
- [x] Critical crash bug fixed
- [x] Buffer pool optimized (size 100)
- [x] Statistics API implemented
- [x] Backward compatibility maintained
- [x] No breaking changes

### Build & CI ✅
- [x] Local build successful (Windows x64)
- [x] All warnings reviewed (only encoding warnings, acceptable)
- [x] Native addon compiled successfully
- [ ] GitHub Actions CI passing (run after push)

## Release Steps

### 1. Final Testing ⏳
- [ ] Wait for 1-hour stability test completion
- [ ] Review test results
- [ ] Confirm zero crashes, zero leaks
- [ ] Validate pool statistics

### 2. Version Update 📝
- [ ] Update `package.json`: `2.6.0-alpha.1` → `2.6.0`
- [ ] Update README.md version badge: `2.5.0` → `2.6.0`
- [ ] Verify all version references updated

### 3. Git Operations 🔖
```bash
# Commit all changes
git add .
git commit -m "Release v2.6.0 - Zero-Copy Memory Optimization"

# Create and push tag
git tag -a v2.6.0 -m "v2.6.0 - Zero-Copy Memory Architecture

Major Features:
- Zero-copy memory optimization (151.3% improvement)
- Buffer pool statistics API
- Critical crash bug fix
- 30,000+ packet stability validated

Performance:
- Heap growth: +8.09 KB/s → -4.25 KB/s (negative!)
- Memory stable, zero leaks
- Production ready"

git push origin feature/v2.6-development
git push origin v2.6.0
```

### 4. Merge to Main 🔀
```bash
# Switch to main branch
git checkout main

# Merge v2.6 development branch
git merge feature/v2.6-development

# Push to main
git push origin main
```

### 5. npm Publishing 📦

#### Dry Run
```bash
# Test publishing without actually publishing
npm publish --dry-run
```

**Review output for:**
- [ ] Correct version (2.6.0)
- [ ] All necessary files included
- [ ] No sensitive files leaked
- [ ] Package size reasonable

#### Actual Publish
```bash
# Publish to npm registry
npm publish
```

#### Verify Publication
```bash
# Check published package
npm info node-windows-audio-capture

# Install and test
npm install node-windows-audio-capture@2.6.0
```

### 6. GitHub Release 🎉

Create GitHub Release at: https://github.com/wujelly701/node-windows-audio-capture/releases/new

**Release Form:**
- Tag: `v2.6.0`
- Title: `v2.6.0 - Zero-Copy Memory Architecture`
- Description: Copy from `docs/V2.6_RELEASE_NOTES.md`
- Attach: Built binaries (optional)
- Mark as: Latest release
- Check: This is not a pre-release

### 7. Post-Release 📢

#### Update Documentation Sites
- [ ] Update package documentation on npm
- [ ] Update GitHub wiki (if applicable)
- [ ] Update any external documentation

#### Announcements
- [ ] GitHub Discussions post
- [ ] Twitter/X announcement (if applicable)
- [ ] Reddit r/nodejs post (optional)
- [ ] Dev.to article (optional)

#### Monitor
- [ ] npm download stats
- [ ] GitHub issues for bug reports
- [ ] User feedback on features

## Rollback Plan 🆘

If critical issues discovered after release:

### Option 1: Quick Patch
```bash
# Create patch branch
git checkout -b hotfix/v2.6.1

# Fix critical issue
# ... make changes ...

# Release v2.6.1
npm version patch
npm publish
```

### Option 2: Deprecate & Rollback
```bash
# Deprecate broken version
npm deprecate node-windows-audio-capture@2.6.0 "Critical bug found, use 2.5.0"

# Users can revert
npm install node-windows-audio-capture@2.5.0
```

## Success Criteria ✅

Release is successful when:
- [x] All tests passing
- [ ] 1-hour stability test complete
- [ ] npm package published
- [ ] GitHub release created
- [ ] No critical bugs reported within 24h
- [ ] Users can install and use v2.6.0

## Known Limitations

Document any known limitations:
- Zero-copy mode is opt-in (not default)
- Pool hit rate is low (~0.33%) but acceptable
- Windows only (as always)
- Requires Node.js >= 14.x

## Support Plan

Post-release support:
- Monitor GitHub issues daily for first week
- Respond to bug reports within 24h
- Release hotfix if critical issues found
- Create v2.6.1 patch if needed

---

## Current Status

**Date**: October 15, 2025  
**Branch**: feature/v2.6-development  
**Version**: 2.6.0-alpha.1 → 2.6.0 (pending)  
**Phase**: Documentation Complete, Waiting for 1-hour test  
**Next Step**: Monitor 1-hour stability test completion

**Blockers**: None  
**Risk Level**: LOW  
**Ready for Release**: After 1-hour test ✅

---

## Contacts

**Release Manager**: Development Team  
**Emergency Contact**: GitHub Issues  
**Documentation**: docs/ directory

---

**Let's ship it! 🚀**
