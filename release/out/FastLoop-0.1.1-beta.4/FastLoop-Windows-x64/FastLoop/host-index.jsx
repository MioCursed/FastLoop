// CEP loads this file as the host-side entrypoint.
// We keep application-specific bridge code in separate host folders and load
// the matching adapter here so panel calls can stay clean.

(function () {
  function loadHostScript(relativePath) {
    var current = new File($.fileName);
    var file = new File(current.path + "/" + relativePath);
    if (file.exists) {
      $.evalFile(file);
    }
  }

  // Load both adapters defensively.
  // Host routing still occurs from the panel bridge via CSInterface host IDs
  // (PPRO / AEFT), but loading both namespaces here avoids brittle dependence
  // on localized/non-standard app.name strings.
  loadHostScript("host-premiere/jsx/fastloop_premiere.jsx");
  loadHostScript("host-aftereffects/jsx/fastloop_aftereffects.jsx");
})();
