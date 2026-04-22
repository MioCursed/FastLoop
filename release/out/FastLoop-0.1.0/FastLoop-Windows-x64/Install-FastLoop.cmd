@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-FastLoop.ps1" -BundleDirectory "%~dp0FastLoop"
exit /b %ERRORLEVEL%
