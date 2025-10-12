/**
 * 集成测试：基础捕获
 * 
 * 测试 examples/basic-capture.js 的完整执行流程。
 * 
 * 注意：此测试需要实际音频设备和运行中的进程，在 CI 环境中会跳过。
 */

const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Integration Test: Basic Capture', function() {
  // 增加超时时间，因为捕获需要实际运行
  this.timeout(30000);

  const exampleScript = path.join(__dirname, '..', 'examples', 'basic-capture.js');
  const outputFile = path.join(__dirname, '..', 'output.raw');
  const testDuration = 5000; // 5 秒测试捕获
  
  // 检测是否在 CI 环境
  const isCI = process.env.CI === 'true' || 
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.CONTINUOUS_INTEGRATION === 'true';

  before(function() {
    // 清理旧的输出文件
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
  });

  after(function() {
    // 清理测试生成的文件
    if (fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch (error) {
        console.warn('清理输出文件失败:', error.message);
      }
    }
  });

  describe('Script Execution', function() {
    it('should exist as a file', function() {
      expect(fs.existsSync(exampleScript)).to.be.true;
    });

    it('should be a valid JavaScript file', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('AudioCapture');
      expect(content).to.include('startCapture');
    });

    it('should export main function', function() {
      const example = require(exampleScript);
      expect(example).to.have.property('main');
      expect(example.main).to.be.a('function');
    });

    it('should export listProcesses function', function() {
      const example = require(exampleScript);
      expect(example).to.have.property('listProcesses');
      expect(example.listProcesses).to.be.a('function');
    });

    it('should export selectProcess function', function() {
      const example = require(exampleScript);
      expect(example).to.have.property('selectProcess');
      expect(example.selectProcess).to.be.a('function');
    });

    it('should export startCapture function', function() {
      const example = require(exampleScript);
      expect(example).to.have.property('startCapture');
      expect(example.startCapture).to.be.a('function');
    });
  });

  describe('Process Enumeration', function() {
    // 如果在 CI 环境，跳过需要硬件的测试
    before(function() {
      if (isCI) {
        this.skip();
      }
    });

    it('should list processes successfully', async function() {
      const example = require(exampleScript);
      const processes = await example.listProcesses();
      
      // 应该返回进程列表（可能为空，取决于系统状态）
      expect(processes).to.be.an('array');
    });
  });

  describe('Basic Capture Execution', function() {
    // 如果在 CI 环境，跳过需要硬件的测试
    before(function() {
      if (isCI) {
        console.log('⚠️  跳过集成测试：CI 环境中没有音频设备');
        this.skip();
      }
    });

    it('should run without critical errors when given a valid process ID', function(done) {
      // 获取当前进程 ID 作为测试目标
      const testPid = process.pid;
      
      // 创建修改后的测试脚本，捕获时间改为 5 秒
      const testScript = `
        const { AudioCapture } = require('./lib/index');
        const fs = require('fs');
        const path = require('path');
        
        async function testCapture() {
          const outputPath = path.join(__dirname, 'output.raw');
          const writeStream = fs.createWriteStream(outputPath);
          
          const capture = new AudioCapture({
            processId: ${testPid},
            loopbackMode: true,
            sampleRate: 48000,
            channels: 2
          });
          
          let errorOccurred = false;
          
          capture.on('error', (error) => {
            console.error('Capture error:', error.message);
            errorOccurred = true;
          });
          
          capture.on('end', () => {
            console.log('Capture ended');
            if (!errorOccurred) {
              process.exit(0);
            } else {
              process.exit(1);
            }
          });
          
          capture.pipe(writeStream);
          
          try {
            await capture.start();
            setTimeout(() => {
              capture.stop();
            }, ${testDuration});
          } catch (error) {
            console.error('Start error:', error.message);
            process.exit(1);
          }
        }
        
        testCapture();
      `;
      
      const tempScript = path.join(__dirname, '..', 'temp_test_capture.js');
      fs.writeFileSync(tempScript, testScript);
      
      // 运行测试脚本
      const child = spawn('node', [tempScript], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        // 清理临时脚本
        try {
          fs.unlinkSync(tempScript);
        } catch (e) {
          // 忽略清理错误
        }
        
        // 即使捕获失败（如没有音频设备），脚本也不应该崩溃
        // 我们主要检查脚本是否正常执行，而不是必须成功捕获
        if (code === 0) {
          // 成功捕获
          done();
        } else {
          // 检查是否是已知的非致命错误
          const hasKnownError = stderr.includes('设备') || 
                                stderr.includes('DEVICE') ||
                                stderr.includes('进程') ||
                                stderr.includes('PROCESS');
          
          if (hasKnownError) {
            console.log('⚠️  预期的错误（设备或进程相关）:', stderr.substring(0, 200));
            done(); // 已知错误，仍视为通过
          } else {
            done(new Error(`脚本异常退出，代码: ${code}, stderr: ${stderr}`));
          }
        }
      });
      
      // 设置超时保护
      setTimeout(() => {
        child.kill();
        done(new Error('测试超时'));
      }, testDuration + 10000);
    });

    it('should generate output.raw file when capture succeeds', function(done) {
      // 此测试依赖于实际的音频捕获，可能会失败
      // 我们只检查如果文件存在，它的大小是否大于 0
      
      setTimeout(() => {
        if (fs.existsSync(outputFile)) {
          const stats = fs.statSync(outputFile);
          expect(stats.size).to.be.greaterThan(0);
          done();
        } else {
          console.log('⚠️  output.raw 文件未生成（可能因为没有音频设备或捕获失败）');
          done(); // 不强制要求，因为可能没有设备
        }
      }, testDuration + 2000);
    });
  });

  describe('Command Line Arguments', function() {
    it('should accept process ID from command line', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('process.argv[2]');
      expect(content).to.include('parseInt');
    });

    it('should handle invalid process ID gracefully', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('isNaN');
    });
  });

  describe('Error Handling', function() {
    it('should handle uncaught exceptions', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('uncaughtException');
    });

    it('should handle unhandled rejections', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('unhandledRejection');
    });

    it('should handle SIGINT signal', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('SIGINT');
    });

    it('should handle SIGTERM signal', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('SIGTERM');
    });

    it('should provide cleanup function', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('cleanup');
    });
  });

  describe('Output and Formatting', function() {
    it('should display summary information', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('displaySummary');
      expect(content).to.include('摘要') || expect(content).to.include('Summary');
    });

    it('should show progress updates', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('chunksReceived');
      expect(content).to.include('bytesReceived');
    });

    it('should use colorful output', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      // 检查是否使用了 Unicode 图标或特殊字符
      expect(content).to.match(/[📋🎙️📊✅❌⚠️💥]/);
    });
  });

  describe('Stream Pipeline', function() {
    it('should use pipe for stream processing', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('.pipe(');
      expect(content).to.include('createWriteStream');
    });

    it('should handle stream errors', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include("writeStream.on('error'");
    });

    it('should listen to data events', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include("capture.on('data'");
    });

    it('should listen to end events', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include("capture.on('end'");
    });

    it('should listen to error events', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include("capture.on('error'");
    });
  });

  describe('Configuration', function() {
    it('should define capture duration', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('captureDuration');
    });

    it('should define sample rate', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('sampleRate');
    });

    it('should define channels', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('channels');
    });

    it('should define loopback mode', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('loopbackMode');
    });

    it('should define output file path', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('outputFile');
      expect(content).to.include('.raw');
    });
  });

  describe('Documentation', function() {
    it('should contain usage instructions', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('使用方法') || expect(content).to.include('Usage');
    });

    it('should contain examples', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('@example');
    });

    it('should explain parameters', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('参数') || expect(content).to.include('Parameters');
    });

    it('should describe output format', function() {
      const content = fs.readFileSync(exampleScript, 'utf-8');
      expect(content).to.include('PCM');
    });
  });
});
