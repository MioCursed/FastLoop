function Resolve-FastLoopPath([string]$InputPath, [string]$Fallback, [string]$ScriptRoot) {
  $candidate = if ($InputPath) { $InputPath } else { $Fallback }
  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }

  return Join-Path $ScriptRoot $candidate
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
  $perUserRoot = Join-Path $env:APPDATA "Adobe\CEP\extensions"
  $roots += [PSCustomObject]@{
    Scope = "CurrentUser"
    Root = $perUserRoot
    TargetRoot = Join-Path $perUserRoot "FastLoop"
  }

  $systemRoots = @()
  foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
    if ($base) {
      $systemRoots += Join-Path $base "Common Files\Adobe\CEP\extensions"
    }
  }

  $systemRoots = $systemRoots | Select-Object -Unique

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

function Get-FastLoopUnsignedExtensionState([string]$RegistryBasePath = "HKCU:\Software\Adobe") {
  return @(@("11", "12") | ForEach-Object {
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
  foreach ($csxsVersion in @("11", "12")) {
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
