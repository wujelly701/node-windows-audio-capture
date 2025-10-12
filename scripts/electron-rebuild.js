#!/usr/bin/env node

/**
 * Electron rebuild script for node-windows-audio-capture
 * Rebuilds native addon for specific Electron versions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

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
      stdio: 'inherit',
      encoding: 'utf8',
      ...options
    });
    
    return output;
  } catch (error) {
    log(`${colors.red}Error executing command: ${command}${colors.reset}`, colors.red);
    log(error.message, colors.red);
    throw error;
  }
}

/**
 * Check if @electron/rebuild is installed
 */
function checkElectronRebuild() {
  log('\n📦 Checking @electron/rebuild...', colors.bright);
  
  try {
    require.resolve('@electron/rebuild');
    log('✅ @electron/rebuild is available', colors.green);
    return true;
  } catch (error) {
    log('⚠️  @electron/rebuild is not installed', colors.yellow);
    return false;
  }
}

/**
 * Install @electron/rebuild
 */
function installElectronRebuild() {
  log('\n📦 Installing @electron/rebuild...', colors.bright);
  
  try {
    exec('npm install --save-dev @electron/rebuild');
    log('✅ @electron/rebuild installed successfully', colors.green);
  } catch (error) {
    log('❌ Failed to install @electron/rebuild', colors.red);
    throw error;
  }
}

/**
 * Get Electron version
 */
function getElectronVersion(electronPath) {
  if (electronPath) {
    try {
      const electronPackageJson = require(path.join(electronPath, 'package.json'));
      return electronPackageJson.version;
    } catch (error) {
      log(`⚠️  Could not read Electron version from ${electronPath}`, colors.yellow);
    }
  }
  
  // Try to get from local electron installation
  try {
    const electronPackageJson = require('electron/package.json');
    return electronPackageJson.version;
  } catch (error) {
    return null;
  }
}

/**
 * Rebuild for Electron
 */
function rebuildForElectron(options) {
  log('\n🔨 Rebuilding for Electron...', colors.bright);
  
  const {
    electronVersion,
    electronPath,
    force,
    verbose,
    arch
  } = options;
  
  // Determine Electron version
  let targetVersion = electronVersion;
  if (!targetVersion) {
    targetVersion = getElectronVersion(electronPath);
  }
  
  if (!targetVersion) {
    log('⚠️  No Electron version specified, using installed Electron version', colors.yellow);
  } else {
    log(`Target Electron version: ${targetVersion}`, colors.cyan);
  }
  
  // Build command
  let command = 'npx @electron/rebuild';
  
  if (force) {
    command += ' -f';
  }
  
  if (targetVersion) {
    command += ` -v ${targetVersion}`;
  }
  
  if (arch) {
    command += ` --arch ${arch}`;
  }
  
  // Add module names to rebuild
  command += ' -m node_windows_audio_capture';
  
  if (verbose) {
    command += ' --force-abi';
    log('Verbose mode enabled', colors.cyan);
  }
  
  try {
    exec(command);
    log('\n✅ Rebuild completed successfully', colors.green);
    return true;
  } catch (error) {
    log('\n❌ Rebuild failed', colors.red);
    throw error;
  }
}

/**
 * Verify rebuild output
 */
function verifyRebuild() {
  log('\n🔍 Verifying rebuild output...', colors.bright);
  
  const buildDir = path.join(__dirname, '..', 'build', 'Release');
  
  if (!fs.existsSync(buildDir)) {
    log('❌ Build directory not found', colors.red);
    return false;
  }
  
  const files = fs.readdirSync(buildDir);
  const nodeFiles = files.filter(file => file.endsWith('.node'));
  
  if (nodeFiles.length === 0) {
    log('❌ No .node files found', colors.red);
    return false;
  }
  
  log(`✅ Found ${nodeFiles.length} .node file(s):`, colors.green);
  nodeFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    log(`  - ${file} (${sizeMB} MB)`, colors.green);
  });
  
  return true;
}

/**
 * Display summary
 */
function displaySummary(options) {
  log('\n' + '='.repeat(60), colors.bright);
  log('📊 Electron Rebuild Summary', colors.bright);
  log('='.repeat(60), colors.bright);
  
  if (options.electronVersion) {
    log(`Electron Version: ${options.electronVersion}`, colors.cyan);
  }
  
  if (options.arch) {
    log(`Architecture: ${options.arch}`, colors.cyan);
  }
  
  log(`Force Rebuild: ${options.force ? 'Yes' : 'No'}`, colors.cyan);
  
  const buildDir = path.join(__dirname, '..', 'build', 'Release');
  if (fs.existsSync(buildDir)) {
    log(`\nBuild Output: ${buildDir}`, colors.cyan);
  }
  
  log('\n' + '='.repeat(60) + '\n', colors.bright);
}

/**
 * Main execution
 */
function main() {
  // Parse command line arguments
  program
    .name('electron-rebuild')
    .description('Rebuild native addon for Electron')
    .version('1.0.0')
    .option('-v, --electron-version <version>', 'Target Electron version')
    .option('-e, --electron-path <path>', 'Path to Electron installation')
    .option('-f, --force', 'Force rebuild', false)
    .option('-a, --arch <arch>', 'Target architecture (x64, arm64, ia32)')
    .option('--verbose', 'Verbose output', false)
    .parse(process.argv);
  
  const options = program.opts();
  
  log('\n' + '='.repeat(60), colors.bright);
  log('🔧 Node Windows Audio Capture - Electron Rebuild', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);
  
  const startTime = Date.now();
  
  try {
    // Check and install @electron/rebuild if needed
    if (!checkElectronRebuild()) {
      installElectronRebuild();
    }
    
    // Rebuild for Electron
    rebuildForElectron(options);
    
    // Verify output
    verifyRebuild();
    
    // Display summary
    displaySummary(options);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`⏱️  Total time: ${duration}s\n`, colors.cyan);
    
    log('✅ Electron rebuild completed successfully!\n', colors.green);
    
    process.exit(0);
  } catch (error) {
    log('\n❌ Electron rebuild failed with errors', colors.red);
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

module.exports = {
  rebuildForElectron,
  verifyRebuild,
  checkElectronRebuild,
  installElectronRebuild
};
