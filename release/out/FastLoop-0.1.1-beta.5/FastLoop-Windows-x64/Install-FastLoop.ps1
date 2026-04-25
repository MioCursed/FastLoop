param(
  [string]$PayloadZip = "",
  [string]$BundleDirectory = "",
  [string]$InstallRoot = "",
  [ValidateSet("Auto", "CurrentUser", "AllUsers")]
  [string]$InstallScope = "Auto",
  [switch]$UseInstallerPanel,
  [switch]$PreferAllUsers,
  [switch]$AllowRunningHosts,
  [bool]$EnableUnsignedPanelSupport = $true,
  [string]$RegistryBasePath = "HKCU:\Software\Adobe",
  [string]$LogDirectory = ""
)

$ErrorActionPreference = "Stop"
$script:FastLoopVersion = "0.1.1-beta.5"
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

function Show-FastLoopInstallerPanel(
  [string]$DefaultScope,
  [bool]$DefaultPreferAllUsers,
  [bool]$DefaultAllowRunningHosts,
  [bool]$DefaultEnableUnsignedSupport,
  [string]$DefaultInstallRoot
) {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing

  $form = New-Object System.Windows.Forms.Form
  $form.Text = "FastLoop Extension Installer"
  $form.Width = 640
  $form.Height = 470
  $form.StartPosition = "CenterScreen"
  $form.FormBorderStyle = "FixedDialog"
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.BackColor = [System.Drawing.Color]::FromArgb(26, 26, 26)
  $form.ForeColor = [System.Drawing.Color]::FromArgb(240, 240, 240)
  $form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

  $title = New-Object System.Windows.Forms.Label
  $title.Text = "FastLoop for Premiere + After Effects"
  $title.Location = New-Object System.Drawing.Point(20, 20)
  $title.Size = New-Object System.Drawing.Size(560, 28)
  $title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 12)
  $form.Controls.Add($title)

  $subtitle = New-Object System.Windows.Forms.Label
  $subtitle.Text = "Instalador estilo painel: escolha escopo, diagnósticos e comportamento de host."
  $subtitle.Location = New-Object System.Drawing.Point(20, 52)
  $subtitle.Size = New-Object System.Drawing.Size(590, 24)
  $form.Controls.Add($subtitle)

  $scopeLabel = New-Object System.Windows.Forms.Label
  $scopeLabel.Text = "Escopo de instalação CEP:"
  $scopeLabel.Location = New-Object System.Drawing.Point(20, 96)
  $scopeLabel.Size = New-Object System.Drawing.Size(220, 24)
  $form.Controls.Add($scopeLabel)

  $scopeCombo = New-Object System.Windows.Forms.ComboBox
  $scopeCombo.DropDownStyle = "DropDownList"
  [void]$scopeCombo.Items.AddRange(@("Auto", "CurrentUser", "AllUsers"))
  $scopeCombo.SelectedItem = $DefaultScope
  $scopeCombo.Location = New-Object System.Drawing.Point(260, 94)
  $scopeCombo.Size = New-Object System.Drawing.Size(170, 28)
  $form.Controls.Add($scopeCombo)

  $installRootLabel = New-Object System.Windows.Forms.Label
  $installRootLabel.Text = "InstallRoot custom (opcional):"
  $installRootLabel.Location = New-Object System.Drawing.Point(20, 136)
  $installRootLabel.Size = New-Object System.Drawing.Size(220, 24)
  $form.Controls.Add($installRootLabel)

  $installRootInput = New-Object System.Windows.Forms.TextBox
  $installRootInput.Location = New-Object System.Drawing.Point(260, 134)
  $installRootInput.Size = New-Object System.Drawing.Size(290, 26)
  $installRootInput.Text = $DefaultInstallRoot
  $form.Controls.Add($installRootInput)

  $browseButton = New-Object System.Windows.Forms.Button
  $browseButton.Text = "..."
  $browseButton.Location = New-Object System.Drawing.Point(560, 133)
  $browseButton.Size = New-Object System.Drawing.Size(40, 28)
  $browseButton.Add_Click({
      $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
      if ($installRootInput.Text) {
        $dialog.SelectedPath = $installRootInput.Text
      }
      if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $installRootInput.Text = $dialog.SelectedPath
      }
    })
  $form.Controls.Add($browseButton)

  $preferAllUsersCheck = New-Object System.Windows.Forms.CheckBox
  $preferAllUsersCheck.Text = "Preferir AllUsers (semelhante a instaladores de plugins comerciais)"
  $preferAllUsersCheck.Location = New-Object System.Drawing.Point(20, 186)
  $preferAllUsersCheck.Size = New-Object System.Drawing.Size(560, 24)
  $preferAllUsersCheck.Checked = $DefaultPreferAllUsers
  $form.Controls.Add($preferAllUsersCheck)

  $allowRunningHostsCheck = New-Object System.Windows.Forms.CheckBox
  $allowRunningHostsCheck.Text = "Permitir instalação com Premiere/AE abertos (não recomendado)"
  $allowRunningHostsCheck.Location = New-Object System.Drawing.Point(20, 216)
  $allowRunningHostsCheck.Size = New-Object System.Drawing.Size(560, 24)
  $allowRunningHostsCheck.Checked = $DefaultAllowRunningHosts
  $form.Controls.Add($allowRunningHostsCheck)

  $unsignedSupportCheck = New-Object System.Windows.Forms.CheckBox
  $unsignedSupportCheck.Text = "Ativar suporte a extensão não assinada (PlayerDebugMode CEP 11/12/13)"
  $unsignedSupportCheck.Location = New-Object System.Drawing.Point(20, 246)
  $unsignedSupportCheck.Size = New-Object System.Drawing.Size(560, 24)
  $unsignedSupportCheck.Checked = $DefaultEnableUnsignedSupport
  $form.Controls.Add($unsignedSupportCheck)

  $notes = New-Object System.Windows.Forms.Label
  $notes.Text = "Dica: feche Premiere/After antes de instalar. Após instalar, valide com Test-FastLoop-HostReadiness.ps1."
  $notes.Location = New-Object System.Drawing.Point(20, 286)
  $notes.Size = New-Object System.Drawing.Size(580, 44)
  $form.Controls.Add($notes)

  $installButton = New-Object System.Windows.Forms.Button
  $installButton.Text = "Install FastLoop"
  $installButton.Location = New-Object System.Drawing.Point(350, 360)
  $installButton.Size = New-Object System.Drawing.Size(120, 34)
  $installButton.BackColor = [System.Drawing.Color]::FromArgb(73, 134, 255)
  $installButton.ForeColor = [System.Drawing.Color]::White
  $installButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.AcceptButton = $installButton
  $form.Controls.Add($installButton)

  $cancelButton = New-Object System.Windows.Forms.Button
  $cancelButton.Text = "Cancel"
  $cancelButton.Location = New-Object System.Drawing.Point(480, 360)
  $cancelButton.Size = New-Object System.Drawing.Size(120, 34)
  $cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.CancelButton = $cancelButton
  $form.Controls.Add($cancelButton)

  $dialog = $form.ShowDialog()
  if ($dialog -ne [System.Windows.Forms.DialogResult]::OK) {
    return $null
  }

  return [PSCustomObject]@{
    InstallScope = [string]$scopeCombo.SelectedItem
    InstallRoot = [string]$installRootInput.Text
    PreferAllUsers = [bool]$preferAllUsersCheck.Checked
    AllowRunningHosts = [bool]$allowRunningHostsCheck.Checked
    EnableUnsignedPanelSupport = [bool]$unsignedSupportCheck.Checked
  }
}

