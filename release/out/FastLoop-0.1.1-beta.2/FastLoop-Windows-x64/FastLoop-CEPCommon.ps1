function Resolve-FastLoopPath([string]$InputPath, [string]$Fallback, [string]$ScriptRoot) {
  $candidate = if ($InputPath) { $InputPath } else { $Fallback }
  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }

  return Join-Path $ScriptRoot $candidate
}

function Get-FastLoopPerUserCepRoot() {
  if ($env:FASTLOOP_CEP_PER_USER_ROOT) {
    return $env:FASTLOOP_CEP_PER_USER_ROOT
  }

  return Join-Path $env:APPDATA "Adobe\CEP\extensions"
}

function Get-FastLoopSystemCepRoots() {
  if ($env:FASTLOOP_CEP_SYSTEM_ROOTS) {
    return @(
      $env:FASTLOOP_CEP_SYSTEM_ROOTS.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries) |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ }
    )
  }

  $systemRoots = @()
  foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
    if ($base) {
      $systemRoots += Join-Path $base "Common Files\Adobe\CEP\extensions"
    }
  }

  return @($systemRoots | Select-Object -Unique)
}

function Get-FastLoopManifestSummary([string]$ManifestPath) {
  if (-not (Test-Path -LiteralPath $ManifestPath)) {
    throw "FastLoop manifest not found at $ManifestPath"
  }

  [xml]$manifest = Get-Content -LiteralPath $ManifestPath
  $extension = $manifest.ExtensionManifest.ExtensionList.Extension
  $dispatchInfo = $manifest.ExtensionManifest.DispatchInfoList.Extension.DispatchInfo

  return [PSCustomObject]@{
    ExtensionBundleId = [string]$manifest.ExtensionManifest.ExtensionBundleId
    ExtensionBundleVersion = [string]$manifest.ExtensionManifest.ExtensionBundleVersion
    ExtensionId = [string]$extension.Id
    ExtensionVersion = [string]$extension.Version
    Hosts = @($manifest.ExtensionManifest.ExecutionEnvironment.HostList.Host | ForEach-Object {
        [PSCustomObject]@{
          Name = [string]$_.Name
          Version = [string]$_.Version
        }
      })
    MainPath = [string]$dispatchInfo.Resources.MainPath
    ScriptPath = [string]$dispatchInfo.Resources.ScriptPath
    Menu = [string]$dispatchInfo.UI.Menu
  }
}

function Test-FastLoopBundleContents([string]$BundleRoot) {
  $requiredPaths = @(
    "CSXS\manifest.xml",
    "dist\index.html",
    "host-index.jsx",
    "host-premiere\jsx\fastloop_premiere.jsx",
    "host-aftereffects\jsx\fastloop_aftereffects.jsx",
    "engine-runtime\windows-x64\fastloop-engine-runtime\fastloop-engine-runtime.exe"
  )

  $missingPaths = @()
  foreach ($relativePath in $requiredPaths) {
    $absolutePath = Join-Path $BundleRoot $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
      $missingPaths += $relativePath
    }
  }

  $manifestPath = Join-Path $BundleRoot "CSXS\manifest.xml"
  $manifestSummary = $null
  if (Test-Path -LiteralPath $manifestPath) {
    $manifestSummary = Get-FastLoopManifestSummary -ManifestPath $manifestPath
  }

  return [PSCustomObject]@{
    BundleRoot = $BundleRoot
    IsComplete = ($missingPaths.Count -eq 0)
    MissingPaths = $missingPaths
    ManifestPath = $manifestPath
    ManifestSummary = $manifestSummary
  }
}

