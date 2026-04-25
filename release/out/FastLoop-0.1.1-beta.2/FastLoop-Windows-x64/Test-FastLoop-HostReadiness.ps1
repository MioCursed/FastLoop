param(
  [string]$InstallRoot = "",
  [ValidateSet("Auto", "CurrentUser", "AllUsers")]
  [string]$InstallScope = "Auto",
  [string]$RegistryBasePath = "HKCU:\Software\Adobe",
  [string]$LogDirectory = ""
)

$ErrorActionPreference = "Stop"
$script:FastLoopVersion = "0.1.1-beta.2"
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
  $targetPlan = Get-FastLoopPreferredInstallTargets -InstallRoot $InstallRoot -InstallScope $InstallScope
  $targets = @(@($targetPlan.PrimaryTargets) + @($targetPlan.SecondaryTargets))
  $duplicateScanRoots = @(
    $targets
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
  $installedTargets = @($targetReports | Where-Object { $_.Exists -and $_.IsComplete } | ForEach-Object {
      [PSCustomObject]@{
        Scope = $_.Scope
        Root = Split-Path -Parent $_.TargetRoot
        TargetRoot = $_.TargetRoot
        ManifestSummary = $_.ManifestSummary
      }
    })
  $primaryManifestSummary = @($installedTargets | Select-Object -ExpandProperty ManifestSummary | Select-Object -First 1)
  $currentVersion = if ($primaryManifestSummary) { [string]$primaryManifestSummary.ExtensionBundleVersion } else { "" }
  $higherPriorityConflicts = @(
    $duplicates | Where-Object {
      $_.Scope -eq "AllUsers" -and
      (($_.ExtensionBundleVersion -ne $currentVersion) -or (@($installedTargets | ForEach-Object { $_.TargetRoot }) -notcontains $_.BundleRoot))
    }
  )
  $hostReadiness = New-FastLoopHostReadinessReport `
    -ManifestSummary $primaryManifestSummary `
    -InstalledTargets $installedTargets `
    -DuplicateBundles $duplicates `
    -UnsignedReady (@($registryState | Where-Object { -not $_.Enabled }).Count -eq 0)
  $isReady = (
    (@($installedTargets).Count -gt 0) -and
    (@($registryState | Where-Object { -not $_.Enabled }).Count -eq 0) -and
    ($higherPriorityConflicts.Count -eq 0)
  )

  $summary = [PSCustomObject]@{
    version = $script:FastLoopVersion
    bundleId = $script:FastLoopBundleId
    ready = $isReady
    installScope = $InstallScope
    resolvedRoots = [PSCustomObject]@{
      perUserRoot = $targetPlan.PerUserRoot
      systemRoots = $targetPlan.SystemRoots
    }
    installTargets = @($targetReports)
    registryState = @($registryState)
    duplicateBundles = @($duplicates)
    higherPriorityConflicts = @($higherPriorityConflicts)
    hostReadiness = @($hostReadiness)
    guidance = @(
      "Restart Premiere Pro or After Effects after install.",
      "Open Window > Extensions (Legacy) > FastLoop on newer Adobe builds.",
      "Ensure PlayerDebugMode=1 is set under HKCU\Software\Adobe\CSXS.11, CSXS.12, and CSXS.13.",
      "If FastLoop is still missing, inspect CEP logs under %LOCALAPPDATA%\\Temp for CEP*-PPRO.log or CEP*-AEFT.log.",
      "If FastLoop exists only under the CurrentUser CEP root, try an AllUsers install if you have permission."
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
