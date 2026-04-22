import { readFile } from "node:fs/promises";
import vm from "node:vm";

const workspaceRoot = "c:/Users/Nataniel/Downloads/FastLoop";

async function runPremiereValidation() {
  const code = await readFile(`${workspaceRoot}/host-premiere/jsx/fastloop_premiere.jsx`, "utf8");
  const createdMarkers = [];
  const importedAssets = [];
  const context = {
    JSON,
    $: {},
    app: {
      project: {
        rootItem: { name: "Root" },
        importFiles(filePaths) {
          importedAssets.push(...filePaths);
          return true;
        },
        activeSequence: {
          markers: {
            createMarker(time) {
              const marker = { time, name: "", comments: "" };
              createdMarkers.push(marker);
              return marker;
            }
          }
        }
      }
    }
  };
  vm.runInNewContext(code, context);
  const result = context.$._fastloopPremiere.placeMarkers(
    JSON.stringify({
      trackId: "fixture-track",
      candidate: {
        id: "candidate-02",
        startSeconds: 4.5,
        endSeconds: 12.5
      }
    })
  );
  if (result !== "ok" || createdMarkers.length !== 2) {
    throw new Error("Premiere host payload validation failed.");
  }
  const commitResult = context.$._fastloopPremiere.commitCandidate(
    JSON.stringify({
      trackId: "fixture-track",
      candidate: {
        id: "candidate-02",
        startSeconds: 4.5,
        endSeconds: 12.5
      },
      renderedAssetPath: "C:/exports/candidate-02.extended.wav"
    })
  );
  if (commitResult !== "ok" || createdMarkers.length !== 5 || importedAssets.length !== 1) {
    throw new Error("Premiere host commit validation failed.");
  }
  return { createdMarkers, importedAssets };
}

async function runAfterEffectsValidation() {
  const code = await readFile(`${workspaceRoot}/host-aftereffects/jsx/fastloop_aftereffects.jsx`, "utf8");
  const placedMarkers = [];
  const context = {
    JSON,
    $: {},
    File: function File(path) {
      this.fsName = path;
    },
    ImportOptions: function ImportOptions(file) {
      this.file = file;
    },
    MarkerValue: function MarkerValue(name) {
      this.name = name;
      this.comment = "";
    },
    app: {
      project: {
        importFile(importOptions) {
          placedMarkers.push({ imported: importOptions.file.fsName });
          return { imported: true };
        },
        activeItem: {
          markerProperty: {
            setValueAtTime(time, markerValue) {
              placedMarkers.push({ time, marker: markerValue });
            }
          }
        }
      }
    }
  };
  vm.runInNewContext(code, context);
  const result = context.$._fastloopAfterEffects.placeMarkers(
    JSON.stringify({
      trackId: "fixture-track",
      candidate: {
        id: "candidate-02",
        startSeconds: 4.5,
        endSeconds: 12.5
      }
    })
  );
  if (result !== "ok" || placedMarkers.length !== 2) {
    throw new Error("After Effects host payload validation failed.");
  }
  const commitResult = context.$._fastloopAfterEffects.commitCandidate(
    JSON.stringify({
      trackId: "fixture-track",
      candidate: {
        id: "candidate-02",
        startSeconds: 4.5,
        endSeconds: 12.5
      },
      renderedAssetPath: "C:/exports/candidate-02.extended.wav"
    })
  );
  if (commitResult !== "ok" || placedMarkers.length !== 6) {
    throw new Error("After Effects host commit validation failed.");
  }
  return placedMarkers;
}

const [premiereMarkers, afterEffectsMarkers] = await Promise.all([
  runPremiereValidation(),
  runAfterEffectsValidation()
]);

console.log(
  JSON.stringify(
    {
      premiereMarkers: premiereMarkers.createdMarkers.length,
      afterEffectsMarkers: afterEffectsMarkers.length,
      firstPremiereMarkerTime: premiereMarkers.createdMarkers[0].time,
      firstAfterEffectsMarkerTime: afterEffectsMarkers[0].time,
      committedPremiereMarkerTime: premiereMarkers.createdMarkers[4].time,
      committedAfterEffectsMarkerTime: afterEffectsMarkers[5].time,
      premiereImportedAsset: premiereMarkers.importedAssets[0],
      afterEffectsImportedAsset: afterEffectsMarkers.find((entry) => entry.imported)?.imported
    },
    null,
    2
  )
);
