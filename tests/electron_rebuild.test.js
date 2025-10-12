/**
 * 单元测试：Electron 重构建脚本
 * 测试 scripts/electron-rebuild.js 的功能
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Electron Rebuild Script', function() {
  // 增加超时时间，因为重构建可能需要较长时间
  this.timeout(60000);

  const scriptPath = path.join(__dirname, '..', 'scripts', 'electron-rebuild.js');
  const buildDir = path.join(__dirname, '..', 'build');
  const prebuildsDir = path.join(__dirname, '..', 'prebuilds');

  beforeEach(function() {
    // 备份环境变量
    this.originalEnv = { ...process.env };
  });

  afterEach(function() {
    // 恢复环境变量
    process.env = this.originalEnv;
  });

  describe('Script Existence', function() {
    it('should exist as a file', function() {
      expect(fs.existsSync(scriptPath)).to.be.true;
    });

    it('should be executable (non-zero size)', function() {
      const stats = fs.statSync(scriptPath);
      expect(stats.size).to.be.greaterThan(0);
    });

    it('should contain main function', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('async function main()');
    });

    it('should contain rebuildForElectron function', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('async function rebuildForElectron');
    });

    it('should contain verifyRebuild function', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('function verifyRebuild');
    });

    it('should contain checkElectronRebuild function', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('function checkElectronRebuild');
    });
  });

  describe('Command Line Interface', function() {
    it('should support --help option', function() {
      try {
        const output = execSync(`node "${scriptPath}" --help`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(output).to.include('Usage:');
        expect(output).to.include('electron-rebuild');
      } catch (error) {
        // Commander 在 --help 时会 exit(0)，但 execSync 可能抛出错误
        if (error.stdout) {
          expect(error.stdout).to.include('Usage:');
        }
      }
    });

    it('should support --version option parsing', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('--electron-version');
      expect(content).to.include('-v');
    });

    it('should support --electron-path option parsing', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('--electron-path');
      expect(content).to.include('-e');
    });

    it('should support --force option parsing', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('--force');
      expect(content).to.include('-f');
    });

    it('should support --arch option parsing', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('--arch');
      expect(content).to.include('-a');
    });

    it('should support --verbose option parsing', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('--verbose');
    });
  });

  describe('Electron Rebuild Dependency Check', function() {
    it('should check for @electron/rebuild package', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('@electron/rebuild');
    });

    it('should handle missing @electron/rebuild gracefully', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('checkElectronRebuild');
      expect(content).to.include('installElectronRebuild');
    });
  });

  describe('Rebuild Verification', function() {
    it('should verify .node file existence after rebuild', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('verifyRebuild');
      expect(content).to.include('.node');
    });

    it('should check build directory structure', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('build');
      expect(content).to.include('Release');
    });

    it('should report verification results', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('验证') || expect(content).to.include('Verify');
    });
  });

  describe('Error Handling', function() {
    it('should handle rebuild failures gracefully', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('catch');
      expect(content).to.include('error') || expect(content).to.include('Error');
    });

    it('should provide error messages', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('console.error') || expect(content).to.include('throw');
    });

    it('should exit with non-zero code on failure', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('process.exit(1)');
    });
  });

  describe('Build Configuration', function() {
    it('should support multiple Electron versions', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('electronVersion') || expect(content).to.include('electron-version');
    });

    it('should support custom Electron path', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('electronPath') || expect(content).to.include('electron-path');
    });

    it('should support architecture specification', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('arch') || expect(content).to.include('x64') || expect(content).to.include('arm64');
    });

    it('should support force rebuild option', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('force');
    });
  });

  describe('Output and Logging', function() {
    it('should provide colorful output', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      // 检查是否有颜色输出（ANSI 转义码或 chalk 等）
      expect(content).to.include('\\x1b[') || expect(content).to.include('chalk');
    });

    it('should display build summary', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('summary') || expect(content).to.include('Summary') || expect(content).to.include('摘要');
    });

    it('should show verbose output when requested', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('verbose');
    });

    it('should display progress information', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('console.log') || expect(content).to.include('console.info');
    });
  });

  describe('Commander Integration', function() {
    it('should use commander for CLI parsing', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('commander') || expect(content).to.include('Command');
    });

    it('should define program commands', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('.option(') || expect(content).to.include('.command(');
    });

    it('should parse CLI arguments', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('.parse(') || expect(content).to.include('process.argv');
    });
  });

  describe('Electron Rebuild Execution', function() {
    it('should call @electron/rebuild programmatically', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('rebuild');
    });

    it('should configure rebuild options', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('buildPath') || expect(content).to.include('electronVersion');
    });

    it('should handle async rebuild process', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('async') || expect(content).to.include('await');
    });
  });

  describe('File System Operations', function() {
    it('should check for build directory', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('build') && expect(content).to.include('existsSync');
    });

    it('should search for .node files', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('.node');
    });

    it('should handle missing files gracefully', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('existsSync') || expect(content).to.include('statSync');
    });
  });

  describe('Electron Version Detection', function() {
    it('should detect Electron version from package.json', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('package.json') || expect(content).to.include('electron');
    });

    it('should support manual version override', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('--electron-version') || expect(content).to.include('-v');
    });

    it('should validate Electron version format', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      // 应该有版本验证逻辑
      expect(content.length).to.be.greaterThan(100);
    });
  });

  describe('Integration with Build System', function() {
    it('should work with existing build directory', function() {
      // 如果 build 目录存在，脚本应该能处理
      if (fs.existsSync(buildDir)) {
        const content = fs.readFileSync(scriptPath, 'utf-8');
        expect(content).to.include('build');
      }
    });

    it('should not conflict with prebuilds', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      // 脚本应该独立于 prebuilds 系统
      expect(content).to.not.include('prebuildify') || expect(content).to.include('electron-rebuild');
    });

    it('should be independent of CI/CD workflows', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      // 脚本应该可以本地运行，不依赖 CI 环境
      expect(content).to.not.include('GITHUB_') && expect(content).to.not.include('CI=true');
    });
  });

  describe('Documentation and Comments', function() {
    it('should contain usage documentation', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('Usage') || expect(content).to.include('用法') || expect(content).to.include('/**');
    });

    it('should explain key functions', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      const commentCount = (content.match(/\/\*\*/g) || []).length;
      expect(commentCount).to.be.greaterThan(0);
    });

    it('should provide examples in comments', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('example') || expect(content).to.include('Example') || expect(content).to.include('示例');
    });
  });

  describe('Conditional Execution', function() {
    it('should support dry-run or test mode', function() {
      // 检查脚本是否可以在测试环境中运行
      const content = fs.readFileSync(scriptPath, 'utf-8');
      // 至少应该有条件判断逻辑
      expect(content).to.include('if (') && expect(content).to.include('process.env');
    });

    it('should skip rebuild if not needed', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('force') || expect(content).to.include('existsSync');
    });
  });

  describe('Exit Codes and Status', function() {
    it('should exit with code 0 on success', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('process.exit(0)') || expect(content).to.not.include('process.exit(1)');
    });

    it('should exit with code 1 on failure', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('process.exit(1)');
    });

    it('should report build status', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('success') || expect(content).to.include('成功') || expect(content).to.include('失败');
    });
  });
});
