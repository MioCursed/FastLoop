if (typeof $._fastloopAfterEffects === "undefined") {
  $._fastloopAfterEffects = {};
}

$._fastloopAfterEffects.parseJson = function (raw) {
  return JSON.parse(raw);
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
