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

export function applyAccent(name) {
  const a = ACCENT_PRESETS[name || getAccent()] || ACCENT_PRESETS.arancione;
  const s = document.documentElement.style;
  s.setProperty("--primary", a.p);
  s.setProperty("--primary-2", a.p2);
  s.setProperty("--primary-grad", `linear-gradient(135deg, ${a.p2}, ${a.p})`);
}

export function setAccent(name) {
  try { localStorage.setItem(ACCENT_KEY, name); } catch {}
  applyAccent(name);
}
