# Build RNNoise for Windows - Simplified Version
$ErrorActionPreference = "Stop"

Write-Host "Building RNNoise for Windows..." -ForegroundColor Cyan

# Paths
$rnnoiseDir = "deps\rnnoise"
$buildDir = "$rnnoiseDir\build"
$installDir = "$rnnoiseDir\install"

# Check CMake
try {
    cmake --version | Out-Null
    Write-Host "[OK] CMake found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] CMake not found!" -ForegroundColor Red
    exit 1
}

# Check CMakeLists.txt
if (-not (Test-Path "$rnnoiseDir\CMakeLists.txt")) {
    Write-Host "[ERROR] CMakeLists.txt not found!" -ForegroundColor Red
    exit 1
}

# Create directories
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
New-Item -ItemType Directory -Path $installDir -Force | Out-Null

# Configure
Write-Host "Configuring..." -ForegroundColor Yellow
Push-Location $buildDir
cmake .. -G "Visual Studio 17 2022" -A x64 -DCMAKE_INSTALL_PREFIX="..\install"
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

# Build
Write-Host "Building..." -ForegroundColor Yellow
Push-Location $buildDir
cmake --build . --config Release --parallel
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

# Install
Write-Host "Installing..." -ForegroundColor Yellow
Push-Location $buildDir
cmake --install . --config Release
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

# Verify
$libFile = "$installDir\lib\rnnoise.lib"
if (Test-Path $libFile) {
    Write-Host "[OK] Build complete: $libFile" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Library not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`nDone!" -ForegroundColor Green
