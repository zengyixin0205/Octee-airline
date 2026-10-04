// Whack-a-Joel: aim the hammer, press Space to hit. Used on its own page and as a tab in Entertainment.
import { el } from "./dom.js";
import { best, setBest, reward } from "./gamekit.js";

export function mountWhack(box) {  // returns a stop() function
  const W = 340, H = 400, cols = 3, rows = 3, cw = 90, ch = 80, gx = (W - cols * cw) / (cols + 1), gy = 42;
  const c = el("canvas", { width: W, height: H, class: "gm-canvas", tabindex: "0", "aria-label": "Whack-a-Joel. Aim the hammer with the mouse or arrow keys and press Space to hit." }), ctx = c.getContext("2d");
  const info = el("p", { class: "note", role: "status", "aria-live": "polite" }, `Best: ${best("whack") || 0}. Move the hammer (mouse, touch or arrow keys). Press Space (or the Hit button) to whack Joel when he pops up. Do not whack the peanut.`);
  const hole = (i) => ({ x: gx + (i % cols) * (cw + gx), y: gy + Math.floor(i / cols) * (ch + 30) });
  let aim = { x: W / 2, y: H / 2 }, ups = new Array(9).fill(null), score = 0, left = 30, running = false, swing = 0, flash = "", flashT = 0, raf, spawn, tm, last = 0;
  const SAY = ["Sorry!", "So sorry!", "Sorry about the delay", "Sorry again", "I am sorry"];
  const over = (i) => { const h = hole(i); return aim.x >= h.x && aim.x <= h.x + cw && aim.y >= h.y - 30 && aim.y <= h.y + ch; };
  const hit = () => {
    if (!running) return; swing = 8;
    const i = ups.findIndex((u, k) => u && !u.hit && over(k));
    if (i < 0) { flash = "Miss. You hit a cupboard."; flashT = 25; score = Math.max(0, score - 0); return; }
    const u = ups[i]; u.hit = true; u.t = 14;
    if (u.kind === "peanut") { score = Math.max(0, score - 2); flash = "Not the peanut! -2"; } else { score++; flash = u.say + " +1"; }
    flashT = 30;
  };
  const tickSpawn = () => { if (!running) return; const free = ups.map((u, k) => (u ? -1 : k)).filter((k) => k >= 0);
    if (free.length) { const k = free[Math.floor(Math.random() * free.length)]; ups[k] = { kind: Math.random() < 0.18 ? "peanut" : "joel", t: 55 + Math.random() * 45, say: SAY[Math.floor(Math.random() * SAY.length)], hit: false, rise: 0 }; }
    spawn = setTimeout(tickSpawn, Math.max(350, 750 - (30 - left) * 12)); };
  const end = () => { running = false; clearTimeout(spawn); clearInterval(tm); const nb = setBest("whack", score);
    info.textContent = `Time up: ${score} Joels. ${nb && score ? "New best! " : ""}${score >= 12 ? reward("whack", "Whack-a-Joel: 12") : "Whack 12 for a peanut."} Press Start to play again.`; startBtn.hidden = false; };
  const start = () => { ups = new Array(9).fill(null); score = 0; left = 30; running = true; startBtn.hidden = true; info.textContent = "Go! Aim and press Space."; tickSpawn(); tm = setInterval(() => { left--; if (left <= 0) end(); }, 1000); c.focus(); };
  const draw = () => {
    ctx.fillStyle = "#e8d8c0"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const h = hole(i), u = ups[i];
      if (u) { const rise = Math.min(1, (u.rise = Math.min(1, u.rise + 0.18))); const dy = u.hit ? 24 : 0, top = h.y + ch - 10 - rise * 58 + dy;
        ctx.save(); ctx.beginPath(); ctx.rect(h.x + 4, h.y - 30, cw - 8, ch + 10); ctx.clip();
        if (u.kind === "peanut") { ctx.fillStyle = "#e5bd7f"; ctx.strokeStyle = "#2b1a0e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(h.x + cw / 2, top + 22, 22, 28, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#2b1a0e"; ctx.fillRect(h.x + cw / 2 - 8, top + 14, 4, 4); ctx.fillRect(h.x + cw / 2 + 4, top + 14, 4, 4); }
        else { ctx.fillStyle = "#ff9d3a"; ctx.strokeStyle = "#2b1a0e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x + cw / 2, top + 24, 26, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#2b1a0e"; ctx.beginPath(); ctx.arc(h.x + cw / 2 - 9, top + 20, 3, 0, 7); ctx.arc(h.x + cw / 2 + 9, top + 20, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(h.x + cw / 2, top + 38, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
          if (u.hit) { ctx.fillStyle = "#fff"; ctx.fillRect(h.x + cw / 2 - 20, top + 16, 40, 4); } }
        ctx.restore();
        if (!u.hit && u.kind === "joel" && rise > 0.6) { ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2b1a0e"; ctx.lineWidth = 1.5; ctx.fillRect(h.x + 2, h.y - 34, cw - 4, 18); ctx.strokeRect(h.x + 2, h.y - 34, cw - 4, 18); ctx.fillStyle = "#2b1a0e"; ctx.font = "700 11px sans-serif"; ctx.fillText(u.say.slice(0, 16), h.x + 6, h.y - 21); }
        u.t--; if (u.t <= 0) ups[i] = null; }
      ctx.fillStyle = "#6b4423"; ctx.fillRect(h.x, h.y + 20, cw, ch - 10); ctx.fillStyle = "#8a5a30"; ctx.fillRect(h.x + 4, h.y + 24, cw / 2 - 6, ch - 18); ctx.fillRect(h.x + cw / 2 + 2, h.y + 24, cw / 2 - 6, ch - 18);
      ctx.fillStyle = "#ffd9b0"; ctx.fillRect(h.x + cw / 2 - 5, h.y + 50, 3, 10); ctx.fillRect(h.x + cw / 2 + 2, h.y + 50, 3, 10); }
    const sw = swing > 0 ? 1 : 0; if (swing > 0) swing--;
    ctx.save(); ctx.translate(aim.x, aim.y); ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.stroke();
    ctx.rotate(sw ? 0.9 : -0.5); ctx.fillStyle = "#6b4423"; ctx.fillRect(10, -4, 6, 36); ctx.fillStyle = "#555"; ctx.fillRect(2, -18, 30, 16); ctx.restore();
    ctx.fillStyle = "#2b1a0e"; ctx.font = "700 15px sans-serif"; ctx.fillText(`Score ${score}   Time ${Math.max(0, left)}`, 8, 20);
    if (flashT > 0) { flashT--; ctx.fillStyle = "#b3261e"; ctx.font = "700 16px sans-serif"; ctx.fillText(flash, 8, H - 12); }
    raf = requestAnimationFrame(draw); };
  const move = (e) => { const r = c.getBoundingClientRect(); aim.x = Math.max(0, Math.min(W, (e.clientX - r.left) * (W / r.width))); aim.y = Math.max(0, Math.min(H, (e.clientY - r.top) * (H / r.height))); };
  c.addEventListener("pointermove", move); c.addEventListener("pointerdown", move);
  const kd = (e) => { if (!box.isConnected) return; const ae = document.activeElement; const ok = ae === c || ae === document.body; if (!ok) return;
    if (e.code === "Space") { e.preventDefault(); hit(); } else if (e.key.startsWith("Arrow")) { e.preventDefault(); const d = 14; if (e.key === "ArrowLeft") aim.x = Math.max(0, aim.x - d); if (e.key === "ArrowRight") aim.x = Math.min(W, aim.x + d); if (e.key === "ArrowUp") aim.y = Math.max(0, aim.y - d); if (e.key === "ArrowDown") aim.y = Math.min(H, aim.y + d); } };
  document.addEventListener("keydown", kd);
  const startBtn = el("button", { class: "btn", type: "button", onclick: start }, "Start (30 seconds)"), hitBtn = el("button", { class: "btn gm-hit", type: "button", onclick: hit }, "HIT (or press Space)");
  box.append(c, el("div", { class: "actions" }, startBtn, hitBtn), info); raf = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(raf); clearTimeout(spawn); clearInterval(tm); document.removeEventListener("keydown", kd); };
}
