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

// Ricerca su Spoonacular (inglese, richiede la chiave sul worker).
export async function searchSpoon(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/spoon?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  if (d.error === "nokey") { const e = new Error("Spoonacular non è configurato sul worker."); e.code = "nokey"; throw e; }
  return Array.isArray(d.results) ? d.results : [];
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
    tags: Array.isArray(data.tags) ? data.tags : []
  };
}
