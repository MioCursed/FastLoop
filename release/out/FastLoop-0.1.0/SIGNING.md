# Signing Roadmap

FastLoop currently ships unsigned prerelease assets for local validation and GitHub Releases testing.

## Current State

- `FastLoop-Windows-x64-Setup.exe` is generated and usable as an unsigned prerelease installer
- `FastLoop-Windows-x64.zip` is generated and usable as an unsigned portable package
- the CEP bundle and packaged runtime are included in the release output

## Future Signed Release Requirements

To move from prerelease assets to signed production-grade releases, the pipeline still needs:

- Windows code-signing certificate material for the installer executable
- CEP/ZXP signing assets if the Adobe distribution path moves to signed CEP packaging
- GitHub Actions secrets for signing credentials
- real signing commands inserted into the release workflow

## Planned Secret Names

- `WINDOWS_CODE_SIGN_CERT_BASE64`
- `WINDOWS_CODE_SIGN_PASSWORD`
- `CEP_SIGN_CERT_BASE64`
- `CEP_SIGN_CERT_PASSWORD`
- `FASTLOOP_RELEASE_TOKEN` if a dedicated release token becomes necessary

## Current Practical Boundary

The repo is now structured so unsigned GitHub Releases can be built and published automatically, while the signing hooks remain clearly separated and ready for future implementation.