function Test-PlatformPreflight() {
  if (-not [Environment]::Is64BitOperatingSystem) {
    throw "FastLoop requires a 64-bit Windows operating system."
  }

  if ($PSVersionTable.PSVersion.Major -lt 5) {
    throw "FastLoop installer requires PowerShell 5.1 or newer."
  }
}

function Get-RunningAdobeHosts() {
  $hostProcessNames = @(
    "Adobe Premiere Pro",
    "AfterFX",
    "Adobe After Effects"
  )

  return @(
    Get-Process -ErrorAction SilentlyContinue |
      Where-Object { $hostProcessNames -contains $_.ProcessName } |
      Select-Object -ExpandProperty ProcessName -Unique
  )
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

function Compare-FastLoopTargetPriority([object]$Target) {
  switch ($Target.Scope) {
    "AllUsers" { return 2 }
    "CurrentUser" { return 1 }
    "Custom" { return 0 }
    default { return 0 }
  }
}

$logRoot = Resolve-LogDirectory -RequestedLogDirectory $LogDirectory
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$logStamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$installLogPath = Join-Path $logRoot ("install-" + $logStamp + ".log")
$installSummaryPath = Join-Path $logRoot ("install-" + $logStamp + ".json")
$latestSummaryPath = Join-Path $logRoot "install-latest.json"
$latestLogPath = Join-Path $logRoot "install-latest.log"
$script:LastInstallSummary = $null

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("FastLoop-Install-" + [Guid]::NewGuid().ToString("N"))

try {
  Test-PlatformPreflight

  if ($UseInstallerPanel) {
    $panelSelection = Show-FastLoopInstallerPanel `
      -DefaultScope $InstallScope `
      -DefaultPreferAllUsers ([bool]$PreferAllUsers) `
      -DefaultAllowRunningHosts ([bool]$AllowRunningHosts) `
      -DefaultEnableUnsignedSupport ([bool]$EnableUnsignedPanelSupport) `
      -DefaultInstallRoot $InstallRoot

    if (-not $panelSelection) {
      Write-Host "FastLoop installer cancelled by user."
      exit 1
    }

    $InstallScope = $panelSelection.InstallScope
    $InstallRoot = $panelSelection.InstallRoot
    $PreferAllUsers = $panelSelection.PreferAllUsers
    $AllowRunningHosts = $panelSelection.AllowRunningHosts
    $EnableUnsignedPanelSupport = $panelSelection.EnableUnsignedPanelSupport
  }

  Write-InstallLog -LogPath $installLogPath -Message "Starting FastLoop install $script:FastLoopVersion"
  Write-InstallLog -LogPath $installLogPath -Message "Install profile: scope=$InstallScope preferAllUsers=$PreferAllUsers allowRunningHosts=$AllowRunningHosts"

  $runningHosts = Get-RunningAdobeHosts
  if ($runningHosts.Count -gt 0 -and -not $AllowRunningHosts) {
    throw "Detected running Adobe host process(es): $($runningHosts -join ', '). Close Premiere Pro/After Effects and run installer again, or rerun with -AllowRunningHosts."
  }
  if ($runningHosts.Count -gt 0 -and $AllowRunningHosts) {
    Write-InstallLog -LogPath $installLogPath -Message "Continuing despite running hosts: $($runningHosts -join ', ')"
  }

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
    throw "FastLoop bundle is invalid before install. $($sourceCheck.ValidationErrors -join ' ')"
  }

  if ($sourceCheck.ManifestSummary.ExtensionBundleId -ne $script:FastLoopBundleId) {
    throw "Unexpected FastLoop bundle ID '$($sourceCheck.ManifestSummary.ExtensionBundleId)' in $($sourceCheck.ManifestPath)"
  }

  Write-InstallLog -LogPath $installLogPath -Message "Source bundle manifest version $($sourceCheck.ManifestSummary.ExtensionBundleVersion)"

  $effectiveInstallScope = if ($InstallScope -eq "Auto" -and $PreferAllUsers) { "AllUsers" } else { $InstallScope }
  $targetPlan = Get-FastLoopPreferredInstallTargets -InstallRoot $InstallRoot -InstallScope $effectiveInstallScope
  $primaryTargets = @($targetPlan.PrimaryTargets)
  $secondaryTargets = @($targetPlan.SecondaryTargets)
  if (($primaryTargets.Count + $secondaryTargets.Count) -eq 0) {
    throw "No valid CEP install targets were resolved."
  }

  $duplicateScanRoots = @(
    $primaryTargets
    $secondaryTargets
    Get-FastLoopKnownCepRoots -InstallRoot $InstallRoot -InstallScope "CurrentUser"
    Get-FastLoopKnownCepRoots -InstallRoot "" -InstallScope "CurrentUser"
    Get-FastLoopKnownCepRoots -InstallRoot "" -InstallScope "AllUsers"
  ) | ForEach-Object { $_ } | Sort-Object TargetRoot -Unique

  $installedTargets = @()
  $installAttempts = @()
  foreach ($target in @($primaryTargets + $secondaryTargets)) {
    $isWritable = Test-FastLoopPathWritable -TargetPath $target.TargetRoot
    $isRequired = @($primaryTargets | Where-Object { $_.TargetRoot -eq $target.TargetRoot }).Count -gt 0
    $attempt = [ordered]@{
      Scope = $target.Scope
      Root = $target.Root
      TargetRoot = $target.TargetRoot
      Writable = $isWritable
      Required = $isRequired
      Succeeded = $false
      Error = $null
    }

    if (-not $isWritable) {
      $attempt.Error = "Target root is not writable from the current process."
      if ($isRequired) {
        throw "Required CEP target is not writable: $($target.TargetRoot)"
      }
      $installAttempts += [PSCustomObject]$attempt
      Write-InstallLog -LogPath $installLogPath -Message "Skipping non-writable optional target $($target.TargetRoot)"
      continue
    }

    try {
      Write-InstallLog -LogPath $installLogPath -Message "Installing FastLoop to $($target.TargetRoot)"
      Install-Bundle -SourceRoot $bundleRoot -TargetRoot $target.TargetRoot
      $targetCheck = Test-FastLoopBundleContents -BundleRoot $target.TargetRoot
      if (-not $targetCheck.IsComplete) {
        throw "Installed FastLoop bundle is invalid at $($target.TargetRoot). $($targetCheck.ValidationErrors -join ' ')"
      }

      $verificationPath = Join-Path $target.TargetRoot "install-verification.json"
      Write-JsonFile -Path $verificationPath -Value @{
        version = $script:FastLoopVersion
        installedAt = (Get-Date).ToString("o")
        bundleRoot = $target.TargetRoot
        manifest = $targetCheck.ManifestSummary
        verified = $true
        scope = $target.Scope
      }
      $attempt.Succeeded = $true
      $installedTargets += [PSCustomObject]@{
        Scope = $target.Scope
        Root = $target.Root
        TargetRoot = $target.TargetRoot
        VerificationPath = $verificationPath
        ManifestSummary = $targetCheck.ManifestSummary
      }
    } catch {
      $attempt.Error = $_.Exception.Message
      if ($isRequired) {
        throw $_
      }
      Write-InstallLog -LogPath $installLogPath -Message "Optional target failed: $($target.TargetRoot) :: $($attempt.Error)"
    }
    $installAttempts += [PSCustomObject]$attempt
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
  $installedTargetRoots = @($installedTargets | ForEach-Object { $_.TargetRoot })
  $currentVersion = [string]$sourceCheck.ManifestSummary.ExtensionBundleVersion
  $systemConflicts = @(
    $duplicateBundles | Where-Object {
      $_.Scope -eq "AllUsers" -and
      (($_.ExtensionBundleVersion -ne $currentVersion) -or ($installedTargetRoots -notcontains $_.BundleRoot))
    }
  )
  $systemInstalled = @($installedTargets | Where-Object { $_.Scope -eq "AllUsers" }).Count -gt 0
  $currentInstalled = @($installedTargets | Where-Object { $_.Scope -eq "CurrentUser" -or $_.Scope -eq "Custom" }).Count -gt 0
  $hostReadiness = New-FastLoopHostReadinessReport `
    -ManifestSummary $sourceCheck.ManifestSummary `
    -InstalledTargets $installedTargets `
    -DuplicateBundles $duplicateBundles `
    -UnsignedReady ($missingRegistry.Count -eq 0) `
    -ExpectedBundleId $script:FastLoopBundleId
  $hostLoadErrorSignals = @($hostReadiness | Where-Object { $_.HostLoadEvidence.Status -eq "error-signals" }).Count -gt 0
  $hostLoadConfirmed = @($hostReadiness | Where-Object { $_.HostLoadConfirmed }).Count -gt 0
  $hostPreconditionsReady = @($hostReadiness | Where-Object { $_.PreconditionsReady }).Count -gt 0
  $warnings = @()
  if (-not $systemInstalled -and $targetPlan.Strategy -eq "Auto" -and $targetPlan.SystemRoots.Count -gt 0) {
    $warnings += "FastLoop could not install into any AllUsers CEP root. CurrentUser install completed, but some Adobe environments may prefer the system CEP root."
  }
  if ($systemConflicts.Count -gt 0) {
    $warnings += "A stale or conflicting FastLoop bundle exists in a higher-priority AllUsers CEP root."
  }
  if (-not $currentInstalled) {
    $warnings += "No CurrentUser FastLoop install target was completed."
  }

  $preconditionsReady = (($missingRegistry.Count -eq 0) -and ($installedTargets.Count -gt 0) -and ($systemConflicts.Count -eq 0))
  $readyForHosts = ($preconditionsReady -and (-not $hostLoadErrorSignals))
  $readinessHelperPath = if ($PayloadZip) {
    Join-Path $tempRoot "Test-FastLoop-HostReadiness.ps1"
  } else {
    Resolve-FastLoopPath -InputPath "" -Fallback "Test-FastLoop-HostReadiness.ps1" -ScriptRoot $scriptRoot
  }
  $summary = [PSCustomObject]@{
    version = $script:FastLoopVersion
    bundleId = $script:FastLoopBundleId
    installedAt = (Get-Date).ToString("o")
    installScope = $InstallScope
    effectiveInstallScope = $effectiveInstallScope
    preferAllUsers = [bool]$PreferAllUsers
    allowRunningHosts = [bool]$AllowRunningHosts
    runningHostsDetected = @($runningHosts)
    installStrategy = $targetPlan.Strategy
    resolvedRoots = [PSCustomObject]@{
      perUserRoot = $targetPlan.PerUserRoot
      systemRoots = $targetPlan.SystemRoots
    }
    installAttempts = $installAttempts
    installTargets = $installedTargets
    registryBefore = $registryBefore
    registryAfter = $registryAfter
    duplicateBundles = @($duplicateBundles)
    higherPriorityConflicts = @($systemConflicts)
    warnings = @($warnings)
    logPath = $installLogPath
    readiness = [PSCustomObject]@{
      preconditionsReady = $preconditionsReady
      hostLoadEvidenceConfirmed = $hostLoadConfirmed
      hostLoadErrorSignalsDetected = $hostLoadErrorSignals
      hostPreconditionsReady = $hostPreconditionsReady
      bundleInstalled = ($installedTargets.Count -gt 0)
      unsignedExtensionSupportReady = ($missingRegistry.Count -eq 0)
      currentUserInstalled = $currentInstalled
      allUsersInstalled = $systemInstalled
      higherPriorityConflictDetected = ($systemConflicts.Count -gt 0)
      readyForHosts = $readyForHosts
      windowMenuPaths = @(
        "Window > Extensions > FastLoop",
        "Window > Extensions (Legacy) > FastLoop"
      )
      nextSteps = @(
        "Restart Premiere Pro or After Effects if the host was open during install.",
        "Open FastLoop from Window > Extensions (Legacy) on newer Adobe builds, or Window > Extensions on older builds."
      )
    }
    hostReadiness = @($hostReadiness)
    packagedReadinessHelperPath = $readinessHelperPath
  }
  $script:LastInstallSummary = $summary

  Write-JsonFile -Path $installSummaryPath -Value $summary
  Copy-Item -LiteralPath $installSummaryPath -Destination $latestSummaryPath -Force
  Copy-Item -LiteralPath $installLogPath -Destination $latestLogPath -Force

  if (-not $readyForHosts) {
    throw "FastLoop install completed, but host readiness is not reliable yet. Review install-latest.json for warnings, higher-priority conflicts, or missing AllUsers coverage."
  }

  Write-InstallLog -LogPath $installLogPath -Message "FastLoop installed and verified for Premiere Pro and After Effects."
  Write-Host "FastLoop installed and verified for Premiere Pro and After Effects."
  if ($systemInstalled) {
    Write-Host "AllUsers CEP root was installed successfully."
  } elseif ($currentInstalled) {
    Write-Host "CurrentUser CEP root was installed successfully."
  }
  Write-Host "Install log: $installLogPath"
  if (Test-Path -LiteralPath $readinessHelperPath) {
    Write-Host "Next step: run host diagnostics if needed:"
    Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File `"$readinessHelperPath`" -InstallScope $effectiveInstallScope -RegistryBasePath `"$RegistryBasePath`" -LogDirectory `"$logRoot`""
  }
  exit 0
} catch {
  $errorMessage = $_.Exception.Message
  Write-InstallLog -LogPath $installLogPath -Message "Install failed: $errorMessage"
  $failureSummary = if ($script:LastInstallSummary) {
    [PSCustomObject]@{
      succeeded = $false
      error = $errorMessage
      summary = $script:LastInstallSummary
    }
  } else {
    [PSCustomObject]@{
      version = $script:FastLoopVersion
      succeeded = $false
      error = $errorMessage
      logPath = $installLogPath
      installRoot = $InstallRoot
      installScope = $InstallScope
      registryBasePath = $RegistryBasePath
    }
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
