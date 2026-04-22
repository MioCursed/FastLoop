if (typeof $._fastloopPremiere === "undefined") {
  $._fastloopPremiere = {};
}

$._fastloopPremiere.parseJson = function (raw) {
  return JSON.parse(raw);
};

$._fastloopPremiere.importRenderedAsset = function (assetPath) {
  if (!assetPath) {
    return "skipped";
  }

  var project = app.project;
  if (!project || !project.importFiles) {
    return "Rendered asset import unavailable in Premiere.";
  }

  var targetBin = project.rootItem || 0;
  var imported = project.importFiles([assetPath], true, targetBin, false);
  return imported ? "ok" : "Rendered asset import failed.";
};

$._fastloopPremiere.placeMarkers = function (raw) {
  try {
    var payload = $._fastloopPremiere.parseJson(raw);
    var project = app.project;
    var sequence = project.activeSequence;

    if (!sequence) {
      return "No active Premiere sequence.";
    }

    var candidate = payload.candidate;
    var markers = sequence.markers;

    var inMarker = markers.createMarker(candidate.startSeconds);
    inMarker.name = "FastLoop In";
    inMarker.comments = "Loop start for " + payload.trackId;

    var outMarker = markers.createMarker(candidate.endSeconds);
    outMarker.name = "FastLoop Out";
    outMarker.comments = "Loop end for " + payload.trackId;

    return "ok";
  } catch (error) {
    return error.toString();
  }
};

$._fastloopPremiere.commitCandidate = function (raw) {
  try {
    var placement = $._fastloopPremiere.placeMarkers(raw);
    if (placement !== "ok") {
      return placement;
    }

    var payload = $._fastloopPremiere.parseJson(raw);
    var sequence = app.project.activeSequence;
    if (!sequence) {
      return "No active Premiere sequence.";
    }

    var importedAsset = $._fastloopPremiere.importRenderedAsset(payload.renderedAssetPath);
    if (importedAsset !== "ok" && importedAsset !== "skipped") {
      return importedAsset;
    }

    var commitMarker = sequence.markers.createMarker(payload.candidate.startSeconds);
    commitMarker.name = "FastLoop Commit";
    commitMarker.comments =
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

    return "ok";
  } catch (error) {
    return error.toString();
  }
};
