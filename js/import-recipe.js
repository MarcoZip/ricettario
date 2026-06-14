// Import ingredienti/porzioni da un link di ricetta, tramite il Worker Cloudflare
// (vedi README). Il Worker legge i dati strutturati schema.org/Recipe della
// pagina e restituisce JSON pulito: { title, image, servings, ingredients[] }.

import { WORKER_URL } from "./config.js";

// Ricerca diretta su GialloZafferano (italiano): ritorna [{ title, url }].
export async function searchGz(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchgz?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Abbinamento vino consigliato per un piatto (via Spoonacular).
export async function winePairing(food) {
  if (!WORKER_URL || !food) return null;
  const res = await fetch(`${WORKER_URL}/wine?food=${encodeURIComponent(food)}`);
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  if (!d || d.error) return null;
  return d;
}

// Dettagli completi (con i passi) di una ricetta Spoonacular, al salvataggio.
export async function spoonInfo(id) {
  if (!WORKER_URL || !id) return null;
  const res = await fetch(`${WORKER_URL}/spoon-info?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  if (!d || d.error) return null;
  return d;
}

// Ricerca diretta su Misya (italiano): ritorna [{ title, url }].
export async function searchMisya(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchmisya?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Ricerca diretta su Cookist (italiano): ritorna [{ title, url, image }].
export async function searchCookist(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchcookist?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Ricerca diretta su Ricette della Nonna (italiano): ritorna [{ title, url, image }].
export async function searchRicettenonna(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchricettenonna?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Ricettario Moulinex (italiano): con una query cerca nell'intero catalogo ricette
// (sitemap); senza query mostra la selezione curata per il Companion.
// Ritorna { results, total } dove total è quante combaciano in tutto.
export async function searchMoulinexFull(query, page = 0) {
  if (!WORKER_URL) return { results: [], total: 0, page: 0 };
  const q = (query || "").trim();
  const params = q ? `?q=${encodeURIComponent(q)}&page=${page}` : "";
  const res = await fetch(`${WORKER_URL}/searchmoulinex${params}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  const results = Array.isArray(d.results) ? d.results : [];
  return { results, total: typeof d.total === "number" ? d.total : results.length, page: d.page || 0 };
}
export async function searchMoulinex(query) {
  return (await searchMoulinexFull(query)).results;
}

// Ricettario Bimby (italiano): si SFOGLIA il catalogo (popolari), paginato.
// Ritorna { results, total } per la paginazione.
export async function searchBimbyFull(page = 0) {
  if (!WORKER_URL) return { results: [], total: 0 };
  const res = await fetch(`${WORKER_URL}/searchbimby?page=${page}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  const results = Array.isArray(d.results) ? d.results : [];
  return { results, total: typeof d.total === "number" ? d.total : results.length };
}

// Ricerca su Edamam (inglese, richiede le chiavi sul worker).
export async function searchEdamam(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/edamam?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  if (d.error === "nokey") { const e = new Error("Edamam non è configurato sul worker."); e.code = "nokey"; throw e; }
  return Array.isArray(d.results) ? d.results : [];
}

// Ricerca su Spoonacular (inglese, richiede la chiave sul worker).
export async function searchSpoon(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/spoon?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  if (d.error === "nokey") { const e = new Error("Spoonacular non è configurato sul worker."); e.code = "nokey"; throw e; }
  return Array.isArray(d.results) ? d.results : [];
}

// Ripulisce i tag importati dalle parole generiche/SEO (es. GialloZafferano).
const TAG_NOISE = new Set([
  "ricetta", "ricette", "cucina", "cucinare", "come fare", "come si fa", "video",
  "video ricetta", "ricette facili", "ricetta facile", "giallozafferano", "food",
  "cibo", "italiana", "italiano", "italia", "primo", "secondo"
]);
function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  const out = [];
  for (const t of tags) {
    const v = String(t || "").trim();
    if (!v || v.length > 22) continue;
    if (TAG_NOISE.has(v.toLowerCase())) continue;
    if (!out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, 5);
}

export async function importFromUrl(url) {
  if (!WORKER_URL) throw new Error("Import da link non configurato.");
  const endpoint = `${WORKER_URL}${WORKER_URL.includes("?") ? "&" : "?"}url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint);
  let data = null;
  try { data = await res.json(); } catch (e) { /* risposta non JSON */ }

  // Siti che bloccano la lettura automatica (sfida anti-bot).
  if (data && data.error === "blocked") {
    const e = new Error("Questo sito blocca la lettura automatica. Apri la ricetta dal link, poi copia gli ingredienti o usa \"Scansiona da una foto\".");
    e.code = "blocked";
    throw e;
  }
  if (!res.ok || !data) throw new Error("Impossibile leggere la ricetta dal link.");
  if (data.error === "notfound" || (!data.ingredients && !data.title)) {
    throw new Error("Nessuna ricetta trovata in questa pagina.");
  }
  return {
    title: data.title || "",
    image: data.image || "",
    servings: typeof data.servings === "number" ? data.servings : (parseInt(data.servings, 10) || null),
    time: typeof data.time === "number" ? data.time : (parseInt(data.time, 10) || null),
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    steps: Array.isArray(data.steps) ? data.steps : [],
    tags: cleanTags(data.tags)
  };
}
