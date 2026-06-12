// Traduzione EN -> IT con l'endpoint gratuito di Google Translate (best-effort,
// senza chiave). Usato per le ricette di TheMealDB (in inglese) al salvataggio.
// Se la traduzione non riesce (rete/limiti), si tiene il testo originale.

async function gtx(text, timeoutMs = 8000, sl = "en", tl = "it") {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=` + encodeURIComponent(text);
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    // data[0] = elenco di segmenti [tradotto, originale, ...]; li riunisco.
    return (data[0] || []).map((seg) => seg[0]).join("");
  } finally {
    clearTimeout(timer);
  }
}

// Traduce dall'italiano all'inglese (per cercare su database in inglese).
export async function translateToEnglish(text) {
  const t = (text || "").trim();
  if (!t) return text || "";
  try { return (await gtx(t, 8000, "it", "en")).trim(); } catch (e) { return text; }
}

export async function translateText(text) {
  const t = (text || "").trim();
  if (!t) return text || "";
  try { return (await gtx(t)).trim(); } catch (e) { return text; }
}

// Traduce una lista di righe (ingredienti/passi). Le manda insieme in un'unica
// richiesta (i ritorni a capo vengono mantenuti); se l'allineamento non torna,
// ripiega sulla traduzione riga per riga.
export async function translateList(lines) {
  const arr = (lines || []).map((l) => String(l == null ? "" : l));
  if (!arr.length) return lines || [];
  try {
    const out = await gtx(arr.join("\n"));
    const split = out.split("\n");
    if (split.length === arr.length) return split.map((s) => s.trim());
  } catch (e) { /* sotto: fallback */ }
  try { return await Promise.all(arr.map((l) => translateText(l))); }
  catch (e) { return arr; }
}

// Traduce i campi testuali di una ricetta. Tiene l'originale per ciò che fallisce.
export async function translateRecipe({ title, ingredients, steps }) {
  const [t, ing, st] = await Promise.all([
    translateText(title),
    translateList(ingredients || []),
    translateList(steps || [])
  ]);
  return { title: t, ingredients: ing, steps: st };
}
