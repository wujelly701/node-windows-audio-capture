#!/usr/bin/env node

/**
 * Check if this module is being installed in an Electron project
 * and rebuild native addon if necessary
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if we're in an Electron environment
function isElectronProject() {
  try {
    // Check if electron is installed in parent project
    const parentDir = path.resolve(__dirname, '../..');
    const packageJsonPath = path.join(parentDir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const hasElectron = 
        (packageJson.dependencies && packageJson.dependencies.electron) ||
        (packageJson.devDependencies && packageJson.devDependencies.electron);
      
      if (hasElectron) {
        console.log('\n🔍 Detected Electron project');
        return true;
      }
    }
  } catch (error) {
    // Silently fail - not critical
  }
  return false;
}

// Check if electron-rebuild is available
function hasElectronRebuild() {
  try {
    require.resolve('@electron/rebuild');
    return true;
  } catch (error) {
    return false;
  }
}

// Main logic
if (isElectronProject()) {
  console.log('📦 node-windows-audio-capture: Electron environment detected');
  
  if (hasElectronRebuild()) {
    console.log('🔧 Rebuilding native addon for Electron...');
    try {
      execSync('npx electron-rebuild -f -m .', { 
        stdio: 'inherit',
        cwd: __dirname + '/..'
      });
      console.log('✅ Native addon rebuilt for Electron successfully');
    } catch (error) {
      console.error('❌ Failed to rebuild for Electron');
      console.error('Please run manually: npx electron-rebuild -f -m node_modules/node-windows-audio-capture');
    }
  } else {
    console.log('\n⚠️  WARNING: @electron/rebuild not found!');
    console.log('To use this module in Electron, please install @electron/rebuild:');
    console.log('  npm install --save-dev @electron/rebuild');
    console.log('Then rebuild the module:');
    console.log('  npx electron-rebuild -f -m node_modules/node-windows-audio-capture');
    console.log('');
  }
} else {
  // Not an Electron project - no rebuild needed
  console.log('✅ node-windows-audio-capture installed successfully');
}
