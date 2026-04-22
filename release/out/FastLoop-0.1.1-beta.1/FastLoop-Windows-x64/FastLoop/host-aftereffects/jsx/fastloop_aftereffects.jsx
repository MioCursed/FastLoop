if (typeof $._fastloopAfterEffects === "undefined") {
  $._fastloopAfterEffects = {};
}

$._fastloopAfterEffects.parseJson = function (raw) {
  return JSON.parse(raw);
};

$._fastloopAfterEffects.importRenderedAsset = function (assetPath) {
  if (!assetPath) {
    return "skipped";
  }

  if (!app.project || !app.project.importFile || typeof ImportOptions === "undefined" || typeof File === "undefined") {
    return "Rendered asset import unavailable in After Effects.";
  }

  var importOptions = new ImportOptions(new File(assetPath));
  app.project.importFile(importOptions);
  return "ok";
};

$._fastloopAfterEffects.placeMarkers = function (raw) {
  try {
    var payload = $._fastloopAfterEffects.parseJson(raw);
    var item = app.project.activeItem;

    if (!item || !item.markerProperty) {
      return "No active After Effects comp.";
    }

    var candidate = payload.candidate;
    var inValue = new MarkerValue("FastLoop In");
    inValue.comment = "Loop start for " + payload.trackId;
    item.markerProperty.setValueAtTime(candidate.startSeconds, inValue);

    var outValue = new MarkerValue("FastLoop Out");
    outValue.comment = "Loop end for " + payload.trackId;
    item.markerProperty.setValueAtTime(candidate.endSeconds, outValue);

    return "ok";
  } catch (error) {
    return error.toString();
  }
};

$._fastloopAfterEffects.commitCandidate = function (raw) {
  try {
    var placement = $._fastloopAfterEffects.placeMarkers(raw);
    if (placement !== "ok") {
      return placement;
    }

    var payload = $._fastloopAfterEffects.parseJson(raw);
    var item = app.project.activeItem;
    if (!item || !item.markerProperty) {
      return "No active After Effects comp.";
    }

    var importedAsset = $._fastloopAfterEffects.importRenderedAsset(payload.renderedAssetPath);
    if (importedAsset !== "ok" && importedAsset !== "skipped") {
      return importedAsset;
    }

    var commitValue = new MarkerValue("FastLoop Commit");
    commitValue.comment =
      "Committed " +
      payload.candidate.id +
      " for " +
      payload.trackId +
      " (" +
      payload.candidate.startSeconds +
      " -> " +
      payload.candidate.endSeconds +
      ")" +
      (payload.renderedAssetPath ? " Imported: " + payload.renderedAssetPath : "");
    item.markerProperty.setValueAtTime(payload.candidate.startSeconds, commitValue);

    return "ok";
  } catch (error) {
    return error.toString();
  }
};
