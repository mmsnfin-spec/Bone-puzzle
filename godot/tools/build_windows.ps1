# Example: .\tools\build_windows.ps1 -GodotBin 'C:\Godot\Godot_v4.7.2-stable_win64.exe'
# Install the official 4.7.2 Windows export templates from Godot's Export Template Manager first.
param([string]$GodotBin = 'godot')
$ErrorActionPreference = 'Stop'
$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$EngineVersion = (& $GodotBin --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $EngineVersion.StartsWith('4.7.2.stable.')) {
    throw "Godot 4.7.2 Stable required; received $EngineVersion"
}
function Invoke-GodotChecked([string[]]$GodotArguments) {
    & $GodotBin @GodotArguments
    if ($LASTEXITCODE -ne 0) { throw "Godot command failed with exit code $LASTEXITCODE" }
}
$ReleaseDir = Join-Path $ProjectDir 'build/windows'
$DebugDir = Join-Path $ProjectDir 'build/windows-debug'
New-Item -ItemType Directory -Force $ReleaseDir, $DebugDir | Out-Null
Invoke-GodotChecked -GodotArguments @('--headless', '--path', $ProjectDir, '--editor', '--import', '--quit')
Invoke-GodotChecked -GodotArguments @('--headless', '--path', $ProjectDir, '--script', 'res://tests/run_tests.gd')
Invoke-GodotChecked -GodotArguments @('--headless', '--path', $ProjectDir, '--script', 'res://tools/validate_import.gd')
Invoke-GodotChecked -GodotArguments @('--headless', '--path', $ProjectDir, '--export-release', 'Windows Release', (Join-Path $ReleaseDir 'Bone-Puzzle-0.2.0-Windows-x64.exe'))
Invoke-GodotChecked -GodotArguments @('--headless', '--path', $ProjectDir, '--export-debug', 'Windows Debug', (Join-Path $DebugDir 'Bone-Puzzle-0.2.0-Windows-x64-Debug.exe'))
python (Join-Path $PSScriptRoot 'package_build.py')
if ($LASTEXITCODE -ne 0) { throw "Packaging failed with exit code $LASTEXITCODE" }
