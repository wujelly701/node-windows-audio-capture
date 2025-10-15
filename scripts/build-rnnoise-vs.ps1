# Build RNNoise using Visual Studio directly (no CMake required)
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Building RNNoise with Visual Studio" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Find Visual Studio
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vsWhere) {
    $vsPath = & $vsWhere -latest -property installationPath
    Write-Host "[OK] Visual Studio: $vsPath" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Visual Studio not found!" -ForegroundColor Red
    Write-Host "Alternative: Install CMake and use build-rnnoise-simple.ps1" -ForegroundColor Yellow
    exit 1
}

# Import VS environment
$vcvarsPath = "$vsPath\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvarsPath)) {
    Write-Host "[ERROR] vcvars64.bat not found!" -ForegroundColor Red
    exit 1
}

# Paths
$rnnoiseDir = "deps\rnnoise"
$srcDir = "$rnnoiseDir\src"
$incDir = "$rnnoiseDir\include"
$outDir = "$rnnoiseDir\build\Release"
$installDir = "$rnnoiseDir\install"

# Create directories
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
New-Item -ItemType Directory -Path "$installDir\lib" -Force | Out-Null
New-Item -ItemType Directory -Path "$installDir\include" -Force | Out-Null

# Source files
$sources = @(
    "rnn.c",
    "rnn_data.c",
    "rnn_reader.c",
    "denoise.c",
    "celt_lpc.c",
    "pitch.c",
    "kiss_fft.c",
    "parse_lpcnet_weights.c"
)

# Check if sources exist
$missing = @()
foreach ($src in $sources) {
    if (-not (Test-Path "$srcDir\$src")) {
        $missing += $src
    }
}

if ($missing.Count -gt 0) {
    Write-Host "[ERROR] Missing source files:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Note: RNNoise may need model files downloaded." -ForegroundColor Yellow
    Write-Host "Try running: cd deps\rnnoise && bash download_model.sh" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] All source files found" -ForegroundColor Green

# Compile each source file
Write-Host "`nCompiling source files..." -ForegroundColor Yellow

$objFiles = @()
foreach ($src in $sources) {
    $srcPath = "$srcDir\$src"
    $objName = [IO.Path]::GetFileNameWithoutExtension($src)
    $objPath = "$outDir\$objName.obj"
    $objFiles += $objPath
    
    Write-Host "  Compiling $src..." -ForegroundColor Gray
    
    # Call cl.exe with vcvars environment
    $compileCmd = @"
call "$vcvarsPath" > nul 2>&1 && cl.exe /c /O2 /W3 /MD /I"$incDir" /I"$srcDir" /Fo"$objPath" "$srcPath"
"@
    
    cmd /c $compileCmd 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to compile $src" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] All files compiled" -ForegroundColor Green

# Create static library
Write-Host "`nCreating static library..." -ForegroundColor Yellow

$libPath = "$installDir\lib\rnnoise.lib"
$libCmd = @"
call "$vcvarsPath" > nul 2>&1 && lib.exe /OUT:"$libPath" $($objFiles -join ' ')
"@

cmd /c $libCmd 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create library" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $libPath)) {
    Write-Host "[ERROR] Library not created!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Library created: $libPath" -ForegroundColor Green

# Copy header file
Copy-Item "$incDir\rnnoise.h" "$installDir\include\" -Force
Write-Host "[OK] Header copied" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Output files:" -ForegroundColor Yellow
Write-Host "  Library: $libPath" -ForegroundColor Gray
Write-Host "  Header:  $installDir\include\rnnoise.h" -ForegroundColor Gray
Write-Host ""
