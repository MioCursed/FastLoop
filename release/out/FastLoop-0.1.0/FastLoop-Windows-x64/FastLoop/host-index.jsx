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

  if (app.name === "Adobe Premiere Pro") {
    loadHostScript("../host-premiere/jsx/fastloop_premiere.jsx");
  } else if (app.name === "Adobe After Effects") {
    loadHostScript("../host-aftereffects/jsx/fastloop_aftereffects.jsx");
  }
})();
