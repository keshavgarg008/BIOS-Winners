/* JeevanSetu offline support: add <script src="pwa.js"></script> to every page.
 * - registers the service worker
 * - shows a small banner when the device goes offline / comes back online
 * - shows an "Install app" button when the browser allows installing
 */
(function () {
  "use strict";

  // ---- 1. Service worker ----
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        // When a new version is installed, activate it on the next page load
        reg.addEventListener("updatefound", function () {
          var sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", function () {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              showBar("A new version is ready. Reload to update.", "Reload", function () { location.reload(); }, "update");
            }
          });
        });
      }).catch(function (e) { console.warn("Service worker not registered:", e); });
    });
  }

  // ---- 2. Online / offline banner ----
  var style = document.createElement("style");
  style.textContent =
    ".gs-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;gap:.75rem;align-items:center;justify-content:center;flex-wrap:wrap;" +
    "padding:.6rem 1rem;font:600 .92rem system-ui,sans-serif;color:#fff;background:#17243b;box-shadow:0 -2px 10px rgba(0,0,0,.2)}" +
    ".gs-bar.off{background:#8a4b00}.gs-bar.on{background:#0d5c06}" +
    ".gs-bar button{background:#fff;color:#17243b;border:0;border-radius:6px;padding:.35rem .8rem;font:inherit;cursor:pointer}" +
    ".gs-bar button:focus-visible{outline:3px solid #9ec2f0}";
  document.head.appendChild(style);

  var bar = null, hideTimer = null;
  function showBar(text, btnText, onClick, kind, autoHideMs) {
    clearTimeout(hideTimer);
    if (!bar) {
      bar = document.createElement("div");
      bar.setAttribute("role", "status");
      bar.setAttribute("aria-live", "polite");
      document.body.appendChild(bar);
    }
    bar.className = "gs-bar " + (kind || "");
    bar.textContent = "";
    var span = document.createElement("span");
    span.textContent = text;
    bar.appendChild(span);
    if (btnText) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = btnText;
      b.addEventListener("click", onClick);
      bar.appendChild(b);
    }
    if (autoHideMs) hideTimer = setTimeout(hideBar, autoHideMs);
  }
  function hideBar() {
    if (bar) { bar.remove(); bar = null; }
  }

  function onOffline() {
    showBar("You are offline. Changes are saved on this device and will upload when the internet returns.", null, null, "off");
  }
  function onOnline() {
    showBar("Back online. Uploading saved changes...", null, null, "on", 4000);
  }
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  document.addEventListener("DOMContentLoaded", function () {
    if (!navigator.onLine) onOffline();
  });

  // ---- 3. Install button ----
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    showBar("Install JeevanSetu on this device to use it like an app.", "Install", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; hideBar(); });
    }, "");
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    hideBar();
  });

  // Ask the browser not to delete our saved data when storage is low
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () {});
  }
})();