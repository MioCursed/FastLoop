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
english.InstallFailed=FastLoop setup could not complete because {0}.%n%nOpen %LOCALAPPDATA%\FastLoop\Logs\setup-latest.log for details.%nYou can also extract FastLoop-Windows-x64.zip and run Install-FastLoop.cmd.
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
brazilianportuguese.InstallFailed=O instalador do FastLoop nao conseguiu concluir porque {0}.%n%nAbra %LOCALAPPDATA%\FastLoop\Logs\setup-latest.log para detalhes.%nVoce tambem pode extrair FastLoop-Windows-x64.zip e executar Install-FastLoop.cmd.
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
Source: "{#SourceDir}\Install-FastLoop.cmd"; DestDir: "{app}\Payload"; Flags: ignoreversion
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
function SetupLogDirectory(): String;
begin
  Result := ExpandConstant('{localappdata}\FastLoop\Logs');
end;

function SetupRecoveryDirectory(): String;
begin
  Result := ExpandConstant('{localappdata}\FastLoop\Recovery');
end;

function SetupLatestLogPath(): String;
begin
  Result := SetupLogDirectory() + '\setup-latest.log';
end;

function SetupLatestJsonPath(): String;
begin
  Result := SetupLogDirectory() + '\setup-latest.json';
end;

function HelperStdoutPath(): String;
begin
  Result := SetupLogDirectory() + '\setup-helper-stdout.log';
end;

function HelperStderrPath(): String;
begin
  Result := SetupLogDirectory() + '\setup-helper-stderr.log';
end;

function RecoveryZipPath(): String;
begin
  Result := SetupRecoveryDirectory() + '\FastLoop-Windows-x64.zip';
end;

