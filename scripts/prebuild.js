#!/usr/bin/env node

/**
 * Prebuild script for node-windows-audio-capture
 * Generates prebuilt binaries for multiple platforms and architectures
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ARCHITECTURES = ['x64', 'arm64'];
const NAPI_VERSION = 8;

// Environment variables
const ELECTRON_VERSION = process.env.ELECTRON_VERSION || '';
const VERBOSE = process.env.VERBOSE === 'true';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Log with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Execute command with error handling
 */
function exec(command, options = {}) {
  log(`\n${colors.cyan}Executing: ${command}${colors.reset}`);
  
  try {
    const output = execSync(command, {
      stdio: VERBOSE ? 'inherit' : 'pipe',
      encoding: 'utf8',
      ...options
    });
    
    if (!VERBOSE && output) {
      console.log(output);
    }
    
    return output;
  } catch (error) {
    log(`${colors.red}Error executing command: ${command}${colors.reset}`, colors.red);
    log(error.message, colors.red);
    if (error.stdout) log(error.stdout, colors.red);
    if (error.stderr) log(error.stderr, colors.red);
    throw error;
  }
}

/**
 * Check if prebuildify is installed
 */
function checkDependencies() {
  log('\n📦 Checking dependencies...', colors.bright);
  
  try {
    exec('npx prebuildify --version');
    log('✅ prebuildify is available', colors.green);
  } catch (error) {
    log('❌ prebuildify is not installed', colors.red);
    log('Installing prebuildify...', colors.yellow);
    exec('npm install --save-dev prebuildify');
  }
}

/**
 * Clean previous builds
 */
function cleanBuilds() {
  log('\n🧹 Cleaning previous builds...', colors.bright);
  
  const dirs = ['build', 'prebuilds'];
  
  dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      log(`Removing ${dir}/`, colors.yellow);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  
  log('✅ Clean completed', colors.green);
}

/**
 * Build prebuilds for specified architectures
 */
function buildPrebuilds() {
  log('\n🔨 Building prebuilds...', colors.bright);
  
  const archFlags = ARCHITECTURES.map(arch => `--arch ${arch}`).join(' ');
  
  let command = `npx prebuildify --napi --strip ${archFlags}`;
  
  // Add Electron support if version specified
  if (ELECTRON_VERSION) {
    command += ` --electron-compat --target ${ELECTRON_VERSION}`;
    log(`Building for Electron ${ELECTRON_VERSION}`, colors.cyan);
  }
  
  log(`Architectures: ${ARCHITECTURES.join(', ')}`, colors.cyan);
  log(`N-API version: ${NAPI_VERSION}`, colors.cyan);
  
  try {
    exec(command);
    log('✅ Prebuild completed successfully', colors.green);
  } catch (error) {
    log('❌ Prebuild failed', colors.red);
    throw error;
  }
}

/**
 * Verify build outputs
 */
function verifyBuilds() {
  log('\n🔍 Verifying build outputs...', colors.bright);
  
  const prebuildsDir = path.join(__dirname, '..', 'prebuilds');
  
  if (!fs.existsSync(prebuildsDir)) {
    log('❌ prebuilds directory not found', colors.red);
    throw new Error('Prebuilds directory does not exist');
  }
  
  // Check for platform-specific directories
  const platforms = fs.readdirSync(prebuildsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  if (platforms.length === 0) {
    log('❌ No platform directories found', colors.red);
    throw new Error('No prebuilds generated');
  }
  
  log(`Found platforms: ${platforms.join(', ')}`, colors.cyan);
  
  // Check for .node files
  let nodeFileCount = 0;
  
  platforms.forEach(platform => {
    const platformDir = path.join(prebuildsDir, platform);
    const files = fs.readdirSync(platformDir);
    const nodeFiles = files.filter(file => file.endsWith('.node'));
    
    nodeFileCount += nodeFiles.length;
    
    if (nodeFiles.length > 0) {
      log(`  ${platform}: ${nodeFiles.join(', ')}`, colors.green);
    } else {
      log(`  ${platform}: No .node files found`, colors.yellow);
    }
  });
  
  if (nodeFileCount === 0) {
    log('❌ No .node files generated', colors.red);
    throw new Error('No .node files found in prebuilds');
  }
  
  log(`\n✅ Found ${nodeFileCount} prebuild(s)`, colors.green);
}

/**
 * Display build summary
 */
function displaySummary() {
  log('\n' + '='.repeat(60), colors.bright);
  log('📊 Build Summary', colors.bright);
  log('='.repeat(60), colors.bright);
  
  const prebuildsDir = path.join(__dirname, '..', 'prebuilds');
  
  if (fs.existsSync(prebuildsDir)) {
    const platforms = fs.readdirSync(prebuildsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    
    platforms.forEach(platform => {
      const platformDir = path.join(prebuildsDir, platform.name);
      const files = fs.readdirSync(platformDir);
      const nodeFiles = files.filter(file => file.endsWith('.node'));
      
      log(`\n📦 ${platform.name}`, colors.cyan);
      nodeFiles.forEach(file => {
        const filePath = path.join(platformDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        log(`  ✓ ${file} (${sizeMB} MB)`, colors.green);
      });
    });
  }
  
  log('\n' + '='.repeat(60), colors.bright);
  log('✅ Prebuild completed successfully!', colors.green);
  log('='.repeat(60) + '\n', colors.bright);
}

/**
 * Main execution
 */
function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('🚀 Node Windows Audio Capture - Prebuild Script', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);
  
  const startTime = Date.now();
  
  try {
    checkDependencies();
    cleanBuilds();
    buildPrebuilds();
    verifyBuilds();
    displaySummary();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`⏱️  Total time: ${duration}s\n`, colors.cyan);
    
    process.exit(0);
  } catch (error) {
    log('\n❌ Prebuild failed with errors', colors.red);
    log(error.message, colors.red);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`⏱️  Failed after: ${duration}s\n`, colors.cyan);
    
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main, cleanBuilds, buildPrebuilds, verifyBuilds };
