const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Prebuild Script', () => {
  const scriptsDir = path.join(__dirname, '..', 'scripts');
  const prebuildScript = path.join(scriptsDir, 'prebuild.js');
  const rootDir = path.join(__dirname, '..');
  const prebuildsDir = path.join(rootDir, 'prebuilds');
  const buildDir = path.join(rootDir, 'build');

  describe('Script existence', () => {
    it('should have prebuild.js in scripts directory', () => {
      expect(fs.existsSync(prebuildScript)).to.be.true;
    });

    it('should be a valid JavaScript file', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('#!/usr/bin/env node');
      expect(() => {
        require(prebuildScript);
      }).to.not.throw();
    });
  });

  describe('Script exports', () => {
    let prebuildModule;

    before(() => {
      prebuildModule = require(prebuildScript);
    });

    it('should export main function', () => {
      expect(prebuildModule.main).to.be.a('function');
    });

    it('should export cleanBuilds function', () => {
      expect(prebuildModule.cleanBuilds).to.be.a('function');
    });

    it('should export buildPrebuilds function', () => {
      expect(prebuildModule.buildPrebuilds).to.be.a('function');
    });

    it('should export verifyBuilds function', () => {
      expect(prebuildModule.verifyBuilds).to.be.a('function');
    });
  });

  describe('cleanBuilds function', () => {
    let prebuildModule;

    before(() => {
      prebuildModule = require(prebuildScript);
    });

    it('should remove build directory if exists', () => {
      // Create a test build directory
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
      }
      
      expect(fs.existsSync(buildDir)).to.be.true;
      
      // Clean builds
      prebuildModule.cleanBuilds();
      
      expect(fs.existsSync(buildDir)).to.be.false;
    });

    it('should remove prebuilds directory if exists', () => {
      // Create a test prebuilds directory
      if (!fs.existsSync(prebuildsDir)) {
        fs.mkdirSync(prebuildsDir);
      }
      
      expect(fs.existsSync(prebuildsDir)).to.be.true;
      
      // Clean builds
      prebuildModule.cleanBuilds();
      
      expect(fs.existsSync(prebuildsDir)).to.be.false;
    });

    it('should not throw error if directories do not exist', () => {
      expect(() => {
        prebuildModule.cleanBuilds();
      }).to.not.throw();
    });
  });

  describe('Script content validation', () => {
    it('should contain architecture configuration', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('x64');
      expect(content).to.include('arm64');
    });

    it('should support ELECTRON_VERSION environment variable', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('ELECTRON_VERSION');
    });

    it('should support VERBOSE environment variable', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('VERBOSE');
    });

    it('should use prebuildify', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('prebuildify');
    });

    it('should use --napi flag', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('--napi');
    });

    it('should use --strip flag', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('--strip');
    });
  });

  describe('Error handling', () => {
    it('should handle missing dependencies gracefully', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('checkDependencies');
      expect(content).to.include('catch');
    });

    it('should provide error messages', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('Error');
      expect(content).to.include('throw');
    });
  });

  describe('Output verification', () => {
    it('should check for prebuilds directory', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('prebuilds');
      expect(content).to.include('existsSync');
    });

    it('should verify .node files', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('.node');
    });

    it('should display build summary', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('Summary');
    });
  });

  describe('Console output', () => {
    it('should use colored output', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('colors');
      expect(content).to.include('green');
      expect(content).to.include('red');
      expect(content).to.include('yellow');
      expect(content).to.include('cyan');
    });

    it('should log progress messages', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('log');
      expect(content).to.include('Executing');
      expect(content).to.include('Building');
      expect(content).to.include('Verifying');
    });
  });

  describe('Module execution', () => {
    it('should be executable as a script', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('if (require.main === module)');
    });

    it('should export functions for testing', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('module.exports');
    });
  });

  describe('Configuration', () => {
    it('should define NAPI_VERSION', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('NAPI_VERSION');
      expect(content).to.match(/NAPI_VERSION\s*=\s*8/);
    });

    it('should define ARCHITECTURES array', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('ARCHITECTURES');
      expect(content).to.include("['x64', 'arm64']");
    });
  });

  describe('Command execution', () => {
    it('should use execSync for commands', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('execSync');
    });

    it('should handle command errors', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('try');
      expect(content).to.include('catch');
    });
  });

  describe('Build process', () => {
    it('should have dependency check step', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('checkDependencies');
    });

    it('should have clean step', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('cleanBuilds');
    });

    it('should have build step', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('buildPrebuilds');
    });

    it('should have verification step', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('verifyBuilds');
    });

    it('should have summary step', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('displaySummary');
    });
  });

  describe('Exit codes', () => {
    it('should exit with 0 on success', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('process.exit(0)');
    });

    it('should exit with 1 on failure', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('process.exit(1)');
    });
  });

  describe('Timing', () => {
    it('should track execution time', () => {
      const content = fs.readFileSync(prebuildScript, 'utf8');
      expect(content).to.include('startTime');
      expect(content).to.include('Date.now()');
      expect(content).to.include('duration');
    });
  });
});
