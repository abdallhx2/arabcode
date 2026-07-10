<#
.SYNOPSIS
    arabcode Installer for Windows (PowerShell).

.DESCRIPTION
    Downloads the arabcode release archive for Windows from GitHub, extracts the
    executable into a per-user bin directory, and (optionally) adds that directory
    to the current user's PATH.

    Designed to be run either directly:

        .\install.ps1 -Version 1.0.180

    or piped from the network (the common one-liner):

        irm https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1 | iex

    Because the piped form cannot pass parameters, every option also honors an
    environment variable fallback:

        $env:ARABCODE_VERSION        # specific version to install (e.g. 1.0.180)
        $env:ARABCODE_BIN_DIR        # install directory (default: %LOCALAPPDATA%\arabcode\bin)
        $env:ARABCODE_NO_MODIFY_PATH # set to any non-empty/"true"/"1" to skip PATH edits
#>

[CmdletBinding()]
param(
    [string]$Version,
    [string]$BinDir,
    [switch]$NoModifyPath,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Enable TLS 1.2 for older PowerShell / .NET (Windows PowerShell 5.1 defaults may be too old).
try {
    [Net.ServicePointManager]::SecurityProtocol = `
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch {
    # Best effort; newer PowerShell negotiates TLS automatically.
}

# --- Colored output helpers ---------------------------------------------------
function Write-Info    { param([string]$Message) Write-Host $Message -ForegroundColor White }
function Write-Muted   { param([string]$Message) Write-Host $Message -ForegroundColor DarkGray }
function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor Green }
function Write-Warn    { param([string]$Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Err     { param([string]$Message) Write-Host $Message -ForegroundColor Red }

function Show-Usage {
    @"
arabcode Installer (Windows / PowerShell)

Usage:
    .\install.ps1 [options]

Options:
    -Help                 Display this help message
    -Version <version>    Install a specific version (e.g., 1.0.180)
    -BinDir <path>        Install directory (default: %LOCALAPPDATA%\arabcode\bin)
    -NoModifyPath         Don't modify the user PATH environment variable

Environment variable fallbacks (useful for the piped one-liner):
    ARABCODE_VERSION         Same as -Version
    ARABCODE_BIN_DIR         Same as -BinDir
    ARABCODE_NO_MODIFY_PATH  Same as -NoModifyPath (set to 1/true)

Examples:
    irm https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1 | iex
    .\install.ps1 -Version 1.0.180
    .\install.ps1 -BinDir C:\tools\arabcode -NoModifyPath
"@ | Write-Host
}

if ($Help) {
    Show-Usage
    return
}

# --- Resolve options (params take precedence, then env vars, then defaults) ---
if (-not $Version -and $env:ARABCODE_VERSION) {
    $Version = $env:ARABCODE_VERSION
}

if (-not $BinDir -and $env:ARABCODE_BIN_DIR) {
    $BinDir = $env:ARABCODE_BIN_DIR
}
if (-not $BinDir) {
    $BinDir = Join-Path $env:LOCALAPPDATA 'arabcode\bin'
}

if (-not $NoModifyPath) {
    $envNoPath = $env:ARABCODE_NO_MODIFY_PATH
    if ($envNoPath -and $envNoPath -ne '0' -and $envNoPath.ToLower() -ne 'false') {
        $NoModifyPath = $true
    }
}

# --- Detect architecture ------------------------------------------------------
$procArch = $env:PROCESSOR_ARCHITECTURE
switch ($procArch) {
    'AMD64' { $arch = 'x64' }
    'ARM64' { $arch = 'arm64' }
    'x86' {
        Write-Err "Error: 32-bit x86 is not supported by arabcode. A 64-bit (x64 or arm64) Windows is required."
        exit 1
    }
    default {
        Write-Err "Error: Unsupported processor architecture: '$procArch'. arabcode supports x64 and arm64 on Windows."
        exit 1
    }
}

$asset = "arabcode-windows-$arch.zip"

# --- Resolve version and download URL -----------------------------------------
$owner = 'abdallhx2'

if ($Version) {
    # Strip a leading 'v' if the user supplied one.
    $Version = $Version -replace '^v', ''
    $specificVersion = $Version
    $downloadUrl = "https://github.com/$owner/arabcode/releases/download/v$Version/$asset"
} else {
    Write-Muted "Resolving latest arabcode release..."
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/arabcode/releases/latest" `
            -Headers @{ 'User-Agent' = 'arabcode-installer' }
    } catch {
        Write-Err "Failed to fetch version information from GitHub: $($_.Exception.Message)"
        exit 1
    }
    $tag = $release.tag_name
    if (-not $tag) {
        Write-Err "Failed to determine the latest arabcode version (no tag_name in API response)."
        exit 1
    }
    $specificVersion = $tag -replace '^v', ''
    # Use the latest/download alias so the URL stays valid even if the tag lookup races.
    $downloadUrl = "https://github.com/$owner/arabcode/releases/latest/download/$asset"
}

