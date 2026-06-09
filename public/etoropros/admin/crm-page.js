/** Load shell + bottom guide + ? help for every ETOROPROS admin page. */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var pageId = script.getAttribute("data-crm-page") || "";
  var base = script.getAttribute("data-base") || "/etoropros/encyclopedia/";

  function load(src, attrs) {
    var s = document.createElement("script");
    s.src = src;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.body.appendChild(s);
  }

  load("/etoropros/admin/crm-shell.js", { "data-crm-page": pageId });
  load("/etoropros/admin/dynamic-guide.js", { "data-crm-page": pageId, "data-base": base });
  load("/etoropros/encyclopedia/help-widget.js", { "data-crm-page": pageId, "data-base": base });
})();
