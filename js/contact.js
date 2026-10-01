import { $, setMsg } from "./dom.js";
// Nothing is sent anywhere: this is a static site.
$("#contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  if (!f.elements.name.value.trim() || !f.elements.message.value.trim()) {
    setMsg($("#contact-msg"), "Please fill in your name and message. We will ignore them properly.", "error");
    return;
  }
  f.reset();
  setMsg($("#contact-msg"), "Thank you. Your message has been placed with your baggage.", "ok");
});
