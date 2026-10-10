// Classic script (not a module) so it still runs when a page is opened straight from disk (file://),
// where browsers refuse to load the site's modules. It says why nothing works and what to do.
(function () {
  if (location.protocol !== "file:") return;
  function show() {
    var b = document.createElement("div");
    b.setAttribute("role", "alert");
    b.style.cssText = "position:sticky;top:0;z-index:99999;background:#fff3cd;color:#5a3b00;border-bottom:2px solid #d9a441;padding:12px 16px;font:15px/1.4 system-ui,sans-serif";
    b.innerHTML = "<strong>Model unavailable here.</strong> This page is opened from a file, and browsers do not let a file run the site's scripts, so JoelAI (handbook and model), logins and most pages cannot work. " +
      "Run a local server instead: in the site folder type <code>python3 -m http.server 8000</code>, then open <code>http://localhost:8000</code>. " +
      "Handbook JoelAI then works. Model answers also need the site on Vercel with the AI service switched on.";
    document.body.insertBefore(b, document.body.firstChild);
  }
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
})();
