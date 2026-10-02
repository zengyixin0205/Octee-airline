import { $, el } from "./dom.js";
import { currentUser } from "./auth.js";

// "Name a gate" reward shows on the map (in this browser)
const u = currentUser();
if (u && (u.redemptions || []).some((r) => r.id === "name-gate")) {
  $("#named-gate").textContent = `Gate A17 is now called "The ${u.username} Gate". Nobody can find it either.`;
}