# --- Prepare directories ------------------------------------------------------
if (-not (Test-Path -LiteralPath $BinDir)) {
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
}

$tmpDir = Join-Path $env:TEMP ("arabcode_install_" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$zipPath = Join-Path $tmpDir $asset

# --- Download -----------------------------------------------------------------
Write-Info ""
Write-Muted "Installing arabcode version: $specificVersion"
Write-Muted "Downloading $asset ..."

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing `
        -Headers @{ 'User-Agent' = 'arabcode-installer' }
} catch {
    Write-Err "Error: Failed to download arabcode from:"
    Write-Err "  $downloadUrl"
    Write-Err "  $($_.Exception.Message)"
    Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

if (-not (Test-Path -LiteralPath $zipPath)) {
    Write-Err "Error: Download did not produce an archive at $zipPath"
    Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# --- Extract ------------------------------------------------------------------
Write-Muted "Extracting..."
try {
    Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force
} catch {
    Write-Err "Error: Failed to extract the archive: $($_.Exception.Message)"
    Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# The archive contains a single executable named arabcode.exe.
$exeSource = Join-Path $tmpDir 'arabcode.exe'
if (-not (Test-Path -LiteralPath $exeSource)) {
    # Fall back to searching in case the archive nests the binary.
    $found = Get-ChildItem -Path $tmpDir -Recurse -Filter 'arabcode.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $exeSource = $found.FullName
    } else {
        Write-Err "Error: 'arabcode.exe' was not found inside the downloaded archive."
        Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
        exit 1
    }
}

$exeTarget = Join-Path $BinDir 'arabcode.exe'
Move-Item -LiteralPath $exeSource -Destination $exeTarget -Force

# --- Cleanup ------------------------------------------------------------------
Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Success "Installed arabcode to $exeTarget"

# --- PATH management ----------------------------------------------------------
if (-not $NoModifyPath) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not $userPath) { $userPath = '' }

    $paths = $userPath -split ';' | Where-Object { $_ -ne '' }
    $already = $false
    foreach ($p in $paths) {
        if ($p.TrimEnd('\') -ieq $BinDir.TrimEnd('\')) {
            $already = $true
            break
        }
    }

    if ($already) {
        Write-Muted "$BinDir is already in your user PATH."
    } else {
        if ($userPath -and -not $userPath.EndsWith(';')) {
            $newPath = "$userPath;$BinDir"
        } else {
            $newPath = "$userPath$BinDir"
        }
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
        # Update the current session too, so a freshly-opened shell isn't required to test.
        $env:Path = "$env:Path;$BinDir"
        Write-Success "Added $BinDir to your user PATH."
        Write-Warn "Restart your terminal (or open a new one) for the PATH change to take full effect."
    }
} else {
    Write-Muted "Skipping PATH modification (as requested)."
    Write-Muted "Add this directory to your PATH manually to run 'arabcode':"
    Write-Muted "  $BinDir"
}

# --- Banner + Arabic getting-started blurb ------------------------------------
Write-Host ""
Write-Host " ####  #####   ####  #####   #####  ####  #####  ######" -ForegroundColor Yellow
Write-Host "##  ## ##  ## ##  ## ##  ## ##     ##  ## ##  ## ##    " -ForegroundColor Yellow
Write-Host "###### #####  ###### #####  ##     ##  ## ##  ## ##### " -ForegroundColor Yellow
Write-Host "##  ## ## ##  ##  ## ##  ## ##     ##  ## ##  ## ##    " -ForegroundColor Yellow
Write-Host "##  ## ##  ## ##  ## #####   #####  ####  #####  ######" -ForegroundColor Yellow
Write-Host ""
Write-Host ""

# Ensure Arabic text renders correctly regardless of the console code page.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

Write-Muted "arabcode يتضمّن نماذج مجانية. للبدء:"
Write-Host ""
Write-Info  "cd <مشروعك>   # افتح مجلد المشروع"
Write-Info  "arabcode       # شغّل الأداة"
Write-Host ""
Write-Muted "لمزيد من المعلومات زُر https://github.com/abdallhx2/arabcode#readme"
Write-Host ""
