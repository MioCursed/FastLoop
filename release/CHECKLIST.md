# Release Checklist

1. Run `npm run typecheck`.
2. Run `python -m compileall engine/fastloop_engine engine/tests`.
3. Run `npm run build:shared`.
4. Run `npm run build:panel`.
5. Run `npm run build:mock`.
6. Run `npm run build:engine-runtime`.
7. Run `npm run runtime:validate`.
8. Run `npm run smoke:render`.
9. Run `npm run smoke:panel`.
10. Run `npm run smoke:panel:packaged`.
11. Run `npm run smoke:mock`.
12. Run `npm run smoke:host`.
13. Run `npm run docs:validate`.
14. Run `npm run release:build`.
15. Run `npm run release:validate`.
16. Confirm `release/out/FastLoop-<version>/` contains the CEP bundle, packaged runtime, install guide, and unsigned zip.
17. Sign the CEP bundle and wrap it in a true installer in the next release stage when required.
