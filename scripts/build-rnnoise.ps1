# Build RNNoise for Windows
# This script compiles RNNoise as a static library for use with node-windows-audio-capture

param(
    [string]$Configuration = "Release",
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Building RNNoise for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check CMake
try {
    $cmakeVersion = cmake --version 2>&1 | Select-Object -First 1
    Write-Host "✓ CMake: $cmakeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ CMake not found! Please install CMake." -ForegroundColor Red
    exit 1
}

# Check Visual Studio
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vsWhere) {
    $vsPath = & $vsWhere -latest -property installationPath
    Write-Host "✓ Visual Studio found at: $vsPath" -ForegroundColor Green
} else {
    Write-Host "✗ Visual Studio not found! Please install Visual Studio 2017 or later." -ForegroundColor Red
    exit 1
}

# Paths
$rootDir = Split-Path -Parent $PSScriptRoot
$rnnoiseDir = Join-Path $rootDir "deps\rnnoise"
$buildDir = Join-Path $rnnoiseDir "build"
$installDir = Join-Path $rnnoiseDir "install"

Write-Host ""
Write-Host "Directories:" -ForegroundColor Yellow
Write-Host "  RNNoise: $rnnoiseDir" -ForegroundColor Gray
Write-Host "  Build:   $buildDir" -ForegroundColor Gray
Write-Host "  Install: $installDir" -ForegroundColor Gray

# Check if RNNoise directory exists
if (-not (Test-Path $rnnoiseDir)) {
    Write-Host ""
    Write-Host "✗ RNNoise directory not found!" -ForegroundColor Red
    Write-Host "  Please run: git clone https://gitlab.xiph.org/xiph/rnnoise.git deps/rnnoise" -ForegroundColor Yellow
    exit 1
}

# Check if CMakeLists.txt exists
$cmakeFile = Join-Path $rnnoiseDir "CMakeLists.txt"
if (-not (Test-Path $cmakeFile)) {
    Write-Host ""
    Write-Host "✗ CMakeLists.txt not found in RNNoise directory!" -ForegroundColor Red
    Write-Host "  The CMakeLists.txt should have been created automatically." -ForegroundColor Yellow
    exit 1
}

# Download model if not exists
$modelFile = Join-Path $rnnoiseDir "src\rnn_data.c"
if (-not (Test-Path $modelFile)) {
    Write-Host ""
    Write-Host "Downloading RNNoise model data..." -ForegroundColor Yellow
    Push-Location $rnnoiseDir
    try {
        if (Test-Path "download_model.sh") {
            # Try to run download script (requires Git Bash or WSL)
            bash download_model.sh 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  Note: Model download script failed, but it might already be included." -ForegroundColor Yellow
            }
        }
    } finally {
        Pop-Location
    }
}

# Clean build directory if requested
if ($Clean -and (Test-Path $buildDir)) {
    Write-Host ""
    Write-Host "Cleaning build directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $buildDir
}

# Create build directory
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

# Create install directory
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

# Configure with CMake
Write-Host ""
Write-Host "Configuring with CMake..." -ForegroundColor Yellow
Push-Location $buildDir
try {
    cmake .. -G "Visual Studio 17 2022" -A x64 `
        -DCMAKE_INSTALL_PREFIX="$installDir" `
        -DCMAKE_BUILD_TYPE="$Configuration"
    
    if ($LASTEXITCODE -ne 0) {
        throw "CMake configuration failed!"
    }
    Write-Host "✓ CMake configuration successful" -ForegroundColor Green
} catch {
    Write-Host "✗ CMake configuration failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Build with CMake
Write-Host ""
Write-Host "Building RNNoise ($Configuration)..." -ForegroundColor Yellow
Push-Location $buildDir
try {
    cmake --build . --config $Configuration --parallel
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed!"
    }
    Write-Host "✓ Build successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Install
Write-Host ""
Write-Host "Installing RNNoise..." -ForegroundColor Yellow
Push-Location $buildDir
try {
    cmake --install . --config $Configuration
    
    if ($LASTEXITCODE -ne 0) {
        throw "Install failed!"
    }
    Write-Host "✓ Install successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Install failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Verify output files
Write-Host ""
Write-Host "Verifying output files..." -ForegroundColor Yellow

$libFile = Join-Path $installDir "lib\rnnoise.lib"
$headerFile = Join-Path $installDir "include\rnnoise.h"

if (Test-Path $libFile) {
    $libSize = (Get-Item $libFile).Length / 1KB
    Write-Host "✓ Library: $libFile ($([math]::Round($libSize, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "✗ Library not found: $libFile" -ForegroundColor Red
    exit 1
}

if (Test-Path $headerFile) {
    Write-Host "✓ Header:  $headerFile" -ForegroundColor Green
} else {
    Write-Host "✗ Header not found: $headerFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RNNoise Build Complete! ✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Output files:" -ForegroundColor Yellow
Write-Host "  Library: $libFile" -ForegroundColor Gray
Write-Host "  Header:  $headerFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update binding.gyp to link against rnnoise.lib" -ForegroundColor Gray
Write-Host "  2. Implement audio_effects.cpp with RNNoise integration" -ForegroundColor Gray
Write-Host "  3. Build the addon with npm run build" -ForegroundColor Gray
Write-Host ""
