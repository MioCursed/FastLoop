import { readFile } from "node:fs/promises";
import vm from "node:vm";

const workspaceRoot = "c:/Users/Nataniel/Downloads/FastLoop";

async function runPremiereValidation() {
  const code = await readFile(`${workspaceRoot}/host-premiere/jsx/fastloop_premiere.jsx`, "utf8");
  const createdMarkers = [];
  const context = {
    JSON,
    $: {},
    app: {
      project: {
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
  return createdMarkers;
}

async function runAfterEffectsValidation() {
  const code = await readFile(`${workspaceRoot}/host-aftereffects/jsx/fastloop_aftereffects.jsx`, "utf8");
  const placedMarkers = [];
  const context = {
    JSON,
    $: {},
    MarkerValue: function MarkerValue(name) {
      this.name = name;
      this.comment = "";
    },
    app: {
      project: {
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
  return placedMarkers;
}

const [premiereMarkers, afterEffectsMarkers] = await Promise.all([
  runPremiereValidation(),
  runAfterEffectsValidation()
]);

console.log(
  JSON.stringify(
    {
      premiereMarkers: premiereMarkers.length,
      afterEffectsMarkers: afterEffectsMarkers.length,
      firstPremiereMarkerTime: premiereMarkers[0].time,
      firstAfterEffectsMarkerTime: afterEffectsMarkers[0].time
    },
    null,
    2
  )
);
