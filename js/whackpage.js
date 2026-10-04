// Whack-a-Joel on its own page.
import { $, el } from "./dom.js";
import { mountWhack } from "./whack.js";

const card = el("div", { class: "card" });
$("#app").replaceChildren(card, el("p", { class: "note" }, "A hit needs the crosshair on Joel when you press Space. A score of 12 earns a peanut (once a day, when logged in). More games: ", el("a", { href: "entertainment.html" }, "Entertainment"), "."));
mountWhack(card);
addEventListener("pagehide", () => {});