function JsonEscape(Value: String): String;
begin
  StringChangeEx(Value, '\', '\\', True);
  StringChangeEx(Value, '"', '\"', True);
  StringChangeEx(Value, #13, '\r', True);
  StringChangeEx(Value, #10, '\n', True);
  Result := Value;
end;

function SetupTimestamp(): String;
begin
  Result := GetDateTimeString('yyyy-mm-dd"T"hh:nn:ss', '-', ':');
end;

procedure AppendSetupLog(Message: String);
var
  LogPath: String;
begin
  ForceDirectories(SetupLogDirectory());
  LogPath := SetupLatestLogPath();
  SaveStringToFile(LogPath, '[' + SetupTimestamp() + '] ' + Message + #13#10, True);
end;

function ReadTextSnippet(Path: String; MaxChars: Integer): String;
var
  Content: AnsiString;
  Text: String;
begin
  Result := '';
  if LoadStringFromFile(Path, Content) then
  begin
    Text := Content;
    if Length(Text) > MaxChars then
      Result := Copy(Text, 1, MaxChars) + '...'
    else
      Result := Text;
  end;
end;

function FileExistsText(Path: String): String;
begin
  if FileExists(Path) then
    Result := 'true'
  else
    Result := 'false';
end;

function DirExistsText(Path: String): String;
begin
  if DirExists(Path) then
    Result := 'true'
  else
    Result := 'false';
end;

function BoolArg(Value: Boolean): String;
begin
  if Value then
    Result := '$true'
  else
    Result := '$false';
end;

function JsonBool(Value: Boolean): String;
begin
  if Value then
    Result := 'true'
  else
    Result := 'false';
end;

function SelectedInstallScope(): String;
begin
  if WizardIsTaskSelected('preferallusers') then
    Result := 'Auto'
  else
    Result := 'CurrentUser';
end;

function PowerShellQuote(Value: String): String;
begin
  StringChangeEx(Value, '''', '''''', True);
  Result := '''' + Value + '''';
end;

function CmdQuote(Value: String): String;
begin
  StringChangeEx(Value, '"', '\"', True);
  Result := '"' + Value + '"';
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

function BuildInstallCommandForLog(): String;
begin
  Result := 'powershell.exe ' + BuildInstallArgs();
end;

function BuildInstallCmdArgs(): String;
begin
  Result :=
    '/S /C ""powershell.exe" ' +
    BuildInstallArgs() +
    ' 1> ' + CmdQuote(HelperStdoutPath()) +
    ' 2> ' + CmdQuote(HelperStderrPath()) +
    '"';
end;

function NormalizeExitCode(ResultCode: Integer): String;
begin
  if ResultCode < 0 then
    Result := IntToStr(ResultCode + 4294967296)
  else
    Result := IntToStr(ResultCode);
end;

function DetectFailureCategory(ResultCode: Integer): String;
var
  PayloadZip: String;
  HelperScript: String;
  HelperCmd: String;
  StderrSnippet: String;
  StdoutSnippet: String;
begin
  PayloadZip := ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip');
  HelperScript := ExpandConstant('{app}\Payload\Install-FastLoop.ps1');
  HelperCmd := ExpandConstant('{app}\Payload\Install-FastLoop.cmd');
  StderrSnippet := Lowercase(ReadTextSnippet(HelperStderrPath(), 4000));
  StdoutSnippet := Lowercase(ReadTextSnippet(HelperStdoutPath(), 4000));

  if not FileExists(PayloadZip) then
    Result := 'the bundled payload zip is missing'
  else if not FileExists(HelperScript) then
    Result := 'the install helper script is missing'
  else if not FileExists(HelperCmd) then
    Result := 'the portable install command is missing'
  else if Pos('expand-archive', StderrSnippet) > 0 then
    Result := 'the bundled payload could not be extracted'
  else if (Pos('playerdebugmode', StderrSnippet) > 0) or (Pos('registry', StderrSnippet) > 0) then
    Result := 'the Adobe CEP registry readiness step failed'
  else if (Pos('not writable', StderrSnippet) > 0) or (Pos('access is denied', StderrSnippet) > 0) then
    Result := 'a CEP install target was not writable'
  else if (Pos('verification', StderrSnippet) > 0) or (Pos('readiness', StderrSnippet) > 0) or (Pos('not reliable', StderrSnippet) > 0) then
    Result := 'post-install verification failed'
  else if (Pos('powershell', StderrSnippet) > 0) or (Pos('powershell', StdoutSnippet) > 0) or (ResultCode = -196608) then
    Result := 'PowerShell failed while running the install helper'
  else if ResultCode <> 0 then
    Result := 'the install helper failed before verification'
  else
    Result := 'an unknown setup wrapper failure occurred';
end;

procedure WriteSetupSummary(Stage: String; Category: String; ResultCode: Integer);
var
  Json: String;
begin
  ForceDirectories(SetupLogDirectory());
  Json :=
    '{' + #13#10 +
    '  "product": "FastLoop",' + #13#10 +
    '  "setupVersion": "' + JsonEscape('{#AppVersion}') + '",' + #13#10 +
    '  "stage": "' + JsonEscape(Stage) + '",' + #13#10 +
    '  "category": "' + JsonEscape(Category) + '",' + #13#10 +
    '  "rawExitCode": ' + IntToStr(ResultCode) + ',' + #13#10 +
    '  "normalizedExitCode": "' + JsonEscape(NormalizeExitCode(ResultCode)) + '",' + #13#10 +
    '  "installerPath": "' + JsonEscape(ExpandConstant('{srcexe}')) + '",' + #13#10 +
    '  "appDirectory": "' + JsonEscape(ExpandConstant('{app}')) + '",' + #13#10 +
    '  "workingDirectory": "' + JsonEscape(ExpandConstant('{app}\Payload')) + '",' + #13#10 +
    '  "payloadZipPath": "' + JsonEscape(ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip')) + '",' + #13#10 +
    '  "installHelperPath": "' + JsonEscape(ExpandConstant('{app}\Payload\Install-FastLoop.ps1')) + '",' + #13#10 +
    '  "installCmdPath": "' + JsonEscape(ExpandConstant('{app}\Payload\Install-FastLoop.cmd')) + '",' + #13#10 +
    '  "payloadZipExists": ' + FileExistsText(ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip')) + ',' + #13#10 +
    '  "installHelperExists": ' + FileExistsText(ExpandConstant('{app}\Payload\Install-FastLoop.ps1')) + ',' + #13#10 +
    '  "installCmdExists": ' + FileExistsText(ExpandConstant('{app}\Payload\Install-FastLoop.cmd')) + ',' + #13#10 +
    '  "powershellPath": "powershell.exe",' + #13#10 +
    '  "isAdminInstallMode": ' + JsonBool(IsAdminInstallMode()) + ',' + #13#10 +
    '  "username": "' + JsonEscape(GetUserNameString()) + '",' + #13#10 +
    '  "installScope": "' + JsonEscape(SelectedInstallScope()) + '",' + #13#10 +
    '  "enableUnsignedPanelSupport": ' + JsonBool(WizardIsTaskSelected('unsigned')) + ',' + #13#10 +
    '  "setupLogPath": "' + JsonEscape(SetupLatestLogPath()) + '",' + #13#10 +
    '  "helperStdoutPath": "' + JsonEscape(HelperStdoutPath()) + '",' + #13#10 +
    '  "helperStderrPath": "' + JsonEscape(HelperStderrPath()) + '",' + #13#10 +
    '  "installLatestLogPath": "' + JsonEscape(ExpandConstant('{localappdata}\FastLoop\Logs\install-latest.log')) + '",' + #13#10 +
    '  "installLatestJsonPath": "' + JsonEscape(ExpandConstant('{localappdata}\FastLoop\Logs\install-latest.json')) + '",' + #13#10 +
    '  "recoveryZipPath": "' + JsonEscape(RecoveryZipPath()) + '"' + #13#10 +
    '}' + #13#10;
  SaveStringToFile(SetupLatestJsonPath(), Json, False);
end;

procedure LogSetupPreflight();
begin
  ForceDirectories(SetupLogDirectory());
  ForceDirectories(SetupRecoveryDirectory());
  SaveStringToFile(SetupLatestLogPath(), '', False);
  SaveStringToFile(HelperStdoutPath(), '', False);
  SaveStringToFile(HelperStderrPath(), '', False);
  AppendSetupLog('Starting FastLoop setup wrapper {#AppVersion}');
  AppendSetupLog('Installer path: ' + ExpandConstant('{srcexe}'));
  AppendSetupLog('Application directory: ' + ExpandConstant('{app}'));
  AppendSetupLog('Working directory: ' + ExpandConstant('{app}\Payload'));
  AppendSetupLog('Expected payload zip: ' + ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip') + ' exists=' + FileExistsText(ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip')));
  AppendSetupLog('Expected Install-FastLoop.ps1: ' + ExpandConstant('{app}\Payload\Install-FastLoop.ps1') + ' exists=' + FileExistsText(ExpandConstant('{app}\Payload\Install-FastLoop.ps1')));
  AppendSetupLog('Expected Install-FastLoop.cmd: ' + ExpandConstant('{app}\Payload\Install-FastLoop.cmd') + ' exists=' + FileExistsText(ExpandConstant('{app}\Payload\Install-FastLoop.cmd')));
  AppendSetupLog('Log directory writable: ' + DirExistsText(SetupLogDirectory()));
  AppendSetupLog('PowerShell executable: powershell.exe');
  AppendSetupLog('Admin install mode: ' + BoolArg(IsAdminInstallMode()));
  AppendSetupLog('Current username: ' + GetUserNameString());
  AppendSetupLog('Install scope: ' + SelectedInstallScope());
  AppendSetupLog('Enable unsigned CEP support: ' + BoolArg(WizardIsTaskSelected('unsigned')));
  AppendSetupLog('CEP registry targets: HKCU\Software\Adobe\CSXS.11, CSXS.12, CSXS.13');
  AppendSetupLog('Portable fallback: extract FastLoop-Windows-x64.zip and run Install-FastLoop.cmd.');
  WriteSetupSummary('preflight', 'pending', 0);
end;

procedure CopyRecoveryPayload();
begin
  ForceDirectories(SetupRecoveryDirectory());
  if FileExists(ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip')) then
  begin
    if CopyFile(ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip'), RecoveryZipPath(), False) then
      AppendSetupLog('Copied portable recovery zip to ' + RecoveryZipPath())
    else
      AppendSetupLog('Could not copy portable recovery zip to ' + RecoveryZipPath());
  end;
end;

procedure FailSetup(Category: String; ResultCode: Integer);
var
  StdoutSnippet: String;
  StderrSnippet: String;
begin
  CopyRecoveryPayload();
  StdoutSnippet := ReadTextSnippet(HelperStdoutPath(), 1800);
  StderrSnippet := ReadTextSnippet(HelperStderrPath(), 1800);
  AppendSetupLog('Failure category: ' + Category);
  AppendSetupLog('Raw exit code: ' + IntToStr(ResultCode));
  AppendSetupLog('Normalized exit code: ' + NormalizeExitCode(ResultCode));
  AppendSetupLog('Command: ' + BuildInstallCommandForLog());
  if StdoutSnippet <> '' then
    AppendSetupLog('Helper stdout snippet: ' + StdoutSnippet);
  if StderrSnippet <> '' then
    AppendSetupLog('Helper stderr snippet: ' + StderrSnippet);
  AppendSetupLog('FastLoop install log should be at ' + ExpandConstant('{localappdata}\FastLoop\Logs\install-latest.log') + ' if the helper started far enough to create it.');
  AppendSetupLog('Fallback: open ' + RecoveryZipPath() + ', extract it, and run Install-FastLoop.cmd. Run this setup as administrator only if your Adobe environment requires AllUsers CEP roots.');
  AppendSetupLog('Close Premiere Pro and After Effects before retrying.');
  WriteSetupSummary('failed', Category, ResultCode);
  MsgBox(FmtMessage(ExpandConstant('{cm:InstallFailed}'), [Category]), mbCriticalError, MB_OK);
  RaiseException('FastLoop setup failed: ' + Category + ' (exit code ' + IntToStr(ResultCode) + '). See ' + SetupLatestLogPath());
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  Category: String;
begin
  if CurStep = ssPostInstall then
  begin
    LogSetupPreflight();
    CopyRecoveryPayload();

    if not FileExists(ExpandConstant('{app}\Payload\FastLoop-Windows-x64.zip')) then
      FailSetup('the bundled payload zip is missing', 9001);

    if not FileExists(ExpandConstant('{app}\Payload\Install-FastLoop.ps1')) then
      FailSetup('the install helper script is missing', 9002);

    if not FileExists(ExpandConstant('{app}\Payload\Install-FastLoop.cmd')) then
      FailSetup('the portable install command is missing', 9003);

    AppendSetupLog('Executing helper command: ' + BuildInstallCommandForLog());
    AppendSetupLog('Helper stdout: ' + HelperStdoutPath());
    AppendSetupLog('Helper stderr: ' + HelperStderrPath());

    if not Exec(ExpandConstant('{cmd}'), BuildInstallCmdArgs(), ExpandConstant('{app}\Payload'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      FailSetup('PowerShell could not be started for FastLoop installation', 9004);

    if ResultCode <> 0 then
    begin
      Category := DetectFailureCategory(ResultCode);
      FailSetup(Category, ResultCode);
    end;

    AppendSetupLog('FastLoop install helper completed successfully.');
    WriteSetupSummary('succeeded', 'success', 0);
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
