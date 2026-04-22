if (typeof $._fastloopPremiere === "undefined") {
  $._fastloopPremiere = {};
}

$._fastloopPremiere.parseJson = function (raw) {
  return JSON.parse(raw);
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
