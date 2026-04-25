(function () {
  function getCepBridge() {
    return typeof window !== "undefined" ? window.__adobe_cep__ : undefined;
  }

  function CSInterface() {}

  CSInterface.prototype.getApplicationID = function () {
    var cep = getCepBridge();
    if (!cep || typeof cep.getApplicationID !== "function") {
      return "";
    }
    return cep.getApplicationID();
  };

  CSInterface.prototype.evalScript = function (script, callback) {
    var cep = getCepBridge();
    if (!cep || typeof cep.evalScript !== "function") {
      if (typeof callback === "function") {
        callback("");
      }
      return "";
    }
    return cep.evalScript(script, callback);
  };

  window.CSInterface = window.CSInterface || CSInterface;
})();
