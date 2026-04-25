# Windows Installer Wizard

FastLoop uses Inno Setup for the primary Windows x64 release installer:

- `FastLoop-Windows-x64-Setup.exe`

The portable fallback remains:

- `FastLoop-Windows-x64.zip`

## Wizard Flow

The setup wizard follows a normal desktop installer structure:

1. language selection
2. welcome/about page
3. license/terms page
4. destination/options page for installer support files
5. additional tasks page
6. ready to install page
7. installing progress page
8. completion page

Supported languages:

- English
- Brazilian Portuguese

## What Gets Installed

FastLoop is a CEP extension, not a standalone desktop app. The setup wizard
places installer support files under the chosen destination, then calls the
packaged PowerShell helper:

- `Install-FastLoop.ps1`

That helper installs the actual CEP bundle, packaged engine runtime, host JSX
payloads, and manifest into Adobe CEP extension roots.

Default behavior:

- CurrentUser CEP install is the default.
- AllUsers can be preferred when the setup process has administrator rights.
- The packaged engine runtime is included in the CEP bundle.
- Install logs are written to `%LOCALAPPDATA%\FastLoop\Logs`.
- Verification writes `install-verification.json` into the installed bundle.

## Installer Options

Useful FastLoop tasks include:

- run the FastLoop host-readiness check after install
- create Start Menu entries for the install guide and logs folder
- open the install guide after install
- enable unsigned CEP prerelease support
- prefer AllUsers CEP install if administrator privileges are available

Unsigned prerelease support enables `PlayerDebugMode=1` under:

- `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
- `HKEY_CURRENT_USER\Software\Adobe\CSXS.12`
- `HKEY_CURRENT_USER\Software\Adobe\CSXS.13`

## Verification

The wizard does not mark setup as successful until `Install-FastLoop.ps1`
exits successfully. The helper verifies:

- required CEP bundle files exist
- manifest resource paths stay inside the bundle
- the packaged runtime exists
- PlayerDebugMode is ready when enabled
- duplicate or stale FastLoop bundles are reported
- Premiere Pro and After Effects readiness reports can be generated

If verification fails, setup fails visibly and the logs explain why.

## Opening FastLoop

After setup, restart Premiere Pro or After Effects and open:

- `Window > Extensions (Legacy) > FastLoop`
- `Window > Extensions > FastLoop`

The completion page shows these menu paths and can run the readiness helper,
open the install guide, or open the logs folder.

## Zip Fallback

Use `FastLoop-Windows-x64.zip` only when the setup wizard cannot be used.

1. Extract the zip.
2. Run `Install-FastLoop.cmd`.
3. Restart Premiere Pro or After Effects.
4. Open FastLoop from the Adobe host extension menu.

The zip contains the same CEP bundle, runtime, install helper, readiness helper,
install guide, troubleshooting guide, and prerelease terms used by the wizard.
