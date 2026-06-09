/**
 * ETOROPROS CRM — full sidebar (matches live etoropros menu).
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var active = script ? script.getAttribute("data-crm-page") || "" : "";

  function guide(page) {
    return "/etoropros/admin/guide.html?page=" + page;
  }

  var links = [
    { section: null, items: [
      { id: "dashboard", label: "Dashboard", href: "/etoropros/admin/index.html" },
      { id: "crm", label: "CRM", href: guide("crm") },
      { id: "cashier", label: "Cashier", href: guide("cashier") },
      { id: "trading", label: "Trading", href: guide("trading") },
      { id: "marketing", label: "Marketing", href: guide("marketing") },
      { id: "online", label: "Online", href: guide("online") },
    ]},
    { section: "System", items: [
      { id: "payment-gateways", label: "Payment Gateways", href: guide("payment-gateways") },
    ]},
    { section: "Super Admin", nested: true, items: [
      { id: "super-admin-configuration", label: "Configuration", href: guide("super-admin-configuration") },
      { id: "super-admin-error-logs", label: "Error Logs", href: "/etoropros/admin/error-logs.html" },
      { id: "super-admin-smtp-logs", label: "SMTP Logs", href: "/etoropros/admin/smtp-logs.html" },
      { id: "super-admin-balance-events", label: "Balance events", href: "/etoropros/admin/balance-events.html" },
      { id: "super-admin-history-logs", label: "History Logs", href: guide("super-admin-history-logs") },
      { id: "super-admin-order-storage-logs", label: "Order Storage Logs", href: "/etoropros/admin/order-storage-logs.html" },
    ]},
    { section: "Common", items: [
      { id: "common-countries", label: "Countries", href: guide("common-countries") },
      { id: "common-preferences", label: "Preferences", href: guide("common-preferences") },
      { id: "common-security", label: "Security", href: guide("common-security") },
      { id: "common-release-pdf", label: "Release Pdf", href: "/etoropros/admin/release-notes.html" },
      { id: "common-tracking", label: "Tracking", href: guide("common-tracking") },
      { id: "common-api-docs", label: "API Docs", href: guide("common-api-docs") },
    ]},
  ];

  var nav = document.querySelector(".crm-nav");
  if (!nav) return;
  nav.innerHTML = "";

  links.forEach(function (group) {
    var wrap = document.createElement("div");
    wrap.className = "crm-nav-group";
    if (group.nested) wrap.classList.add("crm-nav-sub");
    if (group.section) {
      var title = document.createElement("div");
      title.className = "crm-nav-group-title";
      title.textContent = group.section;
      wrap.appendChild(title);
    }
    group.items.forEach(function (item) {
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      if (item.id === active) a.classList.add("is-active");
      wrap.appendChild(a);
    });
    nav.appendChild(wrap);
  });
})();
