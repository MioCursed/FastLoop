param(
  [string]$InstallRoot = "",
  [string]$RegistryBasePath = "HKCU:\Software\Adobe",
  [string]$LogDirectory = ""
)

$ErrorActionPreference = "Stop"
$script:FastLoopVersion = "__FASTLOOP_VERSION__"
$script:FastLoopBundleId = "com.fastloop.panel"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptRoot "FastLoop-CEPCommon.ps1")

function Write-JsonFile([string]$Path, [object]$Value) {
  $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Path -Encoding UTF8
}

$logRoot = if ($LogDirectory) { $LogDirectory } else { Join-Path $env:LOCALAPPDATA "FastLoop\Logs" }
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$summaryPath = Join-Path $logRoot ("host-readiness-" + $stamp + ".json")
$latestSummaryPath = Join-Path $logRoot "host-readiness-latest.json"

try {
  $targets = Get-FastLoopKnownCepRoots -InstallRoot $InstallRoot -InstallScope "CurrentUser"
  $duplicateScanRoots = @(
    Get-FastLoopKnownCepRoots -InstallRoot $InstallRoot -InstallScope "CurrentUser"
    Get-FastLoopKnownCepRoots -InstallRoot "" -InstallScope "CurrentUser"
    Get-FastLoopKnownCepRoots -InstallRoot "" -InstallScope "AllUsers"
  ) | ForEach-Object { $_ } | Sort-Object TargetRoot -Unique
  $targetReports = @($targets | ForEach-Object {
      $check = Test-FastLoopBundleContents -BundleRoot $_.TargetRoot
      [PSCustomObject]@{
        Scope = $_.Scope
        TargetRoot = $_.TargetRoot
        Exists = (Test-Path -LiteralPath $_.TargetRoot)
        IsComplete = $check.IsComplete
        MissingPaths = $check.MissingPaths
        ManifestSummary = $check.ManifestSummary
      }
    })
  $registryState = Get-FastLoopUnsignedExtensionState -RegistryBasePath $RegistryBasePath
  $duplicates = Find-FastLoopDuplicateBundles -KnownRoots $duplicateScanRoots -ExpectedBundleId $script:FastLoopBundleId
  $isReady = (
    (@($targetReports | Where-Object { $_.Exists -and $_.IsComplete }).Count -gt 0) -and
    (@($registryState | Where-Object { -not $_.Enabled }).Count -eq 0)
  )

  $summary = [PSCustomObject]@{
    version = $script:FastLoopVersion
    bundleId = $script:FastLoopBundleId
    ready = $isReady
    installTargets = $targetReports
    registryState = $registryState
    duplicateBundles = $duplicates
    guidance = @(
      "Restart Premiere Pro or After Effects after install.",
      "Open Window > Extensions (Legacy) > FastLoop on newer Adobe builds.",
      "If FastLoop is still missing, inspect CEP logs under %LOCALAPPDATA%\\Temp for CEP*-PPRO.log or CEP*-AEFT.log."
    )
  }

  Write-JsonFile -Path $summaryPath -Value $summary
  Copy-Item -LiteralPath $summaryPath -Destination $latestSummaryPath -Force
  $summary | ConvertTo-Json -Depth 8
  if ($isReady) {
    exit 0
  }

  exit 1
} catch {
  $failure = [PSCustomObject]@{
    version = $script:FastLoopVersion
    ready = $false
    error = $_.Exception.Message
  }
  Write-JsonFile -Path $summaryPath -Value $failure
  Copy-Item -LiteralPath $summaryPath -Destination $latestSummaryPath -Force
  $failure | ConvertTo-Json -Depth 8
  exit 1
}
