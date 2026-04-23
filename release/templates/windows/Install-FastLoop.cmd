@echo off
setlocal
echo FastLoop Installer
echo.
echo This installer works best with Premiere Pro / After Effects closed.
echo Use -AllowRunningHosts only if you know what you're doing.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-FastLoop.ps1" -BundleDirectory "%~dp0FastLoop" %*
exit /b %ERRORLEVEL%
