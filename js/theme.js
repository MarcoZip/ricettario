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
