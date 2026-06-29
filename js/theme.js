// Gestione tema (scuro / chiaro). La preferenza è salvata su questo dispositivo.
const KEY = "ricettario.theme";

export function getTheme() {
  try { return localStorage.getItem(KEY) || "dark"; } catch { return "dark"; }
}

export function applyTheme(t) {
  const v = t || getTheme();
  document.documentElement.setAttribute("data-theme", v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", v === "light" ? "#fbf7f2" : "#0e0f13");
}

export function setTheme(t) {
  try { localStorage.setItem(KEY, t); } catch {}
  applyTheme(t);
}

// ---- Colore d'accento (personalizzazione) ----
const ACCENT_KEY = "ricettario.accent";
export const ACCENT_PRESETS = {
  arancione: { p: "#ff7a3d", p2: "#ffb86b", label: "Arancione" },
  rosso: { p: "#ef4d4d", p2: "#ff9090", label: "Rosso" },
  verde: { p: "#2fb96b", p2: "#86e0aa", label: "Verde" },
  blu: { p: "#3b82f6", p2: "#93c5fd", label: "Blu" },
  viola: { p: "#8b5cf6", p2: "#c4b5fd", label: "Viola" },
  rosa: { p: "#ec4899", p2: "#f9a8d4", label: "Rosa" }
};

export function getAccent() {
  try { return localStorage.getItem(ACCENT_KEY) || "arancione"; } catch { return "arancione"; }
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "255,184,107";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export function applyAccent(name) {
  const a = ACCENT_PRESETS[name || getAccent()] || ACCENT_PRESETS.arancione;
  const s = document.documentElement.style;
  s.setProperty("--primary", a.p);
  s.setProperty("--primary-2", a.p2);
  s.setProperty("--primary-rgb", hexToRgb(a.p2));
  s.setProperty("--primary-grad", `linear-gradient(135deg, ${a.p2}, ${a.p})`);
}

export function setAccent(name) {
  try { localStorage.setItem(ACCENT_KEY, name); } catch {}
  applyAccent(name);
}

// ---- Dimensione del testo (accessibilità) ----
const TEXT_SCALE_KEY = "ricettario.textScale";
export function getTextScale() {
  const v = parseInt(localStorage.getItem(TEXT_SCALE_KEY), 10);
  return [14, 16, 18, 20].includes(v) ? v : 16;
}
export function applyTextScale(px) {
  const v = px || getTextScale();
  document.documentElement.style.fontSize = v + "px";
  if (document.body) document.body.style.fontSize = v + "px";
}
export function setTextScale(px) {
  try { localStorage.setItem(TEXT_SCALE_KEY, String(px)); } catch {}
  applyTextScale(px);
}

// ---- Alto contrasto (accessibilità) ----
const CONTRAST_KEY = "ricettario.contrast";
export function getContrast() { try { return localStorage.getItem(CONTRAST_KEY) === "1"; } catch { return false; } }
export function applyContrast(on) {
  const v = on == null ? getContrast() : on;
  document.documentElement.classList.toggle("high-contrast", !!v);
}
export function setContrast(on) {
  try { localStorage.setItem(CONTRAST_KEY, on ? "1" : "0"); } catch {}
  applyContrast(on);
}

// ---- Tema "festa" (coriandoli e palloncini animati di sottofondo) ----
// Tre modalità: "off" | "on" (sempre) | "auto" (solo nei giorni di festa o
// quando c'è un Menù delle feste in programma per oggi).
const FESTA_KEY = "ricettario.festa";
let festaEventToday = false; // impostato dall'app se oggi cade un evento salvato
export function getFestaMode() {
  try { const v = localStorage.getItem(FESTA_KEY); if (v === "1") return "on"; if (v === "0") return "off"; return v || "auto"; }
  catch { return "auto"; }
}
// Data della Pasqua (algoritmo di Meeus/Butcher, calendario gregoriano).
function easterDate(Y) {
  const a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Y, mo - 1, da);
}
// Oggi è un giorno di festa? (festività italiane principali + Pasqua/Pasquetta)
function isFestaDay() {
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  if (m === 12 && day >= 24 && day <= 26) return true;   // Natale
  if (m === 12 && day === 31) return true;               // San Silvestro
  if (m === 1 && (day === 1 || day === 6)) return true;   // Capodanno, Epifania
  if (m === 8 && day === 15) return true;                 // Ferragosto
  if (m === 10 && day === 31) return true;                // Halloween
  const e = easterDate(d.getFullYear());
  const pasquetta = new Date(e); pasquetta.setDate(e.getDate() + 1);
  if ((m === e.getMonth() + 1 && day === e.getDate()) || (m === pasquetta.getMonth() + 1 && day === pasquetta.getDate())) return true;
  return false;
}
// L'app segnala se oggi cade un Menù delle feste salvato (gli eventi vivono nello store).
export function setFestaEventToday(v) { festaEventToday = !!v; applyFesta(); }
export function festaActive() {
  const mode = getFestaMode();
  if (mode === "on") return true;
  if (mode === "off") return false;
  return isFestaDay() || festaEventToday; // auto
}
export function getFesta() { return festaActive(); } // compat
export function applyFesta() {
  const v = festaActive() && !powerSaveActive();
  document.documentElement.classList.toggle("theme-festa", !!v);
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let layer = document.getElementById("festa");
  if (v && !reduce) {
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "festa";
      layer.setAttribute("aria-hidden", "true");
      const colors = ["#ff7a3d", "#ffd166", "#06d6a0", "#ef476f", "#5aa9ff", "#c77dff"];
      let html = "";
      for (let i = 0; i < 14; i++) {
        const left = Math.round((i / 14) * 96 + (i % 3) * 2);
        const dur = 6 + (i % 5);
        const delay = -(i * 0.9).toFixed(1);
        html += `<span class="festa__bit" style="left:${left}%;background:${colors[i % colors.length]};animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
      }
      for (let i = 0; i < 3; i++) {
        html += `<span class="festa__balloon" style="left:${18 + i * 32}%;animation-duration:${14 + i * 3}s;animation-delay:${-(i * 5)}s">🎈</span>`;
      }
      layer.innerHTML = html;
      document.body.appendChild(layer);
    }
  } else if (layer) { layer.remove(); }
}
export function setFesta(mode) {
  const m = (mode === "on" || mode === "off" || mode === "auto") ? mode : (mode ? "on" : "off");
  try { localStorage.setItem(FESTA_KEY, m); } catch {}
  applyFesta();
}

// ---- Vetro liquido (glassmorphism): superfici smerigliate con riflesso ----
const GLASS_KEY = "ricettario.glass";
export function getGlassOn() {
  try { const v = localStorage.getItem(GLASS_KEY); return v === null ? true : v === "1"; } catch { return true; }
}
export function applyGlass(on) {
  const v = on == null ? getGlassOn() : on;
  document.documentElement.classList.toggle("glass", !!v);
}
export function setGlass(on) {
  try { localStorage.setItem(GLASS_KEY, on ? "1" : "0"); } catch {}
  applyGlass(on);
}

// ---- Risparmio energia: spegne gli effetti continui più pesanti ----
// (aurora, atmosfera stagionale, vetro liquido, Cucina viva, vapore, festa).
// "auto" li riduce solo quando la batteria è scarica.
const POWER_KEY = "ricettario.power";
let batteryLow = false;
export function getPowerMode() {
  try { const v = localStorage.getItem(POWER_KEY); return (v === "on" || v === "off" || v === "auto") ? v : "auto"; }
  catch { return "auto"; }
}
export function powerSaveActive() {
  const m = getPowerMode();
  return m === "on" || (m === "auto" && batteryLow);
}
export function applyPowerSave() {
  document.documentElement.classList.toggle("power-save", powerSaveActive());
  applySeason(); applyFesta();
}
export function setPowerMode(m) {
  const v = (m === "on" || m === "off" || m === "auto") ? m : "auto";
  try { localStorage.setItem(POWER_KEY, v); } catch {}
  applyPowerSave();
}
export function setBatteryLow(v) {
  const nv = !!v;
  if (nv === batteryLow) return;
  batteryLow = nv;
  applyPowerSave();
}

// ---- Atmosfera stagionale (petali, pulviscolo dorato, foglie, neve) ----
// Elementi leggeri che fluttuano sullo sfondo a seconda della stagione in corso.
// Acceso di default; "off" lo disattiva. Rispetta sempre "riduci movimento".
const SEASON_KEY = "ricettario.season";
export function getSeasonMode() {
  try { return localStorage.getItem(SEASON_KEY) === "off" ? "off" : "on"; } catch { return "on"; }
}
export function currentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "primavera";
  if (m >= 6 && m <= 8) return "estate";
  if (m >= 9 && m <= 11) return "autunno";
  return "inverno";
}
const SEASON_BITS = {
  primavera: { emojis: ["🌸", "🌸", "🌷", "🌼"], rise: false },
  estate: { emojis: ["✨", "✨", "🌟", "✨"], rise: true },
  autunno: { emojis: ["🍂", "🍁", "🍂", "🍃"], rise: false },
  inverno: { emojis: ["❄️", "❄️", "❄️", "🌨️"], rise: false }
};
export function applySeason() {
  if (powerSaveActive()) { const l = document.getElementById("season"); if (l) l.remove(); return; }
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const season = currentSeason();
  let layer = document.getElementById("season");
  if (getSeasonMode() !== "off" && !reduce) {
    if (layer && layer.dataset.season === season) return; // già impostato sulla stagione giusta
    if (layer) layer.remove();
    layer = document.createElement("div");
    layer.id = "season";
    layer.dataset.season = season;
    layer.setAttribute("aria-hidden", "true");
    const cfg = SEASON_BITS[season];
    let html = "";
    for (let i = 0; i < 12; i++) {
      const left = Math.round((i / 12) * 94 + (i % 4) * 1.5);
      const dur = 9 + (i % 6);
      const delay = -(i * 1.3).toFixed(1);
      const size = (0.85 + (i % 4) * 0.28).toFixed(2);
      const cls = cfg.rise ? "season__bit season__bit--rise" : "season__bit";
      html += `<span class="${cls}" style="left:${left}%;font-size:${size}rem;animation-duration:${dur}s;animation-delay:${delay}s">${cfg.emojis[i % cfg.emojis.length]}</span>`;
    }
    layer.innerHTML = html;
    document.body.appendChild(layer);
  } else if (layer) { layer.remove(); }
}
export function setSeason(mode) {
  try { localStorage.setItem(SEASON_KEY, mode === "off" ? "off" : "on"); } catch {}
  applySeason();
}

// ---- Sfondo che segue l'ora del giorno ----
// Una tinta soffusa sullo sfondo che vira con l'orario reale: rosa all'alba,
// luce di giorno, arancio al tramonto, blu profondo di notte.
export function dayPhase(d) {
  const h = (d || new Date()).getHours();
  if (h >= 5 && h < 8) return "alba";
  if (h >= 8 && h < 17) return "giorno";
  if (h >= 17 && h < 20) return "tramonto";
  return "notte";
}
export function applyDaylight() {
  document.documentElement.setAttribute("data-daylight", dayPhase());
  let layer = document.getElementById("daysky");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "daysky";
    layer.setAttribute("aria-hidden", "true");
    document.body.insertBefore(layer, document.body.firstChild);
  }
}