function Get-FastLoopKnownCepRoots([string]$InstallRoot = "", [string]$InstallScope = "CurrentUser") {
  if ($InstallRoot) {
    return @(
      [PSCustomObject]@{
        Scope = "Custom"
        Root = (Split-Path -Parent $InstallRoot)
        TargetRoot = $InstallRoot
      }
    )
  }

  $roots = @()
  $perUserRoot = Get-FastLoopPerUserCepRoot
  $roots += [PSCustomObject]@{
    Scope = "CurrentUser"
    Root = $perUserRoot
    TargetRoot = Join-Path $perUserRoot "FastLoop"
  }

  $systemRoots = Get-FastLoopSystemCepRoots

  if ($InstallScope -eq "AllUsers") {
    if ($systemRoots.Count -gt 0) {
      return @($systemRoots | ForEach-Object {
          [PSCustomObject]@{
            Scope = "AllUsers"
            Root = $_
            TargetRoot = Join-Path $_ "FastLoop"
          }
        })
    }

    return $roots
  }

  return $roots
}

function Get-FastLoopPreferredInstallTargets([string]$InstallRoot = "", [string]$InstallScope = "Auto") {
  if ($InstallRoot) {
    return [PSCustomObject]@{
      Strategy = "Custom"
      PrimaryTargets = Get-FastLoopKnownCepRoots -InstallRoot $InstallRoot -InstallScope "CurrentUser"
      SecondaryTargets = @()
      PerUserRoot = $null
      SystemRoots = @()
    }
  }

  $perUserTargets = Get-FastLoopKnownCepRoots -InstallScope "CurrentUser"
  $systemTargets = Get-FastLoopKnownCepRoots -InstallScope "AllUsers"

  switch ($InstallScope) {
    "CurrentUser" {
      return [PSCustomObject]@{
        Strategy = "CurrentUser"
        PrimaryTargets = $perUserTargets
        SecondaryTargets = @()
        PerUserRoot = @($perUserTargets | Select-Object -ExpandProperty Root -First 1)
        SystemRoots = @($systemTargets | Select-Object -ExpandProperty Root)
      }
    }
    "AllUsers" {
      return [PSCustomObject]@{
        Strategy = "AllUsers"
        PrimaryTargets = $systemTargets
        SecondaryTargets = @()
        PerUserRoot = @($perUserTargets | Select-Object -ExpandProperty Root -First 1)
        SystemRoots = @($systemTargets | Select-Object -ExpandProperty Root)
      }
    }
    default {
      return [PSCustomObject]@{
        Strategy = "Auto"
        PrimaryTargets = $perUserTargets
        SecondaryTargets = $systemTargets
        PerUserRoot = @($perUserTargets | Select-Object -ExpandProperty Root -First 1)
        SystemRoots = @($systemTargets | Select-Object -ExpandProperty Root)
      }
    }
  }
}

function Find-FastLoopDuplicateBundles([object[]]$KnownRoots, [string]$ExpectedBundleId = "com.fastloop.panel") {
  $results = @()
  foreach ($root in $KnownRoots) {
    if (-not (Test-Path -LiteralPath $root.Root)) {
      continue
    }

    foreach ($child in Get-ChildItem -LiteralPath $root.Root -Directory -ErrorAction SilentlyContinue) {
      $manifestPath = Join-Path $child.FullName "CSXS\manifest.xml"
      if (-not (Test-Path -LiteralPath $manifestPath)) {
        continue
      }

      try {
        $summary = Get-FastLoopManifestSummary -ManifestPath $manifestPath
        if ($summary.ExtensionBundleId -eq $ExpectedBundleId) {
          $results += [PSCustomObject]@{
            Scope = $root.Scope
            BundleRoot = $child.FullName
            ManifestPath = $manifestPath
            ExtensionBundleVersion = $summary.ExtensionBundleVersion
            ExtensionId = $summary.ExtensionId
          }
        }
      } catch {
        $results += [PSCustomObject]@{
          Scope = $root.Scope
          BundleRoot = $child.FullName
          ManifestPath = $manifestPath
          ExtensionBundleVersion = "unknown"
          ExtensionId = "unknown"
        }
      }
    }
  }

  return $results
}

function Test-FastLoopPathWritable([string]$TargetPath) {
  $targetParent = Split-Path -Parent $TargetPath
  try {
    New-Item -ItemType Directory -Force -Path $targetParent | Out-Null
    $probePath = Join-Path $targetParent (".fastloop-write-test-" + [Guid]::NewGuid().ToString("N"))
    Set-Content -LiteralPath $probePath -Value "ok" -Encoding UTF8
    Remove-Item -LiteralPath $probePath -Force
    return $true
  } catch {
    return $false
  }
}

