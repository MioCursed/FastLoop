param(
  [string]$PayloadZip = "",
  [string]$BundleDirectory = "",
  [string]$InstallRoot = "",
  [ValidateSet("CurrentUser", "AllUsers")]
  [string]$InstallScope = "CurrentUser",
  [bool]$EnableUnsignedPanelSupport = $true,
  [string]$RegistryBasePath = "HKCU:\Software\Adobe",
  [string]$LogDirectory = ""
)

$ErrorActionPreference = "Stop"
$script:FastLoopVersion = "0.1.1-beta.1"
$script:FastLoopBundleId = "com.fastloop.panel"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptRoot "FastLoop-CEPCommon.ps1")

function Resolve-LogDirectory([string]$RequestedLogDirectory) {
  if ($RequestedLogDirectory) {
    return $RequestedLogDirectory
  }

  return Join-Path $env:LOCALAPPDATA "FastLoop\Logs"
}

function Write-InstallLog([string]$LogPath, [string]$Message) {
  $timestamp = (Get-Date).ToString("s")
  $line = "[$timestamp] $Message"
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
  Write-Host $line
}

function Write-JsonFile([string]$Path, [object]$Value) {
  $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Install-Bundle([string]$SourceRoot, [string]$TargetRoot) {
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
  }

  Write-JsonFile -Path (Join-Path $TargetRoot "install.json") -Value $installMetadata
}

$logRoot = Resolve-LogDirectory -RequestedLogDirectory $LogDirectory
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$logStamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$installLogPath = Join-Path $logRoot ("install-" + $logStamp + ".log")
$installSummaryPath = Join-Path $logRoot ("install-" + $logStamp + ".json")
$latestSummaryPath = Join-Path $logRoot "install-latest.json"
$latestLogPath = Join-Path $logRoot "install-latest.log"

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("FastLoop-Install-" + [Guid]::NewGuid().ToString("N"))

