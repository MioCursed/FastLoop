#define AppName "FastLoop"
#define AppPublisher "MioCursed / FastLoop"
#ifndef AppVersion
#define AppVersion "0.0.0"
#endif
#ifndef AppVersionNumeric
#define AppVersionNumeric 0.0.0.0
#endif
#ifndef SourceDir
#define SourceDir "..\build\installer\FastLoop"
#endif
#ifndef OutputDir
#define OutputDir "..\out"
#endif

[Setup]
AppId={{2D3D0616-FD7B-4B5E-A908-6B2E03E7D35A}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=https://github.com/MioCursed/FastLoop
AppSupportURL=https://github.com/MioCursed/FastLoop
AppUpdatesURL=https://github.com/MioCursed/FastLoop/releases
DefaultDirName={localappdata}\Programs\FastLoop Installer
DefaultGroupName=FastLoop
DisableProgramGroupPage=no
LicenseFile={#SourceDir}\LICENSE-TERMS.txt
OutputDir={#OutputDir}
OutputBaseFilename=FastLoop-Windows-x64-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
SetupLogging=yes
UninstallDisplayName=FastLoop installer support files
Uninstallable=yes
VersionInfoVersion={#AppVersionNumeric}
VersionInfoCompany={#AppPublisher}
VersionInfoDescription=FastLoop Windows x64 Setup Wizard
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersionNumeric}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Messages]
english.WelcomeLabel1=Welcome to the [name] Setup Wizard
english.WelcomeLabel2=This wizard installs the FastLoop CEP extension for Adobe Premiere Pro and After Effects.%n%nClose Adobe host applications before continuing.
brazilianportuguese.WelcomeLabel1=Bem-vindo ao Assistente de Instalacao do [name]
brazilianportuguese.WelcomeLabel2=Este assistente instala a extensao CEP FastLoop para Adobe Premiere Pro e After Effects.%n%nFeche os aplicativos Adobe antes de continuar.

[CustomMessages]
english.ReadyMemoInstallScope=CEP install scope:
english.ScopeCurrentUser=Current user CEP root
english.ScopePreferAllUsers=Prefer AllUsers CEP root when administrator permissions are available
english.ReadyMemoUnsigned=Unsigned prerelease support:
english.UnsignedEnabled=Enable PlayerDebugMode for CEP CSXS.11, CSXS.12, and CSXS.13
english.UnsignedDisabled=Do not change PlayerDebugMode
english.InstallFailedTitle=FastLoop installation failed
english.InstallFailed=FastLoop setup could not complete. Review the installer log and FastLoop logs under %LOCALAPPDATA%\FastLoop\Logs.
english.FinishInfo=Open FastLoop from Premiere Pro or After Effects:%n%nWindow > Extensions (Legacy) > FastLoop%nWindow > Extensions > FastLoop%n%nFastLoop is a CEP extension, not a standalone desktop app.
english.RunReadiness=Run FastLoop readiness check now
english.OpenGuide=Open FastLoop install guide
english.OpenLogs=Open FastLoop logs folder
english.OpenDocsShortcut=FastLoop Install Guide
english.OpenLogsShortcut=FastLoop Logs

brazilianportuguese.ReadyMemoInstallScope=Escopo de instalacao CEP:
brazilianportuguese.ScopeCurrentUser=Raiz CEP do usuario atual
brazilianportuguese.ScopePreferAllUsers=Preferir raiz CEP AllUsers quando houver permissao de administrador
brazilianportuguese.ReadyMemoUnsigned=Suporte a prerelease nao assinado:
brazilianportuguese.UnsignedEnabled=Ativar PlayerDebugMode para CEP CSXS.11, CSXS.12 e CSXS.13
brazilianportuguese.UnsignedDisabled=Nao alterar PlayerDebugMode
brazilianportuguese.InstallFailedTitle=A instalacao do FastLoop falhou
brazilianportuguese.InstallFailed=O instalador do FastLoop nao conseguiu concluir. Revise o log do instalador e os logs do FastLoop em %LOCALAPPDATA%\FastLoop\Logs.
brazilianportuguese.FinishInfo=Abra o FastLoop pelo Premiere Pro ou After Effects:%n%nWindow > Extensions (Legacy) > FastLoop%nWindow > Extensions > FastLoop%n%nFastLoop e uma extensao CEP, nao um aplicativo desktop independente.
brazilianportuguese.RunReadiness=Executar verificacao de prontidao do FastLoop agora
brazilianportuguese.OpenGuide=Abrir guia de instalacao do FastLoop
brazilianportuguese.OpenLogs=Abrir pasta de logs do FastLoop
brazilianportuguese.OpenDocsShortcut=Guia de Instalacao do FastLoop
brazilianportuguese.OpenLogsShortcut=Logs do FastLoop

[Tasks]
Name: "unsigned"; Description: "{cm:UnsignedEnabled}"; GroupDescription: "FastLoop CEP options:"; Flags: checkedonce
Name: "preferallusers"; Description: "{cm:ScopePreferAllUsers}"; GroupDescription: "FastLoop CEP options:"; Check: IsAdminInstallMode
Name: "startmenuguide"; Description: "{cm:OpenDocsShortcut}"; GroupDescription: "Additional shortcuts:"; Flags: checkedonce
Name: "startmenulogs"; Description: "{cm:OpenLogsShortcut}"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "{#SourceDir}\FastLoop-Windows-x64.zip"; DestDir: "{app}\Payload"; Flags: ignoreversion
Source: "{#SourceDir}\Install-FastLoop.ps1"; DestDir: "{app}\Payload"; Flags: ignoreversion
Source: "{#SourceDir}\FastLoop-CEPCommon.ps1"; DestDir: "{app}\Payload"; Flags: ignoreversion
Source: "{#SourceDir}\Test-FastLoop-HostReadiness.ps1"; DestDir: "{app}\Payload"; Flags: ignoreversion
Source: "{#SourceDir}\INSTALL.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\TROUBLESHOOTING.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\LICENSE-TERMS.txt"; DestDir: "{app}"; Flags: ignoreversion

[Dirs]
Name: "{localappdata}\FastLoop\Logs"

[Icons]
Name: "{group}\{cm:OpenDocsShortcut}"; Filename: "{app}\INSTALL.md"; Tasks: startmenuguide
Name: "{group}\{cm:OpenLogsShortcut}"; Filename: "{localappdata}\FastLoop\Logs"; Tasks: startmenulogs

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Payload\Test-FastLoop-HostReadiness.ps1"" -InstallScope Auto -LogDirectory ""{localappdata}\FastLoop\Logs"""; Description: "{cm:RunReadiness}"; Flags: postinstall nowait skipifsilent unchecked
Filename: "{app}\INSTALL.md"; Description: "{cm:OpenGuide}"; Flags: postinstall shellexec skipifsilent unchecked
Filename: "{localappdata}\FastLoop\Logs"; Description: "{cm:OpenLogs}"; Flags: postinstall shellexec skipifsilent unchecked

[Code]
function BoolArg(Value: Boolean): String;
begin
  if Value then
    Result := '$true'
  else
    Result := '$false';
end;

function PowerShellQuote(Value: String): String;
begin
  StringChangeEx(Value, '''', '''''', True);
  Result := '''' + Value + '''';
end;

function BuildInstallArgs(): String;
begin
  Result :=
    '-NoProfile -ExecutionPolicy Bypass -File ' +
    PowerShellQuote(ExpandConstant('{app}\Payload\Install-FastLoop.ps1')) +
    ' -PayloadZip ' +
    PowerShellQuote(ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip'));

  if WizardIsTaskSelected('preferallusers') then
    Result := Result + ' -InstallScope Auto'
  else
    Result := Result + ' -InstallScope CurrentUser';

  Result := Result +
    ' -LogDirectory ' +
    PowerShellQuote(ExpandConstant('{localappdata}\FastLoop\Logs')) +
    ' -EnableUnsignedPanelSupport ' +
    BoolArg(WizardIsTaskSelected('unsigned'));

  if WizardIsTaskSelected('preferallusers') then
    Result := Result + ' -PreferAllUsers';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    if not Exec('powershell.exe', BuildInstallArgs(), '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
    begin
      MsgBox(ExpandConstant('{cm:InstallFailed}'), mbCriticalError, MB_OK);
      RaiseException('PowerShell could not be started for FastLoop installation.');
    end;

    if ResultCode <> 0 then
    begin
      MsgBox(ExpandConstant('{cm:InstallFailed}'), mbCriticalError, MB_OK);
      RaiseException('FastLoop install helper failed with exit code ' + IntToStr(ResultCode) + '.');
    end;
  end;
end;

procedure InitializeWizard();
begin
  WizardForm.FinishedLabel.Caption := ExpandConstant('{cm:FinishInfo}');
end;

function UpdateReadyMemo(
  Space,
  NewLine,
  MemoUserInfoInfo,
  MemoDirInfo,
  MemoTypeInfo,
  MemoComponentsInfo,
  MemoGroupInfo,
  MemoTasksInfo: String
): String;
var
  ScopeText: String;
  UnsignedText: String;
begin
  if WizardIsTaskSelected('preferallusers') then
    ScopeText := ExpandConstant('{cm:ScopePreferAllUsers}')
  else
    ScopeText := ExpandConstant('{cm:ScopeCurrentUser}');

  if WizardIsTaskSelected('unsigned') then
    UnsignedText := ExpandConstant('{cm:UnsignedEnabled}')
  else
    UnsignedText := ExpandConstant('{cm:UnsignedDisabled}');

  Result :=
    MemoDirInfo + NewLine + NewLine +
    ExpandConstant('{cm:ReadyMemoInstallScope}') + NewLine +
    Space + ScopeText + NewLine + NewLine +
    ExpandConstant('{cm:ReadyMemoUnsigned}') + NewLine +
    Space + UnsignedText + NewLine + NewLine +
    MemoTasksInfo;
end;