function Get-FastLoopVersionPriority([string]$Version) {
  $cleanVersion = if ($Version) { $Version } else { "0.0.0.0" }
  try {
    return [System.Version]::Parse($cleanVersion)
  } catch {
    return [System.Version]::Parse("0.0.0.0")
  }
}

function Get-FastLoopMenuPaths([string]$HostName) {
  $hostLabel = switch ($HostName) {
    "PPRO" { "Premiere Pro" }
    "AEFT" { "After Effects" }
    default { $HostName }
  }

  return [PSCustomObject]@{
    HostName = $HostName
    HostLabel = $hostLabel
    PrimaryMenuPath = "Window > Extensions (Legacy) > FastLoop"
    SecondaryMenuPath = "Window > Extensions > FastLoop"
  }
}

function New-FastLoopHostReadinessReport(
  [object]$ManifestSummary,
  [object[]]$InstalledTargets,
  [object[]]$DuplicateBundles,
  [bool]$UnsignedReady
) {
  $hostReports = @()
  foreach ($hostName in @("PPRO", "AEFT")) {
    $menuInfo = Get-FastLoopMenuPaths -HostName $hostName
    $hostCovered = $false
    if ($ManifestSummary -and $ManifestSummary.Hosts) {
      $hostCovered = (@($ManifestSummary.Hosts | Where-Object { $_.Name -eq $hostName }).Count -gt 0)
    }

    $hostDuplicates = @($DuplicateBundles | Where-Object { $_.Scope -eq "AllUsers" -or $_.Scope -eq "CurrentUser" -or $_.Scope -eq "Custom" })
    $hostReports += [PSCustomObject]@{
      HostName = $hostName
      HostLabel = $menuInfo.HostLabel
      CoveredByManifest = $hostCovered
      LikelyReady = ($hostCovered -and $UnsignedReady -and @($InstalledTargets).Count -gt 0)
      InstalledRoots = @($InstalledTargets | ForEach-Object { $_.TargetRoot })
      DuplicateBundleCount = $hostDuplicates.Count
      PrimaryMenuPath = $menuInfo.PrimaryMenuPath
      SecondaryMenuPath = $menuInfo.SecondaryMenuPath
      Guidance = @(
        "Restart $($menuInfo.HostLabel) after install.",
        "Check $($menuInfo.PrimaryMenuPath) first.",
        "If not visible there, also check $($menuInfo.SecondaryMenuPath)."
      )
    }
  }

  return $hostReports
}

function Get-FastLoopUnsignedExtensionState([string]$RegistryBasePath = "HKCU:\Software\Adobe") {
  return @(@("11", "12", "13") | ForEach-Object {
      $csxsVersion = $_
      $keyPath = Join-Path $RegistryBasePath ("CSXS." + $csxsVersion)
      $playerDebugMode = $null
      if (Test-Path -LiteralPath $keyPath) {
        $playerDebugMode = (Get-ItemProperty -LiteralPath $keyPath -Name "PlayerDebugMode" -ErrorAction SilentlyContinue).PlayerDebugMode
      }

      [PSCustomObject]@{
        CsxsVersion = $csxsVersion
        RegistryPath = $keyPath
        PlayerDebugMode = [string]$playerDebugMode
        Enabled = ([string]$playerDebugMode -eq "1")
      }
    })
}

function Enable-FastLoopUnsignedExtensions([string]$RegistryBasePath = "HKCU:\Software\Adobe") {
  $changes = @()
  foreach ($csxsVersion in @("11", "12", "13")) {
    $keyPath = Join-Path $RegistryBasePath ("CSXS." + $csxsVersion)
    New-Item -Path $keyPath -Force | Out-Null
    New-ItemProperty -LiteralPath $keyPath -Name "PlayerDebugMode" -PropertyType String -Value "1" -Force | Out-Null
    $changes += [PSCustomObject]@{
      CsxsVersion = $csxsVersion
      RegistryPath = $keyPath
      PlayerDebugMode = "1"
    }
  }

  return $changes
}
