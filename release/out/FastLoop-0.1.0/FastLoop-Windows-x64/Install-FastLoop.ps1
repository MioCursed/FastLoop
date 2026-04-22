param(
  [string]$PayloadZip = "",
  [string]$BundleDirectory = "",
  [string]$InstallRoot = ""
)

$ErrorActionPreference = "Stop"
$script:FastLoopVersion = "0.1.0"

function Resolve-InputPath([string]$InputPath, [string]$Fallback) {
  $candidate = if ($InputPath) { $InputPath } else { $Fallback }
  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }

  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
  return Join-Path $scriptRoot $candidate
}

function Install-Bundle([string]$SourceRoot, [string]$TargetRoot) {
  if (-not (Test-Path -LiteralPath $SourceRoot)) {
    throw "FastLoop bundle not found at $SourceRoot"
  }

  $targetParent = Split-Path -Parent $TargetRoot
  New-Item -ItemType Directory -Force -Path $targetParent | Out-Null

  if (Test-Path -LiteralPath $TargetRoot) {
    Remove-Item -LiteralPath $TargetRoot -Recurse -Force
  }

  Copy-Item -LiteralPath $SourceRoot -Destination $TargetRoot -Recurse -Force

  $installMetadata = @{
    version = $script:FastLoopVersion
    installedAt = (Get-Date).ToString("o")
    targetRoot = $TargetRoot
  } | ConvertTo-Json -Depth 4

  Set-Content -LiteralPath (Join-Path $TargetRoot "install.json") -Value $installMetadata -Encoding UTF8
}

$targetRoot = if ($InstallRoot) {
  $InstallRoot
} else {
  Join-Path $env:APPDATA "Adobe\CEP\extensions\FastLoop"
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("FastLoop-Install-" + [Guid]::NewGuid().ToString("N"))

try {
  if ($PayloadZip) {
    $zipPath = Resolve-InputPath -InputPath $PayloadZip -Fallback "FastLoop-Windows-x64.zip"
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    Expand-Archive -LiteralPath $zipPath -DestinationPath $tempRoot -Force
    $bundleRoot = Join-Path $tempRoot "FastLoop"
    Install-Bundle -SourceRoot $bundleRoot -TargetRoot $targetRoot
  } else {
    $bundleRoot = Resolve-InputPath -InputPath $BundleDirectory -Fallback "FastLoop"
    Install-Bundle -SourceRoot $bundleRoot -TargetRoot $targetRoot
  }

  Write-Host "FastLoop installed successfully to $targetRoot"
  exit 0
} catch {
  Write-Error $_
  exit 1
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
