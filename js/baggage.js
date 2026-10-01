import { $, setMsg, pick, reducedMotion } from "./dom.js";

const RESULTS = [
  "Your bag is on a better holiday than you.",
  "Last seen: Gate 7. Possibly Gate 8. Spiritually, everywhere.",
  "Your bag has been upgraded to a different flight.",
  "Your bag is at SIA. Or LIA. Or Scraggy House. We have narrowed it down to everywhere.",
  "Your bag took the JOELMOBILE. Joel says it is fine.",
  "Your bag is in the cockpit, helping."
];
const form = $("#bag-form");
const bar = $("#bag-progress > span");
const msg = $("#bag-msg");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.elements.tag.value.trim()) { setMsg(msg, "Please type a bag tag number. Any number. We won't check.", "error"); return; }
  setMsg(msg, "Tracking your bag…", "info");
  let p = 0;
  const step = () => {
    p = Math.min(99, p + Math.ceil(Math.random() * 12));
    bar.style.width = p + "%";
    $("#bag-progress").setAttribute("aria-valuenow", String(p));
    if (p < 99) setTimeout(step, reducedMotion() ? 0 : 180);
    else setMsg(msg, "99% found. " + pick(RESULTS), "error");
  };
  step();
});
