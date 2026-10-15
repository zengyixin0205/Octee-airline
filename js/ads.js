// Ads the Control Tower publishes (cloud data "ads"; data/ads.json is the fallback). One small banner under the header,
// rotating through the ads that are on, in date, and meant for this page. A visitor can close it for this visit.
// Ads are plain text only (set with textContent). Links must be https:// or a page of this site.
import { el } from "./dom.js";
import { fetchPublished } from "./published.js";

export const THEMES = { orange: "Orange", ink: "Dark", sky: "Sky blue", cream: "Cream" };
export const MAX_ADS = 30;
export const safeLink = (v) => { const s = String(v || "").trim(); return /^https:\/\/[^\s]+$/i.test(s) || /^[a-z0-9_\-]+\.html(#[\w\-]*)?$/i.test(s) ? s : ""; };
export const safeImage = (v) => { const s = String(v || "").trim(); return /^https:\/\/[^\s]+$/i.test(s) ? s : ""; };
const today = () => new Date().toISOString().slice(0, 10);
const here = () => location.pathname.split("/").pop() || "index.html";

// Clean one ad (also used by the Control Tower before saving).
export function cleanAd(a, i = 0) {
  const s = (v, n) => String(v ?? "").trim().slice(0, n);
  const d = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
  return {
    id: s(a.id, 40) || "ad" + Date.now().toString(36) + i,
    on: a.on !== false, title: s(a.title, 80), text: s(a.text, 200), icon: s(a.icon, 4),
    link: safeLink(a.link), button: s(a.button, 24), image: safeImage(a.image),
    theme: Object.hasOwn(THEMES, a.theme) ? a.theme : "orange",
    start: d(a.start), end: d(a.end),
    pages: s(a.pages, 200), // "" = every page, else page names separated by commas, e.g. index.html, book.html
    priority: Math.max(0, Math.min(99, Number(a.priority) || 0))
  };
}
// Which ads show right now on this page?
export function liveAds(list, page = here(), day = today()) {
  const pg = String(page).toLowerCase();
  return (Array.isArray(list) ? list : []).map(cleanAd).filter((a) => a.on && a.title
    && (!a.start || a.start <= day) && (!a.end || a.end >= day)
    && (!a.pages || a.pages.toLowerCase().split(/[\s,]+/).filter(Boolean).includes(pg)))
    .sort((x, y) => y.priority - x.priority);
}

// One ad as a node (the Control Tower uses it for its preview, too).
export function adNode(a, extra = {}) {
  const body = el("div", { class: "ad-body" },
    el("strong", { class: "ad-title" }, a.title), a.text ? el("span", { class: "ad-text" }, " " + a.text) : "");
  const kids = [
    a.image ? el("img", { class: "ad-img", src: a.image, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.remove() })
      : a.icon ? el("span", { class: "ad-icon", "aria-hidden": "true" }, a.icon) : "",
    body,
    a.link ? el("a", { class: "btn small ad-btn", href: a.link, ...(a.link.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {}) }, a.button || "Learn more") : "",
    el("span", { class: "ad-tag", title: "Octee Airlines is a parody. This advertisement is not real." }, "Ad")
  ];
  if (extra.close) kids.push(el("button", { class: "ad-close", type: "button", "aria-label": "Close this ad", onclick: extra.close }, "×"));
  return el("aside", { class: "ad-banner ad-" + a.theme, "aria-label": "Advertisement" }, ...kids);
}

const CLOSED = "octee.ads.closed";
const closed = () => { try { return sessionStorage.getItem(CLOSED) === "1"; } catch { return false; } };

export async function showAds() {
  if (closed() || document.querySelector(".ad-banner:not(.ad-preview)") || /^(login|404)\.html$/.test(here())) return;
  const data = await fetchPublished("ads", "data/ads.json", { ads: [] });
  const ads = liveAds(data.ads);
  if (!ads.length) return;
  const slot = el("div", { class: "ad-slot" });
  const header = document.querySelector(".site-header");
  if (!header) return;
  header.after(slot);
  let n = Math.floor(Math.random() * ads.length), timer = null;
  const paint = () => {
    const box = adNode(ads[n % ads.length], { close: () => { clearInterval(timer); try { sessionStorage.setItem(CLOSED, "1"); } catch { /* fine */ } slot.remove(); } });
    slot.replaceChildren(box);
  };
  paint();
  if (ads.length > 1) timer = setInterval(() => { if (!document.hidden) { n++; paint(); } }, 9000);
}
