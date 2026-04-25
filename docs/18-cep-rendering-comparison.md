# CEP rendering comparison

Reference inspected: `C:\Users\Nataniel\Downloads\pp-organizer v1.2.6.rar`, extracted locally to `.fastloop-output/pp-organizer-reference/yzl.pporganizer-v1.2.6`.

## What PP Organizer does that FastLoop should imitate

- Uses CEP bundle-local paths from the manifest: `./index.html` and `./host.jsx`.
- Loads panel assets with relative HTML paths: `style.css`, `logo.png`, `CSInterface.js`, and `main.js`.
- Ships `CSInterface.js` inside the extension folder instead of assuming the constructor exists globally.
- Keeps the host-side JSX entrypoint inside the extension package.

## What FastLoop should not copy

- PP Organizer is Premiere-only; FastLoop should remain one shared extension for Premiere Pro and After Effects.
- PP Organizer keeps all panel JS/CSS at the extension root; FastLoop can keep Vite's `dist/assets` layout as long as generated paths are relative.
- PP Organizer evaluates `host.jsx` from panel JavaScript; FastLoop should keep the manifest `ScriptPath` plus `host-index.jsx` adapter loading.
- PP Organizer's tiny `CSInterface.js` only implements the calls it needs; FastLoop's shim must also provide `getApplicationID()` because host routing depends on it.

## Relevant to CEP panel rendering

The rendering-sensitive pattern is not PP Organizer's UI or installer shape; it is the local-file loading model. CEP opens the extension HTML from disk, so root-absolute paths such as `/assets/index.js` can resolve outside the extension bundle. FastLoop's built `index.html` must use `./assets/...` for Vite output and include a local `CSInterface.js` before the app bundle initializes.
