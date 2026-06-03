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
