import { $, el } from "./dom.js";
import { mountGallery } from "./taglines.js";
import { currentUser } from "./auth.js";

mountGallery($("#gallery"));
// "Name a gate" reward shows on the map (in this browser)
const u = currentUser();
if (u && (u.redemptions || []).some((r) => r.id === "name-gate")) {
  $("#named-gate").textContent = `Gate FIA07 is now called "The ${u.username} Gate". Nobody can find it either.`;
}
