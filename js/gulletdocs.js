// Printable Zhang Gullet papers: the complaint letter and the Certificate of Having Been Heard.
// Print = a clean copy goes into a hidden print area, then the browser's print dialog opens.
import { el, niceDate } from "./dom.js";

export function certificate(c) {
  const d = new Date(c.at || Date.now());
  return el("article", { class: "gc-cert", "aria-label": "Certificate of Having Been Heard" },
    el("p", { class: "gc-cert-top" }, "Octee Airlines · Customer Service"),
    el("h2", { class: "gc-cert-title" }, "Certificate of Having Been Heard"),
    el("p", {}, "This is to certify that"),
    el("p", { class: "gc-cert-name" }, c.name || "A Valued Customer"),
    el("p", {}, "has complained, clearly and at length, and has been heard by Zhang Gullet, Head of Customer Service, who read it aloud to the telephone."),
    el("p", { class: "note" }, `Ticket ${c.ticket} · ${niceDate(d.toISOString().slice(0, 10))}`),
    el("p", { class: "gc-sign" }, "Zhang Gullet"),
    el("p", { class: "note" }, "Head of Customer Service · Deputy Head · The Team · The Department"),
    el("p", { class: "note" }, "Not valid as proof of anything. Valid as proof of having been heard, which is more than we usually offer."));
}

export function letterText(c, paragraphs) {
  return [`Zhang Gullet, Head of Customer Service, Octee Airlines`, `To: ${c.name}`, `Re: your complaint ${c.ticket}`, "", `Dear ${c.name},`, "", ...paragraphs.flatMap((p) => [p, ""]), "Yours, with a very steady hand,", "Zhang Gullet", "Head of Customer Service · Deputy Head · The Team · The Department", "", "(Octee Airlines is a parody. This letter is fictional.)", ""].join("\n");
}

export function saveText(name, text) {
  const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: "text/plain" })), download: name });
  document.body.append(a); a.click(); a.remove();
}

export function printNode(node) {
  document.querySelectorAll(".gc-print-root").forEach((n) => n.remove());
  const root = el("div", { class: "gc-print-root" });
  root.append(node.cloneNode(true));
  document.body.append(root);
  document.body.classList.add("gc-printing");
  const done = () => { document.body.classList.remove("gc-printing"); root.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 50);
}
