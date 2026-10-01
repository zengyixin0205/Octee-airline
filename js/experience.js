import { $, el } from "./dom.js";
$("#more-peanut").addEventListener("click", () => {
  $("#peanut-answer").replaceChildren(el("p", { class: "headline" },
    el("span", { class: "line" }, "Peanut? Peanut?"), el("span", { class: "punch line" }, "ONE PEANUT 🥜")));
});
