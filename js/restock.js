// Restock predittivo: registro locale (su questo dispositivo) di quando un
// alimento ENTRA in dispensa. Con almeno due "acquisti" stima ogni quanto lo
// ricompri e segnala quando è probabile che stia per finire. Nessun dato esce
// dal telefono; migliora da solo con l'uso.

const KEY = "ricettario.restock";

function norm(s) { return String(s || "").toLowerCase().trim().replace(/\s{2,}/g, " "); }
export function getRestockLog() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* quota */ } }

// Registra un "acquisto" (max uno al giorno per articolo, ultimi 12).
export function logPurchase(name) {
  const n = norm(name);
  if (n.length < 2) return;
  const o = getRestockLog();
  const arr = Array.isArray(o[n]) ? o[n] : [];
  const today = new Date().toISOString().slice(0, 10);
  if (arr[arr.length - 1] === today) return;
  arr.push(today);
  o[n] = arr.slice(-12);
  save(o);
}

// Dimentica un articolo (es. se l'utente lo toglie dai suggerimenti).
export function forgetRestock(name) {
  const o = getRestockLog();
  delete o[norm(name)];
  save(o);
}

// Alimenti probabilmente da ricomprare presto: intervallo medio tra acquisti e
// tempo trascorso dall'ultimo. Esclude ciò che è ancora in dispensa. Servono
// almeno 2 acquisti per stimare un intervallo.
export function restockDue(pantryNames) {
  const o = getRestockLog();
  const have = new Set((pantryNames || []).map(norm));
  const now = Date.now();
  const out = [];
  for (const [name, dates] of Object.entries(o)) {
    if (!Array.isArray(dates) || dates.length < 2) continue;
    if (have.has(name)) continue;
    const ds = dates.map((d) => new Date(d).getTime()).filter((t) => !isNaN(t)).sort((a, b) => a - b);
    let sum = 0, c = 0;
    for (let i = 1; i < ds.length; i++) { const g = (ds[i] - ds[i - 1]) / 86400000; if (g >= 1 && g <= 120) { sum += g; c++; } }
    if (!c) continue;
    const avg = sum / c;
    const sinceLast = (now - ds[ds.length - 1]) / 86400000;
    const ratio = sinceLast / avg;
    if (ratio >= 0.8) out.push({ name, avg: Math.round(avg), sinceLast: Math.round(sinceLast), ratio });
  }
  return out.sort((a, b) => b.ratio - a.ratio).slice(0, 12);
}