try {
  Write-InstallLog -LogPath $installLogPath -Message "Starting FastLoop install $script:FastLoopVersion"

  if ($PayloadZip) {
    $zipPath = Resolve-FastLoopPath -InputPath $PayloadZip -Fallback "FastLoop-Windows-x64.zip" -ScriptRoot $scriptRoot
    Write-InstallLog -LogPath $installLogPath -Message "Expanding payload zip from $zipPath"
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    Expand-Archive -LiteralPath $zipPath -DestinationPath $tempRoot -Force
    $bundleRoot = Join-Path $tempRoot "FastLoop"
  } else {
    $bundleRoot = Resolve-FastLoopPath -InputPath $BundleDirectory -Fallback "FastLoop" -ScriptRoot $scriptRoot
  }

  $sourceCheck = Test-FastLoopBundleContents -BundleRoot $bundleRoot
  if (-not $sourceCheck.IsComplete) {
    throw "FastLoop bundle is incomplete before install. Missing: $($sourceCheck.MissingPaths -join ', ')"
  }

  if ($sourceCheck.ManifestSummary.ExtensionBundleId -ne $script:FastLoopBundleId) {
    throw "Unexpected FastLoop bundle ID '$($sourceCheck.ManifestSummary.ExtensionBundleId)' in $($sourceCheck.ManifestPath)"
  }

  Write-InstallLog -LogPath $installLogPath -Message "Source bundle manifest version $($sourceCheck.ManifestSummary.ExtensionBundleVersion)"

  $installTargets = Get-FastLoopKnownCepRoots -InstallRoot $InstallRoot -InstallScope $InstallScope
  if ($installTargets.Count -eq 0) {
    throw "No valid CEP install targets were resolved."
  }

  $duplicateScanRoots = @(
    Get-FastLoopKnownCepRoots -InstallRoot $InstallRoot -InstallScope "CurrentUser"
    Get-FastLoopKnownCepRoots -InstallRoot "" -InstallScope "CurrentUser"
    Get-FastLoopKnownCepRoots -InstallRoot "" -InstallScope "AllUsers"
  ) | ForEach-Object { $_ } | Sort-Object TargetRoot -Unique

  $installedTargets = @()
  foreach ($target in $installTargets) {
    Write-InstallLog -LogPath $installLogPath -Message "Installing FastLoop to $($target.TargetRoot)"
    Install-Bundle -SourceRoot $bundleRoot -TargetRoot $target.TargetRoot
    $targetCheck = Test-FastLoopBundleContents -BundleRoot $target.TargetRoot
    if (-not $targetCheck.IsComplete) {
      throw "Installed FastLoop bundle is incomplete at $($target.TargetRoot). Missing: $($targetCheck.MissingPaths -join ', ')"
    }
    $verificationPath = Join-Path $target.TargetRoot "install-verification.json"
    Write-JsonFile -Path $verificationPath -Value @{
      version = $script:FastLoopVersion
      installedAt = (Get-Date).ToString("o")
      bundleRoot = $target.TargetRoot
      manifest = $targetCheck.ManifestSummary
      verified = $true
    }
    $installedTargets += [PSCustomObject]@{
      Scope = $target.Scope
      TargetRoot = $target.TargetRoot
      VerificationPath = $verificationPath
      ManifestSummary = $targetCheck.ManifestSummary
    }
  }

  $registryBefore = Get-FastLoopUnsignedExtensionState -RegistryBasePath $RegistryBasePath
  if ($EnableUnsignedPanelSupport) {
    Write-InstallLog -LogPath $installLogPath -Message "Enabling PlayerDebugMode for CEP 11, CEP 12, and CEP 13 under $RegistryBasePath"
    $null = Enable-FastLoopUnsignedExtensions -RegistryBasePath $RegistryBasePath
  } else {
    Write-InstallLog -LogPath $installLogPath -Message "Skipping unsigned CEP helper registry changes by request"
  }

  $registryAfter = Get-FastLoopUnsignedExtensionState -RegistryBasePath $RegistryBasePath
  $missingRegistry = @($registryAfter | Where-Object { -not $_.Enabled })
  if ($missingRegistry.Count -gt 0) {
    throw "FastLoop is an unsigned CEP prerelease and will not appear until PlayerDebugMode is set to 1 for: $($missingRegistry.CsxsVersion -join ', ')"
  }

  $duplicateBundles = Find-FastLoopDuplicateBundles -KnownRoots $duplicateScanRoots -ExpectedBundleId $script:FastLoopBundleId
  $summary = [PSCustomObject]@{
    version = $script:FastLoopVersion
    bundleId = $script:FastLoopBundleId
    installedAt = (Get-Date).ToString("o")
    installScope = $InstallScope
    installTargets = $installedTargets
    registryBefore = $registryBefore
    registryAfter = $registryAfter
    duplicateBundles = $duplicateBundles
    logPath = $installLogPath
    readiness = [PSCustomObject]@{
      bundleInstalled = $true
      unsignedExtensionSupportReady = ($missingRegistry.Count -eq 0)
      windowMenuPaths = @(
        "Window > Extensions > FastLoop",
        "Window > Extensions (Legacy) > FastLoop"
      )
      nextSteps = @(
        "Restart Premiere Pro or After Effects if the host was open during install.",
        "Open FastLoop from Window > Extensions (Legacy) on newer Adobe builds, or Window > Extensions on older builds."
      )
    }
  }

  Write-JsonFile -Path $installSummaryPath -Value $summary
  Copy-Item -LiteralPath $installSummaryPath -Destination $latestSummaryPath -Force
  Copy-Item -LiteralPath $installLogPath -Destination $latestLogPath -Force

  Write-InstallLog -LogPath $installLogPath -Message "FastLoop installed and verified."
  Write-Host "FastLoop installed and verified. Open Window > Extensions (Legacy) > FastLoop on newer Adobe builds."
  Write-Host "Install log: $installLogPath"
  exit 0
} catch {
  $errorMessage = $_.Exception.Message
  Write-InstallLog -LogPath $installLogPath -Message "Install failed: $errorMessage"
  $failureSummary = [PSCustomObject]@{
    version = $script:FastLoopVersion
    succeeded = $false
    error = $errorMessage
    logPath = $installLogPath
    installRoot = $InstallRoot
    installScope = $InstallScope
    registryBasePath = $RegistryBasePath
  }
  Write-JsonFile -Path $installSummaryPath -Value $failureSummary
  Copy-Item -LiteralPath $installSummaryPath -Destination $latestSummaryPath -Force
  Copy-Item -LiteralPath $installLogPath -Destination $latestLogPath -Force
  Write-Error $errorMessage
  exit 1
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
